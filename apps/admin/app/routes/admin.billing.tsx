import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { drizzle } from "drizzle-orm/d1";
import { tenants } from "@diner-saas/db";
import { listSubscriptions } from "~/services/stripe.server";
import { DataTable } from "@diner-saas/ui/data-table";
import { Button } from "@diner-saas/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { Logger } from "@diner-saas/logger";

// Define the shape of our table data
type SubscriptionData = {
  id: string;
  businessName: string;
  status: string;
  stripeStatus: string;
  plan: string;
  amount: string;
  email: string;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  
  // TODO: Add proper admin authentication check here
  // For now, this is a placeholder - implement authentication before production
  // Example: const adminUser = await authenticateAdmin(request, env);
  // if (!adminUser) throw new Response("Unauthorized", { status: 401 });
  
  const ctx = (context as any).cloudflare?.ctx;
  const db = drizzle(env.DB);
  const logger = new Logger(request, env, ctx);

  if (!env.STRIPE_SECRET_KEY) {
    // Return empty state if keys not configured
    return json({ subscriptions: [], error: "Stripe not configured" });
  }

  // Fetch tenants from DB
  const allTenants = await db.select().from(tenants).all();
  
  // Fetch subscriptions from Stripe
  let stripeSubs: any[] = [];
  try {
    stripeSubs = await listSubscriptions(env.STRIPE_SECRET_KEY);
  } catch (err) {
    logger.error(err instanceof Error ? err : new Error(String(err)));
  }

  // Merge data
  const data: SubscriptionData[] = allTenants.map((tenant: any) => {
    const sub = stripeSubs.find((s) => s.metadata?.tenantId === tenant.id || s.customer?.metadata?.tenantId === tenant.id);
    
    return {
      id: tenant.id,
      businessName: tenant.businessName || "Unknown",
      status: tenant.subscriptionStatus || "inactive",
      stripeStatus: sub?.status || "none",
      plan: sub?.items?.data[0]?.price?.nickname || "Standard",
      amount: sub?.items?.data[0]?.price?.unit_amount ? `$${(sub.items.data[0].price.unit_amount / 100).toFixed(2)}` : "-",
      email: tenant.emailAlias || (sub?.customer as any)?.email || "-",
    };
  });

  return json({ subscriptions: data, error: null });
}

export const columns: ColumnDef<SubscriptionData>[] = [
  // ... (columns remain the same)
];

export default function AdminBilling() {
  const initialData = useLoaderData<typeof loader>();

  const { data: subscriptions, error } = useQuery({
    queryKey: ['billingSubscriptions'],
    queryFn: async () => {
      const response = await fetch("/admin/billing"); 
      const data = await response.json();
      return data.subscriptions;
    },
    initialData: initialData.subscriptions,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes to reduce Stripe API load
  });

  const errorMessage = initialData.error || (error as Error)?.message;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscriptions</h1>
        <p className="mt-2 text-gray-600">Manage tenant subscriptions and view revenue.</p>
      </div>

      {errorMessage && (
        <div className="bg-red-50 text-red-800 p-4 rounded-md">
          {errorMessage}
        </div>
      )}

      <div className="bg-white rounded-lg shadow border">
        <DataTable columns={columns} data={subscriptions || []} />
      </div>
    </div>
  );
}