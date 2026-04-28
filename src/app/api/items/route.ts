import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllItems, createItem } from "@/lib/services/items";
import { enqueueJob, processPendingJobs } from "@/lib/jobs";

const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().nullish(),
  category: z.string().default("other"),
  condition: z.enum(["new", "like_new", "good", "fair", "poor"]).default("good"),
  purchaseDate: z.string().nullish(),
  purchasePrice: z.number().positive().nullish(),
  serialNumber: z.string().nullish(),
  brand: z.string().nullish(),
  model: z.string().nullish(),
  location: z.string().nullish(),
  notes: z.string().nullish(),
  photos: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const data = await getAllItems({ category, search });
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[GET /api/items]", err);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const item = await createItem(parsed.data as any);

    // Fire-and-forget background enrichment (does not block the response).
    // Enqueue then immediately process so the job actually runs — the dev
    // environment has no separate worker, so without this the queue stalls.
    enqueueJob("enrich_item", { itemId: item.id })
      .then(() => processPendingJobs())
      .catch((err) =>
        console.error("[POST /api/items] Background enrichment failed:", err)
      );

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/items]", err);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
