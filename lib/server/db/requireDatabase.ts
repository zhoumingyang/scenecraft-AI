import { db, isDatabaseConfigured } from "@/db";
import { ServerConfigurationError } from "@/lib/server/http/errors";

export function requireDatabase() {
  if (!isDatabaseConfigured || !db) {
    throw new ServerConfigurationError(
      "DATABASE_URL is not configured. Project persistence is unavailable."
    );
  }

  return db;
}
