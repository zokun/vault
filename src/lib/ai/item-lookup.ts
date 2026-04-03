/**
 * Uses Claude to identify an item from its name and return structured metadata.
 * Returns null if ANTHROPIC_API_KEY is not set (graceful degradation).
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ItemCategory, ItemCondition } from "@/types";

export interface ItemLookupResult {
  category: ItemCategory;
  brand: string | null;
  model: string | null;
  description: string;
  condition: ItemCondition;
  typicalPriceMin: number | null;
  typicalPriceMax: number | null;
  rentalSuitability: "high" | "medium" | "low";
  commonMaintenanceTasks: Array<{ title: string; type: "diy" | "professional" }>;
}

const CATEGORIES: ItemCategory[] = [
  "electronics","furniture","clothing","appliances","tools",
  "sports","books","vehicles","jewelry","art","collectibles","other",
];

export async function lookupItemByName(name: string): Promise<ItemLookupResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || name.trim().length < 3) return null;

  const client = new Anthropic({ apiKey });

  const prompt = `You are a product database assistant. Given an item name, return a JSON object with structured product information.

Item name: "${name}"

Return ONLY valid JSON (no markdown, no explanation) matching this exact shape:
{
  "category": one of: electronics|furniture|clothing|appliances|tools|sports|books|vehicles|jewelry|art|collectibles|other,
  "brand": string or null,
  "model": string or null,
  "description": "1-2 sentence description of what this item is",
  "condition": "good",
  "typicalPriceMin": number (USD, retail new price lower bound) or null,
  "typicalPriceMax": number (USD, retail new price upper bound) or null,
  "rentalSuitability": "high" | "medium" | "low",
  "commonMaintenanceTasks": [
    { "title": "task name", "type": "diy" | "professional" }
  ]
}

Rules:
- rentalSuitability: "high" for tools/cameras/party equipment, "low" for clothing/personal items
- commonMaintenanceTasks: 2-4 relevant tasks only
- typicalPriceMin/Max: approximate retail range, null if genuinely unknown
- If the item name is too vague, do your best guess`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    // Strip any markdown code fences if present
    const json = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(json);

    // Validate and normalize
    return {
      category: CATEGORIES.includes(parsed.category) ? parsed.category : "other",
      brand: parsed.brand || null,
      model: parsed.model || null,
      description: parsed.description || "",
      condition: parsed.condition || "good",
      typicalPriceMin: typeof parsed.typicalPriceMin === "number" ? parsed.typicalPriceMin : null,
      typicalPriceMax: typeof parsed.typicalPriceMax === "number" ? parsed.typicalPriceMax : null,
      rentalSuitability: ["high", "medium", "low"].includes(parsed.rentalSuitability)
        ? parsed.rentalSuitability
        : "medium",
      commonMaintenanceTasks: Array.isArray(parsed.commonMaintenanceTasks)
        ? parsed.commonMaintenanceTasks.slice(0, 4)
        : [],
    };
  } catch (err) {
    console.error("[item-lookup] Claude parse error:", err);
    return null;
  }
}
