/**
 * Cloudflare Workers environment bindings
 */
export interface Env {
  DB: D1Database;
  AI: any; // Workers AI binding
  DINER_AGENT: DurableObjectNamespace;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
}

/**
 * Main Worker entry point
 * Routes requests to appropriate handlers
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // Twilio SMS webhook
    if (url.pathname === '/api/twilio/sms') {
      return handleTwilioWebhook(request, env);
    }

    // Web chat endpoint
    if (url.pathname === '/api/chat') {
      return handleWebChat(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

/**
 * Handle incoming SMS from Twilio
 */
async function handleTwilioWebhook(request: Request, env: Env): Promise<Response> {
  // TODO: Validate Twilio signature
  // TODO: Parse SMS body
  // TODO: Get or create Durable Object for this phone number
  // TODO: Forward to agent

  return new Response('SMS received', { status: 200 });
}

/**
 * Handle web chat messages
 */
async function handleWebChat(request: Request, env: Env): Promise<Response> {
  // TODO: Authenticate user session
  // TODO: Get tenant ID from session
  // TODO: Get or create Durable Object for this tenant
  // TODO: Stream response

  return new Response('Chat endpoint', { status: 200 });
}

/**
 * The DinerAgent Durable Object
 * Maintains state for SMS and web chat conversations
 */
export class DinerAgent implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  /**
   * Handle incoming requests to this Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Get conversation history
    if (url.pathname === '/history') {
      const history = (await this.state.storage.get<string[]>('history')) || [];
      return Response.json({ history });
    }

    // Add message to conversation
    if (url.pathname === '/message' && request.method === 'POST') {
      const { message } = await request.json();
      const history = (await this.state.storage.get<string[]>('history')) || [];
      history.push(message);
      await this.state.storage.put('history', history);
      return Response.json({ success: true });
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * Handle alarms (scheduled operations)
   * Used for context timeouts and cleanup
   */
  async alarm(): Promise<void> {
    // TODO: Clear old conversation history after 30 minutes
    console.log('Alarm triggered - clearing context');
  }
}
