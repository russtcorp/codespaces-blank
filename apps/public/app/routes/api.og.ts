import { type LoaderFunctionArgs } from "@remix-run/cloudflare";
import satori from "satori";
import initWasm, { Resvg } from "@resvg/resvg-wasm";
import React from "react";

/**
 * Generate dynamic Open Graph images for menu items and pages
 * 
 * Simplified version using SVG with embedded HTML
 * 
 * GET /api/og?type=menu-item&item_id=123
 * GET /api/og?type=homepage
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "homepage";
  const itemId = url.searchParams.get("item_id");
  const env = (context as any).cloudflare?.env || (request as any).env;
  const host = request.headers.get("host") || "";

  // Resolve tenant from hostname
  const tenant = await resolveTenant(host, env);
  if (!tenant) {
    return new Response("Tenant not found", { status: 404 });
  }

  // Initialize Resvg WASM once per request
  // env.resvg is the wasm module bound in wrangler.toml
  // Safe to call multiple times; initWasm caches
  if (env?.resvg) {
    await initWasm(env.resvg);
  }

  let svg: string;

  switch (type) {
    case "menu-item":
      if (!itemId) {
        return new Response("Missing item_id", { status: 400 });
      }
      svg = await generateMenuItemSvg(tenant, itemId, env);
      break;

    case "homepage":
    default:
      svg = await generateHomepageSvg(tenant);
      break;
  }

  // If Resvg is available, return PNG; otherwise fallback to SVG
  if (env?.resvg) {
    const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
    return new Response(png, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } else {
    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
}

async function resolveTenant(host: string, env: any) {
  const cached = await env.KV.get(`hostname:${host}`, "json");
  if (cached) return cached;

  const result = await env.DB.prepare(
    "SELECT t.id, t.business_name, t.slug, t.custom_domain, bs.address FROM tenants t LEFT JOIN business_settings bs ON t.id = bs.tenant_id WHERE t.slug = ? OR t.custom_domain = ? OR EXISTS (SELECT 1 FROM host_mapping hm WHERE hm.tenant_id = t.id AND hm.host = ?)"
  )
    .bind(getSubdomain(host), host, host)
    .first();

  if (result) {
    await env.KV.put(`hostname:${host}`, JSON.stringify(result), {
      expirationTtl: 3600,
    });
  }

  return result;
}

function getSubdomain(host: string): string {
  const parts = host.split(".");
  if (parts.length >= 3) return parts[0]!;
  return host; // custom domains will not match slug, handled by custom_domain/host_mapping
}

async function generateMenuItemSvg(tenant: any, itemId: string, env: any): Promise<string> {
  const item = await env.DB.prepare(
    "SELECT mi.name, mi.description, mi.price, mi.image_cf_id, c.name as category_name FROM menu_items mi LEFT JOIN categories c ON mi.category_id = c.id WHERE mi.id = ? AND mi.tenant_id = ?"
  )
    .bind(itemId, tenant.id)
    .first();

  if (!item) {
    throw new Error("Menu item not found");
  }

  const primaryColor = "#dc2626";
  const price = `$${Number(item.price).toFixed(2)}`;

  const svg = await satori(
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          width: 1200,
          height: 630,
          background: "white",
          padding: 60,
          fontFamily: "sans-serif",
          color: "#111",
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", width: "100%", height: "100%", justifyContent: "center" } },
        React.createElement(
          "div",
          { style: { fontSize: 20, color: primaryColor, fontWeight: 700, marginBottom: 10 } },
          item.category_name || "Menu Item"
        ),
        React.createElement(
          "div",
          { style: { fontSize: 56, fontWeight: 800, marginBottom: 20 } },
          item.name
        ),
        React.createElement(
          "div",
          { style: { fontSize: 24, color: "#555", marginBottom: 30, lineHeight: 1.4 } },
          item.description || ""
        ),
        React.createElement(
          "div",
          { style: { fontSize: 48, fontWeight: 800, color: primaryColor } },
          price
        ),
        React.createElement(
          "div",
          { style: { fontSize: 18, color: "#999", marginTop: "auto" } },
          tenant.business_name
        )
      )
    ),
    {
      width: 1200,
      height: 630,
      // Minimal fonts array to satisfy Satori; consider embedding Inter in production
      fonts: [] as any,
    }
  );

  return typeof svg === "string" ? svg : new TextDecoder().decode(svg);
}

async function generateHomepageSvg(tenant: any): Promise<string> {
  const primaryColor = "#dc2626";

  const svg = await satori(
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          width: 1200,
          height: 630,
          background: primaryColor,
          padding: 60,
          fontFamily: "sans-serif",
          color: "white",
          justifyContent: "center",
          alignItems: "center",
        },
      },
      React.createElement(
        "div",
        { style: { fontSize: 72, fontWeight: 800, marginBottom: 20, textAlign: "center" } },
        tenant.business_name
      ),
      React.createElement(
        "div",
        { style: { fontSize: 32, opacity: 0.9, textAlign: "center" } },
        tenant.address || "Great food, great service"
      ),
      React.createElement(
        "div",
        { style: { fontSize: 24, marginTop: 40, padding: "20px 40px", background: "white", color: primaryColor, borderRadius: 8, fontWeight: 700 } },
        "View Our Menu"
      )
    ),
    {
      width: 1200,
      height: 630,
      fonts: [] as any,
    }
  );

  return typeof svg === "string" ? svg : new TextDecoder().decode(svg);
}
