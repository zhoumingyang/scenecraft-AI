import { create } from "zustand";

export type AuthMode = "login" | "register";
export type Locale = "en" | "zh";

type AppState = {
  authMode: AuthMode;
  locale: Locale;
  keyword: string;
  setAuthMode: (mode: AuthMode) => void;
  setLocale: (locale: Locale) => void;
  setKeyword: (keyword: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  authMode: "login",
  locale: "en",
  keyword: "Inspiration",
  setAuthMode: (mode) => set({ authMode: mode }),
  setLocale: (locale) => set({ locale }),
  setKeyword: (keyword) => set({ keyword })
}));
