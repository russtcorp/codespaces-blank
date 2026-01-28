import { json, type LinksFunction, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { Toaster } from "@diner-saas/ui/sonner";
import stylesheet from "~/styles/tailwind.css?url";
import { getSession } from "./services/auth.server";
import { getFlags } from "./utils/flags";
import { FlagsInjector } from "./utils/flags";
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient();

// ... (links function)

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { user } = await getSession(request, context);
  const flags = user ? await getFlags(context, user.tenantId) : { flags: {} };
  return json({ user, ...flags });
}

export default function App() {
  const { flags } = useLoaderData<typeof loader>();

  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <FlagsInjector flags={flags} />
      </head>
      <body className="h-full">
        <QueryClientProvider client={queryClient}>
          <Outlet />
          <Toaster />
          <ScrollRestoration />
          <Scripts />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  );
}