import Stripe from "stripe";

export function getStripeClient(apiKey: string) {
  return new Stripe(apiKey, {
    apiVersion: "2024-12-18.acacia", // Use latest API version or what you prefer
    httpClient: Stripe.createFetchHttpClient(), // Cloudflare compatible
  });
}

export async function listSubscriptions(apiKey: string) {
  const stripe = getStripeClient(apiKey);
  const subscriptions = await stripe.subscriptions.list({
    limit: 100,
    status: "all",
    expand: ["data.customer"],
  });
  return subscriptions.data;
}

export async function getConnectAccount(apiKey: string, accountId: string) {
  const stripe = getStripeClient(apiKey);
  return stripe.accounts.retrieve(accountId);
}

export async function createPortalSession(apiKey: string, customerId: string, returnUrl: string) {
  const stripe = getStripeClient(apiKey);
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
