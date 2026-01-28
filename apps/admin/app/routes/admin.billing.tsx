import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, Form, useNavigation } from "@remix-run/react";
import { drizzle } from "drizzle-orm/d1";
import { tenants } from "@diner-saas/db";
import { getStripeClient, listSubscriptions } from "~/services/stripe.server";
import { DataTable } from "@diner-saas/ui/data-table";
import { Button } from "@diner-saas/ui/button";
import { ColumnDef } from "@tanstack/react-table";

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
  const db = drizzle(env.DB);

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
    console.error("Stripe fetch error:", err);
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
  {
    accessorKey: "businessName",
    header: "Business",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "status",
    header: "DB Status",
    cell: ({ row }) => (
      <span className={`px-2 py-1 rounded text-xs font-medium ${
        row.getValue("status") === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
      }`}>
        {row.getValue("status")}
      </span>
    ),
  },
  {
    accessorKey: "stripeStatus",
    header: "Stripe Status",
  },
  {
    accessorKey: "amount",
    header: "Revenue/Mo",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="flex gap-2">
           {/* Placeholder for actions like "Cancel" or "Sync" */}
           <Button variant="outline" size="sm">Manage</Button>
        </div>
      )
    }
  }
];

export default function AdminBilling() {
  const { subscriptions, error } = useLoaderData<typeof loader>();

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscriptions</h1>
        <p className="mt-2 text-gray-600">Manage tenant subscriptions and view revenue.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow border">
        <DataTable columns={columns} data={subscriptions} />
      </div>
    </div>
  );
}
