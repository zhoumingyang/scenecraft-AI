import HomeViewClient from "@/components/homeViewClient";
import { getSession } from "@/lib/server/auth/getSession";

export default async function HomePage() {
  const sessionData = await getSession();
  const userName =
    sessionData?.user?.name || sessionData?.user?.email?.split("@")[0] || null;

  return <HomeViewClient isAuthenticated={Boolean(sessionData)} displayName={userName} />;
}
