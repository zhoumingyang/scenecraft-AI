import type { ExternalAssetSourceJSON } from "@/lib/externalAssets/types";
import type { EditorGroundConfigJSON, ResolvedEditorGroundConfigJSON } from "./mesh";

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
  includeGridHelper?: boolean;
  onProgress?: (progress: EditorViewportCaptureProgress) => void;
  image?: EditorViewportCaptureImageOptions;
  onImageEncoded?: (metadata: EditorViewportCaptureImageMetadata) => void;
};
export type EditorViewportCaptureImageOptions = {
  format: "compressed-jpeg";
  maxBytes?: number;
  maxDimensions?: number[];
  qualities?: number[];
};
export type EditorViewportCaptureImageMetadata = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  byteSize: number;
  width: number;
  height: number;
  quality: number;
  maxBytes: number;
  withinBudget: boolean;
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
