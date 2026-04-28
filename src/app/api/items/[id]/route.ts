import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getItemById, updateItem, deleteItem } from "@/lib/services/items";

const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullish(),
  category: z.enum(["electronics","furniture","clothing","appliances","tools","sports","books","vehicles","jewelry","art","collectibles","other"]).optional(),
  condition: z.enum(["new", "like_new", "good", "fair", "poor"]).optional(),
  purchaseDate: z.string().nullish(),
  purchasePrice: z.number().positive().nullish(),
  serialNumber: z.string().nullish(),
  brand: z.string().nullish(),
  model: z.string().nullish(),
  location: z.string().nullish(),
  notes: z.string().nullish(),
  photos: z.array(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getItemById(parseInt(id));
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch (err) {
    console.error("[GET /api/items/:id]", err);
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const item = await updateItem(parseInt(id), parsed.data as any);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch (err) {
    console.error("[PATCH /api/items/:id]", err);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteItem(parseInt(id));
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error("[DELETE /api/items/:id]", err);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
