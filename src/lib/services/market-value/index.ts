/**
 * Market value orchestrator — runs all marketplace fetchers in parallel
 * using Promise.allSettled so one failure doesn't block the others.
 */

import { db } from "@/lib/db";
import { marketValues } from "@/lib/db/schema";
import type { MarketValueResult, MarketValueSummary } from "@/types";
import { fetchEbayPrices } from "./ebay";
import { fetchGoogleShoppingPrices } from "./google-shopping";
import { eq } from "drizzle-orm";

// Prevents two concurrent fetches for the same item from clobbering each other
// (the auto-fetch on detail-page mount and the post-create enrich job both call
// this; without dedup they'd both DELETE+INSERT and race).
const inFlight = new Map<number, Promise<MarketValueSummary>>();

/**
 * Build a search query string from item details.
 */
function buildQuery(
  name: string,
  brand?: string | null,
  model?: string | null
): string {
  return [brand, model, name].filter(Boolean).join(" ").trim();
}

/**
 * Fetch market values from all sources in parallel for a given item.
 * Caches results in the DB. Concurrent calls for the same itemId share a
 * single in-flight promise.
 */
export async function fetchMarketValues(
  itemId: number,
  name: string,
  brand?: string | null,
  model?: string | null
): Promise<MarketValueSummary> {
  const existing = inFlight.get(itemId);
  if (existing) return existing;

  const promise = doFetchMarketValues(itemId, name, brand, model).finally(() =>
    inFlight.delete(itemId)
  );
  inFlight.set(itemId, promise);
  return promise;
}

async function doFetchMarketValues(
  itemId: number,
  name: string,
  brand?: string | null,
  model?: string | null
): Promise<MarketValueSummary> {
  const query = buildQuery(name, brand, model);

  // Run all fetchers in parallel
  const [ebayResult, shoppingResult] = await Promise.allSettled([
    fetchEbayPrices(query),
    fetchGoogleShoppingPrices(query),
  ]);

  const results: MarketValueResult[] = [ebayResult, shoppingResult].map(
    (settled) => {
      if (settled.status === "fulfilled") return settled.value;
      return {
        source: "unknown",
        price: 0,
        currency: "USD",
        url: null,
        confidence: 0,
        error: settled.reason?.message ?? "Fetch failed",
      };
    }
  );

  // Persist to DB (delete old entries first)
  await db.delete(marketValues).where(eq(marketValues.itemId, itemId));

  const validResults = results.filter((r) => r.price > 0 && !r.error);
  if (validResults.length > 0) {
    await db.insert(marketValues).values(
      validResults.map((r) => ({
        itemId,
        source: r.source,
        price: r.price,
        currency: r.currency,
        url: r.url,
        confidence: r.confidence,
      }))
    );
  }

  // Compute summary stats
  const prices = validResults.map((r) => r.price);
  const averagePrice =
    prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : null;
  const highPrice = prices.length > 0 ? Math.max(...prices) : null;
  const lowPrice = prices.length > 0 ? Math.min(...prices) : null;

  return {
    itemId,
    results,
    averagePrice,
    highPrice,
    lowPrice,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Get cached market values for an item from the DB.
 */
export async function getCachedMarketValues(
  itemId: number
): Promise<MarketValueSummary | null> {
  const rows = await db
    .select()
    .from(marketValues)
    .where(eq(marketValues.itemId, itemId));

  if (rows.length === 0) return null;

  const results: MarketValueResult[] = rows.map((r) => ({
    source: r.source,
    price: r.price,
    currency: r.currency,
    url: r.url,
    confidence: r.confidence,
  }));

  const prices = results.map((r) => r.price);
  return {
    itemId,
    results,
    averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
    highPrice: Math.max(...prices),
    lowPrice: Math.min(...prices),
    fetchedAt: rows[0].fetchedAt,
  };
}
