import * as THREE from "three";

import type { EditorLightJSON } from "../core/types";

export function createEntityId(prefix: "model" | "mesh" | "light" | "group") {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now().toString(36)}`;
}

export function formatTitleCase(value: string) {
  if (!value) return "Mesh";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function createDefaultGroupLabel(index: number) {
  return `Group ${index + 1}`;
}

export function createDefaultModelLabel(index: number) {
  return `Model ${index + 1}`;
}

export function createDefaultMeshLabel(geometryName: string, index: number) {
  return `${formatTitleCase(geometryName.trim() || "Mesh")} ${index + 1}`;
}

export function createDefaultLightLabel(lightType: EditorLightJSON["type"], index: number) {
  const normalizedType = typeof lightType === "string" ? lightType : Number(lightType);
  const typeLabel =
    normalizedType === 2 || normalizedType === "directional"
      ? "Directional Light"
      : normalizedType === 3 || normalizedType === "point"
        ? "Point Light"
        : normalizedType === 4 || normalizedType === "spot"
          ? "Spot Light"
          : normalizedType === 5 || normalizedType === "rectArea"
            ? "Rect Area Light"
            : normalizedType === 6 || normalizedType === "hemisphere"
              ? "Hemisphere Light"
              : "Ambient Light";
  return `${typeLabel} ${index + 1}`;
}

export function getFileBaseName(fileName: string) {
  const trimmed = fileName.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\.[^.]+$/, "").trim();
}

export function createLightEntityId() {
  return createEntityId("light");
}

export function createMeshEntityId() {
  return createEntityId("mesh");
}

export function createGroupEntityId() {
  return createEntityId("group");
}

export function createMeshPayload(geometryName: string) {
  const normalizedGeometryName = geometryName.trim() || "Box";
  return {
    id: createMeshEntityId(),
    label: normalizedGeometryName,
    type: 1,
    geometryName: normalizedGeometryName,
    material: {
      color: "#d9e8ff",
      opacity: 1,
      diffuseMap: {
        url: "",
        offset: [0, 0],
        repeat: [1, 1],
        rotation: 0
      },
      metalness: 0,
      metalnessMap: {
        url: "",
        offset: [0, 0],
        repeat: [1, 1],
        rotation: 0
      },
      roughness: 1,
      roughnessMap: {
        url: "",
        offset: [0, 0],
        repeat: [1, 1],
        rotation: 0
      },
      normalMap: {
        url: "",
        offset: [0, 0],
        repeat: [1, 1],
        rotation: 0
      },
      normalScale: [1, 1],
      aoMap: {
        url: "",
        offset: [0, 0],
        repeat: [1, 1],
        rotation: 0
      },
      aoMapIntensity: 1,
      emissive: "#000000",
      emissiveIntensity: 1,
      emissiveMap: {
        url: "",
        offset: [0, 0],
        repeat: [1, 1],
        rotation: 0
      }
    },
    position: [0, 0.8, 0],
    quaternion: [0, 0, 0, 1],
    scale: [1, 1, 1]
  };
}

export function createLightPayload(lightType: EditorLightJSON["type"]): EditorLightJSON {
  const normalizedType = typeof lightType === "string" ? lightType : Number(lightType);
  const base: EditorLightJSON = {
    id: createLightEntityId(),
    label: "",
    type: normalizedType,
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
    scale: [1, 1, 1],
    color: "#ffffff",
    groundColor: "#2a3548",
    intensity: 1,
    distance: 0,
    decay: 2,
    angle: Math.PI / 3,
    penumbra: 0,
    width: 1,
    height: 1
  };

  if (normalizedType === 1 || normalizedType === "ambient") {
    base.intensity = 0.55;
  }

  if (normalizedType === 2 || normalizedType === "directional") {
    const helper = new THREE.Object3D();
    helper.position.set(6, 8, 6);
    helper.lookAt(0, 0, 0);
    base.position = [helper.position.x, helper.position.y, helper.position.z];
    base.quaternion = [
      helper.quaternion.x,
      helper.quaternion.y,
      helper.quaternion.z,
      helper.quaternion.w
    ];
    base.intensity = 1.1;
  }

  if (normalizedType === 3 || normalizedType === "point") {
    base.position = [4, 4, 4];
    base.intensity = 90;
    base.distance = 14;
    base.decay = 2;
  }

  if (normalizedType === 4 || normalizedType === "spot") {
    const helper = new THREE.Object3D();
    helper.position.set(5, 7, 5);
    helper.lookAt(0, 0.8, 0);
    base.position = [helper.position.x, helper.position.y, helper.position.z];
    base.quaternion = [
      helper.quaternion.x,
      helper.quaternion.y,
      helper.quaternion.z,
      helper.quaternion.w
    ];
    base.intensity = 160;
    base.distance = 18;
    base.decay = 2;
    base.angle = 0.72;
    base.penumbra = 0.35;
  }

  if (normalizedType === 6 || normalizedType === "hemisphere") {
    base.position = [0, 8, 0];
    base.intensity = 0.9;
    base.color = "#d7ecff";
    base.groundColor = "#2b3244";
  }

  return base;
}
