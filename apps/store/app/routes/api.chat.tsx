import { streamText } from 'ai';
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { getAuthenticator } from '~/services/auth.server';

export const runtime = 'edge';

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as any;
  const authenticator = getAuthenticator(env);
  const user = await authenticator.isAuthenticated(request);

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  const { messages } = await request.json();

  // Get a stub for the DinerAgent Durable Object
  const id = env.AGENT_DO.idFromName(user.tenantId);
  const stub = env.AGENT_DO.get(id);

  // Forward the request to the Durable Object's /chat endpoint
  const response = await stub.fetch("http://agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  // The DO will return a streaming response, which we can directly return
  // The `ai` library's `streamText` is not strictly needed here if the DO
  // already returns a compliant stream, but it's a good practice for ensuring
  // compatibility and handling potential transformations.
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
