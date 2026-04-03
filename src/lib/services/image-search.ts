/**
 * Google Custom Search API — fetches product images by query.
 * Requires GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_CX in .env.
 * Returns an empty array (never throws) when keys are absent or on error.
 */

export interface ImageResult {
  url: string;
  thumbnailUrl: string;
  title: string;
  source: string;
}

export async function searchProductImages(query: string): Promise<ImageResult[]> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;

  if (!apiKey || !cx) return [];

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    searchType: "image",
    num: "8",
    imgSize: "medium",
    safe: "active",
  });

  try {
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      console.warn("[image-search] Google API error:", res.status, await res.text());
      return [];
    }

    const json = await res.json();
    const items: any[] = json.items ?? [];

    return items.map((item) => ({
      url: item.link,
      thumbnailUrl: item.image?.thumbnailLink ?? item.link,
      title: item.title ?? query,
      source: item.displayLink ?? "",
    }));
  } catch (err) {
    console.error("[image-search] fetch error:", err);
    return [];
  }
}
