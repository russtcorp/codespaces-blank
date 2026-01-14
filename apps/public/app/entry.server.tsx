/**
 * Server Entry Point (Cloudflare Runtime)
 *
 * Uses renderToReadableStream for Cloudflare. On fatal errors, falls back to
 * serving a static snapshot from R2 (Doomsday Protocol).
 */

import { isbot } from "isbot";
import type { AppLoadContext, EntryContext } from "@remix-run/cloudflare";
import { RemixServer } from "@remix-run/react";
import { renderToReadableStream } from "react-dom/server";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext
) {
  if (isbot(request.headers.get("user-agent"))) {
    return new Response("Please don't crawl us", { status: 403 });
  }

  try {
    const body = await renderToReadableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        onError(error) {
          console.error("[SSR] Render error:", error);
          responseStatusCode = 500;
        },
      }
    );

    await (body as any).allReady;

    responseHeaders.set("Content-Type", "text/html");
    return new Response(body as any, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[Entry Server] Critical error:", error);
    return serveDoomsdayFallback(request, loadContext);
  }
}

async function serveDoomsdayFallback(
  request: Request,
  context: AppLoadContext
): Promise<Response> {
  try {
    const env = (context as any)?.cloudflare?.env;
    const hostname = new URL(request.url).hostname;

    let tenantSlug = "default";
    try {
      const mapping = await env.DB.prepare(
        `SELECT t.slug FROM host_mapping hm JOIN tenants t ON hm.tenant_id = t.id WHERE hm.host = ?`
      )
        .bind(hostname)
        .first();

      if (mapping?.slug) tenantSlug = mapping.slug;
    } catch (dbError) {
      console.error("[Doomsday] DB lookup failed:", dbError);
    }

    const fallbackKey = `fallback/${tenantSlug}.html`;
    const r2Object = await env.ASSETS.get(fallbackKey);
    if (r2Object) {
      return new Response(r2Object.body, {
        status: 503,
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Fallback": "doomsday-r2",
        },
      });
    }
    const html = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Service Temporarily Unavailable</title>
        <style>
          body { font-family: system-ui, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#f3f4f6; }
          .container { max-width: 500px; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align:center; }
          h1 { color: #dc2626; margin-bottom: 1rem; }
          p { color: #6b7280; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Service Temporarily Unavailable</h1>
          <p>We're experiencing technical difficulties. Please try again in a few minutes.</p>
          <p style="margin-top: 2rem; font-size: 0.875rem;">Error Code: DOOMSDAY-FALLBACK</p>
        </div>
      </body>
      </html>`;
    return new Response(html, {
      status: 503,
      headers: { "Content-Type": "text/html", "X-Fallback": "doomsday-minimal" },
    });
  } catch (fallbackError) {
    console.error("[Doomsday] Fallback failed:", fallbackError);
    return new Response("Service Temporarily Unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
