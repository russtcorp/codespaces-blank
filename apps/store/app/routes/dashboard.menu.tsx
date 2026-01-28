import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { getAuthenticator } from "~/services/auth.server";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { categories, menuItems } from "@diner-saas/db";
import { VisualEditor } from "~/components/VisualEditor";
import { getValidatedFormData } from "remix-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { menuActionSchema } from "~/schemas";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const authenticator = getAuthenticator(env);
  const user = await authenticator.isAuthenticated(request);
  const db = drizzle(env.DB);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  // Fetch categories and menu items for this tenant
  const tenantCategories = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.tenant_id, user.tenantId),
        eq(categories.is_visible, true)
      )
    )
    .orderBy(categories.sort_order)
    .all();

  const tenantMenuItems = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.tenant_id, user.tenantId))
    .all();

  // Group items by category
  const categoriesWithItems = tenantCategories.map((category: any) => ({
    ...category,
    items: tenantMenuItems.filter((item: any) => item.category_id === category.id),
  }));

  return json({ 
    categories: categoriesWithItems,
    user,
    cloudflareImagesUrl: env?.CLOUDFLARE_IMAGES_URL || "",
  });
}

const resolver = zodResolver(menuActionSchema);

export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const authenticator = getAuthenticator(env);
  const user = await authenticator.isAuthenticated(request);
  const db = drizzle(env.DB);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  // Validate form data
  const { errors, data, receivedValues } = await getValidatedFormData<any>(
    request,
    resolver
  );

  if (errors) {
    return json({ error: "Validation failed", errors }, { status: 400 });
  }

  const intent = data.intent;

  try {
    switch (intent) {
      case "create-category": {
        const result = await db
          .insert(categories)
          .values({
            tenant_id: user.tenantId,
            name: data.name,
            sort_order: data.sortOrder,
            is_visible: true,
          })
          .returning()
          .get();

        return json({ success: true, category: result });
      }

      case "update-category": {
        await db
          .update(categories)
          .set({ name: data.name, sort_order: data.sortOrder })
          .where(
            and(
              eq(categories.id, data.id),
              eq(categories.tenant_id, user.tenantId)
            )
          )
          .run();

        return json({ success: true });
      }

      case "delete-category": {
        await db
          .update(categories)
          .set({ is_visible: false })
          .where(
            and(
              eq(categories.id, data.id),
              eq(categories.tenant_id, user.tenantId)
            )
          )
          .run();

        return json({ success: true });
      }

      case "create-item": {
        const result = await db
          .insert(menuItems)
          .values({
            tenant_id: user.tenantId,
            category_id: data.categoryId,
            name: data.name,
            description: data.description || "",
            price: data.price,
            image_cf_id: data.imageCfId || null,
            is_available: true,
            dietary_tags: null,
            dietary_tags_verified: false,
            sentiment_score: null,
            is_highlighted: false,
            embedding_version: 1,
          })
          .returning()
          .get();

        return json({ success: true, item: result });
      }

      case "update-item": {
        await db
          .update(menuItems)
          .set({
            name: data.name,
            description: data.description || "",
            price: data.price,
            image_cf_id: data.imageCfId || null,
            is_available: data.isAvailable,
            embedding_version: db.sql`${menuItems.embedding_version} + 1`,
          })
          .where(
            and(
              eq(menuItems.id, data.id),
              eq(menuItems.tenant_id, user.tenantId)
            )
          )
          .run();

        return json({ success: true });
      }

      case "delete-item": {
        await db
          .delete(menuItems)
          .where(
            and(
              eq(menuItems.id, data.id),
              eq(menuItems.tenant_id, user.tenantId)
            )
          )
          .run();

        return json({ success: true });
      }

      case "reorder-categories": {
        const orderData = JSON.parse(data.order);
        
        // Update sort order for each category
        for (const { id, sortOrder } of orderData) {
          await db
            .update(categories)
            .set({ sort_order: sortOrder })
            .where(
              and(
                eq(categories.id, id),
                eq(categories.tenant_id, user.tenantId)
              )
            )
            .run();
        }

        return json({ success: true });
      }

      case "move-item": {
        await db
          .update(menuItems)
          .set({ category_id: data.newCategoryId })
          .where(
            and(
              eq(menuItems.id, data.itemId),
              eq(menuItems.tenant_id, user.tenantId)
            )
          )
          .run();

        return json({ success: true });
      }

      case "request-upload-url": {
        // Request a Direct Creator Upload URL from Cloudflare Images
        const accountId = env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = env.CLOUDFLARE_API_TOKEN;

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          }
        );

        const data: any = await response.json();

        if (!data.success) {
          return json({ error: "Failed to get upload URL" }, { status: 500 });
        }

        return json({
          success: true,
          uploadUrl: data.result.uploadURL,
          imageId: data.result.id,
        });
      }

      case "generate-description": {
        // Use Workers AI to generate description
        if (!env.AI) {
          return json({ error: "AI binding not found" }, { status: 500 });
        }

        // We can import prompts from @diner-saas/ai if we had the package built, 
        // but for now we'll inline the simple prompt logic or assume the package is available.
        // The package.json analysis showed @diner-saas/ai is a dependency.
        
        const systemPrompt = `Generate an appetizing, concise menu item description (2-3 sentences max). 
Focus on key ingredients, preparation method, and what makes it special. 
Use vivid but professional language. Do not include price or availability.`;

        const userPrompt = `Item Name: ${data.name}\nIngredients/Notes: ${data.ingredients || "None"}`;

        try {
            const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ]
            });
            
            // Handle different AI response formats (stream vs string vs object)
            // Workers AI usually returns { response: string } for non-streaming
            const description = typeof response === 'string' ? response : response.response;
            return json({ success: true, description });
        } catch (err: any) {
            console.error("AI Error", err);
            return json({ error: "Failed to generate description" }, { status: 500 });
        }
      }

      default:
        return json({ error: "Invalid intent" }, { status: 400 });
    }
  } catch (error) {
    console.error("Menu action error:", error);
    return json({ error: "Operation failed" }, { status: 500 });
  }
}

export default function DashboardMenu() {
  const { categories, cloudflareImagesUrl } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Menu Editor</h1>
        <p className="mt-2 text-gray-600">
          Drag and drop to reorder categories and items.
        </p>
      </div>

      <VisualEditor
        categories={categories}
        cloudflareImagesUrl={cloudflareImagesUrl}
        fetcher={fetcher}
      />
    </div>
  );
}
