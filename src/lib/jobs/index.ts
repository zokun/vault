/**
 * Background job worker — reads pending jobs from the `background_jobs` table
 * and dispatches them to their handlers.
 *
 * Design:
 * - Jobs are enqueued via `enqueueJob()` from anywhere in the app
 * - The worker runs on a schedule (cron / setInterval / external trigger)
 * - Each job type has a dedicated handler in this directory
 * - Failed jobs are retried up to `maxAttempts` times (with exponential backoff)
 *
 * Current job types:
 *   price_check            — re-fetch market values for all active price alerts
 *   send_notification      — dispatch a notification via the selected channel
 *   generate_ai_recs       — call the AI service to generate item recommendations
 *
 * To add a new job type:
 *   1. Add the type string to the union below
 *   2. Create a handler file in src/lib/jobs/handlers/
 *   3. Register it in the HANDLERS map
 *   4. Enqueue it with enqueueJob({ type, payload })
 */

import { db } from "@/lib/db";
import { backgroundJobs } from "@/lib/db/schema";
import { eq, lte, and } from "drizzle-orm";

export type JobType =
  | "price_check"
  | "send_notification"
  | "generate_ai_recs";

export interface JobPayload {
  price_check: { itemId?: number }; // omit itemId to check all active alerts
  send_notification: { notificationId: number };
  generate_ai_recs: { itemId: number };
}

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
 * Process pending jobs. Call this from a cron route or Next.js cron handler.
 * Returns the number of jobs processed.
 *
 * TODO: implement handler dispatch when job handlers are built out.
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
    // Mark running
    await db
      .update(backgroundJobs)
      .set({ status: "running", startedAt: new Date().toISOString(), attempts: job.attempts + 1 })
      .where(eq(backgroundJobs.id, job.id));

    try {
      // TODO: dispatch to handler based on job.type
      // const handler = HANDLERS[job.type as JobType];
      // await handler(JSON.parse(job.payload));
      console.log(`[jobs] Would process job ${job.id} of type ${job.type}`);

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
    }
  }

  return processed;
}
