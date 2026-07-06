CREATE TABLE "ai_rate_limit_counters" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "route_key" text NOT NULL,
  "window_key" text NOT NULL,
  "window_start" timestamp with time zone NOT NULL,
  "window_end" timestamp with time zone NOT NULL,
  "used" integer DEFAULT 0 NOT NULL,
  "limit" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ai_rate_limit_counters_user_id_user_id_fk"
    FOREIGN KEY ("user_id")
    REFERENCES "user"("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX "ai_rate_limit_counters_lookup_unique"
  ON "ai_rate_limit_counters" ("user_id", "route_key", "window_key", "window_start");
CREATE INDEX "ai_rate_limit_counters_user_route_idx"
  ON "ai_rate_limit_counters" ("user_id", "route_key");
CREATE INDEX "ai_rate_limit_counters_window_end_idx"
  ON "ai_rate_limit_counters" ("window_end");

CREATE TABLE "ai_rate_limit_inflight" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "route_key" text NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "ai_rate_limit_inflight_user_id_user_id_fk"
    FOREIGN KEY ("user_id")
    REFERENCES "user"("id")
    ON DELETE CASCADE
);

CREATE INDEX "ai_rate_limit_inflight_user_route_idx"
  ON "ai_rate_limit_inflight" ("user_id", "route_key");
CREATE INDEX "ai_rate_limit_inflight_expires_at_idx"
  ON "ai_rate_limit_inflight" ("expires_at");
