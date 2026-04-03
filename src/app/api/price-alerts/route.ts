/**
 * Price Alerts API
 *
 * GET  /api/price-alerts          — list alerts (optionally filtered by itemId)
 * POST /api/price-alerts          — create a new alert
 *
 * When triggered: the `price_check` background job queries market values
 * and calls notify() if the threshold is crossed.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { priceAlerts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

const createSchema = z.object({
  itemId: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
  targetPrice: z.number().positive(),
  direction: z.enum(["below", "above"]).default("below"),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");

    let query = db.select().from(priceAlerts).$dynamic();
    if (itemId) {
      query = query.where(eq(priceAlerts.itemId, parseInt(itemId)));
    }
    const rows = await query.orderBy(desc(priceAlerts.createdAt));
    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [row] = await db.insert(priceAlerts).values(parsed.data).returning();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}
