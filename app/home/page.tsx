import HomeViewClient from "@/components/homeViewClient";
import { getSession } from "@/lib/server/auth/getSession";

export default async function HomePage() {
  const sessionData = await getSession();
  const userName =
    sessionData?.user?.name || sessionData?.user?.email?.split("@")[0] || null;
  const socialProviders = {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
  };

  return (
    <HomeViewClient
      isAuthenticated={Boolean(sessionData)}
      displayName={userName}
      socialProviders={socialProviders}
    />
  );
}
