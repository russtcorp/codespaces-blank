import * as cheerio from "cheerio";

/**
 * Extract JSON-LD structured data from HTML
 */
export async function extractJsonLd(html: string): Promise<any[]> {
  const $ = cheerio.load(html);
  const jsonLdScripts: any[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const content = $(element).html();
      if (content) {
        const data = JSON.parse(content);
        jsonLdScripts.push(data);
      }
    } catch (error) {
      console.error("Failed to parse JSON-LD:", error);
    }
  });

  return jsonLdScripts;
}

/**
 * Extract menu items from JSON-LD Restaurant schema
 */
export function extractMenuFromJsonLd(jsonLd: any[]): any[] {
  const menuItems: any[] = [];

  for (const data of jsonLd) {
    // Handle @graph array
    const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];

    for (const item of items) {
      if (!item["@type"]) continue;

      // Restaurant with hasMenu
      if (item["@type"] === "Restaurant" && item.hasMenu) {
        const menu = item.hasMenu;
        if (menu.hasMenuSection) {
          const sections = Array.isArray(menu.hasMenuSection)
            ? menu.hasMenuSection
            : [menu.hasMenuSection];

          for (const section of sections) {
            if (section.hasMenuItem) {
              const items = Array.isArray(section.hasMenuItem)
                ? section.hasMenuItem
                : [section.hasMenuItem];

              for (const menuItem of items) {
                menuItems.push({
                  name: menuItem.name,
                  description: menuItem.description || "",
                  price: parsePrice(menuItem.offers?.price),
                  category: section.name || "Uncategorized",
                  image: menuItem.image || null,
                });
              }
            }
          }
        }
      }

      // Menu/MenuItem types
      if (item["@type"] === "Menu" || item["@type"] === "MenuItem") {
        menuItems.push({
          name: item.name,
          description: item.description || "",
          price: parsePrice(item.offers?.price || item.price),
          category: "Menu",
          image: item.image || null,
        });
      }
    }
  }

  return menuItems;
}

function parsePrice(price: any): number {
  if (typeof price === "number") return price;
  if (typeof price === "string") {
    const cleaned = price.replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  }
  return 0;
}
