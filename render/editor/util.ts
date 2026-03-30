import * as THREE from "three";

import type { QuatTuple, Vec3Tuple, Vector2Tuple } from "./typings";

export const DEFAULT_POSITION: Vec3Tuple = [0, 0, 0];
export const DEFAULT_QUATERNION: QuatTuple = [0, 0, 0, 1];
export const DEFAULT_SCALE: Vec3Tuple = [1, 1, 1];

export function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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
      "rect area": 5
    };
    const normalized = value.trim().toLowerCase();
    if (lookup[normalized]) return lookup[normalized];
    const numeric = Number(normalized);
    if (Number.isFinite(numeric)) return Math.trunc(numeric);
  }

  return 1;
}

export function buildTransformSignature(object: THREE.Object3D): string {
  const p = object.position;
  const q = object.quaternion;
  const s = object.scale;
  return `${p.x.toFixed(6)}|${p.y.toFixed(6)}|${p.z.toFixed(6)}|${q.x.toFixed(6)}|${q.y.toFixed(6)}|${q.z.toFixed(6)}|${q.w.toFixed(6)}|${s.x.toFixed(6)}|${s.y.toFixed(6)}|${s.z.toFixed(6)}`;
}

export function setEntityId(object: THREE.Object3D, id: string) {
  object.userData.editorEntityId = id;
  object.traverse((child) => {
    child.userData.editorEntityId = id;
  });
}

export function disposeObject3D(root: THREE.Object3D) {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

export function createBuiltinGeometry(name: string): THREE.BufferGeometry {
  const normalized = name.trim().toLowerCase();
  if (normalized === "capsule") return new THREE.CapsuleGeometry(0.6, 1.2, 8, 16);
  if (normalized === "sphere") return new THREE.SphereGeometry(0.8, 24, 16);
  if (normalized === "circle") return new THREE.CircleGeometry(0.9, 32);
  if (normalized === "cylinder") return new THREE.CylinderGeometry(0.7, 0.7, 1.4, 24);
  return new THREE.BoxGeometry(1, 1, 1);
}

export function toFloatArray3(vertices: Array<{ x: number; y: number; z: number }>): Float32Array {
  const output: number[] = [];
  vertices.forEach((vertex) => {
    output.push(vertex.x, vertex.y, vertex.z);
  });
  return new Float32Array(output);
}

export function toFloatArray2(uvs: Array<{ x: number; y: number }>): Float32Array {
  const output: number[] = [];
  uvs.forEach((uv) => {
    output.push(uv.x, uv.y);
  });
  return new Float32Array(output);
}

export function toThreeVector2(value: Vector2Tuple): THREE.Vector2 {
  return new THREE.Vector2(value[0], value[1]);
}
