import { drizzle } from "drizzle-orm/d1";
import { tenants } from "@diner-saas/db";

interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

interface TokenData {
  access_token: string;
  expires_at?: number; // Unix timestamp for expiry
}

export async function handleInstagramTokenRefresh(env: Env) {
  const db = drizzle(env.DB);
  const allTenants = await db.select({ id: tenants.id }).from(tenants).all();
  let refreshedCount = 0;

  for (const tenant of allTenants) {
    const tokenKey = `instagram_token:${tenant.id}`;
    const tokenDataStr = await env.KV.get(tokenKey);

    if (!tokenDataStr) continue;

    try {
      const tokenData: TokenData = JSON.parse(tokenDataStr);
      
      // Refresh if expires_at is within 7 days or doesn't exist (legacy token)
      const sevenDaysFromNow = Date.now() / 1000 + 7 * 24 * 60 * 60;
      if (!tokenData.expires_at || tokenData.expires_at < sevenDaysFromNow) {
        
        console.log(`Refreshing Instagram token for tenant ${tenant.id}...`);
        
        const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${tokenData.access_token}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to refresh token: ${await response.text()}`);
        }

        const refreshedData = await response.json<{ access_token: string; expires_in: number }>();
        
        const newExpiry = Date.now() / 1000 + refreshedData.expires_in;
        const newTokenData: TokenData = {
          access_token: refreshedData.access_token,
          expires_at: newExpiry
        };

        await env.KV.put(tokenKey, JSON.stringify(newTokenData));
        refreshedCount++;
      }
    } catch (error) {
      console.error(`Error refreshing token for tenant ${tenant.id}:`, error);
    }
  }

  console.log(`Successfully refreshed ${refreshedCount} Instagram tokens.`);
  return { refreshedCount };
}
