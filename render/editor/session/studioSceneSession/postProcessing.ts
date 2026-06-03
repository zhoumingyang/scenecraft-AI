import type { EditorAppEvent } from "../../core/events";
import type { EditorEnvConfigJSON, SyncSource } from "../../core/types";
import type { EditorProjectModel } from "../../models";
import { mergeEditorPostProcessingConfig } from "../../postProcessing";
import type { EditorRuntime } from "../../runtime/editorRuntime";
import {
  cloneStudioColorGradingConfig,
  createStudioColorGradingConfigFromStyleProfile,
  mergeStudioColorGradingConfig
} from "../../studioColorGrading";
import {
  createStudioPostProcessingEnvPatchFromStyleProfile,
  resolveStudioSceneStyleProfile,
  type StudioSceneStyleProfile
} from "../../studioSceneProfiles";
import type {
  ActiveStudioSceneSession,
  StudioScenePostProcessingPatch,
  StudioScenePostProcessingState
} from "./types";

type StudioPostProcessingDeps = {
  runtime: EditorRuntime;
  emit: (event: EditorAppEvent) => void;
  getProjectModel: () => EditorProjectModel | null;
};

function applyEnvPatch(
  projectModel: EditorProjectModel,
  patch: Partial<EditorEnvConfigJSON>
) {
  const { postProcessing, ground: _ground, ...envPatch } = patch;
  projectModel.envConfig = {
    ...projectModel.envConfig,
    ...envPatch,
    postProcessing: postProcessing
      ? mergeEditorPostProcessingConfig(
          projectModel.envConfig.postProcessing,
          postProcessing
        )
      : projectModel.envConfig.postProcessing
  };
}

function emitPostProcessingChanged(
  deps: StudioPostProcessingDeps,
  source: SyncSource
) {
  deps.emit({
    type: "sceneUpdated",
    source,
    pathTraceInvalidation: "environment"
  });
  deps.emit({ type: "viewStateUpdated" });
}

export function applyStudioColorGradingDefaults(
  deps: StudioPostProcessingDeps,
  session: ActiveStudioSceneSession,
  styleProfile: StudioSceneStyleProfile
) {
  const nextConfig = createStudioColorGradingConfigFromStyleProfile(styleProfile);
  session.studioColorGradingDefaultConfig = cloneStudioColorGradingConfig(nextConfig);
  session.studioColorGradingConfig = cloneStudioColorGradingConfig(nextConfig);
  session.studioPostProcessingDirty = false;
  deps.runtime.applyStudioColorGradingConfig(session.studioColorGradingConfig);
}

export function getStudioScenePostProcessingState(
  session: ActiveStudioSceneSession | null,
  projectModel: EditorProjectModel | null
): StudioScenePostProcessingState | null {
  if (!session || !projectModel) return null;
  const passes = projectModel.envConfig.postProcessing.passes;
  return {
    active: true,
    dirty: session.studioPostProcessingDirty,
    exposure: projectModel.envConfig.toneMappingExposure,
    colorGrading: cloneStudioColorGradingConfig(session.studioColorGradingConfig),
    bloom: {
      enabled: passes.unrealBloom.enabled,
      strength: passes.unrealBloom.params.strength,
      radius: passes.unrealBloom.params.radius,
      threshold: passes.unrealBloom.params.threshold
    },
    bokeh: {
      enabled: passes.bokeh.enabled,
      focus: passes.bokeh.params.focus,
      aperture: passes.bokeh.params.aperture,
      maxblur: passes.bokeh.params.maxblur
    },
    grain: {
      enabled: passes.film.enabled,
      intensity: passes.film.params.intensity
    },
    postProcessing: projectModel.envConfig.postProcessing
  };
}

export function updateStudioScenePostProcessing(input: {
  deps: StudioPostProcessingDeps;
  session: ActiveStudioSceneSession | null;
  patch: StudioScenePostProcessingPatch;
  source: SyncSource;
}) {
  const { deps, session, patch, source } = input;
  const projectModel = deps.getProjectModel();
  if (!session || !projectModel) return false;

  const envPatch: Partial<EditorEnvConfigJSON> = {};
  if (typeof patch.exposure === "number") {
    envPatch.toneMappingExposure = patch.exposure;
  }

  const passPatch: NonNullable<EditorEnvConfigJSON["postProcessing"]>["passes"] = {};
  if (patch.bloom) {
    passPatch.unrealBloom = {
      enabled: patch.bloom.enabled,
      params: {
        strength: patch.bloom.strength,
        radius: patch.bloom.radius,
        threshold: patch.bloom.threshold
      }
    };
  }
  if (patch.bokeh) {
    passPatch.bokeh = {
      enabled: patch.bokeh.enabled,
      params: {
        focus: patch.bokeh.focus,
        aperture: patch.bokeh.aperture,
        maxblur: patch.bokeh.maxblur
      }
    };
  }
  if (patch.grain) {
    passPatch.film = {
      enabled: patch.grain.enabled,
      params: {
        intensity: patch.grain.intensity
      }
    };
  }
  if (Object.keys(passPatch).length > 0) {
    envPatch.postProcessing = { passes: passPatch };
  }

  if (Object.keys(envPatch).length > 0) {
    applyEnvPatch(projectModel, envPatch);
    deps.runtime.applyEnvConfig(projectModel.envConfig);
  }

  if (patch.colorGrading) {
    session.studioColorGradingConfig = mergeStudioColorGradingConfig(
      session.studioColorGradingConfig,
      patch.colorGrading
    );
    deps.runtime.applyStudioColorGradingConfig(session.studioColorGradingConfig);
  }

  session.studioPostProcessingDirty = true;
  emitPostProcessingChanged(deps, source);
  return true;
}

export function resetStudioScenePostProcessing(input: {
  deps: StudioPostProcessingDeps;
  session: ActiveStudioSceneSession | null;
  source: SyncSource;
}) {
  const { deps, session, source } = input;
  const projectModel = deps.getProjectModel();
  if (!session || !projectModel) return false;

  const styleProfile = resolveStudioSceneStyleProfile(
    session.productProfile,
    session.styleProfileId
  );
  applyEnvPatch(
    projectModel,
    createStudioPostProcessingEnvPatchFromStyleProfile(styleProfile)
  );
  deps.runtime.applyEnvConfig(projectModel.envConfig);
  applyStudioColorGradingDefaults(deps, session, styleProfile);
  emitPostProcessingChanged(deps, source);
  return true;
}
