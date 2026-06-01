import { NextResponse } from "next/server";
import { getSession } from "./getSession";

type AuthenticatedSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;

type AuthenticatedRouteHandler<TContext> = (
  request: Request,
  context: TContext,
  session: AuthenticatedSession
) => Response | Promise<Response>;

export function withAuth<TContext = unknown>(
  handler: AuthenticatedRouteHandler<TContext>
) {
  return async function authenticatedRoute(request: Request, context: TContext) {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return handler(request, context, session);
  };
}
