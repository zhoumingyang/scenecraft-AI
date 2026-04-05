import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const connectionString = process.env.DATABASE_URL ?? null;
export const isDatabaseConfigured = Boolean(connectionString);

const globalForDb = globalThis as typeof globalThis & {
  __scenecraftPool?: Pool;
};

// Reuse the same Pool during local hot reloads so we don't create a new
// database connection on every file change.
const pool =
  connectionString
    ? (globalForDb.__scenecraftPool ??
      new Pool({
        connectionString
      }))
    : null;

if (pool && process.env.NODE_ENV !== "production") {
  globalForDb.__scenecraftPool = pool;
}

// In local development we allow running without DATABASE_URL so the app can
// still boot while auth falls back to the in-memory adapter.
export const db = pool ? drizzle(pool, { schema }) : null;
export { pool };
