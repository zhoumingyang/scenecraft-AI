export type AiRateLimitWindowPolicy = {
  limit: number;
  windowMs: number;
};

export type AiRateLimitPolicy = {
  routeKey: string;
  label: string;
  burst: AiRateLimitWindowPolicy;
  daily: AiRateLimitWindowPolicy;
  concurrency: number;
  cost: number;
  inflightTtlMs: number;
};

export type AiRateLimitPolicyId =
  | "promptTransform"
  | "imageGenerate"
  | "pbrTextureGenerate"
  | "panoramaGenerate"
  | "renderOptimize"
  | "ai3dGenerate"
  | "ai3dOptimize"
  | "assetRecommend";

export type FixedWindow = {
  start: Date;
  end: Date;
};

export type RateLimitUsageInput = {
  currentUsed: number;
  increment: number;
  limit: number;
};

export type RateLimitUsageDecision = {
  allowed: boolean;
  nextUsed: number;
};

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const AI_RATE_LIMIT_POLICIES: Record<AiRateLimitPolicyId, AiRateLimitPolicy> = {
  promptTransform: {
    routeKey: "ai.prompts.transform",
    label: "AI prompt transform",
    burst: { limit: 20, windowMs: MINUTE_MS },
    daily: { limit: 300, windowMs: DAY_MS },
    concurrency: 3,
    cost: 1,
    inflightTtlMs: 2 * MINUTE_MS
  },
  imageGenerate: {
    routeKey: "ai.images.generate",
    label: "AI image generation",
    burst: { limit: 3, windowMs: 10 * MINUTE_MS },
    daily: { limit: 30, windowMs: DAY_MS },
    concurrency: 1,
    cost: 1,
    inflightTtlMs: 4 * MINUTE_MS
  },
  pbrTextureGenerate: {
    routeKey: "ai.textures.pbr.generate",
    label: "AI PBR texture generation",
    burst: { limit: 2, windowMs: 10 * MINUTE_MS },
    daily: { limit: 20, windowMs: DAY_MS },
    concurrency: 1,
    cost: 1,
    inflightTtlMs: 4 * MINUTE_MS
  },
  panoramaGenerate: {
    routeKey: "ai.panoramas.generate",
    label: "AI panorama generation",
    burst: { limit: 2, windowMs: 15 * MINUTE_MS },
    daily: { limit: 10, windowMs: DAY_MS },
    concurrency: 1,
    cost: 1,
    inflightTtlMs: 4 * MINUTE_MS
  },
  renderOptimize: {
    routeKey: "ai.render.optimize",
    label: "AI render optimization",
    burst: { limit: 2, windowMs: 10 * MINUTE_MS },
    daily: { limit: 20, windowMs: DAY_MS },
    concurrency: 1,
    cost: 1,
    inflightTtlMs: 4 * MINUTE_MS
  },
  ai3dGenerate: {
    routeKey: "ai.3d.generate",
    label: "AI 3D generation",
    burst: { limit: 5, windowMs: 10 * MINUTE_MS },
    daily: { limit: 30, windowMs: DAY_MS },
    concurrency: 1,
    cost: 1,
    inflightTtlMs: 4 * MINUTE_MS
  },
  ai3dOptimize: {
    routeKey: "ai.3d.optimize",
    label: "AI 3D optimization",
    burst: { limit: 3, windowMs: 10 * MINUTE_MS },
    daily: { limit: 20, windowMs: DAY_MS },
    concurrency: 1,
    cost: 1,
    inflightTtlMs: 5 * MINUTE_MS
  },
  assetRecommend: {
    routeKey: "ai.assets.recommend",
    label: "AI asset recommendation",
    burst: { limit: 5, windowMs: 10 * MINUTE_MS },
    daily: { limit: 50, windowMs: DAY_MS },
    concurrency: 1,
    cost: 1,
    inflightTtlMs: 4 * MINUTE_MS
  }
};

export function calculateFixedWindow(now: Date, windowMs: number): FixedWindow {
  const windowStartMs = Math.floor(now.getTime() / windowMs) * windowMs;

  return {
    start: new Date(windowStartMs),
    end: new Date(windowStartMs + windowMs)
  };
}

export function evaluateRateLimitUsage({
  currentUsed,
  increment,
  limit
}: RateLimitUsageInput): RateLimitUsageDecision {
  const nextUsed = currentUsed + increment;

  if (nextUsed > limit) {
    return {
      allowed: false,
      nextUsed: currentUsed
    };
  }

  return {
    allowed: true,
    nextUsed
  };
}

export function getRetryAfterSeconds(windowEnd: Date, now: Date) {
  return Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000));
}
