import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => {
  return [
    { title: "Diner SaaS - Admin Dashboard" },
    { name: "description", content: "Manage the Diner SaaS fleet" },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  // Phase 1: Hello World
  return json({
    message: "Hello from Admin Dashboard!",
    status: "Phase 1 Complete",
  });
}

export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8", padding: "2rem" }}>
      <h1>👑 Diner SaaS - Admin Dashboard</h1>
      <p>
        <strong>Phase 1: Foundation Complete</strong>
      </p>
      <ul>
        <li>✅ Admin dashboard app configured</li>
        <li>✅ Bindings: D1, R2, KV (with Cloudflare Access protection)</li>
        <li>✅ Running on port 3002</li>
        <li>✅ Complete database schema supporting multi-tenancy</li>
      </ul>
      <p>
        This is the <strong>Super Admin Portal</strong> for managing the entire fleet of diners,
        billing, onboarding, and infrastructure.
      </p>
      <h2>Planned Features:</h2>
      <ul>
        <li>🏢 Fleet Management (Tenant List, Impersonation)</li>
        <li>🎯 "Magic Start" Onboarding (Browser Rendering + Scraping)</li>
        <li>💳 Billing & Stripe Connect</li>
        <li>📊 Infrastructure Monitoring</li>
        <li>🔐 Audit Logs & Compliance</li>
      </ul>
    </div>
  );
}
