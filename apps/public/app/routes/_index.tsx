import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => {
  return [
    { title: "Diner SaaS - Public Site" },
    { name: "description", content: "Welcome to our diner!" },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  // Phase 1: Hello World - just return static data
  return json({
    message: "Hello from Public Site!",
    status: "Phase 1 Complete",
  });
}

export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8", padding: "2rem" }}>
      <h1>🍽️ Diner SaaS - Public Site</h1>
      <p>
        <strong>Phase 1: Foundation Complete</strong>
      </p>
      <ul>
        <li>✅ Monorepo configured with TurboRepo + pnpm</li>
        <li>✅ Shared packages: @diner-saas/db, @diner-saas/ui, @diner-saas/ai, @diner-saas/config</li>
        <li>✅ Public site running on Remix + Cloudflare Pages</li>
        <li>✅ D1 bindings configured</li>
      </ul>
      <p>
        This is the <strong>visitor-facing PWA</strong> that will display menus, hours, and enable
        offline functionality.
      </p>
    </div>
  );
}
