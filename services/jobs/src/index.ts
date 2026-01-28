import { handleUsageAlertsCron } from "./usage-alerts";
import { handleVectorizeSync } from "./queues/vectorize-sync";
import { handleSocialSync } from "./queues/social-sync";
import { handleEmailQueue } from "./queues/email-queue";
import { handleInstagramTokenRefresh } from "./instagram-refresh";
import { handleMarketingBroadcast } from "./queues/marketing-broadcast";

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  SMS_OUTBOUND: Queue;
  EMAIL_QUEUE: Queue;
  MARKETING_BROADCAST: Queue;
  // ... other bindings
}

export default {
  // ... (fetch and scheduled handlers)

  async queue(batch: MessageBatch, env: Env) {
    switch (batch.queue) {
      case "sms-outbound":
        // ...
        break;
      case "vectorize-sync":
        await handleVectorizeSync(batch as MessageBatch<any>, env);
        break;
      case "social-media-sync":
        await handleSocialSync(batch as MessageBatch<any>, env);
        break;
      case "email-queue":
        await handleEmailQueue(batch as MessageBatch<any>, env);
        break;
      case "marketing-broadcast":
        await handleMarketingBroadcast(batch as MessageBatch<any>, env);
        break;
      default:
        console.warn(`Unknown queue: ${batch.queue}`);
    }
  },
};