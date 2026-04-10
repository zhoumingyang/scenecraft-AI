"use client";

import { createHttpClient } from "@/lib/http/axios";

export const appApiClient = createHttpClient({
  baseURL: "/api",
  withCredentials: true,
  onUnauthorized: () => {
    if (typeof window !== "undefined" && window.location.pathname !== "/home") {
      window.location.assign("/home");
    }
  }
});
