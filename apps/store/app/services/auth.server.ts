import { createCookieSessionStorage } from '@remix-run/cloudflare';
import { createDb, createTenantDb, authorizedUsers } from '@diner/db';
import { eq } from 'drizzle-orm';

type Env = {
  DB: D1Database;
  KV: KVNamespace;
  SESSION_SECRET?: string;
};

type SessionData = {
  userId: number;
  tenantId: string;
  email: string | null;
  role: string;
  permissions: string[];
};

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function getSessionStorage(env: Env) {
  return createCookieSessionStorage<SessionData>({
    cookie: {
      name: '__session',
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secrets: [env.SESSION_SECRET || 'dev-secret-change-in-production'],
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE,
    },
  });
}

export async function createUserSession(
  env: Env,
  userId: number,
  tenantId: string,
  email: string | null,
  role: string,
  permissions: string[],
  redirectTo: string
) {
  const storage = getSessionStorage(env);
  const session = await storage.getSession();
  session.set('userId', userId);
  session.set('tenantId', tenantId);
  session.set('email', email);
  session.set('role', role);
  session.set('permissions', permissions);

  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': await storage.commitSession(session),
      Location: redirectTo,
    },
  });
}

export async function getUserSession(request: Request, env: Env) {
  const storage = getSessionStorage(env);
  const session = await storage.getSession(request.headers.get('Cookie'));
  return {
    userId: session.get('userId'),
    tenantId: session.get('tenantId'),
    email: session.get('email'),
    role: session.get('role'),
    permissions: session.get('permissions') || [],
  };
}

export async function requireUserSession(request: Request, env: Env) {
  const session = await getUserSession(request, env);
  if (!session.userId || !session.tenantId) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return session;
}

export async function destroySession(request: Request, env: Env) {
  const storage = getSessionStorage(env);
  const session = await storage.getSession(request.headers.get('Cookie'));
  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': await storage.destroySession(session),
      Location: '/login',
    },
  });
}

// Magic link token management
const MAGIC_LINK_TTL = 60 * 15; // 15 minutes

export async function createMagicLinkToken(env: Env, email: string, tenantId: string) {
  const token = crypto.randomUUID();
  const key = `magic:${token}`;
  await env.KV.put(key, JSON.stringify({ email, tenantId }), {
    expirationTtl: MAGIC_LINK_TTL,
  });
  return token;
}

export async function verifyMagicLinkToken(env: Env, token: string) {
  const key = `magic:${token}`;
  const data = await env.KV.get(key);
  if (!data) return null;
  await env.KV.delete(key); // One-time use
  return JSON.parse(data) as { email: string; tenantId: string };
}

// OTP management
const OTP_TTL = 60 * 10; // 10 minutes

export async function createOTP(env: Env, phone: string, tenantId: string) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const key = `otp:${phone}`;
  await env.KV.put(key, JSON.stringify({ code, tenantId }), { expirationTtl: OTP_TTL });
  return code;
}

export async function verifyOTP(env: Env, phone: string, code: string) {
  const key = `otp:${phone}`;
  const data = await env.KV.get(key);
  if (!data) return null;
  const stored = JSON.parse(data) as { code: string; tenantId: string };
  if (stored.code !== code) return null;
  await env.KV.delete(key);
  return stored.tenantId;
}

// User lookup helpers
export async function getUserByEmail(env: Env, email: string, tenantId: string) {
  const db = createDb(env.DB);
  const tdb = createTenantDb(db, tenantId);
  const [user] = await tdb.select(authorizedUsers, eq(authorizedUsers.email, email));
  return user;
}

export async function getUserByPhone(env: Env, phone: string, tenantId: string) {
  const db = createDb(env.DB);
  const tdb = createTenantDb(db, tenantId);
  const [user] = await tdb.select(authorizedUsers, eq(authorizedUsers.phoneNumber, phone));
  return user;
}
