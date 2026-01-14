import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { handleStripeWebhook } from "../services/stripe-webhook.server";

/**
 * Stripe Webhook Endpoint
 * POST /api/stripe-webhook
 * 
 * Receives events from Stripe when subscriptions are created, updated, or deleted
 * Syncs subscription status to D1 database
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Record<string, unknown>;
  const DB = env.DB as D1Database;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET as string;

  return handleStripeWebhook(request, DB, webhookSecret);
}
