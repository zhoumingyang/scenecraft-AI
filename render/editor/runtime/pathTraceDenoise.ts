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

export const PATH_TRACE_DENOISE_SIGMA = 3;
export const PATH_TRACE_DENOISE_THRESHOLD = 0.05;
export const PATH_TRACE_DENOISE_K_SIGMA = 1;

export function configurePathTraceDenoiseMaterial(
  material: PathTraceDenoiseMaterialTarget,
  texture: unknown
) {
  material.uniforms.map.value = texture;
  material.uniforms.sigma.value = PATH_TRACE_DENOISE_SIGMA;
  material.uniforms.threshold.value = PATH_TRACE_DENOISE_THRESHOLD;
  material.uniforms.kSigma.value = PATH_TRACE_DENOISE_K_SIGMA;
  material.uniforms.opacity.value = 1;
}

export function renderPathTraceDenoisedTexture<RendererTarget extends PathTraceDenoiseRendererTarget>({
  material,
  quad,
  renderer,
  texture
}: {
  material: PathTraceDenoiseMaterialTarget;
  quad: PathTraceDenoiseQuadTarget<RendererTarget>;
  renderer: RendererTarget;
  texture: unknown;
}) {
  configurePathTraceDenoiseMaterial(material, texture);

  const previousAutoClear = renderer.autoClear;
  renderer.autoClear = true;
  renderer.clear();
  quad.render(renderer);
  renderer.autoClear = previousAutoClear;
}
