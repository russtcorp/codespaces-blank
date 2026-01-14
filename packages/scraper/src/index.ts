import puppeteer, { type Browser } from "@cloudflare/puppeteer";
import { extractJsonLd } from "./extractors/json-ld";
import { extractMetaTags } from "./extractors/meta-tags";
import { extractImages } from "./extractors/images";
import { extractMenuText } from "./extractors/menu-text";

export interface ScrapedData {
  url: string;
  title: string;
  description: string;
  jsonLd: any[];
  metaTags: Record<string, string>;
  images: string[];
  menuText: string;
  screenshot?: string;
}

export interface ScrapeOptions {
  url: string;
  browserEndpoint?: string;
  useWaybackMachine?: boolean;
}

/**
 * Main scraping function using Cloudflare Browser Rendering
 */
export async function scrapeWebsite(
  options: ScrapeOptions,
  env: any
): Promise<ScrapedData> {
  const { url, useWaybackMachine = true } = options;

  // Try to scrape the URL
  try {
    const data = await performScrape(url, env);
    return data;
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error);

    // Fallback to Wayback Machine if enabled
    if (useWaybackMachine) {
      console.log(`Attempting Wayback Machine fallback for ${url}`);
      try {
        const waybackUrl = await getWaybackUrl(url);
        if (waybackUrl) {
          const data = await performScrape(waybackUrl, env);
          return { ...data, url }; // Keep original URL in result
        }
      } catch (waybackError) {
        console.error("Wayback Machine fallback failed:", waybackError);
      }
    }

    throw new Error(`Failed to scrape ${url} and no fallback available`);
  }
}

/**
 * Perform the actual scraping with Puppeteer
 */
async function performScrape(url: string, env: any): Promise<ScrapedData> {
  let browser: Browser | null = null;

  try {
    // Launch browser using Cloudflare Browser Rendering
    browser = await puppeteer.launch({
      executablePath: env.BROWSER_ENDPOINT || undefined,
    });

    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to the page
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    // Extract page title
    const title = await page.title();

    // Get page HTML for parsing
    const html = await page.content();

    // Extract structured data
    const jsonLd = await extractJsonLd(html);
    const metaTags = await extractMetaTags(html);
    const images = await extractImages(html, url);
    const menuText = await extractMenuText(html);

    // Get description from meta tags or first paragraph
    let description = metaTags["og:description"] || metaTags["description"] || "";
    if (!description) {
      const firstParagraph = await page.$eval(
        "p",
        (el) => el.textContent || ""
      ).catch(() => "");
      description = firstParagraph.slice(0, 200);
    }

    // Take screenshot (base64)
    const screenshot = await page.screenshot({ encoding: "base64" });

    await browser.close();

    return {
      url,
      title,
      description,
      jsonLd,
      metaTags,
      images,
      menuText,
      screenshot,
    };
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    throw error;
  }
}

/**
 * Get the most recent snapshot URL from Wayback Machine
 */
async function getWaybackUrl(url: string): Promise<string | null> {
  try {
    const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.archived_snapshots?.closest?.available) {
      return data.archived_snapshots.closest.url;
    }

    return null;
  } catch (error) {
    console.error("Wayback Machine API error:", error);
    return null;
  }
}

export { extractJsonLd, extractMetaTags, extractImages, extractMenuText };
