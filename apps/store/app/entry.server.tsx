import type { AppLoadContext, EntryContext } from "@remix-run/cloudflare";
import { RemixServer } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { Logger } from "@diner-saas/logger";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext
) {
  // Initialize Logger (which handles Sentry)
  const env = (loadContext as any).cloudflare.env;
  const ctx = (loadContext as any).cloudflare.ctx;
  const logger = new Logger(request, env, ctx);

  try {
    const body = await renderToReadableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        signal: request.signal,
        onError(error: unknown) {
          // Log error with context
          logger.error(error instanceof Error ? error : String(error));
          responseStatusCode = 500;
        },
      }
    );

    if (isbot(request.headers.get("user-agent") || "")) {
      await body.allReady;
    }

    responseHeaders.set("Content-Type", "text/html");
    return new Response(body, {
      headers: responseHeaders,
      status: responseStatusCode,
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : String(error));
    return new Response("Internal Server Error", { status: 500 });
  }
}
