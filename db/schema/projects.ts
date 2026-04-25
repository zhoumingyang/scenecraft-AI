import { relations, sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import type { EditorProjectJSON, ProjectAiLibraryJSON } from "@/render/editor";
import { user } from "./auth";
import { assets } from "./assets";

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description"),
    tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    snapshot: jsonb("snapshot").$type<EditorProjectJSON>().notNull(),
    aiSnapshot: jsonb("ai_snapshot").$type<ProjectAiLibraryJSON>().notNull(),
    thumbnailAssetId: text("thumbnail_asset_id"),
    version: integer("version").notNull().default(1),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => ({
    userIdIdx: index("projects_user_id_idx").on(table.userId),
    updatedAtIdx: index("projects_updated_at_idx").on(table.updatedAt),
    deletedAtIdx: index("projects_deleted_at_idx").on(table.deletedAt)
  })
);

export const projectRelations = relations(projects, ({ many, one }) => ({
  owner: one(user, {
    fields: [projects.userId],
    references: [user.id]
  }),
  assets: many(assets)
}));
