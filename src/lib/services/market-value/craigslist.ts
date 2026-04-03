/**
 * Craigslist — searches local "for sale" listings.
 * Uses the unofficial RSS feed (no API key needed).
 * Results are lower confidence since items aren't sold yet.
 */

import type { MarketValueResult } from "@/types";

export async function fetchCraigslistPrices(
  query: string
): Promise<MarketValueResult> {
  const region = process.env.CRAIGSLIST_REGION ?? "sfbay";
  const encoded = encodeURIComponent(query);
  const url = `https://${region}.craigslist.org/search/sss?query=${encoded}&format=rss`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "VaultApp/1.0 (personal belongings manager)" },
    });

    if (!res.ok) throw new Error(`Craigslist RSS error: ${res.status}`);

    const xml = await res.text();

    // Parse prices from RSS — they appear as "$XXX" in titles/descriptions
    const priceMatches = [...xml.matchAll(/\$(\d[\d,]*)/g)];
    const prices = priceMatches
      .map((m) => parseFloat(m[1].replace(/,/g, "")))
      .filter((p) => p > 0 && p < 100000);

    if (prices.length === 0) {
      return {
        source: "craigslist",
        price: 0,
        currency: "USD",
        url: `https://${region}.craigslist.org/search/sss?query=${encoded}`,
        confidence: 0,
        error: "No prices found in listings",
      };
    }

    // Use median to reduce outlier impact
    const sorted = prices.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    return {
      source: "craigslist",
      price: Math.round(median * 100) / 100,
      currency: "USD",
      url: `https://${region}.craigslist.org/search/sss?query=${encoded}`,
      confidence: 0.5, // listings aren't sold prices
    };
  } catch (err) {
    return {
      source: "craigslist",
      price: 0,
      currency: "USD",
      url: null,
      confidence: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
