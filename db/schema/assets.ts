import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { ProjectAssetKind } from "@/lib/api/contracts/assets";
import { user } from "./auth";
import { projects } from "./projects";

export const assets = pgTable(
  "assets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ProjectAssetKind>().notNull(),
    provider: text("provider").notNull(),
    objectKey: text("object_key").notNull(),
    url: text("url").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    originalName: text("original_name").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index("assets_user_id_idx").on(table.userId),
    projectIdIdx: index("assets_project_id_idx").on(table.projectId),
    kindIdx: index("assets_kind_idx").on(table.kind),
    objectKeyIdx: index("assets_object_key_idx").on(table.objectKey)
  })
);

export const assetRelations = relations(assets, ({ one }) => ({
  owner: one(user, {
    fields: [assets.userId],
    references: [user.id]
  }),
  project: one(projects, {
    fields: [assets.projectId],
    references: [projects.id]
  })
}));
