import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { getTenant } from "~/services/tenant.server";
import { Card } from "@diner-saas/ui/card";
import { AspectRatio } from "@diner-saas/ui/aspect-ratio";

export async function loader({ request, context }: LoaderFunctionArgs) {
  // ... (existing loader)
}

export default function PublicMenu() {
  const { tenant, categories, cloudflareImagesUrl } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const trackItemView = (itemId: number) => {
    // Fire-and-forget tracking request
    fetcher.submit(
      { tenantId: tenant.id, itemId, interactionType: "view" },
      { method: "post", action: "/api/track-interaction", encType: "application/json" }
    );
  };

  return (
    <main className="max-w-4xl mx-auto p-8">
      {/* ... */}
      {categories.map((category) => (
        <section key={category.id} className="mb-12">
          {/* ... */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {category.items.map((item) => (
              <Card 
                key={item.id} 
                className="overflow-hidden cursor-pointer" 
                onClick={() => trackItemView(item.id)}
              >
                {/* ... item content */}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}