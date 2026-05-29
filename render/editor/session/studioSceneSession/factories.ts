import type {
  EditorLightJSON,
  EditorMeshJSON,
  EditorMeshMaterialJSON
} from "../../core/types";
import type {
  StudioLayoutMeshDescriptor
} from "../../studioSceneLayoutGenerator";
import type {
  StudioLightingLightDescriptor,
  StudioLightingModifierDescriptor
} from "../../studioSceneLightingGenerator";

export function createStudioEntityId(prefix: string) {
  return `studio-${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

export function createStudioMeshFromDescriptor(input: {
  id: string;
  descriptor: StudioLayoutMeshDescriptor;
}): EditorMeshJSON {
  const material: EditorMeshMaterialJSON = {
    color: input.descriptor.material.color,
    opacity: input.descriptor.material.opacity,
    metalness: input.descriptor.material.metalness,
    roughness: input.descriptor.material.roughness,
    emissive: input.descriptor.material.emissive,
    emissiveIntensity: input.descriptor.material.emissiveIntensity
  };
  return {
    id: input.id,
    label: input.descriptor.label,
    ...(input.descriptor.geometry.mode === "custom"
      ? input.descriptor.geometry.geometry
      : {
          type: 1,
          geometryName: input.descriptor.geometry.geometryName
        }),
    material,
    position: input.descriptor.position,
    quaternion: input.descriptor.quaternion,
    scale: input.descriptor.scale,
    visible: input.descriptor.visible,
    locked: input.descriptor.locked
  };
}

export function createStudioLightFromDescriptor(input: {
  id: string;
  descriptor: StudioLightingLightDescriptor;
}): EditorLightJSON {
  return {
    id: input.id,
    ...input.descriptor.light
  };
}

export function createStudioModifierMeshFromDescriptor(input: {
  id: string;
  descriptor: StudioLightingModifierDescriptor;
}): EditorMeshJSON {
  return {
    id: input.id,
    ...input.descriptor.mesh
  };
}
