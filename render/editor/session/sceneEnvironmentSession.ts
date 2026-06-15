import type { EditorAppEvent } from "../core/events";
import type {
  EditorCameraJSON,
  EditorEnvConfigJSON,
  EditorGroundConfigJSON,
  LightingConflictState,
  ResolvedEditorEnvConfigJSON,
  SyncSource
} from "../core/types";
import { GROUND_HELPER_NODE_ID } from "../core/types";
import type { MeshMaterialPatch } from "../core/commands";
import { hasTextureMaterialPatch, mergeMeshMaterialPatch } from "../materials/meshMaterial";
import type { EditorProjectModel } from "../models";
import { mergeEditorPostProcessingConfig } from "../postProcessing";
import type { EditorRuntime } from "../runtime/editorRuntime";

type Emit = (event: EditorAppEvent) => void;

function getEnvConfigPathTraceInvalidation(patch: Partial<EditorEnvConfigJSON>) {
  const nonPostProcessingKeys = Object.keys(patch).filter((key) => key !== "postProcessing");
  return nonPostProcessingKeys.length > 0 ? "environment" : "none";
}

export class SceneEnvironmentSessionController {
  private readonly runtime: EditorRuntime;
  private readonly emit: Emit;
  private readonly getProjectModel: () => EditorProjectModel | null;
  private readonly getSelectedEntityId: () => string | null;
  private readonly setSelectedEntity: (entityId: string | null, source: SyncSource) => void;

  constructor(options: {
    runtime: EditorRuntime;
    emit: Emit;
    getProjectModel: () => EditorProjectModel | null;
    getSelectedEntityId: () => string | null;
    setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
  }) {
    this.runtime = options.runtime;
    this.emit = options.emit;
    this.getProjectModel = options.getProjectModel;
    this.getSelectedEntityId = options.getSelectedEntityId;
    this.setSelectedEntity = options.setSelectedEntity;
  }

  getGroundConfig() {
    return this.getProjectModel()?.envConfig.ground ?? null;
  }

  getLightingConflictState(): LightingConflictState {
    const projectModel = this.getProjectModel();
    if (!projectModel) {
      return {
        hasConflict: false,
        hasAmbientLight: false,
        hasHemisphereLight: false
      };
    }

    const hasActiveImageBasedLighting =
      projectModel.envConfig.environment === 1 && this.runtime.hasImageBasedLighting();
    if (!hasActiveImageBasedLighting) {
      return {
        hasConflict: false,
        hasAmbientLight: false,
        hasHemisphereLight: false
      };
    }

    let hasAmbientLight = false;
    let hasHemisphereLight = false;
    projectModel.lights.forEach((light) => {
      if (light.lightType === 1) {
        hasAmbientLight = true;
      } else if (light.lightType === 6) {
        hasHemisphereLight = true;
      }
    });

    return {
      hasConflict: hasAmbientLight || hasHemisphereLight,
      hasAmbientLight,
      hasHemisphereLight
    };
  }

  updateCamera(update: Partial<EditorCameraJSON>, source: SyncSource = "ui") {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;
    if (update.type === 2 && projectModel.camera.cameraType !== 2) {
      this.runtime.alignCameraModelToFirstPerson(projectModel.camera);
    }
    projectModel.camera.patch(update);
    this.runtime.applyCameraModel(projectModel.camera);
    this.emit({ type: "cameraUpdated", source });
  }

  async updateSceneEnvConfig(
    patch: Partial<EditorEnvConfigJSON>,
    source: SyncSource = "ui",
    options?: { panoAssetName?: string }
  ) {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;

    const nextEnvConfig: ResolvedEditorEnvConfigJSON = {
      ...projectModel.envConfig,
      ...patch,
      postProcessing: patch.postProcessing
        ? mergeEditorPostProcessingConfig(projectModel.envConfig.postProcessing, patch.postProcessing)
        : projectModel.envConfig.postProcessing,
      ground: projectModel.envConfig.ground
    };

    const shouldReloadEnvironment =
      patch.panoUrl !== undefined && patch.panoUrl !== projectModel.envConfig.panoUrl;

    if (shouldReloadEnvironment) {
      if (nextEnvConfig.panoUrl) {
        await this.runtime.setEnvironmentFromUrl(
          nextEnvConfig.panoUrl,
          options?.panoAssetName ?? nextEnvConfig.panoUrl
        );
      } else {
        this.runtime.clearEnvironment();
      }
    }

    projectModel.envConfig = nextEnvConfig;
    this.runtime.applyEnvConfig(projectModel.envConfig);
    this.emit({
      type: "sceneUpdated",
      source,
      pathTraceInvalidation: getEnvConfigPathTraceInvalidation(patch)
    });
    this.emit({ type: "viewStateUpdated" });
  }

  updateGroundConfig(patch: Partial<EditorGroundConfigJSON>, source: SyncSource = "ui") {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;

    projectModel.envConfig = {
      ...projectModel.envConfig,
      ground: {
        ...projectModel.envConfig.ground,
        ...patch,
        scale: patch.scale
          ? [
              patch.scale[0] ?? projectModel.envConfig.ground.scale[0],
              projectModel.envConfig.ground.scale[1],
              patch.scale[2] ?? projectModel.envConfig.ground.scale[2]
            ]
          : projectModel.envConfig.ground.scale,
        material: projectModel.envConfig.ground.material
      }
    };

    this.runtime.applyEnvConfig(projectModel.envConfig);

    if (!projectModel.envConfig.ground.visible && this.getSelectedEntityId() === GROUND_HELPER_NODE_ID) {
      this.setSelectedEntity(null, source);
    }

    this.emit({ type: "sceneUpdated", source, pathTraceInvalidation: "scene" });
    this.emit({ type: "viewStateUpdated" });
  }

  updateGroundMaterial(patch: MeshMaterialPatch, source: SyncSource = "ui") {
    const projectModel = this.getProjectModel();
    if (!projectModel) return;

    const material = projectModel.envConfig.ground.material;
    projectModel.envConfig = {
      ...projectModel.envConfig,
      ground: {
        ...projectModel.envConfig.ground,
        material: mergeMeshMaterialPatch(material, patch)
      }
    };

    if (hasTextureMaterialPatch(patch)) {
      this.runtime.applyEnvConfig(projectModel.envConfig);
    } else {
      this.runtime.updateGroundMaterial(projectModel.envConfig.ground.material);
    }
    this.emit({ type: "sceneUpdated", source, pathTraceInvalidation: "materials" });
  }
}
