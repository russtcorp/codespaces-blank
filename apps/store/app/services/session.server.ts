import { createWorkersKVSessionStorage } from "@remix-run/cloudflare";

/**
 * KV-backed Session Storage (Phase 4 requirement)
 * - Stores session data in Cloudflare KV (binding: KV)
 * - Uses secure, HTTP-only cookie as session handle
 */
export function getSessionStorage(env: any) {
  if (!env?.KV) throw new Error("KV binding is required for session storage");
  if (!env?.SESSION_SECRET) throw new Error("SESSION_SECRET must be configured");

  return createWorkersKVSessionStorage({
    kv: env.KV,
    cookie: {
      name: "_diner_session",
      sameSite: "lax",
      path: "/",
      httpOnly: true,
      secrets: [env.SESSION_SECRET],
      secure: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  });
}

export async function getSession(request: Request, env: any) {
  const storage = getSessionStorage(env);
  return storage.getSession(request.headers.get("Cookie"));
}

export async function commitSession(session: any, env: any) {
  const storage = getSessionStorage(env);
  
  // Rolling session: Reset expiry on every commit
  // This keeps the user logged in as long as they are active
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  session.set("expires", Date.now() + maxAge * 1000);
  
  return storage.commitSession(session, {
    maxAge: maxAge,
  });
}

export async function destroySession(session: any, env: any) {
  const storage = getSessionStorage(env);
  return storage.destroySession(session);
}
