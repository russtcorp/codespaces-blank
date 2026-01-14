import { type Env } from "../index";

/**
 * Vision AI Handler (Llama 3 Vision Stub)
 * 
 * Receives image blobs via POST and returns JSON description of food items.
 * 
 * POST /vision
 * Body: image/* (image file)
 * Response: { description: string, items: string[] }
 */
export async function handleVision(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Get image blob from request
    const imageBlob = await request.blob();

    if (!imageBlob || imageBlob.size === 0) {
      return Response.json({ error: "No image data provided" }, { status: 400 });
    }

    // Convert to base64 for Workers AI
    const imageBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(
      String.fromCharCode(...new Uint8Array(imageBuffer))
    );

    // Use Workers AI Llama 3 Vision (or similar multimodal model)
    const analysis = await env.AI.run("@cf/llava-hf/llava-1.5-7b-hf", {
      image: base64Image,
      prompt: "Analyze this food image. List all visible menu items with descriptions. Format as JSON with 'description' and 'items' array.",
      max_tokens: 512,
    });

    // Parse AI response
    let description = "";
    let items: string[] = [];

    try {
      // Try to extract JSON from response
      const responseText = analysis.response || analysis.description || "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        description = parsed.description || responseText;
        items = parsed.items || [];
      } else {
        // Fallback: treat entire response as description
        description = responseText;
        
        // Try to extract item names from text
        const lines = responseText.split("\n");
        items = lines
          .filter((line: string) => line.trim().length > 0 && !line.includes("JSON"))
          .map((line: string) => line.trim());
      }
    } catch (parseError) {
      console.error("Failed to parse Vision AI response:", parseError);
      description = String(analysis);
    }

    return Response.json({
      description,
      items,
      raw: analysis,
    });
  } catch (error) {
    console.error("Vision analysis error:", error);
    return Response.json(
      { error: "Vision analysis failed", details: String(error) },
      { status: 500 }
    );
  }
}
