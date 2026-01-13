import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { Outlet, useLoaderData, Link, useLocation } from '@remix-run/react';
import { requireUserSession } from '~/services/auth.server';
import { Toaster } from '@diner/ui';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; SESSION_SECRET?: string };
  
  try {
    const session = await requireUserSession(request, env);
    return json({ session });
  } catch (error) {
    return redirect('/login');
  }
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Menu', href: '/dashboard/menu', icon: '🍽️' },
  { name: 'Hours', href: '/dashboard/hours', icon: '🕐' },
  { name: 'Operations', href: '/dashboard/operations', icon: '🚨' },
  { name: 'Users', href: '/dashboard/users', icon: '👥' },
  { name: 'Billing', href: '/dashboard/billing', icon: '💳' },
  { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
];

export default function Dashboard() {
  const { session } = useLoaderData<typeof loader>();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      
      {/* Top Navigation */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Diner Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.email}</span>
            <span className="text-xs text-gray-400">({session.role})</span>
            <form method="post" action="/logout">
              <button
                type="submit"
                className="rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r bg-white p-4">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
