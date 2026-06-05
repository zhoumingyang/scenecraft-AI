import * as THREE from "three";

export type GizmoHandleType = "translate-axis" | "translate-free" | "rotate-axis";
export type GizmoHandleAxis = "x" | "y" | "z" | "free";
export type GizmoHandleKey =
  | "translate-axis:x"
  | "translate-axis:y"
  | "translate-axis:z"
  | "translate-free:free"
  | "rotate-axis:x"
  | "rotate-axis:y"
  | "rotate-axis:z";

export type ActiveDrag =
  | {
      type: "translate-axis";
      axis: "x" | "y" | "z";
      origin: THREE.Vector3;
      startWorldPosition: THREE.Vector3;
      plane: THREE.Plane;
      startOffset: number;
    }
  | {
      type: "translate-free";
      plane: THREE.Plane;
      startPoint: THREE.Vector3;
      startWorldPosition: THREE.Vector3;
    }
  | {
      type: "rotate-axis";
      axis: "x" | "y" | "z";
      origin: THREE.Vector3;
      plane: THREE.Plane;
      startVector: THREE.Vector3;
      startWorldQuaternion: THREE.Quaternion;
      currentAngle: number;
    };

export type PointerInfo = {
  clientX: number;
  clientY: number;
};

export type HandleVisual = {
  key: GizmoHandleKey;
  type: GizmoHandleType;
  axis: GizmoHandleAxis;
  root: THREE.Object3D;
  pickTargets: THREE.Object3D[];
  materials: THREE.MeshBasicMaterial[];
};

export type RotateVisual = HandleVisual & {
  base: THREE.Group;
  previewMesh: THREE.Mesh;
  fullMesh: THREE.Mesh;
};

export type TranslateVisual = HandleVisual & {
  base: THREE.Group;
  tip: THREE.Mesh;
};

export function normalizePositiveAngle(angle: number) {
  const fullTurn = Math.PI * 2;
  return ((angle % fullTurn) + fullTurn) % fullTurn;
}

export function getAxisVector(axis: "x" | "y" | "z"): THREE.Vector3 {
  if (axis === "x") return new THREE.Vector3(1, 0, 0);
  if (axis === "y") return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

export function getHandleKey(type: GizmoHandleType, axis: GizmoHandleAxis): GizmoHandleKey {
  return `${type}:${axis}` as GizmoHandleKey;
}
