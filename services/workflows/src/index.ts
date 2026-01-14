import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import { scrapeWebsite } from "@diner-saas/scraper";

/**
 * Magic Start Onboarding Workflow
 * 
 * Durable multi-step workflow for automated tenant provisioning:
 * 1. Ingest - Receive business details
 * 2. Scrape - Extract data from existing sources
 * 3. Parse - Use AI to structure menu data
 * 4. Hydrate - Upload images to Cloudflare Images
 * 5. Provision - Create tenant and write to D1
 */
export class MagicStartWorkflow extends WorkflowEntrypoint<Env, OnboardingParams> {
  async run(event: WorkflowEvent<OnboardingParams>, step: WorkflowStep) {
    const { businessName, address, websiteUrl, scrapeGoogle, scrapeWayback, scrapeInstagram } = event.payload;

    // Step 1: Ingest
    const ingestData = await step.do("ingest", async () => {
      return {
        businessName,
        address,
        websiteUrl,
        sources: {
          google: scrapeGoogle || false,
          wayback: scrapeWayback || true,
          instagram: scrapeInstagram || false,
        },
        timestamp: new Date().toISOString(),
      };
    });

    // Step 2: Scrape
    const scrapedData = await step.do("scrape", async () => {
      const results: any = {
        website: null,
        google: null,
        instagram: null,
      };

      // Scrape website if URL provided
      if (websiteUrl) {
        try {
          const websiteData = await scrapeWebsite(
            { 
              url: websiteUrl, 
              useWaybackMachine: ingestData.sources.wayback 
            },
            this.env
          );
          results.website = websiteData;
        } catch (error) {
          console.error("Website scrape failed:", error);
          results.website = { error: String(error) };
        }
      }

      // Scrape Google Maps (if enabled)
      if (ingestData.sources.google) {
        // TODO: Implement Google Places API scraping
        results.google = {
          status: "not_implemented",
          message: "Google Maps scraping will use Places API",
        };
      }

      // Scrape Instagram (if enabled)
      if (ingestData.sources.instagram) {
        // TODO: Implement Instagram API scraping
        results.instagram = {
          status: "not_implemented",
          message: "Instagram scraping will use Graph API",
        };
      }

      return results;
    });

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

    // Step 4: Hydrate (Upload Images)
    const hydratedImages = await step.do("hydrate-images", async () => {
      const images: string[] = [];

      if (scrapedData.website && scrapedData.website.images) {
        for (const imageUrl of scrapedData.website.images.slice(0, 10)) {
          try {
            // Fetch image
            const response = await fetch(imageUrl);
            if (!response.ok) continue;

            const blob = await response.blob();
            
            // Upload to Cloudflare Images
            const formData = new FormData();
            formData.append("file", blob);

            const uploadResponse = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
                },
                body: formData,
              }
            );

            if (uploadResponse.ok) {
              const result = await uploadResponse.json();
              images.push(result.result.id);
            }
          } catch (error) {
            console.error(`Failed to upload image ${imageUrl}:`, error);
          }
        }
      }

      return images;
    });

    // Step 5: Provision
    const provisionResult = await step.do("provision", async () => {
      const tenantId = crypto.randomUUID();
      const slug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Create tenant
      await this.env.DB.prepare(
        `INSERT INTO tenants (id, slug, business_name, subscription_status, status, created_at)
         VALUES (?, ?, ?, 'trial', 'active', ?)`
      )
        .bind(tenantId, slug, businessName, new Date().toISOString())
        .run();

      // Create business settings
      await this.env.DB.prepare(
        `INSERT INTO business_settings (tenant_id, address, phone_public, timezone, is_hiring)
         VALUES (?, ?, '', 'America/New_York', 0)`
      )
        .bind(tenantId, address)
        .run();

      // Create theme config
      const heroImageId = hydratedImages[0] || null;
      await this.env.DB.prepare(
        `INSERT INTO theme_config (tenant_id, primary_color, secondary_color, font_heading, font_body, layout_style, hero_image_cf_id)
         VALUES (?, '#dc2626', '#f3f4f6', 'sans-serif', 'sans-serif', 'grid', ?)`
      )
        .bind(tenantId, heroImageId)
        .run();

      // Create categories and menu items
      const categoryMap = new Map<string, number>();

      for (const item of parsedMenu.items || []) {
        // Create category if doesn't exist
        if (!categoryMap.has(item.category)) {
          const result = await this.env.DB.prepare(
            `INSERT INTO categories (tenant_id, name, sort_order, is_visible)
             VALUES (?, ?, ?, 1)
             RETURNING id`
          )
            .bind(tenantId, item.category, categoryMap.size)
            .first<{ id: number }>();

          if (result) {
            categoryMap.set(item.category, result.id);
          }
        }

        const categoryId = categoryMap.get(item.category);
        if (!categoryId) continue;

        // Create menu item
        await this.env.DB.prepare(
          `INSERT INTO menu_items (tenant_id, category_id, name, description, price, image_cf_id, is_available, embedding_version)
           VALUES (?, ?, ?, ?, ?, NULL, 1, 1)`
        )
          .bind(
            tenantId,
            categoryId,
            item.name,
            item.description || "",
            item.price
          )
          .run();
      }

      return {
        tenantId,
        slug,
        url: `https://${slug}.diner-saas.com`,
        itemCount: parsedMenu.items?.length || 0,
      };
    });

    return {
      success: true,
      workflow_id: event.id,
      result: provisionResult,
      steps: {
        ingest: ingestData,
        scrape: scrapedData,
        parse: parsedMenu,
        hydrate: { imageCount: hydratedImages.length },
        provision: provisionResult,
      },
    };
  }
}

/**
 * Extract menu items from JSON-LD data
 */
function extractMenuFromJsonLd(jsonLd: any[]): any[] {
  const items: any[] = [];

  for (const schema of jsonLd || []) {
    if (schema["@type"]?.includes("Menu") || schema.hasMenu) {
      const menu = schema.hasMenu || schema;

      if (menu.hasMenuSection) {
        for (const section of menu.hasMenuSection) {
          const category = section.name || "Uncategorized";

          if (section.hasMenuItem) {
            for (const item of section.hasMenuItem) {
              items.push({
                name: item.name || "",
                description: item.description || "",
                price: parseFloat(item.offers?.price || item.price || "0"),
                category,
              });
            }
          }
        }
      }
    }
  }

  return items;
}

/**
 * Parse menu text using Workers AI (Llama 3)
 */
async function parseMenuWithAI(menuText: string, ai: any): Promise<any[]> {
  if (!ai) {
    throw new Error("AI binding not available");
  }

  const prompt = `Extract menu items from this text and return them as JSON array. Each item should have: name, description, price (number), category.

Text:
${menuText.slice(0, 4000)}

Return only valid JSON array, no other text.`;

  const response = await ai.run("@cf/meta/llama-3-8b-instruct", {
    prompt,
    max_tokens: 2000,
  });

  // Parse the AI response
  const responseText = response.response || "";
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);

  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return [];
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
        const instance = await env.ONBOARDING_WORKFLOW.get(workflowId);
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
}

interface Env {
  DB: D1Database;
  ASSETS: R2Bucket;
  AI: any;
  BROWSER: any;
  ONBOARDING_WORKFLOW: Workflow;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
}
