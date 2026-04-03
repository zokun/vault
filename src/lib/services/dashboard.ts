import { db } from "@/lib/db";
import { items, marketValues, rentalListings } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { DashboardStats, Recommendation } from "@/types";
import { calcDepreciation } from "@/lib/utils/currency";
import { getAllItems } from "./items";

export async function getDashboardStats(): Promise<DashboardStats> {
  const allItems = await getAllItems();

  // Total purchase value
  const totalPurchaseValue = allItems.reduce(
    (sum, item) => sum + (item.purchasePrice ?? 0),
    0
  );

  // Market values from DB
  const mvRows = await db.select().from(marketValues);
  const mvByItem: Record<number, number[]> = {};
  for (const mv of mvRows) {
    if (!mvByItem[mv.itemId]) mvByItem[mv.itemId] = [];
    mvByItem[mv.itemId].push(mv.price);
  }

  // Estimated value: use market price if available, else apply depreciation
  let totalEstimatedValue = 0;
  for (const item of allItems) {
    const mvPrices = mvByItem[item.id] ?? [];
    if (mvPrices.length > 0) {
      totalEstimatedValue += mvPrices.reduce((a, b) => a + b, 0) / mvPrices.length;
    } else if (item.purchasePrice && item.purchaseDate) {
      const { currentValue } = calcDepreciation(
        item.purchasePrice,
        item.purchaseDate
      );
      totalEstimatedValue += currentValue;
    } else if (item.purchasePrice) {
      totalEstimatedValue += item.purchasePrice;
    }
  }

  const totalDepreciation = totalPurchaseValue - totalEstimatedValue;
  const deprecationRate =
    totalPurchaseValue > 0 ? totalDepreciation / totalPurchaseValue : 0;

  // Active rentals count
  const rentalRows = await db
    .select()
    .from(rentalListings)
    .where(eq(rentalListings.isActive, true));
  const activeRentals = rentalRows.length;

  // Items by category
  const categoryMap: Record<string, number> = {};
  for (const item of allItems) {
    categoryMap[item.category] = (categoryMap[item.category] ?? 0) + 1;
  }
  const itemsByCategory = Object.entries(categoryMap).map(
    ([category, count]) => ({ category, count })
  );

  // Recently added (last 5)
  const recentlyAdded = allItems.slice(0, 5);

  // "Stale" items — purchased more than 6 months ago, no recent notes
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const staleItems = allItems.filter(
    (item) =>
      item.purchaseDate &&
      new Date(item.purchaseDate) < sixMonthsAgo &&
      !item.notes?.includes("used") &&
      !item.notes?.includes("active")
  );

  // Recommendations
  const recommendations: Recommendation[] = [];

  for (const item of staleItems.slice(0, 3)) {
    recommendations.push({
      itemId: item.id,
      itemName: item.name,
      type: "sell",
      reason: `You purchased this ${item.purchaseDate ? Math.round((Date.now() - new Date(item.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) : "many"} months ago and it may be sitting unused.`,
      priority: "medium",
    });
  }

  // High-value items without rental listings
  const listedItemIds = new Set(rentalRows.map((r) => r.itemId));
  for (const item of allItems) {
    if (
      item.purchasePrice &&
      item.purchasePrice > 200 &&
      !listedItemIds.has(item.id) &&
      recommendations.length < 5
    ) {
      recommendations.push({
        itemId: item.id,
        itemName: item.name,
        type: "rent",
        reason: `This item is worth ~${Math.round(item.purchasePrice)}. Listing it for rent could earn passive income.`,
        priority: "low",
      });
    }
  }

  return {
    totalItems: allItems.length,
    totalPurchaseValue,
    totalEstimatedValue,
    totalDepreciation,
    deprecationRate,
    activeRentals,
    itemsByCategory,
    recentlyAdded,
    staleItems,
    recommendations,
  };
}
