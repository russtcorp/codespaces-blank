import { verifyTwilioSignature, parseFormBody } from "./utils/twilio";
import { DinerAgent } from "./durable-object";
import type { InboundMessage } from "@diner-saas/ai";
import { handleVoice as handleVoiceAI } from "./handlers/voice";
import { handleVision } from "./handlers/vision";
import { resolveTenantByPhone } from "@diner-saas/db";

export { DinerAgent };

export interface Env {
  AGENT_DO: DurableObjectNamespace;
  SMS_INBOUND: Queue;
  SMS_INBOUND_PRODUCER: Queue;
  SMS_OUTBOUND: Queue;
  AI: any;
  AI_MODEL_WHISPER: string;
  AI_MODEL_EMBEDDING: string;
  VECTORIZE: any;
  TWILIO_AUTH_TOKEN: string;
  DB: D1Database; // Added for tenant resolution
  KV: KVNamespace; // Added for tenant resolution cache
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Twilio SMS Webhook
    if (url.pathname === "/sms" && request.method === "POST") {
      return handleSms(request, env);
    }

    // Twilio Voice Webhook
    if (url.pathname === "/voice" && request.method === "POST") {
      return handleVoice(request, env);
    }

    // Voice AI (Whisper) - Direct audio transcription
    if (url.pathname === "/api/voice" && request.method === "POST") {
      return handleVoiceAI(request, env);
    }

    // Vision AI (Llama Vision) - Image analysis
    if (url.pathname === "/api/vision" && request.method === "POST") {
      return handleVision(request, env);
    }

    // Agent History API (for Dashboard)
    if (url.pathname === "/api/history" && request.method === "GET") {
      const tenantId = url.searchParams.get("tenantId");
      if (!tenantId) return new Response("Missing tenantId", { status: 400 });
      const id = env.AGENT_DO.idFromName(tenantId);
      const stub = env.AGENT_DO.get(id);
      return stub.fetch("https://agent.internal/history");
    }

    // Agent Chat API (for Dashboard)
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const body = await request.json() as any;
      const tenantId = body.tenantId || "default-tenant"; 
      
      const id = env.AGENT_DO.idFromName(tenantId);
      const stub = env.AGENT_DO.get(id);
      
      return stub.fetch("https://agent.internal/stream-chat", {
        method: "POST",
        body: JSON.stringify(body),
      });
    }

    // Web Voice Transcription (Dashboard)
    if (url.pathname === "/api/voice/transcribe" && request.method === "POST") {
      const formData = await request.formData();
      const audioFile = formData.get("file");

      if (!audioFile) {
        return new Response("No audio file provided", { status: 400 });
      }

      try {
        const blob = await (audioFile as File).arrayBuffer();
        const input = {
          audio: [...new Uint8Array(blob)],
        };
        const response = await env.AI.run("@cf/openai/whisper", input);
        return new Response(JSON.stringify({ text: response.text }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("Transcription failed", e);
        return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },

  async queue(batch: MessageBatch<InboundMessage>, env: Env) {
    for (const msg of batch.messages) {
      await dispatchToAgent(env, msg.body);
    }
  },
};

async function handleSms(request: Request, env: Env): Promise<Response> {
  const params = await parseFormBody(request);
  const signature = request.headers.get("x-twilio-signature");
  const valid = await verifyTwilioSignature(
    env.TWILIO_AUTH_TOKEN,
    signature,
    new URL(request.url).origin + new URL(request.url).pathname,
    params
  );

  if (!valid) {
    return new Response("Invalid signature", { status: 403 });
  }

  // Resolve tenant from the "To" phone number (the diner's Twilio number)
  const tenantId = await resolveTenantByPhone(params.To || "", env) || "default-tenant";

  const payload: InboundMessage = {
    from: params.From || "",
    to: params.To || "",
    tenantId,
    body: params.Body || "",
    channel: "sms",
  };

  // enqueue for processing
  await env.SMS_INBOUND_PRODUCER.send(payload);

  // Twilio expects TwiML response
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Got it! We’ll process your request.</Message></Response>`;
  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}

async function handleVoice(request: Request, env: Env): Promise<Response> {
  const params = await parseFormBody(request);
  const signature = request.headers.get("x-twilio-signature");
  const valid = await verifyTwilioSignature(
    env.TWILIO_AUTH_TOKEN,
    signature,
    new URL(request.url).origin + new URL(request.url).pathname,
    params
  );
  if (!valid) {
    return new Response("Invalid signature", { status: 403 });
  }

  // Optional Whisper transcription if RecordingUrl provided
  let transcript = "";
  if (params.RecordingUrl) {
    try {
      const audioResp = await fetch(params.RecordingUrl);
      const audioBuffer = await audioResp.arrayBuffer();
      const result = await env.AI.run(env.AI_MODEL_WHISPER, {
        audio: [...new Uint8Array(audioBuffer)],
      });
      transcript = result?.text || "";
    } catch (err) {
      console.error("Whisper transcription failed", err);
    }
  }

  const payload: InboundMessage = {
    from: params.From || "",
    to: params.To || "",
    tenantId: params.To || "default-tenant",
    body: transcript || "Voice message received",
    channel: "voice",
  };

  await env.SMS_INBOUND_PRODUCER.send(payload);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thanks, we received your message.</Say></Response>`;
  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}

async function dispatchToAgent(env: Env, message?: InboundMessage) {
  if (!message) return;
  const tenantKey = message.tenantId || message.to || "default-tenant";
  const id = env.AGENT_DO.idFromName(tenantKey);
  const stub = env.AGENT_DO.get(id);
  await stub.fetch("https://agent.internal/ingest", {
    method: "POST",
    body: JSON.stringify(message),
  });
}
