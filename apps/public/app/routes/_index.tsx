import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { getTenant } from "~/services/tenant.server";
import { Card } from "@diner-saas/ui/card";
import { AspectRatio } from "@diner-saas/ui/aspect-ratio";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  
  try {
    // Phase 3 Requirement: Hostname-based tenant resolution
    const hostname = new URL(request.url).hostname;
    const hostnameCache = createHostnameCache(env.KV, env.DB);
    const tenantId = await hostnameCache.getTenantId(hostname);
    
    if (!tenantId) {
      throw new Response("Tenant not found", { status: 404 });
    }
    
    // Create safe database context
    const safeDb = createSafeDb(env.DB, { tenantId });
    
    // Fetch tenant data
    const tenant = await env.DB.prepare(
      `SELECT id, businessName, slug FROM tenants WHERE id = ?`
    ).bind(tenantId).first();
    
    if (!tenant) {
      throw new Response("Tenant not found", { status: 404 });
    }
    
    // Fetch theme config
    const theme = await env.DB.prepare(
      `SELECT 
        primaryColor,
        secondaryColor,
        fontHeading,
        fontBody,
        logoImageCfId,
        heroImageCfId,
        customCss
      FROM theme_config WHERE tenantId = ?`
    ).bind(tenantId).first();
    
    // Fetch business settings
    const settings = await env.DB.prepare(
      `SELECT 
        phonePublic,
        address,
        timezone,
        isHiring,
        emergencyCloseReason,
        emergencyReopenTime
      FROM business_settings WHERE tenantId = ?`
    ).bind(tenantId).first();
    
    // Phase 3 Requirement: Get open status with Truth Hierarchy
    const timezone = settings?.timezone || 'America/New_York';
    const openStatus = await getOpenStatus(safeDb, timezone);
    
    // Get today's hours for display
    const now = new Date();
    const dayOfWeek = now.getDay();
    const todayHours = await getHoursForDay(safeDb, dayOfWeek);
    
    // Fetch menu data
    const categories = await env.DB.prepare(
      `SELECT id, name, sortOrder 
       FROM categories WHERE tenantId = ? AND isVisible = 1 ORDER BY sortOrder`
    ).bind(tenantId).all();
    
    const menuItems = await env.DB.prepare(
      `SELECT 
        id,
        categoryId,
        name,
        description,
        price,
        imageCfId,
        isAvailable,
        dietaryTags,
        dietaryTagsVerified,
        isHighlighted
      FROM menu_items WHERE tenantId = ? AND deletedAt IS NULL`
    ).bind(tenantId).all();
    
    // Group items by category
    const categoriesWithItems = (categories.results || []).map((category: any) => ({
      ...category,
      items: (menuItems.results || []).filter(
        (item: any) => item.categoryId === category.id
      ),
    }));
    
    return json({
      tenant: {
        id: tenant.id,
        businessName: tenant.businessName,
        slug: tenant.slug,
      },
      theme: theme || {},
      settings: {
        phonePublic: settings?.phonePublic || null,
        address: settings?.address || null,
        isHiring: settings?.isHiring || false,
        emergencyCloseReason: settings?.emergencyCloseReason || null,
      },
      openStatus,
      todayHours,
      categories: categoriesWithItems,
      cloudflareImagesUrl: env.CLOUDFLARE_IMAGES_URL || '',
    });
  } catch (error) {
    console.error('[Public Site] Loader error:', error);
    
    // Phase 3 Requirement: Doomsday fallback would be triggered here
    // For now, show a friendly error
    throw new Response("Service temporarily unavailable", { status: 500 });
  }
}

export default function PublicMenu() {
  const { tenant, categories, cloudflareImagesUrl } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const trackItemView = (itemId: number) => {
    // Fire-and-forget tracking request
    fetcher.submit(
      { tenantId: tenant.id, itemId, interactionType: "view" },
      { method: "post", action: "/api/track-interaction", encType: "application/json" }
    );
  };

  return (
    <main className="max-w-4xl mx-auto p-8">
      {/* ... */}
      {categories.map((category) => (
        <section key={category.id} className="mb-12">
          {/* ... */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {category.items.map((item) => (
              <Card 
                key={item.id} 
                className="overflow-hidden cursor-pointer" 
                onClick={() => trackItemView(item.id)}
              >
                {/* ... item content */}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}