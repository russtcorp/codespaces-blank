import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { menuItemInteractions } from "@diner-saas/db";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as any;
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { tenantId, itemId, interactionType } = await request.json();

  if (!tenantId || !itemId || !interactionType) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = drizzle(env.DB);
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
