/**
 * AI-powered item recommendations.
 *
 * Uses the Anthropic Claude API to analyze an item's purchase price,
 * current market value, age, category, and condition, then returns
 * structured sell/rent/service/upgrade recommendations.
 *
 * Results are cached in the `ai_recommendations` table for 7 days.
 * A background job (`generate_ai_recs`) refreshes them periodically.
 *
 * Setup:
 *   1. Set ANTHROPIC_API_KEY in .env
 *   2. Install: npm install @anthropic-ai/sdk
 *   3. Uncomment the import and implementation below
 *
 * The stub currently returns a placeholder so the app works without an API key.
 */

import { db } from "@/lib/db";
import { aiRecommendations, items } from "@/lib/db/schema";
import { eq, gt } from "drizzle-orm";

// TODO: uncomment when @anthropic-ai/sdk is installed
// import Anthropic from "@anthropic-ai/sdk";

export interface AiRecommendation {
  type: "sell" | "rent" | "service" | "insure" | "upgrade";
  title: string;
  body: string;
  confidence: number;
}

/**
 * Generate AI recommendations for an item.
 * Returns cached results if they're fresh (< 7 days old).
 */
export async function getAiRecommendations(
  itemId: number
): Promise<AiRecommendation[]> {
  // Check cache
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const cached = await db
    .select()
    .from(aiRecommendations)
    .where(eq(aiRecommendations.itemId, itemId));

  const fresh = cached.filter(
    (r) => !r.expiresAt || r.expiresAt > new Date().toISOString()
  );

  if (fresh.length > 0) {
    return fresh.map((r) => ({
      type: r.type as AiRecommendation["type"],
      title: r.title,
      body: r.body,
      confidence: r.confidence,
    }));
  }

  // Generate fresh recommendations
  return generateRecommendations(itemId);
}

/**
 * Call the Claude API to generate recommendations for an item.
 * Stores results in the DB.
 */
async function generateRecommendations(
  itemId: number
): Promise<AiRecommendation[]> {
  const [item] = await db.select().from(items).where(eq(items.id, itemId));
  if (!item) return [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Return stub recommendations when API key is not configured
    return getStubRecommendations(item);
  }

  try {
    // TODO: implement real API call once @anthropic-ai/sdk is installed
    // const client = new Anthropic({ apiKey });
    // const prompt = buildPrompt(item);
    // const message = await client.messages.create({
    //   model: "claude-sonnet-4-6",
    //   max_tokens: 1024,
    //   messages: [{ role: "user", content: prompt }],
    // });
    // const recs = parseRecommendations(message.content[0].text);
    // await cacheRecommendations(itemId, recs, "claude-sonnet-4-6", message.content[0].text);
    // return recs;

    return getStubRecommendations(item);
  } catch (err) {
    console.error("[ai/recommendations] Error calling Claude API:", err);
    return getStubRecommendations(item);
  }
}

function getStubRecommendations(
  item: typeof items.$inferSelect
): AiRecommendation[] {
  const recs: AiRecommendation[] = [];

  if (item.purchasePrice && item.purchasePrice > 100) {
    recs.push({
      type: "rent",
      title: "Consider listing for rent",
      body: `Your ${item.name} could earn passive income when not in use. Items in this category typically rent for 5–10% of purchase price per day.`,
      confidence: 0.7,
    });
  }

  if (item.condition === "fair" || item.condition === "poor") {
    recs.push({
      type: "service",
      title: "Schedule a service checkup",
      body: `The current condition (${item.condition}) may be reducing resale value. A professional service could restore value and extend lifespan.`,
      confidence: 0.8,
    });
  }

  recs.push({
    type: "insure",
    title: "Consider insuring this item",
    body: `High-value belongings are often under-insured. Check if your homeowner's/renter's policy covers this item or add a rider.`,
    confidence: 0.5,
  });

  return recs;
}

async function cacheRecommendations(
  itemId: number,
  recs: AiRecommendation[],
  model: string,
  rawResponse: string
): Promise<void> {
  // Delete old recommendations for this item
  await db.delete(aiRecommendations).where(eq(aiRecommendations.itemId, itemId));

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  await db.insert(aiRecommendations).values(
    recs.map((r) => ({
      itemId,
      type: r.type,
      title: r.title,
      body: r.body,
      confidence: r.confidence,
      model,
      rawResponse,
      expiresAt,
    }))
  );
}
