/**
 * Notification service — creates and dispatches notifications.
 *
 * Channels:
 *   in_app   — stored in `notifications` table; polled by the client
 *   email    — sent via transactional email provider (stub: console.log)
 *   push     — web push via VAPID (stub: not yet implemented)
 *
 * Usage:
 *   await notify({
 *     userId: 1,
 *     type: "price_drop",
 *     title: "Price dropped on your item",
 *     body: "MacBook Pro is now selling for $900 on eBay",
 *     metadata: { itemId: 42, source: "ebay", price: 900 },
 *     channel: "email",
 *   });
 *
 * To add a channel:
 *   1. Add the channel name to NotificationChannel
 *   2. Implement dispatch logic in the relevant section below
 *   3. Set the env var(s) for the provider
 */

import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export type NotificationChannel = "in_app" | "email" | "push";
export type NotificationType =
  | "price_drop"
  | "price_rise"
  | "rental_request"
  | "transaction_update"
  | "maintenance_due"
  | "ai_recommendation";

export interface NotifyOptions {
  userId?: number;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  channel?: NotificationChannel;
}

/**
 * Create and dispatch a notification.
 */
export async function notify(opts: NotifyOptions): Promise<void> {
  const channel = opts.channel ?? "in_app";

  // Persist to DB (always, for in-app; also for audit trail on other channels)
  const [row] = await db
    .insert(notifications)
    .values({
      userId: opts.userId ?? null,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      metadata: JSON.stringify(opts.metadata ?? {}),
      channel,
    })
    .returning();

  // Dispatch to the selected channel
  switch (channel) {
    case "in_app":
      // Already stored; the client polls GET /api/notifications
      break;

    case "email":
      await dispatchEmail(opts);
      break;

    case "push":
      await dispatchPush(opts);
      break;
  }

  // Mark sent
  await db
    .update(notifications)
    .set({ sentAt: new Date().toISOString() })
    .where(eq(notifications.id, row.id));
}

/**
 * Send a transactional email.
 * TODO: integrate with Resend, Postmark, SendGrid, etc.
 * Set RESEND_API_KEY (or equivalent) in .env.
 */
async function dispatchEmail(opts: NotifyOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[notifications/email] RESEND_API_KEY not set — skipping:", opts.title);
    return;
  }
  // TODO: implement Resend API call
  console.log("[notifications/email] Would send:", opts.title, "→", opts.body);
}

/**
 * Send a web push notification via VAPID.
 * TODO: use web-push library with VAPID keys from env.
 */
async function dispatchPush(opts: NotifyOptions): Promise<void> {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  if (!vapidPublic) {
    console.log("[notifications/push] VAPID_PUBLIC_KEY not set — skipping:", opts.title);
    return;
  }
  // TODO: implement web-push dispatch
  console.log("[notifications/push] Would push:", opts.title);
}

/**
 * Get unread notifications for a user.
 */
export async function getUnreadNotifications(userId: number) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.isRead, false))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

/**
 * Mark a notification as read.
 */
export async function markRead(notificationId: number): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId));
}
