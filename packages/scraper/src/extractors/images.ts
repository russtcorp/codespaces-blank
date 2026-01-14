import * as cheerio from "cheerio";

/**
 * Extract high-resolution images from HTML
 */
export async function extractImages(html: string, baseUrl: string): Promise<string[]> {
  const $ = cheerio.load(html);
  const images: Set<string> = new Set();

  // Extract from img tags
  $("img").each((_, element) => {
    const src = $(element).attr("src") || $(element).attr("data-src");
    if (src) {
      images.add(resolveUrl(src, baseUrl));
    }

    // Check for srcset
    const srcset = $(element).attr("srcset");
    if (srcset) {
      const sources = srcset.split(",");
      for (const source of sources) {
        const url = source.trim().split(" ")[0];
        if (url) {
          images.add(resolveUrl(url, baseUrl));
        }
      }
    }
  });

  // Extract from Open Graph
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) {
    images.add(resolveUrl(ogImage, baseUrl));
  }

  // Extract from picture elements
  $("picture source").each((_, element) => {
    const srcset = $(element).attr("srcset");
    if (srcset) {
      const url = srcset.split(",")[0].trim().split(" ")[0];
      if (url) {
        images.add(resolveUrl(url, baseUrl));
      }
    }
  });

  // Filter and sort by likely quality
  const filteredImages = Array.from(images).filter((url) => {
    // Filter out common non-content images
    const lowQualityPatterns = [
      /icon/i,
      /logo/i,
      /avatar/i,
      /thumbnail/i,
      /sprite/i,
      /pixel/i,
      /tracking/i,
      /\.svg$/i,
    ];

    return !lowQualityPatterns.some((pattern) => pattern.test(url));
  });

  return filteredImages;
}

/**
 * Resolve relative URLs to absolute
 */
function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

/**
 * Check if image is high-resolution (>1000px in either dimension)
 */
export async function isHighResImage(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    const contentLength = parseInt(response.headers.get("content-length") || "0");

    // Heuristic: Files > 100KB are likely high-res
    return contentLength > 100000;
  } catch {
    return false;
  }
}
