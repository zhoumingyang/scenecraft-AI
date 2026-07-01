import type {
  EditorEnvConfigJSON,
  EditorGroundConfigJSON,
  EditorProjectJSON,
  EditorProjectMetaJSON,
  EditorProjectThumbnailJSON,
  ResolvedEditorEnvConfigJSON
} from "../core/types";
import {
  DEFAULT_EDITOR_BACKGROUND_BLURRINESS,
  DEFAULT_EDITOR_BACKGROUND_INTENSITY,
  DEFAULT_EDITOR_ENVIRONMENT_INTENSITY,
  DEFAULT_EDITOR_ENVIRONMENT_ROTATION_Y
} from "../constants/environment";
import { normalizeBoolean, normalizeString, normalizeVec3 } from "../utils/normalize";
import { normalizeEditorPostProcessingConfig } from "../postProcessing";
import {
  createDefaultMeshMaterialJSON,
  normalizeMeshMaterial,
  serializeMeshMaterial
} from "../materials/meshMaterial";
import {
  DEFAULT_EDITOR_TONE_MAPPING,
  DEFAULT_EDITOR_TONE_MAPPING_EXPOSURE
} from "../runtime/colorManagement";
import { normalizePathTraceSettings } from "../runtime/pathTraceSettings";
import type { CameraModel } from "./cameraModel";
import type { GroupEntityModel } from "./groupEntityModel";
import type { LightEntityModel } from "./lightEntityModel";
import type { MeshEntityModel } from "./meshEntityModel";
import type { ModelEntityModel } from "./modelEntityModel";

export function cloneExternalSource(source: ResolvedEditorEnvConfigJSON["externalSource"]) {
  if (!source) {
    return null;
  }

  return {
    ...source,
    selectedFile: {
      ...source.selectedFile,
      ...(source.selectedFile.includes
        ? {
            includes: source.selectedFile.includes.map((include) => ({
              path: include.path,
              url: include.url,
              sizeBytes: include.sizeBytes,
              md5: include.md5
            }))
          }
        : {})
    }
  };
}

export function normalizeEnvConfig(source?: EditorEnvConfigJSON): ResolvedEditorEnvConfigJSON {
  return {
    panoAssetId: source?.panoAssetId ?? "",
    panoAssetName: source?.panoAssetName ?? "",
    panoUrl: source?.panoUrl ?? "",
    externalSource: source?.externalSource ?? null,
    environment: source?.environment ?? 1,
    environmentIntensity: source?.environmentIntensity ?? DEFAULT_EDITOR_ENVIRONMENT_INTENSITY,
    backgroundShow: source?.backgroundShow ?? 1,
    backgroundIntensity: source?.backgroundIntensity ?? DEFAULT_EDITOR_BACKGROUND_INTENSITY,
    backgroundBlurriness: source?.backgroundBlurriness ?? DEFAULT_EDITOR_BACKGROUND_BLURRINESS,
    environmentRotationY: source?.environmentRotationY ?? DEFAULT_EDITOR_ENVIRONMENT_ROTATION_Y,
    toneMapping: source?.toneMapping ?? DEFAULT_EDITOR_TONE_MAPPING,
    toneMappingExposure: source?.toneMappingExposure ?? DEFAULT_EDITOR_TONE_MAPPING_EXPOSURE,
    pathTrace: normalizePathTraceSettings(source?.pathTrace),
    postProcessing: normalizeEditorPostProcessingConfig(source?.postProcessing),
    ground: normalizeGroundConfig(source?.ground)
  };
}

function normalizeGroundConfig(source?: EditorGroundConfigJSON) {
  return {
    mode: source?.mode === "plane" ? "plane" as const : "grid" as const,
    visible: normalizeBoolean(source?.visible, true),
    scale: normalizeVec3(source?.scale, [1, 1, 1]),
    material: normalizeMeshMaterial(source?.material ?? createDefaultMeshMaterialJSON())
  };
}

export function normalizeProjectMeta(source?: EditorProjectMetaJSON): EditorProjectMetaJSON | null {
  const title = normalizeString(source?.title);
  if (!title) {
    return null;
  }

  const description = normalizeString(source?.description);
  const tags = Array.isArray(source?.tags)
    ? source.tags
        .map((tag) => normalizeString(tag))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  return {
    title,
    ...(description ? { description } : {}),
    ...(tags.length > 0 ? { tags } : {})
  };
}

export function normalizeProjectThumbnail(source?: EditorProjectThumbnailJSON): EditorProjectThumbnailJSON | null {
  const assetId = normalizeString(source?.assetId);
  const url = normalizeString(source?.url);
  const mimeType = normalizeString(source?.mimeType, "image/png");
  const capturedAt = normalizeString(source?.capturedAt);

  if (!assetId || !url || !capturedAt) {
    return null;
  }

  return {
    assetId,
    url,
    mimeType,
    originalName: normalizeString(source?.originalName),
    sizeBytes: typeof source?.sizeBytes === "number" ? source.sizeBytes : null,
    width: typeof source?.width === "number" ? source.width : 0,
    height: typeof source?.height === "number" ? source.height : 0,
    capturedAt,
    camera: source?.camera ?? {}
  };
}

export function serializeProjectModel(source: {
  camera: CameraModel;
  envConfig: ResolvedEditorEnvConfigJSON;
  groups: Map<string, GroupEntityModel>;
  id: string;
  lights: Map<string, LightEntityModel>;
  meshes: Map<string, MeshEntityModel>;
  meta: EditorProjectMetaJSON | null;
  models: Map<string, ModelEntityModel>;
  thumbnail: EditorProjectThumbnailJSON | null;
}): EditorProjectJSON {
  return {
    id: source.id,
    ...(source.meta ? { meta: { ...source.meta, tags: source.meta.tags ? [...source.meta.tags] : undefined } } : {}),
    ...(source.thumbnail
      ? {
          thumbnail: {
            ...source.thumbnail,
            camera: {
              ...source.thumbnail.camera,
              position: source.thumbnail.camera.position ? [...source.thumbnail.camera.position] : undefined,
              quaternion: source.thumbnail.camera.quaternion ? [...source.thumbnail.camera.quaternion] : undefined,
              scale: source.thumbnail.camera.scale ? [...source.thumbnail.camera.scale] : undefined
            }
          }
        }
      : {}),
    envConfig: {
      panoAssetId: source.envConfig.panoAssetId,
      panoAssetName: source.envConfig.panoAssetName,
      panoUrl: source.envConfig.panoUrl,
      externalSource: cloneExternalSource(source.envConfig.externalSource) ?? undefined,
      environment: source.envConfig.environment,
      environmentIntensity: source.envConfig.environmentIntensity,
      backgroundShow: source.envConfig.backgroundShow,
      backgroundIntensity: source.envConfig.backgroundIntensity,
      backgroundBlurriness: source.envConfig.backgroundBlurriness,
      environmentRotationY: source.envConfig.environmentRotationY,
      toneMapping: source.envConfig.toneMapping,
      toneMappingExposure: source.envConfig.toneMappingExposure,
      pathTrace: {
        bounces: source.envConfig.pathTrace.bounces,
        filterGlossyFactor: source.envConfig.pathTrace.filterGlossyFactor,
        interactiveRenderScale: source.envConfig.pathTrace.interactiveRenderScale,
        interactiveSamples: source.envConfig.pathTrace.interactiveSamples,
        realtimeSamples: source.envConfig.pathTrace.realtimeSamples,
        exportSamples: source.envConfig.pathTrace.exportSamples
      },
      ground: {
        mode: source.envConfig.ground.mode,
        visible: source.envConfig.ground.visible,
        scale: [...source.envConfig.ground.scale],
        material: serializeMeshMaterial(source.envConfig.ground.material)
      },
      postProcessing: {
        passes: {
          pixelated: {
            enabled: source.envConfig.postProcessing.passes.pixelated.enabled,
            params: {
              ...source.envConfig.postProcessing.passes.pixelated.params
            }
          },
          afterimage: {
            enabled: source.envConfig.postProcessing.passes.afterimage.enabled,
            params: {
              ...source.envConfig.postProcessing.passes.afterimage.params
            }
          },
          bokeh: {
            enabled: source.envConfig.postProcessing.passes.bokeh.enabled,
            params: {
              ...source.envConfig.postProcessing.passes.bokeh.params
            }
          },
          film: {
            enabled: source.envConfig.postProcessing.passes.film.enabled,
            params: {
              ...source.envConfig.postProcessing.passes.film.params
            }
          },
          dotScreen: {
            enabled: source.envConfig.postProcessing.passes.dotScreen.enabled,
            params: {
              ...source.envConfig.postProcessing.passes.dotScreen.params
            }
          },
          gtao: {
            enabled: source.envConfig.postProcessing.passes.gtao.enabled,
            params: {
              ...source.envConfig.postProcessing.passes.gtao.params
            }
          },
          glitch: {
            enabled: source.envConfig.postProcessing.passes.glitch.enabled,
            params: {
              ...source.envConfig.postProcessing.passes.glitch.params
            }
          },
          halftone: {
            enabled: source.envConfig.postProcessing.passes.halftone.enabled,
            params: {
              ...source.envConfig.postProcessing.passes.halftone.params
            }
          },
          ssr: {
            enabled: source.envConfig.postProcessing.passes.ssr.enabled,
            params: {
              ...source.envConfig.postProcessing.passes.ssr.params
            }
          },
          unrealBloom: {
            enabled: source.envConfig.postProcessing.passes.unrealBloom.enabled,
            params: {
              ...source.envConfig.postProcessing.passes.unrealBloom.params
            }
          }
        }
      }
    },
    model: Array.from(source.models.values()).map((item) => ({
      id: item.id,
      label: item.label,
      source: item.source,
      sourceAssetId: item.sourceAssetId,
      externalSource: cloneExternalSource(item.externalSource) ?? undefined,
      format: item.format,
      assetUnit: item.assetUnit,
      assetImportScale: item.assetImportScale,
      animations: item.animations.map((clip) => ({ ...clip })),
      activeAnimationId: item.activeAnimationId,
      animationTimeScale: item.animationTimeScale,
      animationPlaybackState: item.animationPlaybackState,
      locked: item.locked,
      visible: item.visible,
      position: [...item.position],
      quaternion: [...item.quaternion],
      scale: [...item.scale]
    })),
    mesh: Array.from(source.meshes.values()).map((item) => ({
      id: item.id,
      label: item.label,
      type: item.meshType,
      geometryName: item.geometryName,
      vertices: item.vertices.map((vertex) => ({ ...vertex })),
      uvs: item.uvs.map((uv) => ({ ...uv })),
      normals: item.normals.map((normal) => ({ ...normal })),
      indices: [...item.indices],
      material: serializeMeshMaterial(item.material),
      locked: item.locked,
      visible: item.visible,
      position: [...item.position],
      quaternion: [...item.quaternion],
      scale: [...item.scale]
    })),
    light: Array.from(source.lights.values()).map((item) => ({
      id: item.id,
      label: item.label,
      type: item.lightType,
      locked: item.locked,
      visible: item.visible,
      position: [...item.position],
      quaternion: [...item.quaternion],
      scale: [...item.scale],
      color: item.color,
      groundColor: item.groundColor,
      intensity: item.intensity,
      distance: item.distance,
      decay: item.decay,
      angle: item.angle,
      penumbra: item.penumbra,
      width: item.width,
      height: item.height
    })),
    groups: Array.from(source.groups.values()).map((item) => ({
      id: item.id,
      label: item.label,
      children: [...item.children],
      locked: item.locked,
      visible: item.visible,
      position: [...item.position],
      quaternion: [...item.quaternion],
      scale: [...item.scale]
    })),
    camera: {
      type: source.camera.cameraType,
      fov: source.camera.fov,
      position: [...source.camera.position],
      quaternion: [...source.camera.quaternion],
      scale: [...source.camera.scale]
    }
  };
}
