/**
 * GET /api/enrich/lookup?name=...
 *
 * Calls Claude (item metadata) and Google Custom Search (product images) in parallel.
 * Either result is returned independently — if Claude fails, images still come through
 * and vice versa. Gracefully returns empty data if both keys are missing.
 */

import { NextRequest, NextResponse } from "next/server";
import { lookupItemByName } from "@/lib/ai/item-lookup";
import { searchProductImages } from "@/lib/services/image-search";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim() ?? "";

  if (name.length < 3) {
    return NextResponse.json({ data: { metadata: null, images: [] } });
  }

  // Run Claude + Google in parallel — neither blocks the other
  const [metadataResult, imagesResult] = await Promise.allSettled([
    lookupItemByName(name),
    searchProductImages(name),
  ]);

  const metadata =
    metadataResult.status === "fulfilled" ? metadataResult.value : null;
  const images =
    imagesResult.status === "fulfilled" ? imagesResult.value : [];

  return NextResponse.json({ data: { metadata, images } });
}
