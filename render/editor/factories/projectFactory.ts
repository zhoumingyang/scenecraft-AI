import type { EditorProjectJSON } from "../core/types";
import * as THREE from "three";

function createUuid() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `uuid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultEditorCameraJSON() {
  return {
    type: 1,
    fov: 60,
    position: [10, 10, 10],
    quaternion: [0, 0, 0, 1],
    scale: [1, 1, 1]
  };
}

export function createDefaultEditorProjectJSON(): EditorProjectJSON {
  const projectId = createUuid();

  return {
    id: projectId,
    envConfig: {
      panoUrl: "",
      environment: 1,
      backgroundShow: 1,
      toneMapping: THREE.NoToneMapping,
      toneMappingExposure: 1
    },
    model: [],
    mesh: [],
    light: [],
    groups: [],
    camera: createDefaultEditorCameraJSON()
  };
}

export function createEmptyEditorProjectJSON(projectId = createUuid()): EditorProjectJSON {
  return {
    id: projectId,
    envConfig: {
      panoUrl: "",
      environment: 1,
      backgroundShow: 1,
      toneMapping: THREE.NoToneMapping,
      toneMappingExposure: 1
    },
    model: [],
    mesh: [],
    light: [],
    groups: [],
    camera: createDefaultEditorCameraJSON()
  };
}
