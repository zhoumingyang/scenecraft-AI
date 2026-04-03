import type {
  ModelAnimationClipJSON,
  ModelAnimationPlaybackState
} from "../core/types";

export function buildModelAnimationId(name: string, index: number) {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `animation-${index}-${normalizedName || "clip"}`;
}

export function normalizeModelAnimationPlaybackState(
  value: unknown,
  fallback: ModelAnimationPlaybackState = "stopped"
): ModelAnimationPlaybackState {
  if (value === "playing" || value === "paused" || value === "stopped") {
    return value;
  }
  return fallback;
}

export function normalizeModelAnimationClips(value: unknown): ModelAnimationClipJSON[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<ModelAnimationClipJSON>;
    const rawName = typeof candidate.name === "string" && candidate.name.trim()
      ? candidate.name.trim()
      : `Animation ${index + 1}`;
    const duration =
      typeof candidate.duration === "number" && Number.isFinite(candidate.duration)
        ? candidate.duration
        : 0;
    const id =
      typeof candidate.id === "string" && candidate.id.trim()
        ? candidate.id.trim()
        : buildModelAnimationId(rawName, index);

    return [
      {
        id,
        name: rawName,
        duration
      }
    ];
  });
}
