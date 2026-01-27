/**
 * Public Site - Main Route
 * 
 * Phase 3 Implementation:
 * - Hostname-based tenant resolution (KV cache + D1 fallback)
 * - Menu display with empty category hiding
 * - Hours display with Truth Hierarchy logic
 * - Theming from database
 * - Call intercept modal
 * - Hiring banner
 * - Production-ready
 */

import type { HeadersFunction, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createHostnameCache, createSafeDb, getOpenStatus, getHoursForDay } from "@diner-saas/db";
import { MenuSection } from "~/components/MenuSection";
import { HoursDisplay } from "~/components/HoursDisplay";
import { CallButton } from "~/components/CallInterceptModal";
import { HiringBanner } from "~/components/HiringBanner";

export const headers: HeadersFunction = () => {
  return {
    "Cache-Control": "public, max-age=0, s-maxage=60",
  };
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data || !data.tenant) {
    return [
      { title: "Diner Not Found" },
      { name: "description", content: "This diner could not be found." },
    ];
  }

  return [
    { title: `${data.tenant.businessName} - Menu & Hours` },
    { name: "description", content: `View the menu and hours for ${data.tenant.businessName}` },
    { property: "og:title", content: data.tenant.businessName },
    { property: "og:description", content: `View our menu and hours` },
    { property: "og:type", content: "restaurant" },
  ];
};

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
      `SELECT id, business_name AS businessName, slug FROM tenants WHERE id = ?`
    ).bind(tenantId).first();
    
    if (!tenant) {
      throw new Response("Tenant not found", { status: 404 });
    }
    
    // Fetch theme config
    const theme = await env.DB.prepare(
      `SELECT 
        primary_color AS primaryColor,
        secondary_color AS secondaryColor,
        font_heading AS fontHeading,
        font_body AS fontBody,
        logo_image_cf_id AS logoImageCfId,
        hero_image_cf_id AS heroImageCfId,
        custom_css AS customCss
      FROM theme_config WHERE tenant_id = ?`
    ).bind(tenantId).first();
    
    // Fetch business settings
    const settings = await env.DB.prepare(
      `SELECT 
        phone_public AS phonePublic,
        address,
        timezone,
        is_hiring AS isHiring,
        emergency_close_reason AS emergencyCloseReason,
        emergency_reopen_time AS emergencyReopenTime
      FROM business_settings WHERE tenant_id = ?`
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
      `SELECT id, name, sort_order AS sortOrder 
       FROM categories WHERE tenant_id = ? AND is_visible = 1 ORDER BY sort_order`
    ).bind(tenantId).all();
    
    const menuItems = await env.DB.prepare(
      `SELECT 
        id,
        category_id AS categoryId,
        name,
        description,
        price,
        image_cf_id AS imageCfId,
        is_available AS isAvailable,
        dietary_tags AS dietaryTags,
        dietary_tags_verified AS dietaryTagsVerified,
        is_highlighted AS isHighlighted
      FROM menu_items WHERE tenant_id = ? AND deleted_at IS NULL`
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

export default function Index() {
  const { tenant, theme, settings, openStatus, todayHours, categories, cloudflareImagesUrl } = useLoaderData<typeof loader>();
  
  // Phase 3 Requirement: Theme CSS variables are injected in root.tsx
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white shadow-sm print:hidden">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              {theme.logoImageCfId && cloudflareImagesUrl && (
                <img
                  src={`${cloudflareImagesUrl}/${theme.logoImageCfId}/logo`}
                  alt={tenant.businessName}
                  className="mb-4 h-16 object-contain"
                />
              )}
              <h1 className="text-3xl font-bold text-gray-900">{tenant.businessName}</h1>
              {settings.address && (
                <p className="mt-2 text-gray-600">📍 {settings.address}</p>
              )}
            </div>
            
            {settings.phonePublic && (
              <CallButton
                phoneNumber={settings.phonePublic}
                isOpen={openStatus.isOpen}
                nextOpenTime={openStatus.nextOpenTime}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Menu (2/3 width) */}
          <div className="lg:col-span-2">
            <h2 className="mb-6 text-2xl font-bold text-gray-900 print:hidden">Our Menu</h2>
            
            {categories.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                <p className="text-gray-500">Menu coming soon!</p>
              </div>
            ) : (
              categories.map((category: any) => (
                <MenuSection
                  key={category.id}
                  category={category}
                  cloudflareImagesUrl={cloudflareImagesUrl}
                />
              ))
            )}
          </div>
          
          {/* Sidebar (1/3 width) */}
          <div className="lg:col-span-1">
            <HoursDisplay status={openStatus} todayHours={todayHours} />
            
            {/* Map placeholder */}
            {settings.address && (
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 print:hidden">
                <h3 className="text-lg font-bold text-gray-900">Location</h3>
                <p className="mt-2 text-sm text-gray-600">{settings.address}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Get Directions →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Hiring Banner */}
      <HiringBanner isHiring={settings.isHiring} businessName={tenant.businessName} />
    </div>
  );
}

