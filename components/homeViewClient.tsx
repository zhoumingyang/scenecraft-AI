"use client";

import dynamic from "next/dynamic";

type HomeViewClientProps = {
  isAuthenticated: boolean;
  displayName: string | null;
  socialProviders: {
    google: boolean;
    github: boolean;
  };
};

const HomeView = dynamic(() => import("@/components/homeView"), {
  ssr: false
});

export default function HomeViewClient({
  isAuthenticated,
  displayName,
  socialProviders
}: HomeViewClientProps) {
  return (
    <HomeView
      isAuthenticated={isAuthenticated}
      displayName={displayName}
      socialProviders={socialProviders}
    />
  );
}
