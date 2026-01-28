import { type ActionFunctionArgs } from "@remix-run/cloudflare";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await request.json();
  const { messages, tenantId } = body as { messages: any[], tenantId: string };

  if (!tenantId) {
    return new Response("Missing tenantId", { status: 400 });
  }

  const id = env.AGENT_DO.idFromName(tenantId);
  const stub = env.AGENT_DO.get(id);

  // Call the stream-chat endpoint which uses result.toDataStreamResponse()
  const response = await stub.fetch("https://agent.internal/stream-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, tenantId }),
  });

  return response;
}