import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { getSessionStorage } from "~/services/session.server";
import { User } from "~/services/auth.server";

// This route should only be enabled in a testing environment.
// In a real production setup, you would use a build flag
// to exclude this file from the production build.

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as any;
  if (env.ENVIRONMENT !== 'testing') {
    return new Response("Not Found", { status: 404 });
  }

  const sessionStorage = getSessionStorage(env);

  // Create a dummy user for the test session
  const user: User = {
    id: 1,
    tenantId: "test-tenant-123",
    email: "test@example.com",
    phone: null,
    name: "Test User",
    role: "owner",
    permissions: ["all"],
  };

  const session = await sessionStorage.getSession();
  session.set("user", user);

  const cookie = await sessionStorage.commitSession(session);

  return json({ cookie }, {
    headers: {
      "Set-Cookie": cookie,
    },
  });
}
