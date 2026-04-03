/**
 * Background job worker — reads pending jobs from the `background_jobs` table
 * and dispatches them to their handlers.
 *
 * Job types:
 *   enrich_item            — post-save item enrichment (Claude + market value)
 *   price_check            — re-fetch market values for all active price alerts
 *   send_notification      — dispatch a notification via the selected channel
 *   generate_ai_recs       — call the AI service to generate item recommendations
 *
 * To add a new job type:
 *   1. Add the type string to the JobType union
 *   2. Create a handler in src/lib/jobs/handlers/
 *   3. Register it in HANDLERS below
 *   4. Enqueue with enqueueJob({ type, payload })
 */

import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/db/schema";
import { eq, lte, and } from "drizzle-orm";
import { handleEnrichItem } from "./handlers/enrich-item";

export type JobType =
  | "enrich_item"
  | "price_check"
  | "send_notification"
  | "generate_ai_recs";

export interface JobPayload {
  enrich_item: { itemId: number };
  price_check: { itemId?: number };
  send_notification: { notificationId: number };
  generate_ai_recs: { itemId: number };
}

// Handler registry — add new handlers here
const HANDLERS: Partial<Record<JobType, (payload: any) => Promise<void>>> = {
  enrich_item: handleEnrichItem,
};

/**
 * Enqueue a new background job. Returns the job ID.
 */
export async function enqueueJob<T extends JobType>(
  type: T,
  payload: JobPayload[T],
  scheduledAt?: Date
): Promise<number> {
  const [job] = await db
    .insert(backgroundJobs)
    .values({
      type,
      payload: JSON.stringify(payload),
      scheduledAt: (scheduledAt ?? new Date()).toISOString(),
    })
    .returning();
  return job.id;
}

/**
 * Process pending jobs. Call from POST /api/jobs/run (cron).
 * Returns the number of jobs processed.
 */
export async function processPendingJobs(): Promise<number> {
  const now = new Date().toISOString();
  const pending = await db
    .select()
    .from(backgroundJobs)
    .where(
      and(
        eq(backgroundJobs.status, "pending"),
        lte(backgroundJobs.scheduledAt, now)
      )
    )
    .limit(20);

  let processed = 0;

  for (const job of pending) {
    await db
      .update(backgroundJobs)
      .set({ status: "running", startedAt: new Date().toISOString(), attempts: job.attempts + 1 })
      .where(eq(backgroundJobs.id, job.id));

    try {
      const handler = HANDLERS[job.type as JobType];
      if (handler) {
        await handler(JSON.parse(job.payload));
      } else {
        console.warn(`[jobs] No handler registered for type: ${job.type}`);
      }

      await db
        .update(backgroundJobs)
        .set({ status: "completed", completedAt: new Date().toISOString() })
        .where(eq(backgroundJobs.id, job.id));

      processed++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const failed = job.attempts + 1 >= job.maxAttempts;
      await db
        .update(backgroundJobs)
        .set({
          status: failed ? "failed" : "pending",
          lastError: errMsg,
          startedAt: null,
        })
        .where(eq(backgroundJobs.id, job.id));

      console.error(`[jobs] Job ${job.id} (${job.type}) failed:`, errMsg);
    }
  }

  return processed;
}
