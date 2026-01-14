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
    const state = await this.loadState();
    const stored: ChatMessage = {
      id: message.id ?? crypto.randomUUID(),
      from: message.from,
      body: message.body ?? "",
      timestamp: new Date().toISOString(),
      channel: message.channel ?? "sms",
    };

    state.messages.push(stored);
    await this.saveState(state);

    // Process OTP verification first
    const otpResult = await this.handleOtpIfPresent(state, message);
    if (otpResult.handled) return;

    // Handle commands / intent
    const response = await this.handleCommand(message);
    if (response) {
      await this.sendSms(message.from, response);
    }

    // Execute command/logic and enqueue outbound if needed
    const result = await handleInboundCommand(this.env, message);
    if (result.response && message.from) {
      await this.env.SMS_OUTBOUND.send({ to: message.from, body: result.response });
    }
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

  private async handleCommand(message: InboundMessage): Promise<string | null> {
    const text = (message.body || "").trim();
    if (!text) return null;
    const lower = text.toLowerCase();

    // Refuse order-taking per system prompt
    if (/(order|pickup|delivery)/i.test(text)) {
      return "I’m here to manage the site, not take orders. Please call the diner directly.";
    }

    // High-risk actions require OTP
    if (/delete site|change bank|change payout|a2p|2fa/i.test(lower)) {
      const otp = await this.startOtp(message.from, 300);
      await this.sendSms(message.from, `Security check: enter code ${otp.code} to proceed.`);
      return null;
    }

    // 86 item
    const outMatch = lower.match(/(?:86|out of)\s+(.+)/);
    if (outMatch) {
      const term = outMatch[1].trim();
      if (term) {
        await this.softDisableItem(message.to, term);
        return `Got it. Marked ${term} as unavailable.`;
      }
    }

    // Open late until HH:MM
    const openMatch = lower.match(/open (?:late )?until\s+(\d{1,2}:?\d{0,2}\s*(?:am|pm)?)/);
    if (openMatch) {
      const rawTime = openMatch[1] ?? "";
      const time = rawTime.replace(/\s+/g, "");
      if (time) {
        await this.updateTodayClosing(message.to, time);
        return `Updated today’s closing time to ${time}.`;
      }
    }

    // Spicy / recommendations -> Vectorize lookup
    if (/(spicy|recommend|special)/i.test(text)) {
      const rec = await this.semanticRecommend(message.to, text);
      if (rec) return rec;
    }

    return "Message received. If you need to 86 an item, say ‘86 <item>’.";
  }

  private async softDisableItem(to: string | undefined, term: string) {
    if (!to) return;
    try {
      await this.env.DB.prepare(
        "UPDATE menu_items SET is_available = 0 WHERE tenant_id = ? AND name LIKE ? LIMIT 1"
      )
        .bind(this.tenantIdFrom(to), `%${term}%`)
        .run();
    } catch (err) {
      console.error("Failed to 86 item", err);
    }
  }

  private async updateTodayClosing(to: string | undefined, time: string) {
    if (!to) return;
    const tenant = this.tenantIdFrom(to);
    const now = new Date();
    const day = now.getDay();
    try {
      await this.env.DB.prepare(
        "UPDATE operating_hours SET end_time = ? WHERE tenant_id = ? AND day_of_week = ?"
      )
        .bind(time, tenant, day)
        .run();
    } catch (err) {
      console.error("Failed to update hours", err);
    }
  }

  private async semanticRecommend(to: string | undefined, query: string): Promise<string | null> {
    if (!to) return null;
    const env: any = this.env;
    if (!env?.VECTORIZE || !env?.AI || !env?.AI_MODEL_EMBEDDING) return null;
    try {
      const embeddingResult = await env.AI.run(env.AI_MODEL_EMBEDDING, { text: query });
      const vector = embeddingResult?.data?.[0]?.embedding || embeddingResult?.embedding || embeddingResult;
      if (!vector) return null;
      const result = await env.VECTORIZE.query({ topK: 3, vector, includeMetadata: true });
      const items = result?.matches
        ?.map((m: any) => m?.metadata?.name || m?.value?.name)
        .filter(Boolean) || [];
      if (items.length === 0) return null;
      return `You might like: ${items.slice(0, 3).join(", ")}.`;
    } catch (err) {
      console.error("Vectorize recommend failed", err);
      return null;
    }
  }

  private tenantIdFrom(to: string): string {
    // Use the destination number as a tenant key in this phase; can be replaced with host->tenant mapping
    return to || "default-dev-tenant";
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
  R2_ASSETS: R2Bucket;
  AI: any;
  AI_MODEL_WHISPER: string;
  AI_MODEL_EMBEDDING: string;
  VECTORIZE: any;
  SMS_INBOUND_PRODUCER: Queue;
  SMS_OUTBOUND: Queue;
}
