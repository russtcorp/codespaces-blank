import * as cheerio from "cheerio";

/**
 * Extract menu-related text content from HTML
 */
export async function extractMenuText(html: string): Promise<string> {
  const $ = cheerio.load(html);
  const menuTexts: string[] = [];

  // Common menu-related selectors
  const menuSelectors = [
    "#menu",
    ".menu",
    "[class*='menu']",
    "#food",
    ".food",
    "[class*='food']",
    "#items",
    ".items",
    "[class*='items']",
    "section[id*='menu']",
    "div[id*='menu']",
  ];

  for (const selector of menuSelectors) {
    $(selector).each((_, element) => {
      const text = $(element).text();
      if (text && text.length > 50) {
        // Filter out navigation/short texts
        menuTexts.push(text);
      }
    });
  }

  // If no menu sections found, try to extract from tables
  if (menuTexts.length === 0) {
    $("table").each((_, element) => {
      const text = $(element).text();
      // Check if table might contain menu items (has price indicators)
      if (text && (text.includes("$") || text.includes("price"))) {
        menuTexts.push(text);
      }
    });
  }

  // Fallback: extract all paragraphs that might contain menu items
  if (menuTexts.length === 0) {
    $("p, li").each((_, element) => {
      const text = $(element).text();
      // Look for price patterns
      if (text && (text.match(/\$\d+/) || text.match(/\d+\.\d{2}/))) {
        menuTexts.push(text);
      }
    });
  }

  // Clean and combine text
  const combinedText = menuTexts
    .map((text) =>
      text
        .replace(/\s+/g, " ")
        .replace(/\n+/g, "\n")
        .trim()
    )
    .join("\n\n");

  return combinedText;
}

/**
 * Parse menu items from unstructured text using patterns
 */
export function parseMenuFromText(text: string): any[] {
  const items: any[] = [];
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Pattern: "Item Name ... $12.99" or "Item Name - $12.99"
    const priceMatch = line.match(/^(.+?)[\s.-]+\$(\d+\.?\d{0,2})$/);
    if (priceMatch) {
      const name = priceMatch[1].trim();
      const price = parseFloat(priceMatch[2]);

      // Look for description in next line if it doesn't have a price
      let description = "";
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !nextLine.match(/\$\d+/)) {
          description = nextLine;
          i++; // Skip the description line
        }
      }

      items.push({
        name,
        description,
        price,
        category: "Menu",
      });
    }
  }

  return items;
}
