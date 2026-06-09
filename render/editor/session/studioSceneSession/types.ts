import type * as THREE from "three";

import type { BindingRegistry } from "../../bindings/bindingRegistry";
import type { EditorAppEvent } from "../../core/events";
import type {
  EditorLightJSON,
  EditorMeshMaterialJSON,
  ResolvedEditorPostProcessingConfigJSON,
  ResolvedEditorEnvConfigJSON,
  StudioSceneState,
  SyncSource,
  TransformLike
} from "../../core/types";
import type { EditorProjectModel } from "../../models";
import type { EditorRuntime } from "../../runtime/editorRuntime";
import type {
  StudioColorGradingConfig,
  StudioColorGradingPatch
} from "../../studioColorGrading";
import type {
  StudioSceneHdriStatus,
  StudioScenePresetId,
  StudioSceneVariantId
} from "../../studioScenes";
import type {
  StudioProductProfile,
  StudioSceneStyleProfileId,
  StudioSceneStyleSelectionMode
} from "../../studioSceneProfiles";
import type {
  StudioDecorationKind,
  StudioPlinthKind
} from "../../studioSceneLayoutGenerator";
import type {
  StudioGeneratedLightRole,
  StudioGeneratedModifierRole
} from "../../studioSceneLightingGenerator";

export type StudioObjectVisibilitySnapshot = Array<{
  entityId: string;
  visible: boolean;
}>;

export type StudioViewHelperSnapshot = {
  gridHelper: boolean;
  transformGizmo: boolean;
  lightHelper: boolean;
  shadow: boolean;
};

export type StudioTargetTransformSnapshot = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
};

export type StudioTargetFrame = {
  center: THREE.Vector3;
  radius: number;
  footprintRadius: number;
  height: number;
  floorY: number;
};

export type StudioTransientEntityRole =
  | "root"
  | "layoutGroup"
  | "background"
  | "cove"
  | "floor"
  | "backWall"
  | "sideWall"
  | "plinth"
  | "decoration"
  | "light"
  | "studioLight"
  | "keyLight"
  | "keyShadowLight"
  | "fillLight"
  | "rimLight"
  | "topLight"
  | "accentLight"
  | "roomFillLight"
  | "wallWashLight"
  | "ceilingWashLight"
  | "lightModifier"
  | "reflector"
  | "negativeFill"
  | "stripPanel"
  | "userMesh"
  | "userLight"
  | "userLightGroup"
  | "userModel";

export type StudioTransientAdoptOptions = {
  childRole?: StudioTransientEntityRole;
  attachToRoot?: boolean;
  placeAtSpawn?: boolean;
};

export type StudioTransientEntityGroupKind = "layout" | "lighting" | "user";

export type StudioTransientEntityDefaultSnapshot = {
  transform: Required<Pick<TransformLike, "position" | "quaternion" | "scale">>;
  visible?: boolean;
  material?: EditorMeshMaterialJSON;
  light?: Pick<
    EditorLightJSON,
    | "color"
    | "groundColor"
    | "intensity"
    | "distance"
    | "decay"
    | "angle"
    | "penumbra"
    | "width"
    | "height"
  >;
};

export type StudioTransientEntityMetadata = {
  entityId: string;
  role: StudioTransientEntityRole;
  groupKind: StudioTransientEntityGroupKind;
  allowHide: boolean;
  allowDelete: boolean;
  plinthKind?: StudioPlinthKind;
  decorationKind?: StudioDecorationKind;
  lightRole?: StudioGeneratedLightRole;
  modifierRole?: StudioGeneratedModifierRole;
  hasDefaultSnapshot: boolean;
  defaultSnapshot?: StudioTransientEntityDefaultSnapshot;
};

export type StudioSceneEnterOptions = {
  productProfile: StudioProductProfile;
  styleProfileId?: StudioScenePresetId | null;
};

export type StudioSceneEntityAction =
  | "select"
  | "transform"
  | "material"
  | "light"
  | "delete"
  | "duplicate"
  | "rename"
  | "lock"
  | "visibility";

export type StudioHdriResolveInput = {
  provider: "polyhaven" | "local" | "none";
  assetId?: string;
  url?: string;
};

export type StudioHdriResolveResult = {
  url: string;
  assetName?: string;
};

export type StudioScenePostProcessingState = {
  active: true;
  dirty: boolean;
  exposure: number;
  colorGrading: StudioColorGradingConfig;
  bloom: {
    enabled: boolean;
    strength: number;
    radius: number;
    threshold: number;
  };
  bokeh: {
    enabled: boolean;
    focus: number;
    aperture: number;
    maxblur: number;
  };
  grain: {
    enabled: boolean;
    intensity: number;
  };
  postProcessing: ResolvedEditorPostProcessingConfigJSON;
};

export type StudioScenePostProcessingPatch = {
  exposure?: number;
  colorGrading?: StudioColorGradingPatch;
  bloom?: Partial<StudioScenePostProcessingState["bloom"]>;
  bokeh?: Partial<StudioScenePostProcessingState["bokeh"]>;
  grain?: Partial<StudioScenePostProcessingState["grain"]>;
};

export type ActiveStudioSceneSession = {
  targetEntityId: string;
  presetId: StudioScenePresetId;
  variantId: StudioSceneVariantId;
  productProfile: StudioProductProfile;
  styleProfileId: StudioSceneStyleProfileId;
  styleSelectionMode: StudioSceneStyleSelectionMode;
  plinthKind: StudioPlinthKind;
  targetScale: number;
  targetRotationY: number;
  hdriStatus: StudioSceneHdriStatus;
  hdriError: string | null;
  objectVisibilitySnapshot: StudioObjectVisibilitySnapshot;
  viewHelperSnapshot: StudioViewHelperSnapshot;
  targetTransformSnapshot: StudioTargetTransformSnapshot;
  sceneEnvConfigSnapshot: ResolvedEditorEnvConfigJSON;
  studioColorGradingConfig: StudioColorGradingConfig;
  studioColorGradingDefaultConfig: StudioColorGradingConfig;
  studioPostProcessingDirty: boolean;
  targetFrame: StudioTargetFrame;
  defaultTargetScale: number;
  visibleOriginalEntityIds: Set<string>;
  transientEntityIds: Set<string>;
  transientLayoutEntityIds: Set<string>;
  transientLightingEntityIds: Set<string>;
  transientRootGroupId: string | null;
  transientEntityRoles: Map<string, StudioTransientEntityRole>;
  transientEntityMetadata: Map<string, StudioTransientEntityMetadata>;
};

export type StudioSceneSessionControllerOptions = {
  runtime: EditorRuntime;
  registry: BindingRegistry;
  emit: (event: EditorAppEvent) => void;
  resolveStudioHdriUrl?: (input: StudioHdriResolveInput) => Promise<StudioHdriResolveResult | null>;
  getProjectModel: () => EditorProjectModel | null;
  getSelectedEntityId: () => string | null;
  hasEntityIsolation: () => boolean;
  clearEntityIsolation: (source: SyncSource) => void;
  setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
  rebuildGroupHierarchy: () => void;
};

export function createDefaultStudioSceneState(): StudioSceneState {
  return {
    active: false,
    presetId: null,
    variantId: null,
    targetEntityId: null,
    productProfile: null,
    styleProfileId: null,
    styleSelectionMode: null,
    plinthKind: null,
    targetScale: 1,
    targetRotationY: 0,
    hdriStatus: "idle",
    hdriError: null
  };
}

export function cloneResolvedEnvConfig(
  envConfig: ResolvedEditorEnvConfigJSON
): ResolvedEditorEnvConfigJSON {
  return structuredClone(envConfig) as ResolvedEditorEnvConfigJSON;
}
