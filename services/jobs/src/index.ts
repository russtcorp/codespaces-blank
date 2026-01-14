/**
 * Background Jobs Worker
 *
 * This worker handles asynchronous tasks:
 * - Cron-triggered jobs (daily reports, sync operations)
 * - Queue consumption (SMS sending, social media sync)
 * - Email notifications
 */

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  SMS_OUTBOUND: Queue;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
}

export default {
  async fetch(): Promise<Response> {
    return new Response("Diner SaaS Jobs Worker - Running", { status: 200 });
  },

  async scheduled(): Promise<void> {
    // This will be implemented in Phase 5 and beyond
    // eslint-disable-next-line no-console
    console.log("Cron job triggered at", new Date().toISOString());
  },
  async queue(batch: MessageBatch, env: Env) {
    for (const msg of batch.messages) {
      const payload = msg.body as OutboundMessage;
      await sendSms(env, payload.to, payload.body);
    }
  },
} satisfies ExportedHandler<Env>;

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
