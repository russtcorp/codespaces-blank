import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { authenticator } from "~/services/auth.server";
import { Card } from "@diner-saas/ui/components/card";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return json({ user });
}

export default function DashboardChat() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Manager</h1>
        <p className="mt-2 text-gray-600">
          Chat with your AI assistant to manage your diner via natural language.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-6xl">💬</div>
            <h3 className="text-xl font-semibold text-gray-900">
              AI Chat Coming Soon
            </h3>
            <p className="mt-2 text-gray-600">
              This feature will be implemented in Phase 5.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              You'll be able to update your menu, hours, and settings using natural language commands.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
