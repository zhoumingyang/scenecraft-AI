type PathTraceDenoiseMaterialTarget = {
  uniforms: Record<string, { value: unknown }>;
};

type PathTraceDenoiseRendererTarget = {
  autoClear: boolean;
  clear: () => void;
};

type PathTraceDenoiseQuadTarget<RendererTarget> = {
  render: (renderer: RendererTarget) => void;
};

export type PathTraceDenoiseSettings = {
  sigma: number;
  threshold: number;
};

export const PATH_TRACE_REALTIME_DENOISE_SETTINGS: PathTraceDenoiseSettings = {
  sigma: 3.2,
  threshold: 0.045
};

export const PATH_TRACE_CAPTURE_DENOISE_SETTINGS: PathTraceDenoiseSettings = {
  sigma: 5,
  threshold: 0.08
};

export const PATH_TRACE_DENOISE_K_SIGMA = 1;

export function configurePathTraceDenoiseMaterial(
  material: PathTraceDenoiseMaterialTarget,
  texture: unknown,
  settings: PathTraceDenoiseSettings = PATH_TRACE_REALTIME_DENOISE_SETTINGS
) {
  material.uniforms.map.value = texture;
  material.uniforms.sigma.value = settings.sigma;
  material.uniforms.threshold.value = settings.threshold;
  material.uniforms.kSigma.value = PATH_TRACE_DENOISE_K_SIGMA;
  material.uniforms.opacity.value = 1;
}

export function renderPathTraceDenoisedTexture<RendererTarget extends PathTraceDenoiseRendererTarget>({
  material,
  quad,
  renderer,
  settings,
  texture
}: {
  material: PathTraceDenoiseMaterialTarget;
  quad: PathTraceDenoiseQuadTarget<RendererTarget>;
  renderer: RendererTarget;
  settings?: PathTraceDenoiseSettings;
  texture: unknown;
}) {
  configurePathTraceDenoiseMaterial(material, texture, settings);

  const previousAutoClear = renderer.autoClear;
  renderer.autoClear = true;
  renderer.clear();
  quad.render(renderer);
  renderer.autoClear = previousAutoClear;
}
