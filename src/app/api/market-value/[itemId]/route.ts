import { NextRequest, NextResponse } from "next/server";
import { getItemById } from "@/lib/services/items";
import {
  fetchMarketValues,
  getCachedMarketValues,
} from "@/lib/services/market-value";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const id = parseInt(itemId);
    const cached = await getCachedMarketValues(id);
    return NextResponse.json({ data: cached });
  } catch (err) {
    console.error("[GET /api/market-value/:itemId]", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const id = parseInt(itemId);
    const item = await getItemById(id);
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const summary = await fetchMarketValues(
      id,
      item.name,
      item.brand,
      item.model
    );
    return NextResponse.json({ data: summary });
  } catch (err) {
    console.error("[POST /api/market-value/:itemId]", err);
    return NextResponse.json({ error: "Market value fetch failed" }, { status: 500 });
  }
}
