/**
 * Google Shopping (via SerpApi) — searches retail listings to estimate
 * current market price (typically new/refurbished, higher than used resale).
 *
 * Replaces the previous Craigslist scraper, which Craigslist now blocks.
 *
 * Docs: https://serpapi.com/google-shopping-api
 */

import type { MarketValueResult } from "@/types";

export async function fetchGoogleShoppingPrices(
  query: string
): Promise<MarketValueResult> {
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    return {
      source: "google_shopping",
      price: 0,
      currency: "USD",
      url: null,
      confidence: 0,
      error: "SERPAPI_KEY not configured",
    };
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    engine: "google_shopping",
    q: query,
    hl: "en",
    gl: "us",
  });

  try {
    const res = await fetch(`https://serpapi.com/search?${params.toString()}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error(`SerpApi error: ${res.status}`);

    const json = await res.json();
    const results: Array<Record<string, any>> = json.shopping_results ?? [];

    const prices: number[] = results
      .map((r) => {
        if (typeof r.extracted_price === "number") return r.extracted_price;
        if (typeof r.price === "string") {
          const m = r.price.match(/\$?([\d,]+\.?\d*)/);
          return m ? parseFloat(m[1].replace(/,/g, "")) : null;
        }
        return null;
      })
      .filter((p): p is number => p != null && p > 0);

    if (prices.length === 0) {
      return {
        source: "google_shopping",
        price: 0,
        currency: "USD",
        url: null,
        confidence: 0,
        error: "No shopping results with prices",
      };
    }

    // Median to suppress outliers (clearance, accessories priced as the item, etc.)
    const sorted = prices.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    const topUrl =
      results[0]?.link ?? results[0]?.product_link ?? null;

    return {
      source: "google_shopping",
      price: Math.round(median * 100) / 100,
      currency: "USD",
      url: topUrl,
      confidence: Math.min(0.85, prices.length / 15),
    };
  } catch (err) {
    return {
      source: "google_shopping",
      price: 0,
      currency: "USD",
      url: null,
      confidence: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
