import * as THREE from "three";
import type {
  EditorEnvConfigJSON,
  EditorProjectJSON,
  ResolvedEditorEnvConfigJSON
} from "../core/types";
import { normalizeString } from "../utils/normalize";
import { normalizeEditorPostProcessingConfig } from "../postProcessing";
import { CameraModel } from "./cameraModel";
import { GroupEntityModel } from "./groupEntityModel";
import { LightEntityModel } from "./lightEntityModel";
import { MeshEntityModel } from "./meshEntityModel";
import { ModelEntityModel } from "./modelEntityModel";

function normalizeEnvConfig(source?: EditorEnvConfigJSON): ResolvedEditorEnvConfigJSON {
  return {
    panoUrl: source?.panoUrl ?? "",
    environment: source?.environment ?? 1,
    backgroundShow: source?.backgroundShow ?? 1,
    toneMapping: source?.toneMapping ?? THREE.NoToneMapping,
    toneMappingExposure: source?.toneMappingExposure ?? 1,
    postProcessing: normalizeEditorPostProcessingConfig(source?.postProcessing)
  };
}

export class EditorProjectModel {
  id: string;
  envConfig: ResolvedEditorEnvConfigJSON;
  models: Map<string, ModelEntityModel>;
  meshes: Map<string, MeshEntityModel>;
  lights: Map<string, LightEntityModel>;
  groups: Map<string, GroupEntityModel>;
  camera: CameraModel;

  private constructor(id: string, camera: CameraModel, envConfig: ResolvedEditorEnvConfigJSON) {
    this.id = id;
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
      normalizeEnvConfig(source.envConfig)
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
      envConfig: {
        panoUrl: this.envConfig.panoUrl,
        environment: this.envConfig.environment,
        backgroundShow: this.envConfig.backgroundShow,
        toneMapping: this.envConfig.toneMapping,
        toneMappingExposure: this.envConfig.toneMappingExposure,
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
        material: {
          color: item.material.color,
          opacity: item.material.opacity,
          diffuseMap: {
            url: item.material.diffuseMap.url,
            offset: [...item.material.diffuseMap.offset],
            repeat: [...item.material.diffuseMap.repeat],
            rotation: item.material.diffuseMap.rotation
          },
          metalness: item.material.metalness,
          metalnessMap: {
            url: item.material.metalnessMap.url,
            offset: [...item.material.metalnessMap.offset],
            repeat: [...item.material.metalnessMap.repeat],
            rotation: item.material.metalnessMap.rotation
          },
          roughness: item.material.roughness,
          roughnessMap: {
            url: item.material.roughnessMap.url,
            offset: [...item.material.roughnessMap.offset],
            repeat: [...item.material.roughnessMap.repeat],
            rotation: item.material.roughnessMap.rotation
          },
          normalMap: {
            url: item.material.normalMap.url,
            offset: [...item.material.normalMap.offset],
            repeat: [...item.material.normalMap.repeat],
            rotation: item.material.normalMap.rotation
          },
          normalScale: [...item.material.normalScale],
          aoMap: {
            url: item.material.aoMap.url,
            offset: [...item.material.aoMap.offset],
            repeat: [...item.material.aoMap.repeat],
            rotation: item.material.aoMap.rotation
          },
          aoMapIntensity: item.material.aoMapIntensity,
          emissive: item.material.emissive,
          emissiveIntensity: item.material.emissiveIntensity,
          emissiveMap: {
            url: item.material.emissiveMap.url,
            offset: [...item.material.emissiveMap.offset],
            repeat: [...item.material.emissiveMap.repeat],
            rotation: item.material.emissiveMap.rotation
          }
        },
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
