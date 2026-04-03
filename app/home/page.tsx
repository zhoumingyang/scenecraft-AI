import HomeViewClient from "@/components/homeViewClient";

/*
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const sessionData = await auth.api.getSession({
    headers: await headers()
  });
  const userName =
    sessionData?.user?.name || sessionData?.user?.email?.split("@")[0] || null;

  return <HomeViewClient isAuthenticated={Boolean(sessionData)} displayName={userName} />;
}
*/

export const dynamic = "force-static";

export default function HomePage() {
  return <HomeViewClient isAuthenticated={false} displayName={null} />;
}
