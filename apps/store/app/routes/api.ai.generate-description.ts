import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { requireUserSession } from '~/services/auth.server';
import { requirePermission } from '~/utils/permissions';
import { PERMISSIONS } from '@diner/config';

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace; AI: any; SESSION_SECRET?: string };
  const session = await requireUserSession(request, env);

  // AI assists require menu edit access
  if (session.userId) {
    requirePermission(session as any, PERMISSIONS.MENU_FULL_ACCESS);
  }

  try {
    const body = await request.json() as { itemName?: string };
    const { itemName } = body;

    if (!itemName || typeof itemName !== 'string') {
      return json({ error: 'Item name required' }, { status: 400 });
    }

    // Use Workers AI to generate description
    const prompt = `Write a short, appetizing description (max 20 words) for this menu item: "${itemName}". Focus on flavors and presentation. Return only the description, no quotes or extra text.`;

    const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
    });

    const description = response?.response?.trim() || '';

    return json({ description });
  } catch (error) {
    console.error('AI generation error:', error);
    return json({ error: 'Generation failed' }, { status: 500 });
  }
}
