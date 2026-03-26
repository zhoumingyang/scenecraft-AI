import { create } from "zustand";

export type AuthMode = "login" | "register";

type AppState = {
  authMode: AuthMode;
  keyword: string;
  setAuthMode: (mode: AuthMode) => void;
  setKeyword: (keyword: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  authMode: "login",
  keyword: "灵感",
  setAuthMode: (mode) => set({ authMode: mode }),
  setKeyword: (keyword) => set({ keyword })
}));
