import { useCallback } from "react";
import { Locale, useAppStore } from "@/stores/appStore";
import en from "./i18n/en";
import zh from "./i18n/zh";

type Dictionary = Record<string, string>;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  zh
};

export type TranslationKey = keyof typeof en;

type TranslationParams = Record<string, string | number>;
export type TranslationFunction = (key: TranslationKey, params?: TranslationParams) => string;

export function translate(locale: Locale, key: TranslationKey, params?: TranslationParams): string;
export function translate(locale: Locale, key: string, params?: TranslationParams): string;
export function translate(locale: Locale, key: string, params?: TranslationParams) {
  const typedKey = key as TranslationKey;
  const template = dictionaries[locale][typedKey] ?? dictionaries.en[typedKey] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? ""));
}

export function useI18n() {
  const locale = useAppStore((state) => state.locale);
  const setLocale = useAppStore((state) => state.setLocale);
  const t = useCallback(
    (key: string, params?: TranslationParams) => translate(locale, key, params),
    [locale]
  );
  return { locale, setLocale, t };
}
