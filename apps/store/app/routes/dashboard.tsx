import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { Outlet, useLoaderData, Link, Form, useLocation } from "@remix-run/react";
import { getAuthenticator } from "~/services/auth.server";
import { Button } from "@diner-saas/ui/button";
import { CommandMenu } from "~/components/CommandMenu";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const authenticator = getAuthenticator(env);
  const user = await authenticator.isAuthenticated(request);
  
  if (!user) {
    return redirect("/auth/login");
  }

  return json({ user });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const authenticator = getAuthenticator(env);
  return await authenticator.logout(request, { redirectTo: "/auth/login" });
}

export default function DashboardLayout() {
  const { user } = useLoaderData<typeof loader>();
  const location = useLocation();

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: "📊" },
    { name: "AI Chat", href: "/dashboard/chat", icon: "💬" },
    { name: "Menu Editor", href: "/dashboard/menu", icon: "📋" },
    { name: "Operations", href: "/dashboard/operations", icon: "⏰" },
    { name: "Settings", href: "/dashboard/settings", icon: "⚙️" },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <CommandMenu />
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b px-4">
            <h1 className="text-xl font-bold text-gray-900">Diner Dashboard</h1>
          </div>

          {/* User Info */}
          <div className="border-b p-4">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
              {user.role}
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = 
                item.href === "/dashboard" 
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="border-t p-4">
            <Form method="post" id="logout-form">
              <Button
                type="submit"
                variant="outline"
                className="w-full"
              >
                Sign Out
              </Button>
            </Form>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
