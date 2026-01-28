import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { drizzle } from "drizzle-orm/d1";
import { tenants } from "@diner-saas/db";
import { getStripeClient, listSubscriptions } from "~/services/stripe.server";
import { DataTable } from "@diner-saas/ui/data-table";
import { Button } from "@diner-saas/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";

// ... (SubscriptionData type and loader function remain the same)

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