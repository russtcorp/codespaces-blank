import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { menuItemInteractions } from "@diner-saas/db";
import { createHostnameCache } from "@diner-saas/db";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as any;
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // Derive tenantId from hostname instead of accepting from client
  const url = new URL(request.url);
  const host = url.hostname;
  
  // Resolve tenant from hostname
  let tenantId: string | null = null;
  if (!env.KV) {
    return json({ error: "KV namespace not configured" }, { status: 500 });
  }
  
  const db = drizzle(env.DB);
  const hostnameCache = createHostnameCache(env.KV, db);
  tenantId = await hostnameCache.getTenantId(host);
  
  if (!tenantId) {
    return json({ error: "Invalid tenant" }, { status: 400 });
  }

  const { itemId, interactionType } = await request.json();

  if (!itemId || !interactionType) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await db.insert(menuItemInteractions).values({
      tenantId,
      itemId,
      interactionType,
    }).run();
    return json({ success: true }, { status: 201 });
  } catch (error) {
    logger.error("Failed to track interaction:", error);
    return json({ error: "Could not track interaction" }, { status: 500 });
  }
}
