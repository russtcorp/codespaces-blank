import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { getAuthenticator } from "~/services/auth.server";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { categories, menuItems } from "@diner-saas/db";
import { VisualEditor } from "~/components/VisualEditor";

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

export async function action({ request, context }: ActionFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const authenticator = getAuthenticator(env);
  const user = await authenticator.isAuthenticated(request);
  const db = drizzle(env.DB);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    switch (intent) {
      case "create-category": {
        const name = formData.get("name") as string;
        const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;

        const result = await db
          .insert(categories)
          .values({
            tenant_id: user.tenantId,
            name,
            sort_order: sortOrder,
            is_visible: true,
          })
          .returning()
          .get();

        return json({ success: true, category: result });
      }

      case "update-category": {
        const id = parseInt(formData.get("id") as string);
        const name = formData.get("name") as string;
        const sortOrder = parseInt(formData.get("sortOrder") as string);

        await db
          .update(categories)
          .set({ name, sort_order: sortOrder })
          .where(
            and(
              eq(categories.id, id),
              eq(categories.tenant_id, user.tenantId)
            )
          )
          .run();

        return json({ success: true });
      }

      case "delete-category": {
        const id = parseInt(formData.get("id") as string);

        await db
          .update(categories)
          .set({ is_visible: false })
          .where(
            and(
              eq(categories.id, id),
              eq(categories.tenant_id, user.tenantId)
            )
          )
          .run();

        return json({ success: true });
      }

      case "create-item": {
        const categoryId = parseInt(formData.get("categoryId") as string);
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const price = parseFloat(formData.get("price") as string);
        const imageCfId = formData.get("imageCfId") as string || null;

        const result = await db
          .insert(menuItems)
          .values({
            tenant_id: user.tenantId,
            category_id: categoryId,
            name,
            description,
            price,
            image_cf_id: imageCfId,
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
        const id = parseInt(formData.get("id") as string);
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const price = parseFloat(formData.get("price") as string);
        const imageCfId = formData.get("imageCfId") as string || null;
        const isAvailable = formData.get("isAvailable") === "true";

        await db
          .update(menuItems)
          .set({
            name,
            description,
            price,
            image_cf_id: imageCfId,
            is_available: isAvailable,
            embedding_version: db.sql`${menuItems.embedding_version} + 1`,
          })
          .where(
            and(
              eq(menuItems.id, id),
              eq(menuItems.tenant_id, user.tenantId)
            )
          )
          .run();

        return json({ success: true });
      }

      case "delete-item": {
        const id = parseInt(formData.get("id") as string);

        await db
          .delete(menuItems)
          .where(
            and(
              eq(menuItems.id, id),
              eq(menuItems.tenant_id, user.tenantId)
            )
          )
          .run();

        return json({ success: true });
      }

      case "reorder-categories": {
        const orderData = JSON.parse(formData.get("order") as string);
        
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
        const itemId = parseInt(formData.get("itemId") as string);
        const newCategoryId = parseInt(formData.get("newCategoryId") as string);

        await db
          .update(menuItems)
          .set({ category_id: newCategoryId })
          .where(
            and(
              eq(menuItems.id, itemId),
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
