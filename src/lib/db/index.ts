import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// Singleton pattern so we don't create multiple DB connections
// in dev with hot-reload (Next.js)
declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof drizzle> | undefined;
}

function createDb() {
  const dbPath = process.env.DATABASE_URL?.replace("file:", "") ?? "./vault.db";
  const sqlite = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return drizzle(sqlite, { schema });
}

export const db = global.__db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  global.__db = db;
}
