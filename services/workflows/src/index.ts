import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import { scrapeWebsite } from "@diner-saas/scraper";
import { generateObject } from "ai";
import { createWorkersAI } from "workers-ai-provider";
import { z } from "zod";

// Define the schema for the menu extraction
const menuSchema = z.object({
  items: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    price: z.coerce.number(), // Use coerce to handle string inputs from LLM
    category: z.string()
  }))
});

/**
 * Magic Start Onboarding Workflow
 * ... (rest of the file stays the same until parseMenuWithAI)
 */
export class MagicStartWorkflow extends WorkflowEntrypoint<Env, OnboardingParams> {
  // ... (run method stays same until step 3)

    // Step 3: Parse (AI)
    const parsedMenu = await step.do("parse-ai", async () => {
      if (!scrapedData.website || scrapedData.website.error) {
        return { items: [], error: "No website data to parse" };
      }

      // Try to extract from JSON-LD first
      const jsonLdItems = extractMenuFromJsonLd(scrapedData.website.jsonLd);
      if (jsonLdItems && jsonLdItems.length > 0) {
        return { items: jsonLdItems, source: "json-ld" };
      }

      // Fallback to AI parsing of text
      if (scrapedData.website.menuText) {
        try {
          const aiParsed = await parseMenuWithAI(
            scrapedData.website.menuText,
            this.env.AI
          );
          return { items: aiParsed, source: "ai" };
        } catch (error) {
          console.error("AI parsing failed:", error);
          return { items: [], error: String(error) };
        }
      }

      return { items: [], error: "No parseable menu data found" };
    });

    // ... (rest of run method)
}

// ... (extractMenuFromJsonLd stays same)

/**
 * Parse menu text using Vercel AI SDK + Workers AI
 */
async function parseMenuWithAI(menuText: string, aiBinding: any): Promise<any[]> {
  const workersAI = createWorkersAI({ binding: aiBinding });

  const result = await generateObject({
    model: workersAI("@cf/meta/llama-3-8b-instruct"),
    schema: menuSchema,
    system: "You are a data extraction assistant. Extract menu items from the text. For each item, identify the name, description, price (as a number), and category (e.g., Appetizers, Entrees).",
    prompt: `Extract menu items from this text:\n\n${menuText.slice(0, 4000)}`,
  });

  return result.object.items;
}

// ... (rest of file)

async function provisionFromPreview(env: Env, data: any) {
  const businessName: string = data.ingest?.businessName || "New Diner";
  const address: string = data.ingest?.address || "";
  const items: any[] = data.parsed?.items || [];
  const hydratedImages: string[] = data.hydratedImages || [];

  const tenantId = crypto.randomUUID();
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Create tenant
  await env.DB.prepare(
    `INSERT INTO tenants (id, slug, business_name, subscription_status, status, created_at)
     VALUES (?, ?, ?, 'trial', 'active', ?)`
  ).bind(tenantId, slug, businessName, new Date().toISOString()).run();

  // Create business settings
  await env.DB.prepare(
    `INSERT INTO business_settings (tenant_id, address, phone_public, timezone, is_hiring)
     VALUES (?, ?, '', 'America/New_York', 0)`
  ).bind(tenantId, address).run();

  // Create theme config
  const heroImageId = hydratedImages[0] || null;
  await env.DB.prepare(
    `INSERT INTO theme_config (tenant_id, primary_color, secondary_color, font_heading, font_body, layout_style, hero_image_cf_id)
     VALUES (?, '#dc2626', '#f3f4f6', 'sans-serif', 'sans-serif', 'grid', ?)`
  ).bind(tenantId, heroImageId).run();

  // Create categories and menu items
  const categoryMap = new Map<string, number>();

  for (const item of items) {
    const category = item.category || 'Menu';
    if (!categoryMap.has(category)) {
      const result = await env.DB.prepare(
        `INSERT INTO categories (tenant_id, name, sort_order, is_visible)
         VALUES (?, ?, ?, 1)
         RETURNING id`
      ).bind(tenantId, category, categoryMap.size).first<{ id: number }>();

      if (result) categoryMap.set(category, result.id);
    }

    const categoryId = categoryMap.get(category);
    if (!categoryId) continue;

    await env.DB.prepare(
      `INSERT INTO menu_items (tenant_id, category_id, name, description, price, image_cf_id, is_available, embedding_version)
       VALUES (?, ?, ?, ?, ?, NULL, 1, 1)`
    ).bind(tenantId, categoryId, item.name || '', item.description || '', item.price || 0).run();
  }

  // Optional: trigger Cloudflare for SaaS custom hostname
  if (data.ingest?.customDomain && env.CLOUDFLARE_ZONE_ID && env.CLOUDFLARE_API_TOKEN) {
    try {
      await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hostname: data.ingest.customDomain }),
      });
    } catch (e) {
      console.error("Cloudflare for SaaS custom hostname failed:", e);
    }
  }

  return {
    tenantId,
    slug,
    url: `https://${slug}.diner-saas.com`,
    itemCount: items.length,
  };
}

// HTTP Handler to trigger workflows
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Start new onboarding workflow
    if (url.pathname === "/start" && request.method === "POST") {
      try {
        const body = await request.json<OnboardingParams>();

        // Validate input
        if (!body.businessName || !body.address) {
          return Response.json(
            { error: "businessName and address are required" },
            { status: 400 }
          );
        }

        // Trigger workflow
        const instance = await env.ONBOARDING_WORKFLOW.create({
          params: body,
        });

        return Response.json({
          success: true,
          workflow_id: instance.id,
        });
      } catch (error) {
        return Response.json(
          { error: String(error) },
          { status: 500 }
        );
      }
    }

    // Get workflow status
    if (url.pathname.startsWith("/status/")) {
      const workflowId = url.pathname.split("/")[2];
      
      try {
        const instance = await env.ONBOARDING_WORKFLOW.get(workflowId!);
        const status = await instance.status();

        return Response.json({
          workflow_id: workflowId,
          status: status.status,
          output: status.output,
        });
      } catch (error) {
        return Response.json(
          { error: "Workflow not found" },
          { status: 404 }
        );
      }
    }

    // Get preview payload for visual diff (screenshot + parsed menu)
    if (url.pathname.startsWith("/preview/")) {
      const previewId = url.pathname.split("/")[2];
      const obj = await env.ASSETS.get(`workflows/preview/${previewId}.json`);
      if (!obj) {
        return Response.json({ error: "Preview not found" }, { status: 404 });
      }
      const data: any = await obj.json();
      // Return only the necessary fields for UI
      return Response.json({
        preview_id: previewId,
        screenshot: data.scraped?.website?.screenshot || null,
        items: data.parsed?.items || [],
        images: data.hydratedImages || [],
      });
    }

    // Approve and provision the tenant from stored preview
    if (url.pathname.startsWith("/approve/") && request.method === "POST") {
      const previewId = url.pathname.split("/")[2];
      const obj = await env.ASSETS.get(`workflows/preview/${previewId}.json`);
      if (!obj) {
        return Response.json({ error: "Preview not found" }, { status: 404 });
      }
      const data: any = await obj.json();

      try {
        const result = await provisionFromPreview(env, data);
        // Optionally delete preview after success
        await env.ASSETS.delete(`workflows/preview/${previewId}.json`).catch(() => {});
        return Response.json({ success: true, result });
      } catch (error) {
        return Response.json({ error: String(error) }, { status: 500 });
      }
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};

interface OnboardingParams {
  businessName: string;
  address: string;
  websiteUrl?: string;
  scrapeGoogle?: boolean;
  scrapeWayback?: boolean;
  scrapeInstagram?: boolean;
  customDomain?: string;
}

interface Env {
  DB: D1Database;
  ASSETS: R2Bucket;
  AI: any;
  BROWSER: any;
  ONBOARDING_WORKFLOW: Workflow;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ZONE_ID?: string;
}
