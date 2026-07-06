import { randomUUID } from "crypto";
import type { PoolClient } from "pg";
import { pool } from "@/db";
import {
  calculateFixedWindow,
  evaluateRateLimitUsage,
  getRetryAfterSeconds,
  type AiRateLimitPolicy,
  type AiRateLimitWindowPolicy
} from "./policies";

export type AiRateLimitPermit = {
  inflightId: string | null;
};

export type AiRateLimitDenyReason = "burst" | "daily" | "concurrency" | "unavailable";

export type AiRateLimitAcquireResult =
  | {
      allowed: true;
      permit: AiRateLimitPermit;
    }
  | {
      allowed: false;
      reason: AiRateLimitDenyReason;
      status: 429 | 503;
      message: string;
      retryAfterSeconds?: number;
    };

type WindowCheckInput = {
  client: PoolClient;
  userId: string;
  routeKey: string;
  windowKey: "burst" | "daily";
  policy: AiRateLimitWindowPolicy;
  cost: number;
  now: Date;
  label: string;
};

let warnedMissingLocalDatabase = false;

function buildLimitMessage(label: string) {
  return `${label} usage limit reached. Please try again later.`;
}

function buildConcurrencyMessage(label: string) {
  return `You already have a ${label} request running. Please wait for it to finish.`;
}

function buildUnavailableMessage() {
  return "AI rate limiting is unavailable because DATABASE_URL is not configured.";
}

async function consumeWindow({
  client,
  userId,
  routeKey,
  windowKey,
  policy,
  cost,
  now,
  label
}: WindowCheckInput): Promise<AiRateLimitAcquireResult | null> {
  const window = calculateFixedWindow(now, policy.windowMs);
  const counterId = randomUUID();

  await client.query(
    `
      INSERT INTO ai_rate_limit_counters (
        id,
        user_id,
        route_key,
        window_key,
        window_start,
        window_end,
        used,
        "limit",
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $8)
      ON CONFLICT (user_id, route_key, window_key, window_start) DO NOTHING
    `,
    [counterId, userId, routeKey, windowKey, window.start, window.end, policy.limit, now]
  );

  const counter = await client.query<{ used: number }>(
    `
      SELECT used
      FROM ai_rate_limit_counters
      WHERE user_id = $1
        AND route_key = $2
        AND window_key = $3
        AND window_start = $4
      FOR UPDATE
    `,
    [userId, routeKey, windowKey, window.start]
  );
  const currentUsed = Number(counter.rows[0]?.used ?? 0);
  const decision = evaluateRateLimitUsage({
    currentUsed,
    increment: cost,
    limit: policy.limit
  });

  if (!decision.allowed) {
    return {
      allowed: false,
      reason: windowKey,
      status: 429,
      message: buildLimitMessage(label),
      retryAfterSeconds: getRetryAfterSeconds(window.end, now)
    };
  }

  await client.query(
    `
      UPDATE ai_rate_limit_counters
      SET used = $1,
          "limit" = $2,
          window_end = $3,
          updated_at = $4
      WHERE user_id = $5
        AND route_key = $6
        AND window_key = $7
        AND window_start = $8
    `,
    [decision.nextUsed, policy.limit, window.end, now, userId, routeKey, windowKey, window.start]
  );

  return null;
}

export async function acquireAiRateLimitPermit({
  policy,
  userId,
  now = new Date()
}: {
  policy: AiRateLimitPolicy;
  userId: string;
  now?: Date;
}): Promise<AiRateLimitAcquireResult> {
  if (!pool) {
    if (process.env.NODE_ENV === "production") {
      return {
        allowed: false,
        reason: "unavailable",
        status: 503,
        message: buildUnavailableMessage()
      };
    }

    if (!warnedMissingLocalDatabase) {
      warnedMissingLocalDatabase = true;
      console.warn("[ai-rate-limit] DATABASE_URL is not configured. AI limits are bypassed locally.");
    }

    return {
      allowed: true,
      permit: { inflightId: null }
    };
  }

  const client = await pool.connect();
  const inflightId = randomUUID();

  try {
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM ai_rate_limit_inflight WHERE route_key = $1 AND expires_at <= $2",
      [policy.routeKey, now]
    );

    const inflight = await client.query<{ count: string; earliest_expires_at: Date | null }>(
      `
        SELECT COUNT(*)::text AS count,
               MIN(expires_at) AS earliest_expires_at
        FROM ai_rate_limit_inflight
        WHERE user_id = $1
          AND route_key = $2
      `,
      [userId, policy.routeKey]
    );
    const currentInflight = Number(inflight.rows[0]?.count ?? 0);

    if (currentInflight >= policy.concurrency) {
      await client.query("ROLLBACK");

      return {
        allowed: false,
        reason: "concurrency",
        status: 429,
        message: buildConcurrencyMessage(policy.label),
        retryAfterSeconds: getRetryAfterSeconds(
          inflight.rows[0]?.earliest_expires_at ?? new Date(now.getTime() + policy.inflightTtlMs),
          now
        )
      };
    }

    await client.query(
      `
        INSERT INTO ai_rate_limit_inflight (id, user_id, route_key, started_at, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [inflightId, userId, policy.routeKey, now, new Date(now.getTime() + policy.inflightTtlMs)]
    );

    const burstDenied = await consumeWindow({
      client,
      userId,
      routeKey: policy.routeKey,
      windowKey: "burst",
      policy: policy.burst,
      cost: policy.cost,
      now,
      label: policy.label
    });

    if (burstDenied) {
      await client.query("ROLLBACK");
      return burstDenied;
    }

    const dailyDenied = await consumeWindow({
      client,
      userId,
      routeKey: policy.routeKey,
      windowKey: "daily",
      policy: policy.daily,
      cost: policy.cost,
      now,
      label: policy.label
    });

    if (dailyDenied) {
      await client.query("ROLLBACK");
      return dailyDenied;
    }

    await client.query("COMMIT");

    return {
      allowed: true,
      permit: { inflightId }
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function releaseAiRateLimitPermit(permit: AiRateLimitPermit) {
  if (!pool || !permit.inflightId) {
    return;
  }

  try {
    await pool.query("DELETE FROM ai_rate_limit_inflight WHERE id = $1", [permit.inflightId]);
  } catch (error) {
    console.warn("[ai-rate-limit] Failed to release inflight permit.", error);
  }
}
