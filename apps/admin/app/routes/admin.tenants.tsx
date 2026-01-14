import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData, Link, Form } from "@remix-run/react";
import { useState } from "react";

interface TenantWithMetrics {
  id: string;
  slug: string;
  business_name: string;
  subscription_status: string;
  status: string;
  stripe_subscription_id?: string;
  monthly_revenue?: number;
  created_at: string;
  ai_tokens_used?: number;
  version_channel: string;
}

export async function loader({ context }: LoaderFunctionArgs) {
  // This would query D1 joined with Stripe subscription data
  // For now, return mock data structure
  const tenants: TenantWithMetrics[] = [
    {
      id: "tenant_1",
      slug: "joes-diner",
      business_name: "Joe's Diner",
      subscription_status: "active",
      status: "building",
      monthly_revenue: 2500,
      created_at: "2024-01-15T00:00:00Z",
      ai_tokens_used: 15000,
      version_channel: "stable",
    },
    {
      id: "tenant_2",
      slug: "marias-cafe",
      business_name: "Maria's Café",
      subscription_status: "active",
      status: "active",
      monthly_revenue: 3200,
      created_at: "2024-01-20T00:00:00Z",
      ai_tokens_used: 8500,
      version_channel: "beta",
    },
  ];

  return json({ tenants });
}

export default function AdminTenants() {
  const { tenants } = useLoaderData<typeof loader>();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("revenue");

  const filtered = tenants
    .filter((t) => (filterStatus === "all" ? true : t.status === filterStatus))
    .filter((t) =>
      filterChannel === "all" ? true : t.version_channel === filterChannel
    )
    .sort((a, b) => {
      if (sortBy === "revenue") {
        return (b.monthly_revenue || 0) - (a.monthly_revenue || 0);
      } else if (sortBy === "created") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      return 0;
    });

  return (
    <div className="p-6 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Fleet Management</h1>
        <div className="text-sm text-gray-600">
          Total Tenants: <strong>{tenants.length}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deployment Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="building">Building</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Version Channel
            </label>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Channels</option>
              <option value="stable">Stable</option>
              <option value="beta">Beta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="revenue">Monthly Revenue</option>
              <option value="created">Created Date</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterStatus("all");
                setFilterChannel("all");
              }}
              className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-400"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Business</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">
                Monthly Revenue
              </th>
              <th className="px-4 py-3 text-left font-semibold">AI Tokens</th>
              <th className="px-4 py-3 text-left font-semibold">Channel</th>
              <th className="px-4 py-3 text-left font-semibold">Created</th>
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tenant) => (
              <tr
                key={tenant.id}
                className="border-b hover:bg-gray-50 transition"
              >
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium">{tenant.business_name}</div>
                    <div className="text-xs text-gray-500">{tenant.slug}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tenant.status === "active"
                        ? "bg-green-100 text-green-800"
                        : tenant.status === "building"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {tenant.status}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    {tenant.subscription_status}
                  </div>
                </td>
                <td className="px-4 py-3">
                  ${(tenant.monthly_revenue || 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {(tenant.ai_tokens_used || 0).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      tenant.version_channel === "stable"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {tenant.version_channel}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(tenant.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Form method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="tenantId" value={tenant.id} />
                    <input
                      type="hidden"
                      name="action"
                      value="impersonate"
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 mr-2"
                    >
                      Login As
                    </button>
                  </Form>
                  <Link
                    to={`/admin/tenant/${tenant.id}`}
                    className="px-2 py-1 bg-gray-300 text-gray-800 rounded text-xs hover:bg-gray-400"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No tenants match the selected filters.
        </div>
      )}
    </div>
  );
}
