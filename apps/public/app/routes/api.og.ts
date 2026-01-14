import { type LoaderFunctionArgs } from "@remix-run/cloudflare";

/**
 * Generate dynamic Open Graph images for menu items and pages
 * 
 * Simplified version using SVG with embedded HTML
 * 
 * GET /api/og?type=menu-item&item_id=123
 * GET /api/og?type=homepage
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "homepage";
  const itemId = url.searchParams.get("item_id");

  const env = (request as any).env;
  const host = request.headers.get("host") || "";

  // Resolve tenant from hostname
  const tenant = await resolveTenant(host, env);
  if (!tenant) {
    return new Response("Tenant not found", { status: 404 });
  }

  let imageHtml: string;

  switch (type) {
    case "menu-item":
      if (!itemId) {
        return new Response("Missing item_id", { status: 400 });
      }
      imageHtml = await generateMenuItemOG(tenant, itemId, env);
      break;

    case "homepage":
    default:
      imageHtml = generateHomepageOG(tenant);
      break;
  }

  const svg = htmlToSvg(imageHtml);

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

async function resolveTenant(host: string, env: any) {
  const cached = await env.KV.get(`hostname:${host}`, "json");
  if (cached) return cached;

  const result = await env.DB.prepare(
    "SELECT t.id, t.business_name, t.slug, bs.address FROM tenants t LEFT JOIN business_settings bs ON t.id = bs.tenant_id WHERE t.slug = ? OR bs.custom_domain = ?"
  )
    .bind(host.split(".")[0], host)
    .first();

  if (result) {
    await env.KV.put(`hostname:${host}`, JSON.stringify(result), {
      expirationTtl: 3600,
    });
  }

  return result;
}

function generateHomepageOG(tenant: any): string {
  const primaryColor = "#dc2626";
  const businessName = escapeHtml(tenant.business_name);
  const address = escapeHtml(tenant.address || "Great food, great service");

  return `
    <div style="display: flex; flex-direction: column; width: 1200px; height: 630px; background: ${primaryColor}; padding: 60px; font-family: sans-serif; color: white; justify-content: center; align-items: center;">
      <div style="font-size: 72px; font-weight: bold; margin-bottom: 20px; text-align: center;">${businessName}</div>
      <div style="font-size: 32px; opacity: 0.9; text-align: center;">${address}</div>
      <div style="font-size: 24px; margin-top: 40px; padding: 20px 40px; background: white; color: ${primaryColor}; border-radius: 8px; font-weight: bold;">View Our Menu</div>
    </div>
  `;
}

async function generateMenuItemOG(tenant: any, itemId: string, env: any): Promise<string> {
  const item = await env.DB.prepare(
    "SELECT mi.name, mi.description, mi.price, mi.image_cf_id, c.name as category_name FROM menu_items mi LEFT JOIN categories c ON mi.category_id = c.id WHERE mi.id = ? AND mi.tenant_id = ?"
  )
    .bind(itemId, tenant.id)
    .first();

  if (!item) {
    throw new Error("Menu item not found");
  }

  const primaryColor = "#dc2626";
  const itemName = escapeHtml(item.name);
  const description = escapeHtml(item.description || "");
  const category = escapeHtml(item.category_name || "Menu Item");
  const price = `$${Number(item.price).toFixed(2)}`;
  const businessName = escapeHtml(tenant.business_name);

  return `
    <div style="display: flex; width: 1200px; height: 630px; background: white;">
      <div style="display: flex; flex-direction: column; width: 100%; height: 100%; padding: 60px; justify-content: center;">
        <div style="font-size: 20px; color: ${primaryColor}; font-weight: bold; margin-bottom: 10px;">${category}</div>
        <div style="font-size: 56px; font-weight: bold; margin-bottom: 20px; color: #111;">${itemName}</div>
        <div style="font-size: 24px; color: #555; margin-bottom: 30px; line-height: 1.4;">${description}</div>
        <div style="font-size: 48px; font-weight: bold; color: ${primaryColor};">${price}</div>
        <div style="font-size: 18px; color: #999; margin-top: auto;">${businessName}</div>
      </div>
    </div>
  `;
}

function htmlToSvg(html: string): string {
  return `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <foreignObject width="1200" height="630">
        <div xmlns="http://www.w3.org/1999/xhtml">
          ${html}
        </div>
      </foreignObject>
    </svg>
  `;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
