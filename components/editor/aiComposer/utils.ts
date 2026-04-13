"use client";

export function parseSeed(seedText: string) {
  const trimmed = seedText.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}
