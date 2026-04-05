import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getSession() {
  try {
    return await auth.api.getSession({
      headers: await headers()
    });
  } catch {
    // Old or malformed cookies can throw while Better Auth parses the session.
    // Treat that case as "signed out" so protected pages redirect cleanly.
    console.warn("[auth] Failed to read session cookie. Treating request as signed out.");
    return null;
  }
}
