import { executeCommand } from "./handlers/commands";
import type { InboundMessage } from "@diner-saas/ai";

interface Env {
  DB: D1Database;
  VECTORIZE: any;
  AI: any;
  MARKETING_BROADCAST: Queue;
}

export class DinerAgent implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private tenantId: string;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    // Extract tenantId from the Durable Object ID
    this.tenantId = state.id.toString();
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
    });
  }
}
