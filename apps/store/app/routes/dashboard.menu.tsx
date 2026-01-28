import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { getAuthenticator } from "~/services/auth.server";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { categories, menuItems } from "@diner-saas/db";
import { VisualEditor } from "~/components/VisualEditor";
import { getValidatedFormData } from "remix-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { menuActionSchema } from "@diner-saas/db/schemas";
import { INTENTS } from "@diner-saas/db/intents";

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
        eq(categories.tenantId, user.tenantId),
        eq(categories.isVisible, true)
      )
    )
    .orderBy(categories.sortOrder)
    .all();

  const tenantMenuItems = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.tenantId, user.tenantId))
    .all();

  // Group items by category
  const categoriesWithItems = tenantCategories.map((category: any) => ({
    ...category,
    items: tenantMenuItems.filter((item: any) => item.categoryId === category.id),
  }));

  return json({ 
    categories: categoriesWithItems,
    user,
    cloudflareImagesUrl: env?.CLOUDFLARE_IMAGES_URL || "",
  });
}

const resolver = zodResolver(menuActionSchema);

export async function action({ request, context }: ActionFunctionArgs) {
  // ... (auth and db setup)

  const { errors, data, receivedValues } = await getValidatedFormData<any>(request, resolver);
  if (errors) { /* ... */ }
  // Validate form data
  const { errors, data } = await getValidatedFormData<any>(
    request,
    resolver
  );

  if (errors) {
    return json({ error: "Validation failed", errors }, { status: 400 });
  }

  const intent = data.intent;

  try {
    switch (intent) {
      case INTENTS.createCategory: { /* ... */ }
      case INTENTS.updateCategory: { /* ... */ }
      case INTENTS.deleteCategory: { /* ... */ }
      case INTENTS.createItem: { /* ... */ }
      case INTENTS.updateItem: { /* ... */ }
      case INTENTS.deleteItem: { /* ... */ }
      case INTENTS.reorderCategories: { /* ... */ }
      case INTENTS.moveItem: { /* ... */ }
      case INTENTS.requestUploadUrl: { /* ... */ }
      case INTENTS.generateDescription: { /* ... */ }
      case "create-category": {
        const result = await db
          .insert(categories)
          .values({
            tenantId: user.tenantId,
            name: data.name,
            sortOrder: data.sortOrder,
            isVisible: true,
          })
          .returning()
          .get();

        return json({ success: true, category: result });
      }

      case "update-category": {
        await db
          .update(categories)
          .set({ name: data.name, sortOrder: data.sortOrder })
          .where(
            and(
              eq(categories.id, data.id),
              eq(categories.tenantId, user.tenantId)
            )
          )
          .run();

        return json({ success: true });
      }

      case "delete-category": {
        await db
          .update(categories)
          .set({ isVisible: false })
          .where(
            and(
              eq(categories.id, data.id),
              eq(categories.tenantId, user.tenantId)
            )
          )
          .run();

        return json({ success: true });
      }

      case "create-item": {
        const result = await db
          .insert(menuItems)
          .values({
            tenantId: user.tenantId,
            categoryId: data.categoryId,
            name: data.name,
            description: data.description || "",
            price: data.price,
            imageCfId: data.imageCfId || null,
            isAvailable: true,
            dietaryTags: null,
            dietaryTagsVerified: false,
            sentimentScore: null,
            isHighlighted: false,
            embeddingVersion: 1,
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
            imageCfId: data.imageCfId || null,
            isAvailable: data.isAvailable,
            embeddingVersion: db.sql`${menuItems.embeddingVersion} + 1`,
          })
          .where(
            and(
              eq(menuItems.id, data.id),
              eq(menuItems.tenantId, user.tenantId)
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
              eq(menuItems.tenantId, user.tenantId)
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
            .set({ sortOrder: sortOrder })
            .where(
              and(
                eq(categories.id, id),
                eq(categories.tenantId, user.tenantId)
              )
            )
            .run();
        }

        return json({ success: true });
      }

      case "move-item": {
        await db
          .update(menuItems)
          .set({ categoryId: data.newCategoryId })
          .where(
            and(
              eq(menuItems.id, data.itemId),
              eq(menuItems.tenantId, user.tenantId)
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
    // ...
  }
}

export default function DashboardMenu() {
  // ...
}