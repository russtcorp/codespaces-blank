import { type LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader({ request }: LoaderFunctionArgs) {
  return {
    message: "Welcome to the Diner SaaS Admin Dashboard",
  };
}

import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <html lang="en">
      <head>
        {/* ... */}
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <Outlet />
          <ScrollRestoration />
          <Scripts />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  );
}

