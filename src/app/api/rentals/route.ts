import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllRentals, getRentalsByItem, createRental } from "@/lib/services/rental";

const createSchema = z.object({
  itemId: z.number().int().positive(),
  pricePerDay: z.number().positive(),
  currency: z.string().default("USD"),
  availableFrom: z.string(),
  availableTo: z.string().optional(),
  description: z.string().optional(),
  contactInfo: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemIdParam = searchParams.get("itemId");
    const data = itemIdParam
      ? await getRentalsByItem(parseInt(itemIdParam))
      : await getAllRentals();
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch rentals" }, { status: 500 });
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
    const rental = await createRental(parsed.data as any);
    return NextResponse.json({ data: rental }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create rental" }, { status: 500 });
  }
}
