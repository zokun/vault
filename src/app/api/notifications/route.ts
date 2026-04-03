/**
 * GET  /api/notifications        — get unread notifications (for current user)
 * POST /api/notifications/[id]/read — mark a notification as read
 *
 * TODO: add authentication middleware to scope by userId.
 * Currently returns all notifications (single-user mode).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";

    let query = db.select().from(notifications).$dynamic();
    if (unreadOnly) {
      query = query.where(eq(notifications.isRead, false));
    }
    const rows = await query.orderBy(desc(notifications.createdAt)).limit(50);
    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
