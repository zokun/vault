/**
 * PATCH /api/transactions/[id]   — update transaction status
 * DELETE /api/transactions/[id]  — cancel/remove a transaction
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const updateSchema = z.object({
  status: z.enum(["pending", "active", "completed", "cancelled", "disputed"]).optional(),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const [row] = await db
      .update(transactions)
      .set({ ...parsed.data, updatedAt: new Date().toISOString() })
      .where(eq(transactions.id, parseInt(id)))
      .returning();

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // TODO: notify relevant parties of status change
    return NextResponse.json({ data: row });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await db
      .delete(transactions)
      .where(eq(transactions.id, parseInt(id)))
      .returning();
    if (!result.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
