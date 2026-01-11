import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { createDb, createTenantDb, businessInfo, themeConfig, categories, menuItems, operatingHours, specialDates } from '@diner/db';
import { eq, and, isNull } from 'drizzle-orm';
import { resolveTenantId } from '~/utils/tenant.server';
import { computeStatus } from '~/utils/status';

type LoaderData = {
  businessName: string;
  phone?: string | null;
  address?: string | null;
  status: { isOpen: boolean; reason: string; nextChange?: string };
  themeStyle: string;
  menu: Array<{ id: number; name: string; items: Array<{ id: number; name: string; description: string | null; price: number; isHighlighted: boolean; dietaryTags: string[] }> }>;
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) return [{ title: 'Diner' }];
  return [
    { title: `${data.businessName} | Diner` },
    { name: 'description', content: `${data.businessName} menu and hours.` },
  ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as { DB: D1Database; KV: KVNamespace };
  const tenantId = await resolveTenantId(request, env);
  if (!tenantId) throw new Response('Not Found', { status: 404 });

  const db = createDb(env.DB);
  const tdb = createTenantDb(db, tenantId);

  const [biz] = await tdb.select(businessInfo);
  const [theme] = await tdb.select(themeConfig);

  const cats = await tdb.select(categories, and(eq(categories.isVisible, true), isNull(categories.deletedAt as any))); // deletedAt not in schema for categories but safe
  const items = await tdb.select(menuItems, eq(menuItems.isAvailable, true));
  const hours = await tdb.select(operatingHours);
  const specials = await tdb.select(specialDates);

  const menu = cats
    .map((cat) => {
      const catItems = items.filter((m) => m.categoryId === cat.id);
      if (!catItems.length) return null;
      return {
        id: cat.id,
        name: cat.name,
        items: catItems.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          price: m.price,
          isHighlighted: m.isHighlighted,
          dietaryTags: m.dietaryTags ? JSON.parse(m.dietaryTags) : [],
        })),
      };
    })
    .filter(Boolean) as LoaderData['menu'];

  const status = computeStatus({ operatingHours: hours, specialDates: specials, emergencyClosed: false });

  const themeStyle = `:root {${[
    ['--primary', theme?.primaryColor ?? '#b22222'],
    ['--secondary', theme?.secondaryColor ?? '#f8f4ec'],
    ['--font-heading', theme?.fontHeading ?? 'Inter, system-ui, sans-serif'],
    ['--font-body', theme?.fontBody ?? 'Inter, system-ui, sans-serif'],
  ]
    .map(([k, v]) => `${k}:${v};`)
    .join('')}}`;

  return json<LoaderData>({
    businessName: biz?.businessName ?? 'Our Diner',
    phone: biz?.phonePublic,
    address: biz?.address,
    status,
    themeStyle,
    menu,
  });
}

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style dangerouslySetInnerHTML={{ __html: data.themeStyle }} />
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Welcome to</p>
            <h1 className="text-3xl font-bold md:text-4xl">{data.businessName}</h1>
            {data.address && <p className="text-muted-foreground">{data.address}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
                data.status.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {data.status.isOpen ? 'Open' : 'Closed'}
            </span>
            {data.phone && (
              <a
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground shadow hover:bg-primary/90"
                href={`tel:${data.phone}`}
              >
                Call Now
              </a>
            )}
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {data.menu.map((cat) => (
            <div key={cat.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <h2 className="mb-3 text-xl font-semibold">{cat.name}</h2>
              <div className="space-y-3">
                {cat.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                      {item.dietaryTags.length > 0 && (
                        <p className="text-xs text-muted-foreground">Tags: {item.dietaryTags.join(', ')}</p>
                      )}
                    </div>
                    <div className="text-right font-semibold">${item.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <footer className="text-sm text-muted-foreground">
          Dietary tags are AI suggestions. Please confirm allergens with staff.
        </footer>
      </main>
    </div>
  );
}
