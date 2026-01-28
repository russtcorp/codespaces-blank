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

// ... (loader function remains the same)

const resolver = zodResolver(menuActionSchema);

export async function action({ request, context }: ActionFunctionArgs) {
  // ... (auth and db setup)

  const { errors, data, receivedValues } = await getValidatedFormData<any>(request, resolver);
  if (errors) { /* ... */ }

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