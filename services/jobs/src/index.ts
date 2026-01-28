/**
 * Background Jobs Worker
 *
 * This worker handles asynchronous tasks:
 * - Cron-triggered jobs (daily reports, sync operations, usage alerts)
 * - Queue consumption (SMS sending, social media sync)
 * - Email notifications
 */

import { handleUsageAlertsCron } from "./usage-alerts";
import { handleInstagramTokenRefresh } from "./instagram-refresh";

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  SMS_OUTBOUND: Queue;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 });
    }
    
    return new Response("Not Found", { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log(`Cron triggered at ${new Date().toISOString()}`);

    // Run multiple cron jobs in parallel
    await Promise.all([
      (async () => {
        const result = await handleUsageAlertsCron(env.DB, env.KV);
        console.log("Usage Alerts Report:", JSON.stringify(result, null, 2));
        if (result.errors.length > 0) {
          console.error("Usage Alerts Errors:", result.errors);
        }
      })(),
      (async () => {
        const result = await handleInstagramTokenRefresh(env);
        console.log("Instagram Refresh Report:", JSON.stringify(result, null, 2));
      })(),
    ]);
  },
};

interface OutboundMessage {
  to: string;
  body: string;
}

async function sendSms(env: Env, to: string, body: string) {
  if (!to || !body) return;
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const auth = btoa(`${sid}:${token}`);
  const form = new URLSearchParams({
    From: env.TWILIO_PHONE_NUMBER,
    To: to,
    Body: body,
  });

  try {
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("Twilio send failed", resp.status, text);
    }
  } catch (err) {
    console.error("Twilio send error", err);
  }
}
