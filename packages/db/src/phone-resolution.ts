import { createDb } from "./index";
import { businessSettings } from "./schema";
import { eq } from "drizzle-orm";

export async function resolveTenantByPhone(
  phoneNumber: string,
  env: any
): Promise<string | null> {
  // 1. Check KV Cache (Fast Path)
  // Format: phone:to:tenant:{number}
  const cacheKey = `phone:to:tenant:${phoneNumber}`;
  if (env.KV) {
    const cached = await env.KV.get(cacheKey);
    if (cached) return cached;
  }

  // 2. Query D1 (Authoritative)
  const db = createDb(env.DB);
  
  // Note: This assumes `business_settings` has a `phone_public` or we add a specific `twilio_phone_number`
  // For now, we'll query against `phone_public` but in production this should be a dedicated mapping table
  // or column if different from public display number.
  const record = await db
    .select({ tenantId: businessSettings.tenantId })
    .from(businessSettings)
    .where(eq(businessSettings.phonePublic, phoneNumber))
    .get();

  if (record?.tenantId) {
    // Cache for 1 hour
    if (env.KV) {
      await env.KV.put(cacheKey, record.tenantId, { expirationTtl: 3600 });
    }
    return record.tenantId;
  }

  return null;
}
