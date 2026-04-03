/**
 * eBay Finding API — searches completed listings to estimate resale value.
 * Uses the public Finding API (App ID required but free tier available).
 * Falls back gracefully when the key is missing.
 */

import type { MarketValueResult } from "@/types";

const EBAY_BASE =
  "https://svcs.ebay.com/services/search/FindingService/v1";

export async function fetchEbayPrices(
  query: string
): Promise<MarketValueResult> {
  const appId = process.env.EBAY_APP_ID;

  if (!appId) {
    return {
      source: "ebay",
      price: 0,
      currency: "USD",
      url: null,
      confidence: 0,
      error: "EBAY_APP_ID not configured",
    };
  }

  const params = new URLSearchParams({
    "OPERATION-NAME": "findCompletedItems",
    "SERVICE-VERSION": "1.0.0",
    "SECURITY-APPNAME": appId,
    "RESPONSE-DATA-FORMAT": "JSON",
    "REST-PAYLOAD": "",
    keywords: query,
    "itemFilter(0).name": "SoldItemsOnly",
    "itemFilter(0).value": "true",
    "sortOrder": "EndTimeSoonest",
    "paginationInput.entriesPerPage": "10",
  });

  try {
    const res = await fetch(`${EBAY_BASE}?${params.toString()}`, {
      next: { revalidate: 3600 }, // cache 1 hour
    });

    if (!res.ok) throw new Error(`eBay API error: ${res.status}`);

    const json = await res.json();
    const searchResult =
      json?.findCompletedItemsResponse?.[0]?.searchResult?.[0];
    const items = searchResult?.item ?? [];

    if (items.length === 0) {
      return {
        source: "ebay",
        price: 0,
        currency: "USD",
        url: null,
        confidence: 0,
        error: "No sold listings found",
      };
    }

    const prices: number[] = (items as Array<Record<string, any>>)
      .map((item) => {
        const statuses = item.sellingStatus as Array<Record<string, any>> | undefined;
        const prices = statuses?.[0]?.convertedCurrentPrice as Array<Record<string, any>> | undefined;
        const sp = prices?.[0];
        return sp ? parseFloat(sp.__value__ as string) : null;
      })
      .filter((p): p is number => p !== null && p > 0);

    if (prices.length === 0) {
      return {
        source: "ebay",
        price: 0,
        currency: "USD",
        url: null,
        confidence: 0,
        error: "Could not parse prices from listings",
      };
    }

    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const topItem = items[0];
    const viewUrl = topItem?.viewItemURL?.[0] ?? null;

    return {
      source: "ebay",
      price: Math.round(avgPrice * 100) / 100,
      currency: "USD",
      url: viewUrl,
      confidence: Math.min(0.9, prices.length / 10), // more results = higher confidence
    };
  } catch (err) {
    return {
      source: "ebay",
      price: 0,
      currency: "USD",
      url: null,
      confidence: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
