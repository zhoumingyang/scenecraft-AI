import { db, isDatabaseConfigured } from "@/db";

export function requireDatabase() {
  if (!isDatabaseConfigured || !db) {
    throw new Error("DATABASE_URL is not configured. Project persistence is unavailable.");
  }

  return db;
}
