/**
 * POST /api/jobs/run
 *
 * Trigger the background job worker. In production, call this from a cron
 * service (e.g. Vercel Cron, GitHub Actions, external cron service).
 *
 * Protect with a shared secret via the Authorization header:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Example Vercel cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/jobs/run",
 *     "schedule": "0 * * * *"    // every hour
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { processPendingJobs } from "@/lib/jobs";

export async function POST(req: NextRequest) {
  // Verify the cron secret if set
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const processed = await processPendingJobs();
    return NextResponse.json({ data: { processed } });
  } catch (err) {
    console.error("[POST /api/jobs/run]", err);
    return NextResponse.json({ error: "Job processing failed" }, { status: 500 });
  }
}
