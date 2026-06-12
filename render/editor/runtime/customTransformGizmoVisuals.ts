import * as THREE from "three";
import {
  getHandleKey,
  type GizmoHandleAxis,
  type GizmoHandleType,
  type HandleVisual,
  type RotateVisual,
  type TranslateVisual
} from "./customTransformGizmoTypes";

function createHandleMaterial(color: string, opacity: number) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false
  });

  material.userData.baseColor = color;
  material.userData.baseOpacity = opacity;
  return material;
}

function tintHex(color: string, amount: number) {
  const source = new THREE.Color(color);
  const target = new THREE.Color(amount >= 0 ? "#ffffff" : "#000000");
  return `#${source.lerp(target, Math.min(Math.abs(amount), 1)).getHexString()}`;
}

function tagHandle(object: THREE.Object3D, type: GizmoHandleType, axis: GizmoHandleAxis) {
  object.userData.gizmoHandleType = type;
  object.userData.gizmoAxis = axis;
  object.renderOrder = 999;
}

export function createTranslateVisual(
  axis: "x" | "y" | "z",
  color: string,
  handleTargets: THREE.Object3D[]
): TranslateVisual {
  const key = getHandleKey("translate-axis", axis);
  const root = new THREE.Group();
  const base = new THREE.Group();
  const shaftMaterial = createHandleMaterial(tintHex(color, -0.16), 0.92);
  const tipMaterial = createHandleMaterial(tintHex(color, 0.08), 0.98);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.92, 64), shaftMaterial);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 18), tipMaterial);

  shaft.position.y = 0.46;
  tip.position.y = 1.08;
  tagHandle(root, "translate-axis", axis);
  tagHandle(base, "translate-axis", axis);
  tagHandle(shaft, "translate-axis", axis);
  tagHandle(tip, "translate-axis", axis);
  base.add(shaft, tip);
  root.add(base);
  handleTargets.push(root, base, shaft, tip);

  return {
    key,
    type: "translate-axis",
    axis,
    root,
    base,
    tip,
    pickTargets: [root, base, shaft, tip],
    materials: [shaftMaterial, tipMaterial]
  };
}

export function createRotateVisual(
  axis: "x" | "y" | "z",
  color: string,
  handleTargets: THREE.Object3D[]
): RotateVisual {
  const key = getHandleKey("rotate-axis", axis);
  const root = new THREE.Group();
  const base = new THREE.Group();
  const previewMaterial = createHandleMaterial(tintHex(color, -0.08), 0.48);
  const fullMaterial = createHandleMaterial(color, 0.86);
  const previewMesh = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.022, 10, 48, Math.PI / 2),
    previewMaterial
  );
  const fullMesh = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.022, 10, 96, Math.PI * 2),
    fullMaterial
  );

  fullMesh.visible = false;
  tagHandle(root, "rotate-axis", axis);
  tagHandle(base, "rotate-axis", axis);
  tagHandle(previewMesh, "rotate-axis", axis);
  tagHandle(fullMesh, "rotate-axis", axis);
  base.add(previewMesh, fullMesh);
  root.add(base);
  handleTargets.push(root, base, previewMesh, fullMesh);

  return {
    key,
    type: "rotate-axis",
    axis,
    root,
    base,
    previewMesh,
    fullMesh,
    pickTargets: [root, base, previewMesh, fullMesh],
    materials: [previewMaterial, fullMaterial]
  };
}

export function createFreeTranslateVisual(handleTargets: THREE.Object3D[]): HandleVisual {
  const key = getHandleKey("translate-free", "free");
  const root = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.14, 0),
    createHandleMaterial("#f4f7ff", 0.95)
  );
  tagHandle(root, "translate-free", "free");
  handleTargets.push(root);

  return {
    key,
    type: "translate-free",
    axis: "free",
    root,
    pickTargets: [root],
    materials: [root.material as THREE.MeshBasicMaterial]
  };
}
