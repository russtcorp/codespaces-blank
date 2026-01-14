import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { getAuthenticator } from "~/services/auth.server";
import { Card } from "@diner-saas/ui/card";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const authenticator = getAuthenticator(env);
  const user = await authenticator.isAuthenticated(request);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  // TODO: Fetch analytics from Workers Analytics Engine
  // For now, return mock data
  const stats = {
    totalViews: 1234,
    totalClicks: 567,
    callClicks: 89,
    directionsClicks: 234,
  };

  return json({ stats, user });
}

export default function DashboardIndex() {
  const { stats, user } = useLoaderData<typeof loader>();

  const statCards = [
    { name: "Total Views", value: stats.totalViews, icon: "👁️" },
    { name: "Total Interactions", value: stats.totalClicks, icon: "🖱️" },
    { name: "Call Clicks", value: stats.callClicks, icon: "📞" },
    { name: "Directions Clicks", value: stats.directionsClicks, icon: "🗺️" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.name}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here's what's happening with your diner today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.name} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className="text-4xl">{stat.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Card className="p-6 transition-shadow hover:shadow-lg">
            <h3 className="font-semibold text-gray-900">Update Menu</h3>
            <p className="mt-2 text-sm text-gray-600">
              Add, edit, or remove menu items
            </p>
          </Card>
          <Card className="p-6 transition-shadow hover:shadow-lg">
            <h3 className="font-semibold text-gray-900">Change Hours</h3>
            <p className="mt-2 text-sm text-gray-600">
              Update your operating hours
            </p>
          </Card>
          <Card className="p-6 transition-shadow hover:shadow-lg">
            <h3 className="font-semibold text-gray-900">Emergency Close</h3>
            <p className="mt-2 text-sm text-gray-600">
              Temporarily close your diner
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
