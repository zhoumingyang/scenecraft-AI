import { NextResponse } from "next/server";
import type { AuthenticatedSession } from "@/lib/server/auth/withAuth";
import type { AiRateLimitPolicy } from "./policies";
import { acquireAiRateLimitPermit, releaseAiRateLimitPermit } from "./store";

type RateLimitedRouteHandler<TContext> = (
  request: Request,
  context: TContext,
  session: AuthenticatedSession
) => Response | Promise<Response>;

function buildHeaders(retryAfterSeconds: number | undefined) {
  const headers = new Headers();

  if (retryAfterSeconds) {
    headers.set("Retry-After", String(retryAfterSeconds));
  }

  return headers;
}

export function withAiRateLimit<TContext = unknown>(
  policy: AiRateLimitPolicy,
  handler: RateLimitedRouteHandler<TContext>
): RateLimitedRouteHandler<TContext> {
  return async function rateLimitedRoute(request, context, session) {
    const limit = await acquireAiRateLimitPermit({
      policy,
      userId: session.user.id
    }).catch((error) => {
      console.warn("[ai-rate-limit] Failed to acquire rate limit permit.", error);

      return {
        allowed: false,
        reason: "unavailable",
        status: 503,
        message: "AI rate limiting is unavailable.",
        retryAfterSeconds: undefined
      } as const;
    });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          message: limit.message,
          code: limit.reason === "unavailable" ? "AI_RATE_LIMIT_UNAVAILABLE" : "AI_RATE_LIMITED",
          retryAfterSeconds: limit.retryAfterSeconds
        },
        {
          status: limit.status,
          headers: buildHeaders(limit.retryAfterSeconds)
        }
      );
    }

    try {
      return await handler(request, context, session);
    } finally {
      await releaseAiRateLimitPermit(limit.permit);
    }
  };
}
