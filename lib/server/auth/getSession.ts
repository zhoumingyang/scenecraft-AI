import { headers } from "next/headers";
import { isAPIError } from "better-auth/api";
import { auth } from "@/lib/auth";

function isExpectedSessionReadFailure(error: unknown) {
  return isAPIError(error) && (error.status === "UNAUTHORIZED" || error.status === "BAD_REQUEST");
}

export async function getSession() {
  try {
    return await auth.api.getSession({
      headers: await headers(),
      query: {
        disableCookieCache: true
      }
    });
  } catch (error) {
    if (!isExpectedSessionReadFailure(error)) {
      throw error;
    }

    console.warn("[auth] Invalid session request. Treating request as signed out.");
    return null;
  }
}
