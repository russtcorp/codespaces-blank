import Stripe from 'stripe';

type Env = {
  STRIPE_SECRET_KEY?: string;
};

// Initialize Stripe client (cached to avoid recreating)
let stripeClient: Stripe | null = null;

function getStripeClient(env: Env): Stripe {
  if (stripeClient) return stripeClient;

  const apiKey = env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }

  stripeClient = new Stripe(apiKey, {
    apiVersion: '2024-12-18.acacia',
  });

  return stripeClient;
}

/**
 * Get subscription details from Stripe
 */
export async function getSubscription(env: Env, subscriptionId: string) {
  const stripe = getStripeClient(env);
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['customer.default_source', 'latest_invoice'],
    });
    return subscription;
  } catch (error) {
    console.error('Failed to retrieve subscription:', error);
    return null;
  }
}

/**
 * Get customer details from Stripe
 */
export async function getCustomer(env: Env, customerId: string) {
  const stripe = getStripeClient(env);
  try {
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ['default_source', 'sources'],
    });
    return customer;
  } catch (error) {
    console.error('Failed to retrieve customer:', error);
    return null;
  }
}

/**
 * List invoices for a customer
 */
export async function listInvoices(env: Env, customerId: string, limit: number = 10) {
  const stripe = getStripeClient(env);
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
      expand: ['data.payment_intent'],
    });
    return invoices.data;
  } catch (error) {
    console.error('Failed to list invoices:', error);
    return [];
  }
}

/**
 * Get available price IDs for different plans
 */
export function getPriceIds(env: Env) {
  return {
    starter: process.env.STRIPE_PRICE_STARTER || 'price_starter_monthly',
    professional: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional_monthly',
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_monthly',
  };
}

/**
 * Update subscription to a new plan
 */
export async function updateSubscriptionPlan(
  env: Env,
  subscriptionId: string,
  newPriceId: string
) {
  const stripe = getStripeClient(env);
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
    return { success: true, subscription };
  } catch (error) {
    console.error('Failed to update subscription plan:', error);
    return { success: false, error };
  }
}

/**
 * Create a payment method intent for updating payment method
 */
export async function createPaymentMethodSetupIntent(env: Env, customerId: string) {
  const stripe = getStripeClient(env);
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    return setupIntent;
  } catch (error) {
    console.error('Failed to create setup intent:', error);
    return null;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(env: Env, subscriptionId: string) {
  const stripe = getStripeClient(env);
  try {
    const subscription = await stripe.subscriptions.del(subscriptionId);
    return { success: true, subscription };
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    return { success: false, error };
  }
}

/**
 * Verify Stripe webhook signature
 */
export async function verifyWebhookSignature(
  env: Env,
  body: string,
  signature: string | null
): Promise<Stripe.Event | null> {
  if (!signature) return null;

  const stripe = getStripeClient(env);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return null;
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return null;
  }
}

/**
 * Get formatted subscription data for display
 */
export function formatSubscriptionForDisplay(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const price = item.price as Stripe.Price;

  return {
    status: subscription.status,
    plan: price.lookup_key || 'custom',
    amount: (price.unit_amount || 0) / 100,
    currency: price.currency,
    interval: price.recurring?.interval || 'month',
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0],
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    paymentMethod: subscription.default_payment_method,
  };
}

/**
 * Get formatted invoice data for display
 */
export function formatInvoiceForDisplay(invoice: Stripe.Invoice) {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amountDue: (invoice.amount_due || 0) / 100,
    amountPaid: (invoice.amount_paid || 0) / 100,
    currency: invoice.currency,
    dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString().split('T')[0] : null,
    paidAt: invoice.paid_at ? new Date(invoice.paid_at * 1000).toISOString() : null,
    pdfUrl: invoice.pdf || null,
    hostedInvoiceUrl: invoice.hosted_invoice_url || null,
  };
}
