"use client";

import dynamic from "next/dynamic";

type HomeViewClientProps = {
  isAuthenticated: boolean;
  displayName: string | null;
};

const HomeView = dynamic(() => import("@/components/homeView"), {
  ssr: false
});

export default function HomeViewClient({
  isAuthenticated,
  displayName
}: HomeViewClientProps) {
  return <HomeView isAuthenticated={isAuthenticated} displayName={displayName} />;
}