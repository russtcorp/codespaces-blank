import { type Env } from "../index";

/**
 * Voice AI Handler (Whisper Stub)
 * 
 * Receives audio blobs via POST and returns transcribed text.
 * 
 * POST /voice
 * Body: audio/* (audio file)
 * Response: { text: string }
 */
export async function handleVoice(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Get audio blob from request
    const audioBlob = await request.blob();

    if (!audioBlob || audioBlob.size === 0) {
      return Response.json({ error: "No audio data provided" }, { status: 400 });
    }

    // Convert to appropriate format for Workers AI
    const audioBuffer = await audioBlob.arrayBuffer();

    // Use Workers AI Whisper model
    const transcription = await env.AI.run("@cf/openai/whisper", {
      audio: Array.from(new Uint8Array(audioBuffer)),
    });

    return Response.json({
      text: transcription.text || "",
      language: transcription.language || "en",
    });
  } catch (error) {
    console.error("Voice transcription error:", error);
    return Response.json(
      { error: "Transcription failed", details: String(error) },
      { status: 500 }
    );
  }
}
