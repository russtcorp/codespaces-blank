import { type ActionFunctionArgs, json } from "@remix-run/cloudflare";
import { getAuthenticator } from "~/services/auth.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const authenticator = getAuthenticator(env);
  const user = await authenticator.isAuthenticated(request);

  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  
  // Proxy to Agent Worker
  try {
    const response = await env.AGENT_DO.fetch("https://agent.internal/api/voice/transcribe", {
      method: "POST",
      body: formData, // Forward the multipart form data directly
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const data = await response.json();
    return json(data);
  } catch (e) {
    console.error("Transcribe proxy failed", e);
    return json({ error: "Transcription failed" }, { status: 500 });
  }
}
