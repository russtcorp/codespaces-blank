import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { createDb, createTenantDb, businessInfo, themeConfig } from '@diner/db';
import { resolveTenantId } from '~/utils/tenant.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace };
  const tenantId = await resolveTenantId(request, env);
  if (!tenantId) throw new Response('Not Found', { status: 404 });

  const db = createDb(env.DB);
  const tdb = createTenantDb(db, tenantId);
  const [biz] = await tdb.select(businessInfo);
  const [theme] = await tdb.select(themeConfig);

  const name = biz?.businessName ?? 'Diner';
  const bg = theme?.primaryColor ?? '#b22222';
  const fg = theme?.secondaryColor ?? '#ffffff';

  return json(
    {
      name,
      short_name: name,
      start_url: '/',
      display: 'standalone',
      background_color: fg,
      theme_color: bg,
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}
