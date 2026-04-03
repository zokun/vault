import { db } from "@/lib/db";
import { rentalListings, items } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import type { RentalListing } from "@/types";

function toRental(row: typeof rentalListings.$inferSelect): RentalListing {
  return {
    ...row,
    isActive: Boolean(row.isActive),
  };
}

export async function getAllRentals(): Promise<RentalListing[]> {
  const rows = await db
    .select()
    .from(rentalListings)
    .orderBy(desc(rentalListings.createdAt));
  return rows.map(toRental);
}

export async function getActiveRentals(): Promise<RentalListing[]> {
  const rows = await db
    .select()
    .from(rentalListings)
    .where(eq(rentalListings.isActive, true))
    .orderBy(desc(rentalListings.createdAt));
  return rows.map(toRental);
}

export async function getRentalsByItem(itemId: number): Promise<RentalListing[]> {
  const rows = await db
    .select()
    .from(rentalListings)
    .where(eq(rentalListings.itemId, itemId))
    .orderBy(desc(rentalListings.createdAt));
  return rows.map(toRental);
}

export async function createRental(
  data: Omit<RentalListing, "id" | "createdAt" | "updatedAt">
): Promise<RentalListing> {
  const [row] = await db.insert(rentalListings).values(data).returning();
  return toRental(row);
}

export async function updateRental(
  id: number,
  data: Partial<Omit<RentalListing, "id" | "itemId" | "createdAt">>
): Promise<RentalListing | null> {
  const [row] = await db
    .update(rentalListings)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(rentalListings.id, id))
    .returning();
  return row ? toRental(row) : null;
}

export async function deleteRental(id: number): Promise<boolean> {
  const result = await db
    .delete(rentalListings)
    .where(eq(rentalListings.id, id))
    .returning();
  return result.length > 0;
}
