export function loader() {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Diner Offline</title></head><body style="font-family:system-ui;padding:2rem;max-width:640px;margin:0 auto;">
      <h1>Diner is offline</h1>
      <p>We're performing maintenance or experiencing an outage. Please try again soon.</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
