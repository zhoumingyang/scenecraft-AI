"use client";

import * as THREE from "three";
import type { AxisTextValues } from "@/components/common/propertyFieldControls";
import { useI18n } from "@/lib/i18n";
import type { TextureFieldKey } from "./shared";

export const AXIS_INDEX = { x: 0, y: 1, z: 2 } as const;

export function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(digits)).toString();
}

export function formatDegrees(value: number) {
  return `${Math.round(value)}°`;
}

export function quaternionToDegrees(
  quaternion: [number, number, number, number]
): [number, number, number] {
  const euler = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3]),
    "XYZ"
  );
  return [
    THREE.MathUtils.euclideanModulo(THREE.MathUtils.radToDeg(euler.x), 360),
    THREE.MathUtils.euclideanModulo(THREE.MathUtils.radToDeg(euler.y), 360),
    THREE.MathUtils.euclideanModulo(THREE.MathUtils.radToDeg(euler.z), 360)
  ];
}

export function degreesToQuaternion(
  degrees: [number, number, number]
): [number, number, number, number] {
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(degrees[0]),
    THREE.MathUtils.degToRad(degrees[1]),
    THREE.MathUtils.degToRad(degrees[2]),
    "XYZ"
  );
  const quaternion = new THREE.Quaternion().setFromEuler(euler);
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
}

export function buildDefaultPositionDraft(): AxisTextValues {
  return { x: "0", y: "0", z: "0" };
}

export function buildDefaultRotationDraft(): [number, number, number] {
  return [0, 0, 0];
}

export function buildLightNumberDraft(values?: {
  intensity: number;
  distance: number;
  decay: number;
  width: number;
  height: number;
}) {
  if (!values) {
    return {
      intensity: "1",
      distance: "0",
      decay: "2",
      width: "1",
      height: "1"
    };
  }

  return {
    intensity: formatNumber(values.intensity, 3),
    distance: formatNumber(values.distance, 3),
    decay: formatNumber(values.decay, 3),
    width: formatNumber(values.width, 3),
    height: formatNumber(values.height, 3)
  };
}

export function getLightTypeLabel(lightType: number, t: ReturnType<typeof useI18n>["t"]) {
  if (lightType === 2) return t("editor.light.directional");
  if (lightType === 3) return t("editor.light.point");
  if (lightType === 4) return t("editor.light.spot");
  if (lightType === 5) return t("editor.light.rectArea");
  if (lightType === 6) return t("editor.light.hemisphere");
  return t("editor.light.ambient");
}

export function getTextureDialogTitle(
  key: TextureFieldKey,
  t: ReturnType<typeof useI18n>["t"]
) {
  const labels: Record<TextureFieldKey, string> = {
    diffuseMap: t("editor.properties.diffuseMap"),
    metalnessMap: t("editor.properties.metalnessMap"),
    roughnessMap: t("editor.properties.roughnessMap"),
    normalMap: t("editor.properties.normalMap"),
    aoMap: t("editor.properties.aoMap"),
    emissiveMap: t("editor.properties.emissiveMap")
  };
  return labels[key];
}
