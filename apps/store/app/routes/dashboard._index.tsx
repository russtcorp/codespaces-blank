import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { Link, useLoaderData } from '@remix-run/react';
import { Card, CardHeader, CardTitle, CardContent } from '@diner/ui';
import { createDb, createTenantDb, menuItems, categories, authorizedUsers } from '@diner/db';
import { requireUserSession } from '~/services/auth.server';
import { requirePermission } from '~/utils/permissions';
import { PERMISSIONS } from '@diner/config';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; SESSION_SECRET?: string };
  const session = await requireUserSession(request, env);

  // Analytics view is available to all roles, but we enforce it explicitly
  if (session.userId) {
    requirePermission(session as any, PERMISSIONS.ANALYTICS_VIEW);
  }

  const db = createDb(env.DB);
  const tdb = createTenantDb(db, session.tenantId);

  const items = await tdb.select(menuItems);
  const cats = await tdb.select(categories);
  const users = await tdb.select(authorizedUsers);

  // In production, fetch real analytics from KV or analytics provider
  const weeklyViews = 1247; // TODO: Integrate real analytics
  const weeklyClicks = 87;
  const conversionRate = (weeklyClicks / weeklyViews * 100).toFixed(1);

  return json({
    stats: {
      menuItems: items.length,
      categories: cats.length,
      users: users.length,
      weeklyViews,
      weeklyClicks,
      conversionRate,
    },
    recentActivity: [
      { action: 'Menu item updated', item: 'Cheeseburger', time: '2 hours ago' },
      { action: 'Hours modified', item: 'Saturday schedule', time: '1 day ago' },
      { action: 'User added', item: 'jane@example.com', time: '3 days ago' },
    ],
  });
}

export default function DashboardIndex() {
  const { stats, recentActivity } = useLoaderData<typeof loader>();

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
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.users}</p>
            <p className="text-sm text-muted-foreground">Authorized users</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Views</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.weeklyViews.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.weeklyClicks}</p>
            <p className="text-sm text-muted-foreground">Phone taps this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.conversionRate}%</p>
            <p className="text-sm text-muted-foreground">Views to calls</p>
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
            <div className="space-y-3">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.item}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
