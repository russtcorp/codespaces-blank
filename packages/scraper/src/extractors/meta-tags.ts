import * as cheerio from "cheerio";

/**
 * Extract meta tags from HTML
 */
export async function extractMetaTags(html: string): Promise<Record<string, string>> {
  const $ = cheerio.load(html);
  const metaTags: Record<string, string> = {};

  // Standard meta tags
  $("meta[name]").each((_, element) => {
    const name = $(element).attr("name");
    const content = $(element).attr("content");
    if (name && content) {
      metaTags[name] = content;
    }
  });

  // Open Graph meta tags
  $("meta[property]").each((_, element) => {
    const property = $(element).attr("property");
    const content = $(element).attr("content");
    if (property && content) {
      metaTags[property] = content;
    }
  });

  // Twitter meta tags
  $("meta[name^='twitter:']").each((_, element) => {
    const name = $(element).attr("name");
    const content = $(element).attr("content");
    if (name && content) {
      metaTags[name] = content;
    }
  });

  return metaTags;
}
