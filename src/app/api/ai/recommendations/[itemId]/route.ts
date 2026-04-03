/**
 * GET /api/ai/recommendations/[itemId]
 *
 * Returns AI-powered recommendations for an item.
 * Results are cached for 7 days in `ai_recommendations` table.
 * Set ANTHROPIC_API_KEY in .env to enable real AI analysis.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAiRecommendations } from "@/lib/ai/recommendations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const recommendations = await getAiRecommendations(parseInt(itemId));
    return NextResponse.json({ data: recommendations });
  } catch (err) {
    console.error("[GET /api/ai/recommendations/:itemId]", err);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
