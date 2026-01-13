import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useMatches,
} from '@remix-run/react';
import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  { rel: 'manifest', href: '/api.manifest' },
  { rel: 'apple-touch-icon', href: '/icons/icon-192.png' },
  { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/icon-32.png' },
  { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/icons/icon-16.png' },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const hostname = new URL(request.url).hostname;
  
  return {
    hostname,
    env: {
      // Add any public environment variables here
    },
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const matches = useMatches();
  const themeStyle = matches
    .map((m) => (m.data as Record<string, unknown> | undefined))
    .find((d) => d && typeof d.themeStyle === 'string') as { themeStyle?: string } | undefined;
  const themeCss = themeStyle?.themeStyle;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="var(--primary, #b22222)" />
        <Meta />
        <Links />
        {themeCss ? <style dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Diner fallback</title>
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <main className="mx-auto max-w-2xl px-6 py-16 space-y-4">
          <h1 className="text-2xl font-bold">We hit a snag</h1>
          <p>Something went wrong loading this page. You can try again or load the static fallback.</p>
          <a
            href="/doomsday"
            className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 font-semibold text-white shadow hover:bg-rose-500"
          >
            Open fallback
          </a>
          <pre className="mt-4 rounded-md bg-slate-900 p-3 text-xs text-slate-300 overflow-auto">
            {error.message}
          </pre>
        </main>
        <Scripts />
      </body>
    </html>
  );
}

export function CatchBoundary() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Not found</title>
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <main className="mx-auto max-w-2xl px-6 py-16 space-y-4">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <p>We couldn’t find that page. Return home or try the static fallback.</p>
          <div className="flex gap-3">
            <a className="rounded-md bg-slate-900 px-4 py-2 text-white" href="/">Home</a>
            <a className="rounded-md bg-rose-600 px-4 py-2 text-white" href="/doomsday">Fallback</a>
          </div>
        </main>
        <Scripts />
      </body>
    </html>
  );
}
