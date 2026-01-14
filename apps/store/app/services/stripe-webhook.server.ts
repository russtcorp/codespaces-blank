/**
 * Stripe Connect Webhook Handler
 * Listens for subscription events and syncs status to D1
 * Handles: customer.subscription.updated, customer.subscription.deleted
 */

import { json } from "@remix-run/cloudflare";
import crypto from "crypto";

export interface StripeSubscriptionEvent {
  id: string;
  object: string;
  api_version: string;
  created: number;
  data: {
    object: {
      id: string;
      object: "subscription";
      billing_cycle_anchor: number;
      cancel_at: number | null;
      cancel_at_period_end: boolean;
      canceled_at: number | null;
      collection_method: string;
      created: number;
      currency: string;
      current_period_end: number;
      current_period_start: number;
      customer: string;
      days_until_due: number | null;
      default_payment_method: string | null;
      default_source: string | null;
      default_tax_rates: unknown[];
      description: string | null;
      discount: unknown | null;
      ended_at: number | null;
      items: {
        object: string;
        data: unknown[];
      };
      latest_invoice: string | null;
      livemode: boolean;
      metadata: Record<string, unknown>;
      next_pending_invoice_item_invoice: number | null;
      on_behalf_of: string | null;
      pause_at: number | null;
      paused_at: number | null;
      payment_settings: {
        save_default_payment_method: string;
      };
      pending_invoice_item_interval: unknown | null;
      pending_setup_intent: unknown | null;
      pending_update: unknown | null;
      schedule: unknown | null;
      start_date: number;
      status: "trialing" | "active" | "past_due" | "canceled" | "unpaid";
      test_clock: unknown | null;
      transfer_data: unknown | null;
      trial_end: number | null;
      trial_settings: {
        end_behavior: {
          missing_payment_method: string;
        };
      };
    };
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: unknown | null;
    idempotency_key: unknown | null;
  };
  type:
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "customer.subscription.deleted";
}

/**
 * Verify Stripe webhook signature
 * Prevents spoofed webhooks
 */
export function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    const timestamp = signature.split(",")[0].split("=")[1];
    const signedContent = `${timestamp}.${body}`;
    const hash = crypto
      .createHmac("sha256", secret)
      .update(signedContent)
      .digest("hex");
    const expectedSig = signature.split(",")[1].split("=")[1];
    return hash === expectedSig;
  } catch (error) {
    console.error("Stripe signature verification failed:", error);
    return false;
  }
}

/**
 * Map Stripe subscription status to our internal status
 */
export function mapSubscriptionStatus(
  stripeStatus:
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
): "trial" | "active" | "past_due" | "cancelled" {
  const statusMap: Record<
    string,
    "trial" | "active" | "past_due" | "cancelled"
  > = {
    trialing: "trial",
    active: "active",
    past_due: "past_due",
    canceled: "cancelled",
    unpaid: "past_due",
  };
  return statusMap[stripeStatus] || "active";
}

/**
 * Process a Stripe webhook event
 * Updates the tenant subscription status in D1
 */
export async function processStripeEvent(
  event: StripeSubscriptionEvent,
  db: D1Database
): Promise<void> {
  const subscription = event.data.object;

  // Get tenant by stripe_subscription_id
  const tenantResult = await db
    .prepare(
      "SELECT id FROM tenants WHERE stripe_subscription_id = ? LIMIT 1"
    )
    .bind(subscription.id)
    .first<{ id: string }>();

  if (!tenantResult) {
    console.warn(`No tenant found for subscription ${subscription.id}`);
    return;
  }

  const tenantId = tenantResult.id;
  const newStatus = mapSubscriptionStatus(subscription.status);

  // Update tenant subscription status
  await db
    .prepare("UPDATE tenants SET subscription_status = ? WHERE id = ?")
    .bind(newStatus, tenantId)
    .run();

  console.log(
    `Updated tenant ${tenantId} subscription status to ${newStatus}`
  );

  // Log the event for audit trail
  await db
    .prepare(
      `INSERT INTO subscription_events (tenant_id, event_type, stripe_event_id, previous_status, new_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      tenantId,
      event.type,
      event.id,
      null, // Would need to fetch previous status
      newStatus,
      new Date().toISOString()
    )
    .run();
}

/**
 * Stripe webhook handler for Remix resource route
 * Should be mounted at routes/api.stripe-webhook.ts
 */
export async function handleStripeWebhook(
  request: Request,
  db: D1Database,
  webhookSecret: string
) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const signature = request.headers.get("stripe-signature") || "";
    const body = await request.text();

    // Verify signature
    if (!verifyStripeSignature(body, signature, webhookSecret)) {
      console.error("Invalid Stripe signature");
      return json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: StripeSubscriptionEvent = JSON.parse(body);

    // Handle subscription events
    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await processStripeEvent(event, db);
    }

    return json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
