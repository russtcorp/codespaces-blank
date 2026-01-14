import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        
        {/* Cloudflare Web Analytics */}
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token":"YOUR_CF_ANALYTICS_TOKEN"}'
        ></script>
        
        {/* Zaraz - Dynamic Pixel Injection (loaded via Cloudflare Zaraz) */}
        {/* Marketing pixels configured via tenant business_settings and injected by Cloudflare */}
      </head>
      <body className="flex flex-col min-h-screen">
        <main className="flex-grow">
          <Outlet />
        </main>
        
        {/* Footer with Liability Disclaimer */}
        <footer className="w-full border-t border-gray-200 bg-amber-50 px-4 py-3 text-center text-xs text-gray-700">
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
