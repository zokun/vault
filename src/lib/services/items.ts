import { db } from "@/lib/db";
import { items, marketValues, rentalListings } from "@/lib/db/schema";
import { eq, desc, like, and } from "drizzle-orm";
import type { Item, ItemCategory, ItemCondition } from "@/types";

function parsePhotos(raw: string): string[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function toItem(row: typeof items.$inferSelect): Item {
  return {
    ...row,
    category: row.category as ItemCategory,
    condition: row.condition as ItemCondition,
    photos: parsePhotos(row.photos),
  };
}

export async function getAllItems(filters?: {
  category?: string;
  search?: string;
}): Promise<Item[]> {
  let query = db.select().from(items).$dynamic();

  if (filters?.category) {
    query = query.where(eq(items.category, filters.category));
  }

  const rows = await query.orderBy(desc(items.createdAt));
  let result = rows.map(toItem);

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (item) =>
        item.name.toLowerCase().includes(s) ||
        item.brand?.toLowerCase().includes(s) ||
        item.model?.toLowerCase().includes(s) ||
        item.description?.toLowerCase().includes(s)
    );
  }

  return result;
}

export async function getItemById(id: number): Promise<Item | null> {
  const [row] = await db.select().from(items).where(eq(items.id, id));
  return row ? toItem(row) : null;
}

export async function createItem(
  data: Omit<Item, "id" | "createdAt" | "updatedAt">
): Promise<Item> {
  const [row] = await db
    .insert(items)
    .values({
      ...data,
      photos: JSON.stringify(data.photos ?? []),
    })
    .returning();
  return toItem(row);
}

export async function updateItem(
  id: number,
  data: Partial<Omit<Item, "id" | "createdAt">>
): Promise<Item | null> {
  const payload: Record<string, unknown> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  if (data.photos !== undefined) {
    payload.photos = JSON.stringify(data.photos);
  }

  const [row] = await db
    .update(items)
    .set(payload)
    .where(eq(items.id, id))
    .returning();
  return row ? toItem(row) : null;
}

export async function deleteItem(id: number): Promise<boolean> {
  const result = await db.delete(items).where(eq(items.id, id)).returning();
  return result.length > 0;
}
