import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import Stripe from "stripe";
import { handleStripeWebhook } from "../services/stripe-webhook.server";

/**
 * Stripe Webhook Endpoint
 * POST /api/stripe-webhook
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as any;
  const db = env.DB as D1Database;
  const stripeSecretKey = env.STRIPE_SECRET_KEY as string;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET as string;

  const stripe = new Stripe(stripeSecretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  return handleStripeWebhook(request, db, webhookSecret, stripe);
}
