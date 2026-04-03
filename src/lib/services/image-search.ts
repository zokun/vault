/**
 * SerpApi — fetches Google Images results for a product query.
 * Requires SERPAPI_KEY in .env.
 * Returns an empty array (never throws) when the key is absent or on any error.
 *
 * SerpApi docs: https://serpapi.com/images-results
 */

export interface ImageResult {
  url: string;
  thumbnailUrl: string;
  title: string;
  source: string;
}

export async function searchProductImages(query: string): Promise<ImageResult[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    api_key: apiKey,
    engine: "google_images",
    q: query,
    num: "8",
    safe: "active",
  });

  try {
    const res = await fetch(
      `https://serpapi.com/search?${params.toString()}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      console.warn("[image-search] SerpApi error:", res.status);
      return [];
    }

    const json = await res.json();
    const results: any[] = json.images_results ?? [];

    return results.slice(0, 8).map((item) => ({
      url: item.original ?? item.thumbnail,
      thumbnailUrl: item.thumbnail,
      title: item.title ?? query,
      source: item.source ?? "",
    }));
  } catch (err) {
    console.error("[image-search] fetch error:", err);
    return [];
  }
}
