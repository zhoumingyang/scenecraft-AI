import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AI_RATE_LIMIT_POLICIES,
  calculateFixedWindow,
  evaluateRateLimitUsage,
  getRetryAfterSeconds
} from "../../../../lib/server/aiRateLimit/policies.ts";

test("high-cost image generation policy is stricter than prompt transform", () => {
  assert.equal(AI_RATE_LIMIT_POLICIES.imageGenerate.concurrency, 1);
  assert.ok(
    AI_RATE_LIMIT_POLICIES.imageGenerate.burst.limit <
      AI_RATE_LIMIT_POLICIES.promptTransform.burst.limit
  );
  assert.ok(
    AI_RATE_LIMIT_POLICIES.imageGenerate.daily.limit <
      AI_RATE_LIMIT_POLICIES.promptTransform.daily.limit
  );
});

test("every route policy allows at least one request in each configured window", () => {
  for (const [policyId, policy] of Object.entries(AI_RATE_LIMIT_POLICIES)) {
    assert.ok(policy.cost <= policy.burst.limit, `${policyId} burst limit is below request cost`);
    assert.ok(policy.cost <= policy.daily.limit, `${policyId} daily limit is below request cost`);
  }
});

test("fixed window calculation returns stable start and end boundaries", () => {
  const now = new Date("2026-07-06T10:05:42.500Z");
  const window = calculateFixedWindow(now, 10 * 60 * 1000);

  assert.equal(window.start.toISOString(), "2026-07-06T10:00:00.000Z");
  assert.equal(window.end.toISOString(), "2026-07-06T10:10:00.000Z");
});

test("rate limit usage allows requests at the limit and rejects above it", () => {
  assert.deepEqual(evaluateRateLimitUsage({ currentUsed: 2, increment: 1, limit: 3 }), {
    allowed: true,
    nextUsed: 3
  });
  assert.deepEqual(evaluateRateLimitUsage({ currentUsed: 3, increment: 1, limit: 3 }), {
    allowed: false,
    nextUsed: 3
  });
});

test("retry-after is rounded up and never below one second", () => {
  const now = new Date("2026-07-06T10:00:00.100Z");
  const windowEnd = new Date("2026-07-06T10:00:00.200Z");

  assert.equal(getRetryAfterSeconds(windowEnd, now), 1);
});
