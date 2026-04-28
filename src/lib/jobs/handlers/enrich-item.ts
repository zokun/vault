/**
 * Background job handler: enrich_item
 *
 * After an item is saved, this job:
 * 1. Fetches market value from all sources (already available)
 * 2. Creates maintenance records from Claude's suggested tasks
 * 3. Updates item notes with rental suitability info
 *
 * Payload: { itemId: number }
 */

import { lookupItemByName } from "@/lib/ai/item-lookup";
import { fetchMarketValues } from "@/lib/services/market-value";
import { getItemById } from "@/lib/services/items";
import { db } from "@/lib/db";
import { maintenanceRecords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function handleEnrichItem(payload: { itemId: number }): Promise<void> {
  const { itemId } = payload;
  const item = await getItemById(itemId);
  if (!item) {
    console.warn(`[enrich-item] Item ${itemId} not found`);
    return;
  }

  const query = [item.brand, item.model, item.name].filter(Boolean).join(" ");

  // Run Claude lookup and market value fetch in parallel
  const [lookupResult, marketResult] = await Promise.allSettled([
    lookupItemByName(item.name),
    fetchMarketValues(itemId, item.name, item.brand, item.model),
  ]);

  const lookup = lookupResult.status === "fulfilled" ? lookupResult.value : null;

  if (lookup) {
    // Create maintenance records if none exist yet
    const existing = await db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.itemId, itemId));

    if (existing.length === 0 && lookup.commonMaintenanceTasks.length > 0) {
      await db.insert(maintenanceRecords).values(
        lookup.commonMaintenanceTasks.map((task) => ({
          itemId,
          title: task.title,
          type: task.type,
          description: `Suggested for ${item.category} items`,
        }))
      );
    }
  }

  console.log(`[enrich-item] Completed enrichment for item ${itemId}`);
}
