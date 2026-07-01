import type {
  AssetUnit,
  ModelAnimationPlaybackState,
  ModelFileFormat
} from "../constants/model";
import type { ExternalAssetSourceJSON } from "@/lib/externalAssets/types";
import type {
  StudioSceneHdriStatus,
  StudioScenePresetId,
  StudioSceneVariantId
} from "../studioScenes";
import type {
  StudioProductProfile,
  StudioSceneStyleProfileId,
  StudioSceneStyleSelectionMode
} from "../studioSceneProfiles";

export type { AssetUnit, ModelAnimationPlaybackState, ModelFileFormat } from "../constants/model";
export { GROUND_HELPER_NODE_ID, SCENE_NODE_ID } from "../constants/scene";

export type Vec3Tuple = [number, number, number];
export type QuatTuple = [number, number, number, number];
export type Vector2Tuple = [number, number];

export type TransformLike = {
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};

export type TransformPatch = {
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};

export type ModelAnimationClipJSON = {
  id: string;
  name: string;
  duration: number;
};

export type EditorModelJSON = {
  id: string;
  label?: string;
  source: string;
  sourceAssetId?: string;
  externalSource?: ExternalAssetSourceJSON | null;
  format?: ModelFileFormat;
  assetUnit?: AssetUnit;
  assetImportScale?: number;
  animations?: ModelAnimationClipJSON[];
  activeAnimationId?: string | null;
  animationTimeScale?: number;
  animationPlaybackState?: ModelAnimationPlaybackState;
  locked?: boolean;
  visible?: boolean;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};

export type EditorMeshVertexJSON = {
  x: number;
  y: number;
  z: number;
};

export type EditorMeshUvJSON = {
  x: number;
  y: number;
};

export type TextureSchema = {
  assetId?: string;
  url?: string;
  externalSource?: ExternalAssetSourceJSON | null;
  offset?: number[];
  repeat?: number[];
  rotation?: number;
};

export type ResolvedTextureSchema = {
  assetId: string;
  url: string;
  externalSource: ExternalAssetSourceJSON | null;
  offset: [number, number];
  repeat: [number, number];
  rotation: number;
};

export type EditorMeshMaterialJSON = {
  color?: string;
  opacity?: number;
  diffuseMap?: TextureSchema;
  metalness?: number;
  metalnessMap?: TextureSchema;
  roughness?: number;
  roughnessMap?: TextureSchema;
  normalMap?: TextureSchema;
  normalScale?: number[];
  aoMap?: TextureSchema;
  aoMapIntensity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  emissiveMap?: TextureSchema;
  ior?: number;
  specularIntensity?: number;
  specularColor?: string;
  specularIntensityMap?: TextureSchema;
  specularColorMap?: TextureSchema;
  clearcoat?: number;
  clearcoatMap?: TextureSchema;
  clearcoatRoughness?: number;
  clearcoatRoughnessMap?: TextureSchema;
  clearcoatNormalMap?: TextureSchema;
  clearcoatNormalScale?: number[];
  transmission?: number;
  transmissionMap?: TextureSchema;
  thickness?: number;
  thicknessMap?: TextureSchema;
  attenuationDistance?: number;
  attenuationColor?: string;
  dispersion?: number;
  sheen?: number;
  sheenColor?: string;
  sheenColorMap?: TextureSchema;
  sheenRoughness?: number;
  sheenRoughnessMap?: TextureSchema;
  iridescence?: number;
  iridescenceMap?: TextureSchema;
  iridescenceIOR?: number;
  iridescenceThicknessRange?: number[];
  iridescenceThicknessMap?: TextureSchema;
  anisotropy?: number;
  anisotropyMap?: TextureSchema;
  anisotropyRotation?: number;
};

export type ResolvedMeshMaterialJSON = {
  color: string;
  opacity: number;
  diffuseMap: ResolvedTextureSchema;
  metalness: number;
  metalnessMap: ResolvedTextureSchema;
  roughness: number;
  roughnessMap: ResolvedTextureSchema;
  normalMap: ResolvedTextureSchema;
  normalScale: [number, number];
  aoMap: ResolvedTextureSchema;
  aoMapIntensity: number;
  emissive: string;
  emissiveIntensity: number;
  emissiveMap: ResolvedTextureSchema;
  ior: number;
  specularIntensity: number;
  specularColor: string;
  specularIntensityMap: ResolvedTextureSchema;
  specularColorMap: ResolvedTextureSchema;
  clearcoat: number;
  clearcoatMap: ResolvedTextureSchema;
  clearcoatRoughness: number;
  clearcoatRoughnessMap: ResolvedTextureSchema;
  clearcoatNormalMap: ResolvedTextureSchema;
  clearcoatNormalScale: [number, number];
  transmission: number;
  transmissionMap: ResolvedTextureSchema;
  thickness: number;
  thicknessMap: ResolvedTextureSchema;
  attenuationDistance: number;
  attenuationColor: string;
  dispersion: number;
  sheen: number;
  sheenColor: string;
  sheenColorMap: ResolvedTextureSchema;
  sheenRoughness: number;
  sheenRoughnessMap: ResolvedTextureSchema;
  iridescence: number;
  iridescenceMap: ResolvedTextureSchema;
  iridescenceIOR: number;
  iridescenceThicknessRange: [number, number];
  iridescenceThicknessMap: ResolvedTextureSchema;
  anisotropy: number;
  anisotropyMap: ResolvedTextureSchema;
  anisotropyRotation: number;
};

export type EditorGroundMode = "grid" | "plane";

export type EditorGroundConfigJSON = {
  mode?: EditorGroundMode;
  visible?: boolean;
  scale?: number[];
  material?: EditorMeshMaterialJSON;
};

export type ResolvedEditorGroundConfigJSON = {
  mode: EditorGroundMode;
  visible: boolean;
  scale: Vec3Tuple;
  material: ResolvedMeshMaterialJSON;
};

export type EditorMeshJSON = {
  id: string;
  label?: string;
  type: number;
  geometryName?: string;
  vertices?: EditorMeshVertexJSON[];
  uvs?: EditorMeshUvJSON[];
  normals?: EditorMeshVertexJSON[];
  indices?: number[];
  color?: string;
  textureUrl?: string;
  material?: EditorMeshMaterialJSON;
  locked?: boolean;
  visible?: boolean;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};

export type EditorLightJSON = {
  id: string;
  label?: string;
  type: number | string;
  locked?: boolean;
  visible?: boolean;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
  color?: string;
  groundColor?: string;
  intensity?: number;
  distance?: number;
  decay?: number;
  angle?: number;
  penumbra?: number;
  width?: number;
  height?: number;
};

export type EditorGroupJSON = {
  id: string;
  label?: string;
  children: string[];
  locked?: boolean;
  visible?: boolean;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};

export type EditorCameraJSON = {
  type?: number;
  fov?: number;
  position?: number[];
  quaternion?: number[];
  scale?: number[];
};

export type AfterimagePassParams = {
  damp?: number;
};

export type BokehPassParams = {
  focus?: number;
  aperture?: number;
  maxblur?: number;
};

export type FilmPassParams = {
  intensity?: number;
  grayscale?: boolean;
};

export type DotScreenPassParams = {
  angle?: number;
  scale?: number;
};

export type GtaoPassParams = {
  blendIntensity?: number;
  radius?: number;
  distanceFallOff?: number;
  thickness?: number;
};

export type GlitchPassParams = {
  goWild?: boolean;
};

export type HalftonePassParams = {
  shape?: number;
  radius?: number;
  scatter?: number;
  blending?: number;
  blendingMode?: number;
  greyscale?: boolean;
};

export type SsrPassParams = {
  opacity?: number;
  maxDistance?: number;
  thickness?: number;
  blur?: boolean;
  distanceAttenuation?: boolean;
  fresnel?: boolean;
  infiniteThick?: boolean;
};

export type UnrealBloomPassParams = {
  strength?: number;
  radius?: number;
  threshold?: number;
};

export type PixelatedPassParams = {
  pixelSize?: number;
  normalEdgeStrength?: number;
  depthEdgeStrength?: number;
};

export type EditorPostProcessingPassParamsMap = {
  pixelated: PixelatedPassParams;
  afterimage: AfterimagePassParams;
  bokeh: BokehPassParams;
  film: FilmPassParams;
  dotScreen: DotScreenPassParams;
  gtao: GtaoPassParams;
  glitch: GlitchPassParams;
  halftone: HalftonePassParams;
  ssr: SsrPassParams;
  unrealBloom: UnrealBloomPassParams;
};

export type EditorPostProcessPassId = keyof EditorPostProcessingPassParamsMap;

export type EditorPostProcessingPassConfig<T> = {
  enabled?: boolean;
  params?: T;
};

export type ResolvedEditorPostProcessingPassConfig<T> = {
  enabled: boolean;
  params: Required<T>;
};

export type EditorPostProcessingPassesJSON = {
  pixelated?: EditorPostProcessingPassConfig<PixelatedPassParams>;
  afterimage?: EditorPostProcessingPassConfig<AfterimagePassParams>;
  bokeh?: EditorPostProcessingPassConfig<BokehPassParams>;
  film?: EditorPostProcessingPassConfig<FilmPassParams>;
  dotScreen?: EditorPostProcessingPassConfig<DotScreenPassParams>;
  gtao?: EditorPostProcessingPassConfig<GtaoPassParams>;
  glitch?: EditorPostProcessingPassConfig<GlitchPassParams>;
  halftone?: EditorPostProcessingPassConfig<HalftonePassParams>;
  ssr?: EditorPostProcessingPassConfig<SsrPassParams>;
  unrealBloom?: EditorPostProcessingPassConfig<UnrealBloomPassParams>;
};

export type ResolvedEditorPostProcessingPasses = {
  pixelated: ResolvedEditorPostProcessingPassConfig<PixelatedPassParams>;
  afterimage: ResolvedEditorPostProcessingPassConfig<AfterimagePassParams>;
  bokeh: ResolvedEditorPostProcessingPassConfig<BokehPassParams>;
  film: ResolvedEditorPostProcessingPassConfig<FilmPassParams>;
  dotScreen: ResolvedEditorPostProcessingPassConfig<DotScreenPassParams>;
  gtao: ResolvedEditorPostProcessingPassConfig<GtaoPassParams>;
  glitch: ResolvedEditorPostProcessingPassConfig<GlitchPassParams>;
  halftone: ResolvedEditorPostProcessingPassConfig<HalftonePassParams>;
  ssr: ResolvedEditorPostProcessingPassConfig<SsrPassParams>;
  unrealBloom: ResolvedEditorPostProcessingPassConfig<UnrealBloomPassParams>;
};

export type EditorPostProcessingConfigJSON = {
  passes?: EditorPostProcessingPassesJSON;
};

export type ResolvedEditorPostProcessingConfigJSON = {
  passes: ResolvedEditorPostProcessingPasses;
};

export type EditorPathTraceConfigJSON = {
  bounces?: number;
  filterGlossyFactor?: number;
  interactiveRenderScale?: number;
  interactiveSamples?: number;
  renderScale?: number;
  tiles?: number;
  minSamples?: number;
  fadeDuration?: number;
  renderDelay?: number;
  realtimeSamples?: number;
  exportSamples?: number;
};

export type ResolvedEditorPathTraceConfigJSON = {
  bounces: number;
  filterGlossyFactor: number;
  interactiveRenderScale: number;
  interactiveSamples: number;
  renderScale: number;
  tiles: number;
  minSamples: number;
  fadeDuration: number;
  renderDelay: number;
  realtimeSamples: number;
  exportSamples: number;
};

export type EditorViewportCaptureMode = "viewport" | "clean";
export type EditorViewportCaptureProgress = {
  samples: number;
  targetSamples: number;
  progress: number;
  renderedIterations: number;
};
export type EditorViewportCaptureOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: EditorViewportCaptureProgress) => void;
};
export type EditorRenderMode = "webgl" | "pathTrace";

export type EditorEnvConfigJSON = {
  panoAssetId?: string;
  panoAssetName?: string;
  panoUrl?: string;
  externalSource?: ExternalAssetSourceJSON | null;
  environment?: number;
  environmentIntensity?: number;
  backgroundShow?: number;
  backgroundIntensity?: number;
  backgroundBlurriness?: number;
  environmentRotationY?: number;
  toneMapping?: number;
  toneMappingExposure?: number;
  pathTrace?: EditorPathTraceConfigJSON;
  postProcessing?: EditorPostProcessingConfigJSON;
  ground?: EditorGroundConfigJSON;
};

export type ResolvedEditorEnvConfigJSON = Omit<
  Required<EditorEnvConfigJSON>,
  "postProcessing" | "externalSource" | "ground" | "pathTrace"
> & {
  externalSource: ExternalAssetSourceJSON | null;
  pathTrace: ResolvedEditorPathTraceConfigJSON;
  postProcessing: ResolvedEditorPostProcessingConfigJSON;
  ground: ResolvedEditorGroundConfigJSON;
};

export type EditorProjectMetaJSON = {
  title: string;
  description?: string;
  tags?: string[];
};

export type ProjectAssetRefJSON = {
  assetId: string;
  url: string;
  mimeType?: string;
  originalName?: string;
  sizeBytes?: number | null;
};

export type EditorProjectThumbnailJSON = ProjectAssetRefJSON & {
  width: number;
  height: number;
  capturedAt: string;
  camera: EditorCameraJSON;
};

export type ProjectAiImageResultJSON = ProjectAssetRefJSON & {
  id: string;
  appliedMeshIds?: string[];
};

export type ProjectAiGenerationMetadataJSON = {
  kind?: "pbr_texture_atlas" | "panorama";
  atlasLayoutVersion?: number;
  targetKind?: "mesh" | "ground";
  targetId?: string | null;
};

export type ProjectAiImageGenerationJSON = {
  id: string;
  createdAt: string;
  prompt: string;
  model: string;
  seed?: number | null;
  imageSize?: string;
  cfg: number;
  inferenceSteps: number;
  traceId?: string | null;
  referenceImages?: ProjectAssetRefJSON[];
  results: ProjectAiImageResultJSON[];
  metadata?: ProjectAiGenerationMetadataJSON | null;
};

export type ProjectAiLibraryV1JSON = {
  version: 1;
  imageGenerations: ProjectAiImageGenerationJSON[];
};

export type ProjectAiAssetKindJSON = "image" | "pbr_atlas" | "panorama";

export type ProjectAiAssetBaseJSON = ProjectAssetRefJSON & {
  id: string;
  kind: ProjectAiAssetKindJSON;
  createdAt: string;
  prompt: string;
  model: string;
  seed?: number | null;
  imageSize?: string;
  cfg?: number;
  inferenceSteps?: number;
  traceId?: string | null;
  referenceImages?: ProjectAssetRefJSON[];
  appliedMeshIds?: string[];
};

export type ProjectAiImageAssetJSON = ProjectAiAssetBaseJSON & {
  kind: "image";
};

export type ProjectAiPbrAtlasAssetJSON = ProjectAiAssetBaseJSON & {
  kind: "pbr_atlas";
  atlasLayoutVersion?: number;
  targetKind?: "mesh" | "ground";
  targetId?: string | null;
};

export type ProjectAiPanoramaAssetJSON = ProjectAiAssetBaseJSON & {
  kind: "panorama";
  width?: number;
  height?: number;
  targetPath: "env:pano";
};

export type ProjectAiAssetJSON =
  | ProjectAiImageAssetJSON
  | ProjectAiPbrAtlasAssetJSON
  | ProjectAiPanoramaAssetJSON;

export type ProjectAiLibraryV2JSON = {
  version: 2;
  assets: ProjectAiAssetJSON[];
};

export type ProjectAiLibraryJSON = ProjectAiLibraryV1JSON | ProjectAiLibraryV2JSON;

export type EditorProjectJSON = {
  id: string;
  meta?: EditorProjectMetaJSON;
  thumbnail?: EditorProjectThumbnailJSON;
  envConfig?: EditorEnvConfigJSON;
  model?: EditorModelJSON[];
  mesh?: EditorMeshJSON[];
  light?: EditorLightJSON[];
  groups?: EditorGroupJSON[];
  camera?: EditorCameraJSON;
};

export type EntityKind = "model" | "mesh" | "light" | "group";
export type SyncSource = "load" | "ui" | "render";

export type LightingConflictState = {
  hasConflict: boolean;
  hasAmbientLight: boolean;
  hasHemisphereLight: boolean;
};

export type StudioSceneState = {
  active: boolean;
  presetId: StudioScenePresetId | null;
  variantId: StudioSceneVariantId | null;
  targetEntityId: string | null;
  productProfile: StudioProductProfile | null;
  styleProfileId: StudioSceneStyleProfileId | null;
  styleSelectionMode: StudioSceneStyleSelectionMode | null;
  plinthKind: import("../studioSceneLayoutGenerator").StudioPlinthKind | null;
  targetScale: number;
  targetRotationY: number;
  hdriStatus: StudioSceneHdriStatus;
  hdriError: string | null;
};
