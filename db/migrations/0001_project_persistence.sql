CREATE TABLE "projects" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "title" varchar(120) NOT NULL,
  "description" text,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "snapshot" jsonb NOT NULL,
  "ai_snapshot" jsonb NOT NULL,
  "thumbnail_asset_id" text,
  "version" integer DEFAULT 1 NOT NULL,
  "last_opened_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "projects_user_id_user_id_fk"
    FOREIGN KEY ("user_id")
    REFERENCES "user"("id")
    ON DELETE CASCADE
);

CREATE INDEX "projects_user_id_idx" ON "projects" ("user_id");
CREATE INDEX "projects_updated_at_idx" ON "projects" ("updated_at");
CREATE INDEX "projects_deleted_at_idx" ON "projects" ("deleted_at");

CREATE TABLE "assets" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "project_id" text NOT NULL,
  "kind" text NOT NULL,
  "provider" text NOT NULL,
  "object_key" text NOT NULL,
  "url" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "original_name" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "assets_user_id_user_id_fk"
    FOREIGN KEY ("user_id")
    REFERENCES "user"("id")
    ON DELETE CASCADE,
  CONSTRAINT "assets_project_id_projects_id_fk"
    FOREIGN KEY ("project_id")
    REFERENCES "projects"("id")
    ON DELETE CASCADE
);

CREATE INDEX "assets_user_id_idx" ON "assets" ("user_id");
CREATE INDEX "assets_project_id_idx" ON "assets" ("project_id");
CREATE INDEX "assets_kind_idx" ON "assets" ("kind");
CREATE INDEX "assets_object_key_idx" ON "assets" ("object_key");
