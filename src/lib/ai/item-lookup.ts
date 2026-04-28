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

export interface ItemPhotoIdentification extends ItemLookupResult {
  /** Suggested item name inferred from the photo (e.g. "Sony WH-1000XM5 Headphones"). */
  name: string;
  /** Visible condition assessment based on the photo. */
  condition: ItemCondition;
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

const CONDITIONS: ItemCondition[] = ["new", "like_new", "good", "fair", "poor"];

function normalizeIdentification(parsed: any): ItemPhotoIdentification | null {
  const name = typeof parsed?.name === "string" ? parsed.name.trim() : "";
  if (!name) return null;
  return {
    name,
    category: CATEGORIES.includes(parsed.category) ? parsed.category : "other",
    brand: parsed.brand || null,
    model: parsed.model || null,
    description: parsed.description || "",
    condition: CONDITIONS.includes(parsed.condition) ? parsed.condition : "good",
    typicalPriceMin:
      typeof parsed.typicalPriceMin === "number" ? parsed.typicalPriceMin : null,
    typicalPriceMax:
      typeof parsed.typicalPriceMax === "number" ? parsed.typicalPriceMax : null,
    rentalSuitability: ["high", "medium", "low"].includes(parsed.rentalSuitability)
      ? parsed.rentalSuitability
      : "medium",
    commonMaintenanceTasks: Array.isArray(parsed.commonMaintenanceTasks)
      ? parsed.commonMaintenanceTasks.slice(0, 4)
      : [],
  };
}

/**
 * Uses Claude vision to identify all distinct items in a photo and return
 * structured metadata for each. Returns [] if ANTHROPIC_API_KEY is not set
 * or if identification fails entirely.
 */
export async function identifyItemsFromPhoto(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ItemPhotoIdentification[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  const client = new Anthropic({ apiKey });

  const prompt = `You are a product identification assistant. Look at this photo and return structured information about each distinct personal belonging visible in it.

Examine the photo carefully for distinguishing features that separate visually-similar products:
- Logos, badges, model numbers, or text printed on each item
- Grille patterns, port shapes, button layouts, ridges, vents
- Materials, colors, proportions, and connector types
- Any tags, labels, or serial numbers

Many products in the same category look superficially similar (e.g. broadcast microphones, DSLR cameras, audio interfaces). For each item, pick the model whose distinctive features actually match what's in the photo. Don't guess a famous model when you're not sure — wrong is worse than generic.

What counts as "an item": each distinct personal belonging that someone would want to manage individually in a belongings catalog. Bundle accessories with their parent (a camera and its strap = one item; headphones and their cable = one item). But two separate products lying together are two items.

Return ONLY valid JSON (no markdown, no explanation), an object with an "items" array:
{
  "items": [
    {
      "name": "specific product name including brand and model when visible",
      "category": one of: electronics|furniture|clothing|appliances|tools|sports|books|vehicles|jewelry|art|collectibles|other,
      "brand": string or null,
      "model": string or null,
      "description": "1-2 sentence description of what this item is",
      "condition": one of: new|like_new|good|fair|poor — based on visible wear,
      "typicalPriceMin": number (USD retail) or null,
      "typicalPriceMax": number (USD retail) or null,
      "rentalSuitability": "high" | "medium" | "low",
      "commonMaintenanceTasks": [
        { "title": "task name", "type": "diy" | "professional" }
      ]
    }
  ]
}

Rules:
- Return 1+ items. If only one belonging is in the photo, return an array of length 1.
- If you cannot confidently identify a specific model, use a generic name (e.g. "Black Dynamic Broadcast Microphone") and leave brand/model null.
- Order items by visual prominence (largest/most central first).
- Cap at 10 items. If the photo has more, return the most prominent 10.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const json = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(json);

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return items
      .map(normalizeIdentification)
      .filter((x: ItemPhotoIdentification | null): x is ItemPhotoIdentification => x !== null)
      .slice(0, 10);
  } catch (err) {
    console.error("[item-lookup] Claude vision error:", err);
    return [];
  }
}
