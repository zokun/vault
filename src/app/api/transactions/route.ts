/**
 * P2P Transactions API
 *
 * GET  /api/transactions          — list transactions (filtered by sellerId or buyerId)
 * POST /api/transactions          — create a new transaction (buy/sell/rent offer)
 *
 * TODO:
 *   - Add authentication to extract userId from session
 *   - Integrate payment provider (Stripe) for amount processing
 *   - Add dispute resolution workflow
 *   - Send notifications on status changes
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, or, desc } from "drizzle-orm";

const createSchema = z.object({
  itemId: z.number().int().positive(),
  sellerId: z.number().int().positive(),
  buyerId: z.number().int().positive().optional(),
  type: z.enum(["sale", "rental"]),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  rentalStartDate: z.string().optional(),
  rentalEndDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    let query = db.select().from(transactions).$dynamic();
    if (userId) {
      const id = parseInt(userId);
      query = query.where(
        or(eq(transactions.sellerId, id), eq(transactions.buyerId, id))
      );
    }
    const rows = await query.orderBy(desc(transactions.createdAt));
    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
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

    const [row] = await db.insert(transactions).values(parsed.data).returning();

    // TODO: enqueue job to send notification to seller/buyer
    // await enqueueJob("send_notification", { notificationId: ... });

    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
