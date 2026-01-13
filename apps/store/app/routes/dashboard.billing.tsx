import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, Link } from '@remix-run/react';
import { requireUserSession } from '~/services/auth.server';
import { createDb, createTenantDb, tenants } from '@diner/db';
import { requirePermission } from '~/utils/permissions';
import { PERMISSIONS } from '@diner/config';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@diner/ui';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; SESSION_SECRET?: string };
  const session = await requireUserSession(request, env);

  // Only owners can access billing
  if (session.userId) {
    requirePermission(session as any, PERMISSIONS.BILLING_ACCESS);
  }

  const db = createDb(env.DB);
  const tdb = createTenantDb(db, session.tenantId);

  const [tenant] = await tdb.select(tenants);

  return json({
    tenant,
    subscription: {
      status: tenant?.subscriptionStatus || 'trial',
      plan: 'starter',
      nextBillingDate: '2026-02-13',
      amount: 29.99,
    },
  });
}

export default function Billing() {
  const { tenant, subscription } = useLoaderData<typeof loader>();

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    trial: 'bg-blue-100 text-blue-800',
    past_due: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Billing & Subscription</h2>
        <p className="text-gray-600">Manage your subscription and payment details</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Plan</span>
            <span
              className={`rounded px-2 py-1 text-xs font-medium ${
                statusColors[subscription.status as keyof typeof statusColors]
              }`}
            >
              {subscription.status}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-lg font-semibold capitalize">{subscription.plan}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Cost</p>
              <p className="text-lg font-semibold">${subscription.amount}/mo</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Billing Date</p>
              <p className="text-lg font-semibold">{subscription.nextBillingDate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stripe ID</p>
              <p className="text-sm font-mono">{tenant?.stripeSubscriptionId || 'N/A'}</p>
            </div>
          </div>

          {subscription.status === 'past_due' && (
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-900">
              <strong>Payment Required:</strong> Your payment method failed. Please update it to
              avoid service interruption.
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline">Change Plan</Button>
            <Button variant="outline">Update Payment Method</Button>
            <Button variant="outline">View Invoices</Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Page Views</span>
                <span className="font-medium">1,247 / Unlimited</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-primary" style={{ width: '25%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">AI Requests</span>
                <span className="font-medium">43 / 500</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-primary" style={{ width: '8.6%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">SMS Sent</span>
                <span className="font-medium">12 / 100</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-primary" style={{ width: '12%' }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Info */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Business Name</p>
            <p className="font-medium">{tenant?.businessName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Payment Method</p>
            <p className="font-medium">•••• •••• •••• 4242</p>
            <p className="text-xs text-muted-foreground">Expires 12/2027</p>
          </div>
          <Button variant="outline">Edit Billing Details</Button>
        </CardContent>
      </Card>

      {/* Cancel Section */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Cancel your subscription. Your site will remain active until the end of your billing
              period.
            </p>
          </div>
          <Button variant="destructive">Cancel Subscription</Button>
        </CardContent>
      </Card>
    </div>
  );
}
