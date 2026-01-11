import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { destroySession } from '~/services/auth.server';

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; SESSION_SECRET?: string };
  return destroySession(request, env);
}

export async function loader({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; SESSION_SECRET?: string };
  return destroySession(request, env);
}
