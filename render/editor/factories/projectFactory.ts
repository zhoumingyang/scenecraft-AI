import type { EditorProjectJSON } from "../core/types";
import {
  DEFAULT_EDITOR_BACKGROUND_BLURRINESS,
  DEFAULT_EDITOR_BACKGROUND_INTENSITY,
  DEFAULT_EDITOR_ENVIRONMENT_INTENSITY,
  DEFAULT_EDITOR_ENVIRONMENT_ROTATION_Y
} from "../constants/environment";
import { createDefaultEditorPostProcessingConfigJSON } from "../postProcessing";
import {
  DEFAULT_EDITOR_TONE_MAPPING,
  DEFAULT_EDITOR_TONE_MAPPING_EXPOSURE
} from "../runtime/colorManagement";

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
  const postProcessing = createDefaultEditorPostProcessingConfigJSON();

  return {
    id: projectId,
    envConfig: {
      panoAssetName: "",
      panoUrl: "",
      environment: 1,
      environmentIntensity: DEFAULT_EDITOR_ENVIRONMENT_INTENSITY,
      backgroundShow: 1,
      backgroundIntensity: DEFAULT_EDITOR_BACKGROUND_INTENSITY,
      backgroundBlurriness: DEFAULT_EDITOR_BACKGROUND_BLURRINESS,
      environmentRotationY: DEFAULT_EDITOR_ENVIRONMENT_ROTATION_Y,
      toneMapping: DEFAULT_EDITOR_TONE_MAPPING,
      toneMappingExposure: DEFAULT_EDITOR_TONE_MAPPING_EXPOSURE,
      postProcessing
    },
    model: [],
    mesh: [],
    light: [],
    groups: [],
    camera: createDefaultEditorCameraJSON()
  };
}

export function createEmptyEditorProjectJSON(projectId = createUuid()): EditorProjectJSON {
  const postProcessing = createDefaultEditorPostProcessingConfigJSON();

  return {
    id: projectId,
    envConfig: {
      panoAssetName: "",
      panoUrl: "",
      environment: 1,
      environmentIntensity: DEFAULT_EDITOR_ENVIRONMENT_INTENSITY,
      backgroundShow: 1,
      backgroundIntensity: DEFAULT_EDITOR_BACKGROUND_INTENSITY,
      backgroundBlurriness: DEFAULT_EDITOR_BACKGROUND_BLURRINESS,
      environmentRotationY: DEFAULT_EDITOR_ENVIRONMENT_ROTATION_Y,
      toneMapping: DEFAULT_EDITOR_TONE_MAPPING,
      toneMappingExposure: DEFAULT_EDITOR_TONE_MAPPING_EXPOSURE,
      postProcessing
    },
    model: [],
    mesh: [],
    light: [],
    groups: [],
    camera: createDefaultEditorCameraJSON()
  };
}
