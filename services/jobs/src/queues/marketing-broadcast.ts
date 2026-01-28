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
    
    // 1. Fetch all users for the tenant who have a phone number.
    // In a real app, this would check for marketing opt-ins.
    const users = await db.select({ phone: authorizedUsers.phoneNumber })
      .from(authorizedUsers)
      .where(eq(authorizedUsers.tenantId, tenantId))
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
    msg.ack();
  }
}
