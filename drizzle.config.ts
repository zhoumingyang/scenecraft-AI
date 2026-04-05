import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run Drizzle commands.");
}

export default defineConfig({
  out: "./db/migrations",
  schema: "./db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl
  }
});
