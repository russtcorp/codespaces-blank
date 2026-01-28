import { executeCommand } from "./handlers/commands";

interface Env {
  DB: D1Database;
  VECTORIZE: any;
  AI: any;
  MARKETING_BROADCAST: Queue;
import { Agent } from "agents";
import { streamText } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { SYSTEM_PROMPTS } from "@diner-saas/ai";
import type { OtpRecord } from "./utils/twilio";
import { handleInboundCommand } from "./handlers/commands";
import type { InboundMessage, ChatMessage } from "@diner-saas/ai";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@diner-saas/db/schema";

interface StoredState {
  messages: ChatMessage[];
  otp?: OtpRecord & { userId: string };
  tenantInfo?: {
    businessName: string;
    phonePublic: string;
    cachedAt: number;
  };
}

export class DinerAgent implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private tenantId: string;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    // Extract tenantId from the Durable Object ID name
    // The DO is created via idFromName(tenantId), so we can extract it
    this.tenantId = state.id.name || "default-tenant";
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === "/ingest") {
      return this.handleIngest(request);
    }
    if (url.pathname === "/stream-chat") {
      return this.handleStreamChat(request);
    }
    if (url.pathname === "/history") {
      return this.handleHistory(request);
    }
    
    return new Response("Not found", { status: 404 });

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

      // Get dynamic tenant information for system prompt
      const tenantInfo = await this.getTenantInfo();

      const workersAI = createWorkersAI({ binding: this.env.AI });

      const result = await streamText({
        model: workersAI("@cf/meta/llama-3-8b-instruct"),
        system: SYSTEM_PROMPTS.dinerAgent(tenantInfo.businessName, tenantInfo.phonePublic),
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

  async handleIngest(request: Request): Promise<Response> {
    const message: InboundMessage = await request.json();
    // Store the message and process it
    // ... existing logic for handling Twilio webhooks
    return new Response("OK", { status: 200 });
  }
  
  async handleStreamChat(request: Request): Promise<Response> {
    const { messages } = await request.json();
    const lastMessage = messages[messages.length - 1]?.content;

    if (!lastMessage) {
        return new Response("No message content", { status: 400 });
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
      if (currentState.messages.length > 50) currentState.messages = currentState.messages.slice(-50);
      await this.saveState(currentState);

      const otpResult = await this.handleOtpIfPresent(currentState, message);
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
        currentState.messages.push(responseMsg);
        if (currentState.messages.length > 50) currentState.messages = currentState.messages.slice(-50);
        await this.saveState(currentState);

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

    try {
        const stream = await executeCommand(
            this.env.DB,
            this.env.VECTORIZE,
            this.env.AI,
            { marketingBroadcast: this.env.MARKETING_BROADCAST },
            this.tenantId,
            lastMessage
        );
        return new Response(stream.body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    } catch (error) {
        console.error("Error executing command via chat:", error);
        return new Response("Error processing your request.", { status: 500 });
    }
  }
  
  async handleHistory(request: Request): Promise<Response> {
    // Return conversation history
    // ... implementation
    return new Response(JSON.stringify({ history: [] }), {
      headers: { 'Content-Type': 'application/json' }

  /**
   * Get tenant information (business name and phone number) for system prompt.
   * Caches the result in durable object storage to avoid repeated DB queries.
   */
  private async getTenantInfo(): Promise<{ businessName: string; phonePublic: string }> {
    const CACHE_TTL_MS = 3600000; // 1 hour cache

    return await this.state.blockConcurrencyWhile(async () => {
      const state = await this.loadState();
      
      // Return cached value if still fresh
      if (state.tenantInfo && Date.now() - state.tenantInfo.cachedAt < CACHE_TTL_MS) {
        return {
          businessName: state.tenantInfo.businessName,
          phonePublic: state.tenantInfo.phonePublic,
        };
      }

      // Fetch fresh data from database
      const tenantId = this.state.id.name; // Tenant ID is the Durable Object name
      const db = drizzle(this.env.DB, { schema });
      
      let businessName = "Your Diner";
      let phonePublic = "555-0199";

      try {
        // Fetch tenant name
        const tenant = await db.query.tenants.findFirst({
          where: eq(schema.tenants.id, tenantId),
        });

        // Fetch business settings for phone number
        const settings = await db.query.businessSettings.findFirst({
          where: eq(schema.businessSettings.tenantId, tenantId),
        });

        businessName = tenant?.businessName || businessName;
        phonePublic = settings?.phonePublic || phonePublic;
      } catch (err) {
        console.error("Failed to fetch tenant info, using defaults", err);
        // Continue with defaults - they will be cached below
      }

      // Cache the result (including defaults if fetch failed)
      state.tenantInfo = {
        businessName,
        phonePublic,
        cachedAt: Date.now(),
      };
      await this.saveState(state);

      return { businessName, phonePublic };
    });
  }
}
