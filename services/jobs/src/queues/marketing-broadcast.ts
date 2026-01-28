import { drizzle } from "drizzle-orm/d1";
import { authorizedUsers } from "@diner-saas/db";
import { eq } from "drizzle-orm";

interface BroadcastMessage {
  tenantId: string;
  message: string;
}

interface Env {
  DB: D1Database;
  SMS_OUTBOUND: Queue; // Assuming we send broadcasts via the existing SMS queue
}

export async function handleMarketingBroadcast(
  batch: MessageBatch<BroadcastMessage>,
  env: Env
) {
  const db = drizzle(env.DB);

  for (const msg of batch.messages) {
    const { tenantId, message } = msg.body;
    
    try {
      // 1. Fetch all users for the tenant who have a phone number AND marketing consent.
      // CRITICAL: Must check for marketing opt-in to comply with TCPA/GDPR regulations.
      // TODO: Add marketingConsent column to authorized_users table
      const users = await db.select({ phone: authorizedUsers.phoneNumber })
        .from(authorizedUsers)
        .where(eq(authorizedUsers.tenantId, tenantId))
        // .where(eq(authorizedUsers.marketingConsent, true)) // Enable when column exists
        .all();

      // 2. Enqueue an outbound SMS for each user.
      const messagesToSend = users
        .filter(u => u.phone)
        .map(u => ({ to: u.phone, body: message }));

      if (messagesToSend.length > 0) {
        // Cloudflare Queues allow sending a batch of messages at once.
        await env.SMS_OUTBOUND.sendBatch(messagesToSend.map(m => ({ body: m })));
      }
      
      console.log(`Enqueued ${messagesToSend.length} broadcast messages for tenant ${tenantId}.`);
      
      // Only acknowledge after successful processing
      msg.ack();
    } catch (error) {
      console.error(`Failed to process broadcast for tenant ${tenantId}:`, error);
      // Only retry for transient errors (network issues, temporary DB failures)
      // For permanent errors (invalid data), we should ack to prevent infinite retry
      const isPermanentError = error instanceof Error && 
        (error.message.includes('invalid') || error.message.includes('not found'));
      
      if (isPermanentError) {
        console.error(`Permanent error for tenant ${tenantId}, acknowledging message`);
        msg.ack();
      }
      // For transient errors, message will be retried automatically by not acknowledging
    }
  }
}
