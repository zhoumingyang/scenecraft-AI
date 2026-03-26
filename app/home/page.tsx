import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import HomeViewClient from "@/components/homeViewClient";

export default async function HomePage() {
  const sessionData = await auth.api.getSession({
    headers: await headers()
  });
  const userName =
    sessionData?.user?.name || sessionData?.user?.email?.split("@")[0] || null;

  return <HomeViewClient isAuthenticated={Boolean(sessionData)} displayName={userName} />;
}
