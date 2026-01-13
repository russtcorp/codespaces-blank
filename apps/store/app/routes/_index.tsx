import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => {
  return [
    { title: "Diner SaaS - Store Dashboard" },
    { name: "description", content: "Manage your diner" },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  return json({
    message: "Hello from Store Dashboard!",
    status: "Phase 1 Complete",
  });
}

export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8", padding: "2rem" }}>
      <h1>📊 Diner SaaS - Store Dashboard</h1>
      <p>
        <strong>Phase 1: Foundation Complete</strong>
      </p>
      <ul>
        <li>✅ Store dashboard app configured</li>
        <li>✅ Bindings: D1, R2, KV, Durable Objects (Agent)</li>
        <li>✅ Running on port 3001</li>
      </ul>
      <p>
        This is the <strong>Tenant Portal</strong> where diner owners will manage menus, hours,
        and business settings.
      </p>
      <h2>Planned Features:</h2>
      <ul>
        <li>🤖 AI Manager (Chat Interface)</li>
        <li>📝 Visual Menu Editor</li>
        <li>⏰ Operations Center (Hours, Emergency Close)</li>
        <li>⚙️ Settings & Marketing Tools</li>
      </ul>
    </div>
  );
}
