import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { maintenanceRecords } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

const createSchema = z.object({
  itemId: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["diy", "professional"]).default("diy"),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  cost: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemIdParam = searchParams.get("itemId");
    let query = db.select().from(maintenanceRecords).$dynamic();
    if (itemIdParam) {
      query = query.where(eq(maintenanceRecords.itemId, parseInt(itemIdParam)));
    }
    const rows = await query.orderBy(desc(maintenanceRecords.createdAt));
    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
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
    const [row] = await db
      .insert(maintenanceRecords)
      .values(parsed.data)
      .returning();
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
