import type {
  EditorEnvConfigJSON,
  EditorMeshMaterialJSON,
  EditorProjectMetaJSON,
  EditorProjectJSON,
  EditorProjectThumbnailJSON,
  ResolvedMeshMaterialJSON,
  EditorGroundConfigJSON,
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
import { createDefaultMeshMaterialJSON, normalizeMeshMaterial } from "../materials/meshMaterial";
import {
  DEFAULT_EDITOR_TONE_MAPPING,
  DEFAULT_EDITOR_TONE_MAPPING_EXPOSURE
} from "../runtime/colorManagement";
import { CameraModel } from "./cameraModel";
import { GroupEntityModel } from "./groupEntityModel";
import { LightEntityModel } from "./lightEntityModel";
import { MeshEntityModel } from "./meshEntityModel";
import { ModelEntityModel } from "./modelEntityModel";

function cloneExternalSource(source: ResolvedEditorEnvConfigJSON["externalSource"]) {
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

function normalizeEnvConfig(source?: EditorEnvConfigJSON): ResolvedEditorEnvConfigJSON {
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

function serializeMaterial(source: ResolvedMeshMaterialJSON): EditorMeshMaterialJSON {
  return {
    color: source.color,
    opacity: source.opacity,
    diffuseMap: {
      assetId: source.diffuseMap.assetId,
      url: source.diffuseMap.url,
      externalSource: cloneExternalSource(source.diffuseMap.externalSource) ?? undefined,
      offset: [...source.diffuseMap.offset],
      repeat: [...source.diffuseMap.repeat],
      rotation: source.diffuseMap.rotation
    },
    metalness: source.metalness,
    metalnessMap: {
      assetId: source.metalnessMap.assetId,
      url: source.metalnessMap.url,
      externalSource: cloneExternalSource(source.metalnessMap.externalSource) ?? undefined,
      offset: [...source.metalnessMap.offset],
      repeat: [...source.metalnessMap.repeat],
      rotation: source.metalnessMap.rotation
    },
    roughness: source.roughness,
    roughnessMap: {
      assetId: source.roughnessMap.assetId,
      url: source.roughnessMap.url,
      externalSource: cloneExternalSource(source.roughnessMap.externalSource) ?? undefined,
      offset: [...source.roughnessMap.offset],
      repeat: [...source.roughnessMap.repeat],
      rotation: source.roughnessMap.rotation
    },
    normalMap: {
      assetId: source.normalMap.assetId,
      url: source.normalMap.url,
      externalSource: cloneExternalSource(source.normalMap.externalSource) ?? undefined,
      offset: [...source.normalMap.offset],
      repeat: [...source.normalMap.repeat],
      rotation: source.normalMap.rotation
    },
    normalScale: [...source.normalScale],
    aoMap: {
      assetId: source.aoMap.assetId,
      url: source.aoMap.url,
      externalSource: cloneExternalSource(source.aoMap.externalSource) ?? undefined,
      offset: [...source.aoMap.offset],
      repeat: [...source.aoMap.repeat],
      rotation: source.aoMap.rotation
    },
    aoMapIntensity: source.aoMapIntensity,
    emissive: source.emissive,
    emissiveIntensity: source.emissiveIntensity,
    emissiveMap: {
      assetId: source.emissiveMap.assetId,
      url: source.emissiveMap.url,
      externalSource: cloneExternalSource(source.emissiveMap.externalSource) ?? undefined,
      offset: [...source.emissiveMap.offset],
      repeat: [...source.emissiveMap.repeat],
      rotation: source.emissiveMap.rotation
    }
  };
}

function normalizeProjectMeta(source?: EditorProjectMetaJSON): EditorProjectMetaJSON | null {
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

function normalizeProjectThumbnail(source?: EditorProjectThumbnailJSON): EditorProjectThumbnailJSON | null {
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

export class EditorProjectModel {
  id: string;
  meta: EditorProjectMetaJSON | null;
  thumbnail: EditorProjectThumbnailJSON | null;
  envConfig: ResolvedEditorEnvConfigJSON;
  models: Map<string, ModelEntityModel>;
  meshes: Map<string, MeshEntityModel>;
  lights: Map<string, LightEntityModel>;
  groups: Map<string, GroupEntityModel>;
  camera: CameraModel;

  private constructor(
    id: string,
    camera: CameraModel,
    envConfig: ResolvedEditorEnvConfigJSON,
    meta: EditorProjectMetaJSON | null,
    thumbnail: EditorProjectThumbnailJSON | null
  ) {
    this.id = id;
    this.meta = meta;
    this.thumbnail = thumbnail;
    this.envConfig = envConfig;
    this.camera = camera;
    this.models = new Map();
    this.meshes = new Map();
    this.lights = new Map();
    this.groups = new Map();
  }

  static fromJSON(source: EditorProjectJSON): EditorProjectModel {
    const id = normalizeString(source.id, `project-${Date.now().toString(36)}`);
    const project = new EditorProjectModel(
      id,
      new CameraModel(source.camera),
      normalizeEnvConfig(source.envConfig),
      normalizeProjectMeta(source.meta),
      normalizeProjectThumbnail(source.thumbnail)
    );

    ((source.groups || []) as NonNullable<EditorProjectJSON["groups"]>).forEach((item, index) => {
      const group = new GroupEntityModel(index, item);
      project.groups.set(group.id, group);
    });

    (source.model || []).forEach((item, index) => {
      const model = new ModelEntityModel(index, item);
      project.models.set(model.id, model);
    });

    (source.mesh || []).forEach((item, index) => {
      const mesh = new MeshEntityModel(index, item);
      project.meshes.set(mesh.id, mesh);
    });

    (source.light || []).forEach((item, index) => {
      const light = new LightEntityModel(index, item);
      project.lights.set(light.id, light);
    });

    return project;
  }

  toJSON(): EditorProjectJSON {
    return {
      id: this.id,
      ...(this.meta ? { meta: { ...this.meta, tags: this.meta.tags ? [...this.meta.tags] : undefined } } : {}),
      ...(this.thumbnail
        ? {
            thumbnail: {
              ...this.thumbnail,
              camera: {
                ...this.thumbnail.camera,
                position: this.thumbnail.camera.position ? [...this.thumbnail.camera.position] : undefined,
                quaternion: this.thumbnail.camera.quaternion ? [...this.thumbnail.camera.quaternion] : undefined,
                scale: this.thumbnail.camera.scale ? [...this.thumbnail.camera.scale] : undefined
              }
            }
          }
        : {}),
      envConfig: {
        panoAssetId: this.envConfig.panoAssetId,
        panoAssetName: this.envConfig.panoAssetName,
        panoUrl: this.envConfig.panoUrl,
        externalSource: cloneExternalSource(this.envConfig.externalSource) ?? undefined,
        environment: this.envConfig.environment,
        environmentIntensity: this.envConfig.environmentIntensity,
        backgroundShow: this.envConfig.backgroundShow,
        backgroundIntensity: this.envConfig.backgroundIntensity,
        backgroundBlurriness: this.envConfig.backgroundBlurriness,
        environmentRotationY: this.envConfig.environmentRotationY,
        toneMapping: this.envConfig.toneMapping,
        toneMappingExposure: this.envConfig.toneMappingExposure,
        ground: {
          mode: this.envConfig.ground.mode,
          visible: this.envConfig.ground.visible,
          scale: [...this.envConfig.ground.scale],
          material: serializeMaterial(this.envConfig.ground.material)
        },
        postProcessing: {
          passes: {
            pixelated: {
              enabled: this.envConfig.postProcessing.passes.pixelated.enabled,
              params: {
                ...this.envConfig.postProcessing.passes.pixelated.params
              }
            },
            afterimage: {
              enabled: this.envConfig.postProcessing.passes.afterimage.enabled,
              params: {
                ...this.envConfig.postProcessing.passes.afterimage.params
              }
            },
            bokeh: {
              enabled: this.envConfig.postProcessing.passes.bokeh.enabled,
              params: {
                ...this.envConfig.postProcessing.passes.bokeh.params
              }
            },
            film: {
              enabled: this.envConfig.postProcessing.passes.film.enabled,
              params: {
                ...this.envConfig.postProcessing.passes.film.params
              }
            },
            dotScreen: {
              enabled: this.envConfig.postProcessing.passes.dotScreen.enabled,
              params: {
                ...this.envConfig.postProcessing.passes.dotScreen.params
              }
            },
            gtao: {
              enabled: this.envConfig.postProcessing.passes.gtao.enabled,
              params: {
                ...this.envConfig.postProcessing.passes.gtao.params
              }
            },
            glitch: {
              enabled: this.envConfig.postProcessing.passes.glitch.enabled,
              params: {
                ...this.envConfig.postProcessing.passes.glitch.params
              }
            },
            halftone: {
              enabled: this.envConfig.postProcessing.passes.halftone.enabled,
              params: {
                ...this.envConfig.postProcessing.passes.halftone.params
              }
            },
            ssr: {
              enabled: this.envConfig.postProcessing.passes.ssr.enabled,
              params: {
                ...this.envConfig.postProcessing.passes.ssr.params
              }
            },
            unrealBloom: {
              enabled: this.envConfig.postProcessing.passes.unrealBloom.enabled,
              params: {
                ...this.envConfig.postProcessing.passes.unrealBloom.params
              }
            }
          }
        }
      },
      model: Array.from(this.models.values()).map((item) => ({
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
      mesh: Array.from(this.meshes.values()).map((item) => ({
        id: item.id,
        label: item.label,
        type: item.meshType,
        geometryName: item.geometryName,
        vertices: item.vertices.map((vertex) => ({ ...vertex })),
        uvs: item.uvs.map((uv) => ({ ...uv })),
        normals: item.normals.map((normal) => ({ ...normal })),
        indices: [...item.indices],
        material: serializeMaterial(item.material),
        locked: item.locked,
        visible: item.visible,
        position: [...item.position],
        quaternion: [...item.quaternion],
        scale: [...item.scale]
      })),
      light: Array.from(this.lights.values()).map((item) => ({
        id: item.id,
        label: item.label,
        type: item.lightType,
        locked: item.locked,
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
      groups: Array.from(this.groups.values()).map((item) => ({
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
        type: this.camera.cameraType,
        fov: this.camera.fov,
        position: [...this.camera.position],
        quaternion: [...this.camera.quaternion],
        scale: [...this.camera.scale]
      }
    };
  }

  getEntityById(id: string):
    | { kind: "group"; item: GroupEntityModel }
    | { kind: "model"; item: ModelEntityModel }
    | { kind: "mesh"; item: MeshEntityModel }
    | { kind: "light"; item: LightEntityModel }
    | null {
    if (this.groups.has(id)) return { kind: "group", item: this.groups.get(id)! };
    if (this.models.has(id)) return { kind: "model", item: this.models.get(id)! };
    if (this.meshes.has(id)) return { kind: "mesh", item: this.meshes.get(id)! };
    if (this.lights.has(id)) return { kind: "light", item: this.lights.get(id)! };
    return null;
  }

  getParentGroupId(childId: string) {
    for (const group of this.groups.values()) {
      if (group.children.includes(childId)) {
        return group.id;
      }
    }
    return null;
  }

  listDirectChildren(groupId: string) {
    return this.groups.get(groupId)?.children ?? [];
  }

  isEntityEffectivelyVisible(id: string) {
    const record = this.getEntityById(id);
    if (!record) return false;

    if (record.kind !== "light" && !record.item.visible) {
      return false;
    }

    let parentGroupId = this.getParentGroupId(id);
    while (parentGroupId) {
      const parentGroup = this.groups.get(parentGroupId);
      if (!parentGroup?.visible) {
        return false;
      }
      parentGroupId = this.getParentGroupId(parentGroupId);
    }

    return true;
  }

  addModel(source: ConstructorParameters<typeof ModelEntityModel>[1]) {
    const model = new ModelEntityModel(this.models.size, source);
    this.models.set(model.id, model);
    return model;
  }

  addMesh(source: ConstructorParameters<typeof MeshEntityModel>[1]) {
    const mesh = new MeshEntityModel(this.meshes.size, source);
    this.meshes.set(mesh.id, mesh);
    return mesh;
  }

  addLight(source: ConstructorParameters<typeof LightEntityModel>[1]) {
    const light = new LightEntityModel(this.lights.size, source);
    this.lights.set(light.id, light);
    return light;
  }

  addGroup(source: ConstructorParameters<typeof GroupEntityModel>[1]) {
    const group = new GroupEntityModel(this.groups.size, source);
    this.groups.set(group.id, group);
    return group;
  }

  removeEntity(id: string) {
    const group = this.groups.get(id);
    if (group) {
      const parentGroupId = this.getParentGroupId(id);
      this.groups.delete(id);
      this.groups.forEach((item) => {
        if (item.id === parentGroupId) {
          const nextChildren: string[] = [];
          item.children.forEach((childId) => {
            if (childId === id) {
              nextChildren.push(...group.children);
              return;
            }
            nextChildren.push(childId);
          });
          item.children = nextChildren;
          return;
        }
        item.children = item.children.filter((childId) => childId !== id);
      });
      return "group";
    }
    this.groups.forEach((group) => {
      group.children = group.children.filter((childId) => childId !== id);
    });
    if (this.models.delete(id)) return "model";
    if (this.meshes.delete(id)) return "mesh";
    if (this.lights.delete(id)) return "light";
    return null;
  }
}
