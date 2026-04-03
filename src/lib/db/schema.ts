import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// ----------------------------------------------------------------
// Items — the core entity of the Vault app
// ----------------------------------------------------------------
export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("other"),
  condition: text("condition").notNull().default("good"),
  purchaseDate: text("purchase_date"), // ISO date string
  purchasePrice: real("purchase_price"),
  serialNumber: text("serial_number"),
  brand: text("brand"),
  model: text("model"),
  location: text("location"),
  notes: text("notes"),
  photos: text("photos").notNull().default("[]"), // JSON array of paths
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ----------------------------------------------------------------
// Market value cache — one row per source per item per fetch
// ----------------------------------------------------------------
export const marketValues = sqliteTable("market_values", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  source: text("source").notNull(), // "ebay", "craigslist", etc.
  price: real("price").notNull(),
  currency: text("currency").notNull().default("USD"),
  url: text("url"),
  confidence: real("confidence").notNull().default(0.5), // 0–1
  fetchedAt: text("fetched_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ----------------------------------------------------------------
// Maintenance records — service history & upcoming tasks
// ----------------------------------------------------------------
export const maintenanceRecords = sqliteTable("maintenance_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("diy"), // "diy" | "professional"
  scheduledDate: text("scheduled_date"),
  completedDate: text("completed_date"),
  cost: real("cost"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ----------------------------------------------------------------
// Rental listings — items available to rent out
// ----------------------------------------------------------------
export const rentalListings = sqliteTable("rental_listings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  pricePerDay: real("price_per_day").notNull(),
  currency: text("currency").notNull().default("USD"),
  availableFrom: text("available_from").notNull(),
  availableTo: text("available_to"),
  description: text("description"),
  contactInfo: text("contact_info"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ----------------------------------------------------------------
// Users — for P2P transactions and multi-user support
// Extensible: add OAuth fields, profile photo, trust score, etc.
// ----------------------------------------------------------------
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  // Trust score for P2P marketplace (0–100)
  trustScore: real("trust_score").notNull().default(50),
  // Stripe or payment provider customer ID for future transactions
  paymentCustomerId: text("payment_customer_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ----------------------------------------------------------------
// Transactions — P2P buy/sell/rent transactions between users
// ----------------------------------------------------------------
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "restrict" }),
  sellerId: integer("seller_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  buyerId: integer("buyer_id")
    .references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(), // "sale" | "rental"
  status: text("status").notNull().default("pending"), // "pending" | "active" | "completed" | "cancelled" | "disputed"
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  // For rentals: window
  rentalStartDate: text("rental_start_date"),
  rentalEndDate: text("rental_end_date"),
  // Stripe payment intent or external payment reference
  paymentReference: text("payment_reference"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ----------------------------------------------------------------
// Notifications — in-app notification queue
// Supports email, push, and in-app channels
// ----------------------------------------------------------------
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Null userId = system-level notification (broadcast)
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "price_drop" | "rental_request" | "transaction_update" | "maintenance_due" | "ai_recommendation"
  title: text("title").notNull(),
  body: text("body").notNull(),
  // JSON payload: { itemId?, transactionId?, url?, ... }
  metadata: text("metadata").notNull().default("{}"),
  channel: text("channel").notNull().default("in_app"), // "in_app" | "email" | "push"
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  sentAt: text("sent_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ----------------------------------------------------------------
// Price alerts — watches an item and notifies when market price
// drops below / rises above a threshold.
// Background job reads this table and calls market-value service.
// ----------------------------------------------------------------
export const priceAlerts = sqliteTable("price_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  targetPrice: real("target_price").notNull(),
  direction: text("direction").notNull().default("below"), // "below" | "above"
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  triggeredAt: text("triggered_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ----------------------------------------------------------------
// Background jobs — persistent job queue for async processing.
// Worker reads rows with status="pending", runs the handler,
// marks "completed" or "failed". Retry count limits re-queuing.
// ----------------------------------------------------------------
export const backgroundJobs = sqliteTable("background_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // "price_check" | "send_notification" | "generate_ai_recommendations"
  // JSON payload specific to the job type
  payload: text("payload").notNull().default("{}"),
  status: text("status").notNull().default("pending"), // "pending" | "running" | "completed" | "failed"
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  lastError: text("last_error"),
  scheduledAt: text("scheduled_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ----------------------------------------------------------------
// AI recommendations — cached results from LLM-powered item analysis.
// Re-generated periodically by a background job.
// ----------------------------------------------------------------
export const aiRecommendations = sqliteTable("ai_recommendations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "sell" | "rent" | "service" | "insure" | "upgrade"
  title: text("title").notNull(),
  body: text("body").notNull(),
  // Confidence 0–1 from the model
  confidence: real("confidence").notNull().default(0.5),
  // Raw model output for debugging / display
  rawResponse: text("raw_response"),
  model: text("model"), // e.g. "claude-sonnet-4-6"
  expiresAt: text("expires_at"), // recommendations are re-generated after expiry
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ---- inferred types ----
export type ItemRow = typeof items.$inferSelect;
export type NewItemRow = typeof items.$inferInsert;
export type MarketValueRow = typeof marketValues.$inferSelect;
export type NewMarketValueRow = typeof marketValues.$inferInsert;
export type MaintenanceRow = typeof maintenanceRecords.$inferSelect;
export type NewMaintenanceRow = typeof maintenanceRecords.$inferInsert;
export type RentalRow = typeof rentalListings.$inferSelect;
export type NewRentalRow = typeof rentalListings.$inferInsert;
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
export type PriceAlertRow = typeof priceAlerts.$inferSelect;
export type NewPriceAlertRow = typeof priceAlerts.$inferInsert;
export type BackgroundJobRow = typeof backgroundJobs.$inferSelect;
export type NewBackgroundJobRow = typeof backgroundJobs.$inferInsert;
export type AiRecommendationRow = typeof aiRecommendations.$inferSelect;
export type NewAiRecommendationRow = typeof aiRecommendations.$inferInsert;
