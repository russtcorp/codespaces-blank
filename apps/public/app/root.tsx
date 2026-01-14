/**
 * Public Site Root Layout
 * 
 * Phase 3 Implementation:
 * - Server-side CSS variable injection (theming engine) to prevent FOUC
 * - Liability disclaimer footer
 * - Print Mode CSS
 * - Cloudflare Web Analytics
 * - Zaraz pixel injection
 */

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  
  try {
    // Get hostname and resolve tenant for theme injection
    const hostname = new URL(request.url).hostname;
    
    // Query KV cache for tenant ID
    const cacheKey = `host:${hostname}`;
    let tenantId = await env.KV.get(cacheKey);
    
    // Fallback to D1 if cache miss
    if (!tenantId) {
      const mapping = await env.DB.prepare(
        `SELECT tenantId FROM host_mapping WHERE host = ?`
      ).bind(hostname).first();
      
      if (mapping) {
        tenantId = mapping.tenantId;
        // Cache for 60 minutes
        await env.KV.put(cacheKey, tenantId, { expirationTtl: 3600 });
      }
    }
    
    // Fetch theme config if tenant found
    let theme = null;
    if (tenantId) {
      theme = await env.DB.prepare(
        `SELECT * FROM theme_config WHERE tenantId = ?`
      ).bind(tenantId).first();
    }
    
    return json({
      theme: theme || {
        primaryColor: '#dc2626',
        secondaryColor: '#fef3c7',
        fontHeading: 'Inter',
        fontBody: 'Inter',
      },
    });
  } catch (error) {
    console.error('[Root] Theme loader error:', error);
    
    // Return default theme on error
    return json({
      theme: {
        primaryColor: '#dc2626',
        secondaryColor: '#fef3c7',
        fontHeading: 'Inter',
        fontBody: 'Inter',
      },
    });
  }
}

export default function App() {
  const { theme } = useLoaderData<typeof loader>();
  
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        
        {/* Phase 3 Requirement: Server-side CSS variable injection (prevents FOUC) */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --color-primary: ${theme.primaryColor || '#dc2626'};
            --color-secondary: ${theme.secondaryColor || '#fef3c7'};
            --font-heading: ${theme.fontHeading || 'Inter'}, system-ui, sans-serif;
            --font-body: ${theme.fontBody || 'Inter'}, system-ui, sans-serif;
          }
          
          body {
            font-family: var(--font-body);
          }
          
          h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-heading);
          }
          
          /* Phase 3 Requirement: Print Mode CSS */
          @media print {
            /* Hide non-essential elements */
            .print\\:hidden {
              display: none !important;
            }
            
            /* Page formatting */
            @page {
              margin: 0.5in;
            }
            
            body {
              background: white !important;
              color: black !important;
              font-size: 11pt;
            }
            
            /* Menu layout - two columns */
            .print\\:grid-cols-2 {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 0.5rem !important;
            }
            
            /* Prevent page breaks inside items */
            .print\\:break-inside-avoid {
              break-inside: avoid;
            }
            
            /* Remove shadows and colors for printing */
            .print\\:shadow-none {
              box-shadow: none !important;
            }
            
            /* High contrast for readability */
            h1, h2, h3, h4, h5, h6 {
              color: black !important;
            }
            
            /* Remove background colors */
            .print\\:bg-gray-200 {
              background-color: #e5e5e5 !important;
            }
          }
        ` }} />
        
        {/* Cloudflare Web Analytics */}
        {/* Configure token via Cloudflare Dashboard */}
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token":"CONFIGURE_IN_CLOUDFLARE_DASHBOARD"}'
        ></script>
        
        {/* Zaraz - Dynamic Pixel Injection (configured per tenant) */}
        {/* Marketing pixels configured via business_settings and injected by Cloudflare */}
      </head>
      <body className="flex flex-col min-h-screen">
        <main className="flex-grow">
          <Outlet />
        </main>
        
        {/* Phase 3 Requirement: Liability Disclaimer Footer */}
        <footer className="w-full border-t border-gray-200 bg-amber-50 px-4 py-3 text-center text-xs text-gray-700 print:hidden">
          <p>
            <strong>Disclaimer:</strong> Dietary tags are AI-generated suggestions.
            Please confirm all allergen information and dietary restrictions with
            staff before ordering.
          </p>
        </footer>
        
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

