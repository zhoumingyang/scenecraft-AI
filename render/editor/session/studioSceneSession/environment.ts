import type { EditorAppEvent } from "../../core/events";
import type { SyncSource } from "../../core/types";
import type { EditorProjectModel } from "../../models";
import type { EditorRuntime } from "../../runtime/editorRuntime";
import type { StudioSceneStyleProfile } from "../../studioSceneProfiles";
import { createStudioEnvPatchFromStyleProfile } from "../../studioSceneProfiles";
import { mergeEditorPostProcessingConfig } from "../../postProcessing";
import type { StudioHdriResolveResult, ActiveStudioSceneSession, StudioTargetFrame } from "./types";

type StudioHdriResolveInput = {
  provider: "polyhaven" | "local" | "none";
  assetId?: string;
  url?: string;
};

type StudioSceneEnvironmentDeps = {
  runtime: EditorRuntime;
  emit: (event: EditorAppEvent) => void;
  getProjectModel: () => EditorProjectModel | null;
};

export function frameStudioSceneCamera(
  runtime: EditorRuntime,
  preset: {
    cameraFov: number;
    cameraPitch: number;
    cameraYaw: number;
    cameraDistanceMultiplier: number;
  },
  frame: StudioTargetFrame
) {
  runtime.frameStudioCamera({
    center: frame.center,
    floorY: frame.floorY,
    height: frame.height,
    radius: frame.radius,
    fov: preset.cameraFov,
    pitch: preset.cameraPitch,
    yaw: preset.cameraYaw,
    distanceMultiplier: preset.cameraDistanceMultiplier
  });
}

export function applyStudioStyleProfileToSceneEnv(
  deps: StudioSceneEnvironmentDeps,
  styleProfile: StudioSceneStyleProfile,
  source: SyncSource
) {
  const projectModel = deps.getProjectModel();
  if (!projectModel) return;

  const patch = createStudioEnvPatchFromStyleProfile(styleProfile);
  projectModel.envConfig = {
    ...projectModel.envConfig,
    ...patch,
    postProcessing: patch.postProcessing
      ? mergeEditorPostProcessingConfig(
          projectModel.envConfig.postProcessing,
          patch.postProcessing
        )
      : projectModel.envConfig.postProcessing,
    ground: {
      ...projectModel.envConfig.ground,
      visible: false,
      mode: "plane"
    }
  };
  deps.runtime.applyEnvConfig(projectModel.envConfig);
  deps.emit({
    type: "sceneUpdated",
    source,
    pathTraceInvalidation: "environment"
  });
}

export async function applyStudioIbl(input: {
  deps: StudioSceneEnvironmentDeps;
  session: ActiveStudioSceneSession;
  styleProfile: StudioSceneStyleProfile;
  source: SyncSource;
  requestId: number;
  getCurrentRequestId: () => number;
  isSessionCurrent: (session: ActiveStudioSceneSession) => boolean;
  resolveStudioHdriUrl?: (
    input: StudioHdriResolveInput
  ) => Promise<StudioHdriResolveResult | null>;
  emitChanged: () => void;
}) {
  const {
    deps,
    session,
    styleProfile,
    source,
    requestId,
    getCurrentRequestId,
    isSessionCurrent,
    resolveStudioHdriUrl,
    emitChanged
  } = input;
  const projectModel = deps.getProjectModel();
  const ibl = styleProfile.lighting.ibl;

  if (!projectModel || !ibl.enabled || ibl.provider === "none") {
    session.hdriStatus = "idle";
    session.hdriError = null;
    emitChanged();
    return;
  }

  session.hdriStatus = "loading";
  session.hdriError = null;
  emitChanged();

  try {
    const resolved =
      ibl.url && ibl.url.trim().length > 0
        ? { url: ibl.url, assetName: ibl.assetId ?? ibl.url }
        : resolveStudioHdriUrl
          ? await resolveStudioHdriUrl({
              provider: ibl.provider,
              assetId: ibl.assetId,
              url: ibl.url
            })
          : null;

    if (!resolved?.url) {
      throw new Error("No HDRI URL could be resolved for the selected studio style.");
    }

    if (requestId !== getCurrentRequestId() || !isSessionCurrent(session)) return;

    await deps.runtime.setEnvironmentFromUrl(
      resolved.url,
      resolved.assetName ?? resolved.url
    );
    if (requestId !== getCurrentRequestId() || !isSessionCurrent(session)) return;

    deps.runtime.applyEnvConfig(projectModel.envConfig);
    session.hdriStatus = "ready";
    session.hdriError = null;
    deps.emit({
      type: "sceneUpdated",
      source,
      pathTraceInvalidation: "environment"
    });
    emitChanged();
  } catch (error) {
    if (requestId !== getCurrentRequestId() || !isSessionCurrent(session)) return;
    session.hdriStatus = "error";
    session.hdriError =
      error instanceof Error ? error.message : "Failed to load studio HDRI.";
    emitChanged();
  }
}
