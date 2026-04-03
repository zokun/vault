/**
 * Maintenance service — provides DIY and professional service guides
 * relevant to an item's category.
 *
 * In a real app this would query iFixit API, YouTube Data API, etc.
 * Currently returns curated stub data organized by category.
 */

import { db } from "@/lib/db";
import { maintenanceRecords } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { MaintenanceRecord } from "@/types";

export interface MaintenanceGuide {
  title: string;
  type: "diy" | "professional";
  description: string;
  difficulty?: "easy" | "medium" | "hard";
  estimatedCost?: string;
  url?: string;
}

const GUIDES_BY_CATEGORY: Record<string, MaintenanceGuide[]> = {
  electronics: [
    {
      title: "Clean dust from vents",
      type: "diy",
      description: "Use compressed air to clear dust from vents and ports.",
      difficulty: "easy",
      estimatedCost: "$5–10",
    },
    {
      title: "Battery calibration",
      type: "diy",
      description: "Fully charge, discharge to 0%, recharge to 100% to recalibrate.",
      difficulty: "easy",
      estimatedCost: "$0",
    },
    {
      title: "Professional repair / diagnostic",
      type: "professional",
      description: "Take to an authorized service center for hardware issues.",
      estimatedCost: "$50–150",
    },
  ],
  furniture: [
    {
      title: "Tighten loose joints",
      type: "diy",
      description: "Use wood glue and clamps to re-secure wobbly joints.",
      difficulty: "easy",
      estimatedCost: "$5–15",
    },
    {
      title: "Surface refinishing",
      type: "diy",
      description: "Sand, stain, and seal wooden surfaces to restore finish.",
      difficulty: "medium",
      estimatedCost: "$20–60",
    },
    {
      title: "Professional upholstery repair",
      type: "professional",
      description: "Have worn fabric or foam professionally replaced.",
      estimatedCost: "$100–400",
    },
  ],
  appliances: [
    {
      title: "Clean filters",
      type: "diy",
      description: "Remove and clean or replace air/water filters per manual.",
      difficulty: "easy",
      estimatedCost: "$5–20",
    },
    {
      title: "Descale heating elements",
      type: "diy",
      description: "Run a vinegar cycle to dissolve mineral buildup.",
      difficulty: "easy",
      estimatedCost: "$2",
    },
    {
      title: "Professional appliance service",
      type: "professional",
      description: "Schedule annual professional maintenance for complex appliances.",
      estimatedCost: "$80–200",
    },
  ],
  vehicles: [
    {
      title: "Oil change",
      type: "diy",
      description: "Change engine oil and filter per manufacturer interval.",
      difficulty: "medium",
      estimatedCost: "$30–60",
    },
    {
      title: "Tire rotation & pressure check",
      type: "diy",
      description: "Rotate tires and check/inflate to spec every 5,000 miles.",
      difficulty: "easy",
      estimatedCost: "$0–20",
    },
    {
      title: "Full service inspection",
      type: "professional",
      description: "Annual inspection at a certified mechanic.",
      estimatedCost: "$100–300",
    },
  ],
  tools: [
    {
      title: "Blade/bit sharpening",
      type: "diy",
      description: "Sharpen blades or replace worn bits to maintain performance.",
      difficulty: "easy",
      estimatedCost: "$5–20",
    },
    {
      title: "Lubrication",
      type: "diy",
      description: "Apply appropriate lubricant to moving parts.",
      difficulty: "easy",
      estimatedCost: "$5",
    },
  ],
  other: [
    {
      title: "General cleaning",
      type: "diy",
      description: "Wipe down with appropriate cleaner for the material.",
      difficulty: "easy",
      estimatedCost: "$0–10",
    },
  ],
};

/**
 * Return relevant maintenance guides for a given category.
 */
export function getMaintenanceGuides(
  category: string
): MaintenanceGuide[] {
  return GUIDES_BY_CATEGORY[category] ?? GUIDES_BY_CATEGORY.other;
}

/**
 * Get all maintenance records for an item, newest first.
 */
export async function getItemMaintenanceRecords(
  itemId: number
): Promise<MaintenanceRecord[]> {
  const rows = await db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.itemId, itemId))
    .orderBy(desc(maintenanceRecords.createdAt));

  return rows.map((r) => ({
    ...r,
    type: r.type as "diy" | "professional",
  }));
}

/**
 * Create a new maintenance record.
 */
export async function createMaintenanceRecord(
  data: Omit<MaintenanceRecord, "id" | "createdAt">
): Promise<MaintenanceRecord> {
  const [row] = await db
    .insert(maintenanceRecords)
    .values(data)
    .returning();
  return { ...row, type: row.type as "diy" | "professional" };
}
