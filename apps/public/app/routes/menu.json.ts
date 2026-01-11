import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { createDb, createTenantDb, categories, menuItems } from '@diner/db';
import { eq } from 'drizzle-orm';
import { resolveTenantId } from '~/utils/tenant.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace };
  const tenantId = await resolveTenantId(request, env);
  if (!tenantId) throw new Response('Not Found', { status: 404 });

  const db = createDb(env.DB);
  const tdb = createTenantDb(db, tenantId);

  const cats = await tdb.select(categories);
  const items = await tdb.select(menuItems, eq(menuItems.isAvailable, true));

  const payload = cats
    .map((cat) => {
      const catItems = items.filter((m) => m.categoryId === cat.id);
      if (!catItems.length) return null;
      return {
        id: cat.id,
        name: cat.name,
        sortOrder: cat.sortOrder,
        items: catItems.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          price: m.price,
          dietaryTags: m.dietaryTags ? JSON.parse(m.dietaryTags) : [],
          isHighlighted: m.isHighlighted,
        })),
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder);

  return json({ categories: payload }, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
