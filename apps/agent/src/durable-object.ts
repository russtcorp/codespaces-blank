import { Agent } from "agents";
import { streamText } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { SYSTEM_PROMPTS } from "@diner-saas/ai";
import type { OtpRecord } from "./utils/twilio";
import { handleInboundCommand } from "./handlers/commands";
import type { InboundMessage, ChatMessage } from "@diner-saas/ai";

interface StoredState {
  messages: ChatMessage[];
  otp?: OtpRecord & { userId: string };
}

/**
 * DinerAgent Durable Object
 * Maintains per-tenant state (chat history, OTP challenges)
 * Built using Cloudflare Agents SDK
 */
export class DinerAgent extends Agent<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

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

    if (url.pathname === "/history" && request.method === "GET") {
      const state = await this.loadState();
      return new Response(JSON.stringify(state.messages), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/chat" && request.method === "POST") {
      const body = (await request.json()) as InboundMessage;
      body.channel = body.channel || "chat";
      await this.handleInbound(body);
      return new Response("ok", { status: 200 });
    }

    if (url.pathname === "/stream-chat" && request.method === "POST") {
      const { messages } = (await request.json()) as { messages: any[] };

      // Save user message to history
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg && lastUserMsg.role === "user") {
        await this.saveMessage({
          id: crypto.randomUUID(),
          from: "dashboard",
          body: lastUserMsg.content,
          channel: "chat",
          timestamp: new Date().toISOString(),
        });
      }

      const workersAI = createWorkersAI({ binding: this.env.AI });

      const result = await streamText({
        model: workersAI("@cf/meta/llama-3-8b-instruct"),
        system: SYSTEM_PROMPTS.dinerAgent("Your Diner", "555-0199"),
        messages,
        onFinish: async ({ text }) => {
          await this.saveMessage({
            id: crypto.randomUUID(),
            from: "agent",
            body: text,
            channel: "chat",
            timestamp: new Date().toISOString(),
          });
        },
      });

      return result.toDataStreamResponse();
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

      state.messages.push(stored);
      if (state.messages.length > 50) state.messages = state.messages.slice(-50);
      await this.saveState(state);

      const otpResult = await this.handleOtpIfPresent(state, message);
      if (otpResult.handled) return;

      const result = await handleInboundCommand(this.env, message);
      if (result.response) {
        const responseMsg: ChatMessage = {
          id: crypto.randomUUID(),
          from: "agent",
          body: result.response,
          timestamp: new Date().toISOString(),
          channel: "chat",
        };
        state.messages.push(responseMsg);
        if (state.messages.length > 50) state.messages = state.messages.slice(-50);
        await this.saveState(state);

        if (message.from && message.channel === "sms") {
          await this.sendSms(message.from, result.response);
        }
      }
    });
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
    const state = await this.loadState();
    if (!state.otp) return false;
    if (state.otp.userId !== userId) return false;
    if (Date.now() > state.otp.expiresAt) return false;
    if (state.otp.code !== code) return false;
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

  private async saveMessage(msg: ChatMessage) {
    await this.state.blockConcurrencyWhile(async () => {
      const state = await this.loadState();
      state.messages.push(msg);
      if (state.messages.length > 50) state.messages = state.messages.slice(-50);
      await this.saveState(state);
    });
  }

  private async handleOtpIfPresent(state: StoredState, message: InboundMessage) {
    const body = (message.body || "").trim();
    if (!state.otp) return { handled: false };
    if (Date.now() > state.otp.expiresAt) {
      state.otp = undefined;
      await this.saveState(state);
      await this.sendSms(
        message.from,
        "Your previous verification code expired. Reply with the new code when prompted."
      );
      return { handled: true };
    }
    if (body === state.otp.code && state.otp.userId === message.from) {
      state.otp = undefined;
      await this.saveState(state);
      await this.sendSms(
        message.from,
        "Verification successful. Proceeding with your request."
      );
      return { handled: true };
    }
    await this.sendSms(
      message.from,
      "That code didn’t match. Please re-enter the verification code we sent."
    );
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