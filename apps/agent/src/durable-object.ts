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
    // Prevent race conditions during state updates
    await this.state.blockConcurrencyWhile(async () => {
      const state = await this.loadState();
      const stored: ChatMessage = {
        id: message.id ?? crypto.randomUUID(),
        from: message.from,
        body: message.body ?? "",
        timestamp: new Date().toISOString(),
        channel: message.channel ?? "sms",
      };

      state.messages.push(stored);
      
      // Performance: Truncate history to last 50 messages
      if (state.messages.length > 50) {
        state.messages = state.messages.slice(-50);
      }
      
      await this.saveState(state);

      // Process OTP verification first
      const otpResult = await this.handleOtpIfPresent(state, message);
      if (otpResult.handled) return;

      // Handle commands / intent via shared handler
      // This unifies logic with the rest of the system
      const result = await handleInboundCommand(this.env, message);
      if (result.response && message.from) {
        await this.sendSms(message.from, result.response);
      }
    });
  }

  async startOtp(userId: string, ttlSeconds = 300): Promise<OtpRecord> {
    const code = this.generateOtp();
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const state = await this.loadState();
    state.otp = { code, expiresAt, userId };
    await this.saveState(state);
    return { code, expiresAt };
  }

  async verifyOtp(userId: string, code: string): Promise<boolean> {
    const state = await this.loadState();
    if (!state.otp) return false;
    if (state.otp.userId !== userId) return false;
    if (Date.now() > state.otp.expiresAt) return false;
    if (state.otp.code !== code) return false;
    // Clear after verification
    state.otp = undefined;
    await this.saveState(state);
    return true;
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

  private async handleOtpIfPresent(state: StoredState, message: InboundMessage) {
    const body = (message.body || "").trim();
    if (!state.otp) return { handled: false };
    if (Date.now() > state.otp.expiresAt) {
      state.otp = undefined;
      await this.saveState(state);
      await this.sendSms(message.from, "Your previous verification code expired. Reply with the new code when prompted.");
      return { handled: true };
    }
    if (body === state.otp.code && state.otp.userId === message.from) {
      state.otp = undefined;
      await this.saveState(state);
      await this.sendSms(message.from, "Verification successful. Proceeding with your request.");
      return { handled: true };
    }
    await this.sendSms(message.from, "That code didn’t match. Please re-enter the verification code we sent.");
    return { handled: true };
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
