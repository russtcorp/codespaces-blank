import { drizzle } from "drizzle-orm/d1";
import { socialPosts } from "@diner-saas/db";
import { and, eq } from "drizzle-orm";

export interface SocialSyncMessage {
  tenantId: string;
  platform: "instagram" | "facebook";
}

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  INSTAGRAM_CLIENT_ID: string;
  INSTAGRAM_CLIENT_SECRET: string;
}

export async function handleSocialSync(
  batch: MessageBatch<SocialSyncMessage>,
  env: Env
) {
  for (const msg of batch.messages) {
    const { tenantId, platform } = msg.body;

    if (platform === "instagram") {
      try {
        await syncInstagram(tenantId, env);
        msg.ack();
      } catch (error) {
        console.error(`Instagram sync failed for ${tenantId}:`, error);
        msg.retry();
      }
    }
  }
}

async function syncInstagram(tenantId: string, env: Env) {
  console.log(`Syncing Instagram for tenant ${tenantId}...`);
  const db = drizzle(env.DB);
  
  // 1. Fetch Instagram access token from KV
  const tokenKey = `instagram_token:${tenantId}`;
  const tokenDataStr = await env.KV.get(tokenKey);
  
  if (!tokenDataStr) {
    console.log(`No Instagram token found for ${tenantId}`);
    return;
  }

  let tokenData;
  try {
    tokenData = JSON.parse(tokenDataStr);
  } catch (e) {
    // Legacy plain string token?
    tokenData = { access_token: tokenDataStr };
  }

  // Refresh token if needed (Long-lived tokens last 60 days)
  // Logic: If expires_in < 7 days, refresh.
  // Assuming tokenData has 'expires_at' or we just try refreshing every time (not ideal for rate limits but okay for MVP)
  // For MVP, we'll skip complex refresh logic and assume the token is valid or refreshed by the frontend auth flow.

  // 2. Fetch latest media from Instagram Graph API
  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
  const url = `https://graph.instagram.com/me/media?fields=${fields}&access_token=${tokenData.access_token}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Instagram API error: ${response.statusText}`);
  }

  const data: any = await response.json();
  const mediaItems = data.data || [];

  console.log(`Found ${mediaItems.length} media items`);

  // 3. Save to DB
  let newCount = 0;
  for (const item of mediaItems) {
    // Check if exists
    const existing = await db.select().from(socialPosts).where(
      and(
        eq(socialPosts.tenantId, tenantId),
        eq(socialPosts.externalId, item.id)
      )
    ).get();

    if (!existing) {
      await db.insert(socialPosts).values({
        id: crypto.randomUUID(),
        tenantId,
        platform: "instagram",
        externalId: item.id,
        caption: item.caption,
        mediaUrl: item.media_url,
        permalink: item.permalink,
        thumbnailUrl: item.thumbnail_url || item.media_url, // Video thumbnails might differ
        postedAt: item.timestamp,
      }).run();
      newCount++;
    }
  }
  
  console.log(`Synced ${newCount} new posts for ${tenantId}`);
}
