import { redirect } from "next/navigation";
import { getSession } from "./getSession";

export async function requireSessionUser() {
  const session = await getSession();

  if (!session) {
    // Centralize the redirect rule so every protected page uses the same
    // auth check instead of reimplementing it.
    redirect("/home");
  }

  return session.user;
}
