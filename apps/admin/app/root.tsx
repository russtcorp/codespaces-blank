import { type LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader({ request }: LoaderFunctionArgs) {
  return {
    message: "Welcome to the Diner SaaS Admin Dashboard",
  };
}

export default function Index() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold">Diner SaaS - Admin Dashboard</h1>
      <p className="mt-4 text-gray-600">
        Admin dashboard coming in Phase 6. This will include:
      </p>
      <ul className="mt-2 list-inside list-disc text-gray-600">
        <li>Fleet Management</li>
        <li>"Magic Start" Onboarding</li>
        <li>Billing & Subscriptions</li>
        <li>Audit Logs & Infrastructure</li>
      </ul>
    </div>
  );
}
