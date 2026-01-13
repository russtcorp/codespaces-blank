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
    const body = await request.json() as { itemName?: string; description?: string };
    const { itemName, description } = body;

    if (!itemName) {
      return json({ error: 'Item name required' }, { status: 400 });
    }

    // Use Workers AI to analyze potential allergens
    const prompt = `Analyze this menu item for common dietary restrictions and allergens. Item: "${itemName}"${description ? `, Description: "${description}"` : ''}. Return ONLY a comma-separated list of applicable tags from: GF (gluten-free), DF (dairy-free), V (vegetarian), VG (vegan), NF (nut-free), SF (soy-free), EF (egg-free). If none apply, return "None". No explanations.`;

    const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 30,
    });

    const result = response?.response?.trim() || '';
    const allergens = result === 'None' ? [] : result.split(',').map((tag: string) => tag.trim()).filter(Boolean);

    return json({ allergens });
  } catch (error) {
    console.error('Allergen analysis error:', error);
    return json({ error: 'Analysis failed' }, { status: 500 });
  }
}
