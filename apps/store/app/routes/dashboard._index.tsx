import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { Link, useLoaderData } from '@remix-run/react';
import { Card, CardHeader, CardTitle, CardContent } from '@diner/ui';

export async function loader({ request, context }: LoaderFunctionArgs) {
  // Session already checked in parent route
  return json({
    stats: {
      menuItems: 5,
      categories: 3,
      weeklyViews: 127,
    },
  });
}

export default function DashboardIndex() {
  const { stats } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Welcome back!</h2>
        <p className="text-gray-600">Here's an overview of your diner.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Menu Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.menuItems}</p>
            <p className="text-sm text-muted-foreground">Active items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.categories}</p>
            <p className="text-sm text-muted-foreground">Menu sections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Views</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.weeklyViews}</p>
            <p className="text-sm text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              to="/dashboard/menu"
              className="block rounded-md bg-primary px-4 py-3 text-center text-primary-foreground hover:bg-primary/90"
            >
              📝 Manage Menu
            </Link>
            <Link
              to="/dashboard/hours"
              className="block rounded-md bg-secondary px-4 py-3 text-center text-secondary-foreground hover:bg-secondary/80"
            >
              🕐 Update Hours
            </Link>
            <Link
              to="/dashboard/operations"
              className="block rounded-md border border-red-300 bg-red-50 px-4 py-3 text-center text-red-700 hover:bg-red-100"
            >
              🚨 Operations
            </Link>
            <Link
              to="/dashboard/settings"
              className="block rounded-md border border-gray-300 bg-white px-4 py-3 text-center hover:bg-gray-50"
            >
              ⚙️ Settings
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
