import { isbot } from "isbot";
import { type LoaderFunctionArgs } from "@remix-run/cloudflare";

import { createHtmlString } from "remix-utils/create-html-string.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  if (isbot(request.headers.get("user-agent"))) {
    throw new Response("Please don't crawl us", { status: 403 });
  }

  return new Response("OK");
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div id="app">Loading...</div>
      </body>
    </html>
  );
}
