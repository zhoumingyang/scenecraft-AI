import * as THREE from "three";

import type { QuatTuple, Vec3Tuple } from "../core/types";
import {
  ASSET_UNITS,
  MODEL_FILE_FORMATS,
  type AssetUnit,
  type ModelFileFormat
} from "../constants/model";

export const DEFAULT_POSITION: Vec3Tuple = [0, 0, 0];
export const DEFAULT_QUATERNION: QuatTuple = [0, 0, 0, 1];
export const DEFAULT_SCALE: Vec3Tuple = [1, 1, 1];

export function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizePositiveNumber(value: unknown, fallback: number): number {
  const normalized = normalizeNumber(value, fallback);
  return normalized > 0 ? normalized : fallback;
}

export function normalizeColor(value: unknown, fallback = "#ffffff"): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed;
}

export function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeVec3(value: unknown, fallback: Vec3Tuple): Vec3Tuple {
  if (!Array.isArray(value)) return [...fallback];
  return [
    normalizeNumber(value[0], fallback[0]),
    normalizeNumber(value[1], fallback[1]),
    normalizeNumber(value[2], fallback[2])
  ];
}

export function normalizeQuat(value: unknown, fallback: QuatTuple): QuatTuple {
  if (!Array.isArray(value)) return [...fallback];
  return [
    normalizeNumber(value[0], fallback[0]),
    normalizeNumber(value[1], fallback[1]),
    normalizeNumber(value[2], fallback[2]),
    normalizeNumber(value[3], fallback[3])
  ];
}

export function normalizeId(prefix: string, value: unknown, index: number): string {
  const raw = normalizeString(value);
  return raw || `${prefix}-${index}`;
}

export function normalizeLightType(value: number | string | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const lookup: Record<string, number> = {
      ambient: 1,
      direction: 2,
      directional: 2,
      point: 3,
      spot: 4,
      rect: 5,
      rectarea: 5,
      "rect area": 5,
      hemisphere: 6,
      hemi: 6
    };
    const normalized = value.trim().toLowerCase();
    if (lookup[normalized]) return lookup[normalized];
    const numeric = Number(normalized);
    if (Number.isFinite(numeric)) return Math.trunc(numeric);
  }

  return 1;
}

export function clampUnitInterval(value: unknown, fallback: number): number {
  return THREE.MathUtils.clamp(normalizeNumber(value, fallback), 0, 1);
}

export function normalizeModelFormat(
  value: unknown,
  fallback: ModelFileFormat = "glb"
): ModelFileFormat {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if ((MODEL_FILE_FORMATS as readonly string[]).includes(normalized)) {
    return normalized as ModelFileFormat;
  }
  return fallback;
}

export function normalizeAssetUnit(value: unknown, fallback: AssetUnit = "unknown"): AssetUnit {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if ((ASSET_UNITS as readonly string[]).includes(normalized)) {
    return normalized as AssetUnit;
  }
  return fallback;
}

export function assetUnitToMeters(unit: AssetUnit): number {
  if (unit === "cm") return 0.01;
  if (unit === "mm") return 0.001;
  return 1;
}
