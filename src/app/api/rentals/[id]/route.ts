import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateRental, deleteRental } from "@/lib/services/rental";

const updateSchema = z.object({
  pricePerDay: z.number().positive().optional(),
  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),
  description: z.string().optional(),
  contactInfo: z.string().optional(),
  isActive: z.boolean().optional(),
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
    const rental = await updateRental(parseInt(id), parsed.data);
    if (!rental) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: rental });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update rental" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteRental(parseInt(id));
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete rental" }, { status: 500 });
  }
}
