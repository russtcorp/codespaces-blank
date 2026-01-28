import { type LoaderFunctionArgs } from "@remix-run/cloudflare";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { Toaster } from "@diner-saas/ui/toaster";

import stylesheet from "~/styles/app.css?url";

export const links = () => [{ rel: "stylesheet", href: stylesheet }];

export async function loader({ request }: LoaderFunctionArgs) {
  return {
    url: request.url,
  };
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
