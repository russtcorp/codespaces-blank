import type { OtpRecord } from "./utils/twilio";
import { handleInboundCommand } from "./handlers/commands";

interface ChatMessage {
  id: string;
  from: string;
  body: string;
  timestamp: string;
  channel: "sms" | "voice" | "chat";
}

interface StoredState {
  messages: ChatMessage[];
  otp?: OtpRecord & { userId: string };
}

/**
 * DinerAgent Durable Object
 * Maintains per-tenant state (chat history, OTP challenges)
 */
export class DinerAgent implements DurableObject {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }

    if (url.pathname === "/ingest" && request.method === "POST") {
      const body = await request.json();
      await this.handleInbound(body as InboundMessage);
      return new Response("ok", { status: 200 });
    }

    if (url.pathname === "/otp/start" && request.method === "POST") {
      const body = (await request.json()) as { userId: string; ttlSeconds?: number };
      const otp = await this.startOtp(body.userId, body.ttlSeconds ?? 300);
      return new Response(JSON.stringify(otp), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/otp/verify" && request.method === "POST") {
      const body = (await request.json()) as { userId: string; code: string };
      const ok = await this.verifyOtp(body.userId, body.code);
      return new Response(JSON.stringify({ ok }), {
        status: ok ? 200 : 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  }

  async queue(batch: MessageBatch<any>): Promise<void> {
    for (const msg of batch.messages) {
      await this.handleInbound(msg.body as InboundMessage);
    }
  }

  private async handleInbound(message: InboundMessage): Promise<void> {
    // Critical section: Load state, append message, truncate, and save
    // Only block concurrency for state reads/writes, not downstream I/O
    await this.state.blockConcurrencyWhile(async () => {
      const currentState = await this.loadState();
      const stored: ChatMessage = {
        id: message.id ?? crypto.randomUUID(),
        from: message.from,
        body: message.body ?? "",
        timestamp: new Date().toISOString(),
        channel: message.channel ?? "sms",
      };

      currentState.messages.push(stored);
      
      // Performance: Truncate history to last 50 messages
      if (currentState.messages.length > 50) {
        currentState.messages = currentState.messages.slice(-50);
      }
      
      await this.saveState(currentState);
    });

    // Process OTP verification first (outside message storage critical section)
    // OTP state mutations use their own critical sections for atomicity
    const otpResult = await this.handleOtpIfPresent(message);
    if (otpResult.handled) return;

    // Handle commands / intent via shared handler (outside critical section)
    // This unifies logic with the rest of the system
    const result = await handleInboundCommand(this.env, message);
    if (result.response && message.from) {
      await this.sendSms(message.from, result.response);
    }
  }

  async startOtp(userId: string, ttlSeconds = 300): Promise<OtpRecord> {
    return await this.state.blockConcurrencyWhile(async () => {
      const code = this.generateOtp();
      const expiresAt = Date.now() + ttlSeconds * 1000;
      const state = await this.loadState();
      state.otp = { code, expiresAt, userId };
      await this.saveState(state);
      return { code, expiresAt };
    });
  }

  async verifyOtp(userId: string, code: string): Promise<boolean> {
    return await this.state.blockConcurrencyWhile(async () => {
      const state = await this.loadState();
      if (!state.otp) return false;
      if (state.otp.userId !== userId) return false;
      if (Date.now() > state.otp.expiresAt) return false;
      if (state.otp.code !== code) return false;
      // Clear after verification
      state.otp = undefined;
      await this.saveState(state);
      return true;
    });
  }

  private generateOtp(length = 6): string {
    const digits = "0123456789";
    let code = "";
    const buf = new Uint8Array(length);
    crypto.getRandomValues(buf);
    buf.forEach((b) => (code += digits[b % 10]));
    return code;
  }

  private async loadState(): Promise<StoredState> {
    return (
      (await this.state.storage.get<StoredState>("state")) || {
        messages: [],
      }
    );
  }

  private async saveState(state: StoredState): Promise<void> {
    await this.state.storage.put("state", state);
  }

  private async handleOtpIfPresent(message: InboundMessage) {
    const body = (message.body || "").trim();
    
    // Check and mutate OTP state in its own critical section
    const otpHandled = await this.state.blockConcurrencyWhile(async () => {
      const state = await this.loadState();
      
      if (!state.otp) return { handled: false, response: "" };
      
      // Check if the message looks like an OTP code (digits only)
      const looksLikeOtp = /^\d+$/.test(body);
      
      // Check if OTP expired
      if (Date.now() > state.otp.expiresAt) {
        state.otp = undefined;
        await this.saveState(state);
        // Only notify if user is trying to enter a code
        if (looksLikeOtp) {
          return { 
            handled: true, 
            response: "Your previous verification code expired. Reply with the new code when prompted." 
          };
        }
        return { handled: false, response: "" };  // Allow non-OTP messages to be processed
      }
      
      // Only handle if the message looks like an OTP code
      if (!looksLikeOtp) {
        return { handled: false, response: "" };  // Not an OTP attempt, process normally
      }
      
      // Verify the OTP code
      if (body === state.otp.code && state.otp.userId === message.from) {
        state.otp = undefined;
        await this.saveState(state);
        return { 
          handled: true, 
          response: "Verification successful. Proceeding with your request." 
        };
      }
      
      // Code didn't match
      return { 
        handled: true, 
        response: "That code didn't match. Please re-enter the verification code we sent." 
      };
    });
    
    // Send SMS response outside the critical section
    if (otpHandled.handled && otpHandled.response) {
      await this.sendSms(message.from, otpHandled.response);
    }
    
    return { handled: otpHandled.handled };
  }

  private async sendSms(to: string, body: string) {
    if (!to || !body) return;
    try {
      await this.env.SMS_OUTBOUND.send({ to, body });
    } catch (err) {
      console.error("Failed to enqueue outbound SMS", err);
    }
  }
}

export interface InboundMessage {
  id?: string;
  from: string;
  to?: string;
  tenantId?: string;
  body?: string;
  channel?: "sms" | "voice" | "chat";
}

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ASSETS: R2Bucket;
  AI: any;
  AI_MODEL_WHISPER: string;
  AI_MODEL_EMBEDDING: string;
  VECTORIZE: any;
  SMS_INBOUND_PRODUCER: Queue;
  SMS_OUTBOUND: Queue;
}
