"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/authClient";

type SignOutButtonProps = {
  className: string;
};

export default function SignOutButton({ className }: SignOutButtonProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button type="button" className={className} onClick={handleSignOut}>
      退出登录
    </button>
  );
}
