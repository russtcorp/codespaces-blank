// ... (imports)

export class DinerAgent implements DurableObject {
  // ... (constructor, state, etc.)

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/sms" || url.pathname === "/voice") {
        return this.handleSmsVoice(request);
    }
    if (url.pathname === "/chat") {
        return this.handleChat(request);
    }
    return new Response("Not found", { status: 404 });
  }

  async handleSmsVoice(request: Request): Promise<Response> {
    // ... existing logic for handling Twilio webhooks
  }
  
  async handleChat(request: Request): Promise<Response> {
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
        logger.error("Error executing command via chat:", error);
        return new Response("Error processing your request.", { status: 500 });
    }
  }
}
