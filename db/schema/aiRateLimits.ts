import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const aiRateLimitCounters = pgTable(
  "ai_rate_limit_counters",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    routeKey: text("route_key").notNull(),
    windowKey: text("window_key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    used: integer("used").notNull().default(0),
    limit: integer("limit").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    lookupUniqueIdx: uniqueIndex("ai_rate_limit_counters_lookup_unique").on(
      table.userId,
      table.routeKey,
      table.windowKey,
      table.windowStart
    ),
    userRouteIdx: index("ai_rate_limit_counters_user_route_idx").on(table.userId, table.routeKey),
    windowEndIdx: index("ai_rate_limit_counters_window_end_idx").on(table.windowEnd)
  })
);

export const aiRateLimitInflight = pgTable(
  "ai_rate_limit_inflight",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    routeKey: text("route_key").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
  },
  (table) => ({
    userRouteIdx: index("ai_rate_limit_inflight_user_route_idx").on(table.userId, table.routeKey),
    expiresAtIdx: index("ai_rate_limit_inflight_expires_at_idx").on(table.expiresAt)
  })
);
