import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { setFeatureFlag } from "@diner-saas/config/src/feature-flags";
import { getAuthenticator } from "~/services/auth.server";

// This route should only be enabled in a testing environment.
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as any;
  if (env.ENVIRONMENT !== 'testing') {
    return new Response("Not Found", { status: 404 });
  }

  const authenticator = getAuthenticator(env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { flagName, value } = await request.json();
  if (!flagName || typeof value !== 'boolean') {
      return json({ error: 'Missing flagName or value' }, { status: 400 });
  }

  try {
    await setFeatureFlag(env.FEATURE_FLAGS, user.tenantId, flagName, value);
    return json({ success: true });
  } catch (error) {
    console.error("Failed to set feature flag for test:", error);
    return json({ error: 'Could not set feature flag' }, { status: 500 });
  }
}
