import type { AppLoadContext } from '@remix-run/cloudflare';
import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';

const DOOMSDAY_HTML = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Diner Offline</title><style>body{font-family:system-ui,-apple-system,sans-serif;padding:2rem;max-width:640px;margin:0 auto;background:#0f172a;color:#e2e8f0}h1{margin-bottom:0.5rem}a.button{display:inline-block;margin-top:1rem;padding:0.75rem 1rem;border-radius:0.5rem;background:#e11d48;color:white;text-decoration:none;font-weight:600}</style></head><body><h1>Diner is offline</h1><p>We’re performing maintenance or experiencing an outage. Please try again soon.</p><a class="button" href="/doomsday">Try static fallback</a></body></html>`;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: any,
  loadContext: AppLoadContext
) {
  try {
    const body = await renderToReadableStream(remixContext, {
      signal: request.signal,
      onError(error: unknown) {
        console.error(error);
        responseStatusCode = 500;
      },
    });

    if (isbot(request.headers.get('user-agent') || '')) {
      await body.allReady;
    }

    responseHeaders.set('Content-Type', 'text/html');
    return new Response(body, {
      headers: responseHeaders,
      status: responseStatusCode,
    });
  } catch (err) {
    console.error('Doomsday fallback triggered:', err);
    return new Response(DOOMSDAY_HTML, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
