import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { maintenanceRecords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["diy", "professional"]).optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  cost: z.number().nonnegative().optional(),
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
      .update(maintenanceRecords)
      .set(parsed.data)
      .where(eq(maintenanceRecords.id, parseInt(id)))
      .returning();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: row });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await db
      .delete(maintenanceRecords)
      .where(eq(maintenanceRecords.id, parseInt(id)))
      .returning();
    if (!result.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
