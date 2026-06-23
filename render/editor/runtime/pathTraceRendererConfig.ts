import type { WebGLPathTracer } from "three-gpu-pathtracer";

export const INTERACTIVE_PATH_TRACE_MIN_SAMPLES = 1;
export const PATH_TRACE_INTERACTIVE_TARGET_SAMPLES = 128;
export const PATH_TRACE_CAPTURE_SAMPLES = 192;
export const PATH_TRACE_CAPTURE_MAX_ITERATIONS = 256;

const FULL_FRAME_TILE_COUNT = 1;

type PathTracerConfigTarget = Pick<
  WebGLPathTracer,
  | "dynamicLowRes"
  | "fadeDuration"
  | "minSamples"
  | "rasterizeScene"
  | "renderDelay"
  | "renderScale"
  | "renderToCanvasCallback"
  | "tiles"
>;

type EditorPathTracerConfigOptions = {
  renderScale?: number;
};

export function configureEditorPathTracer(
  pathTracer: PathTracerConfigTarget,
  options: EditorPathTracerConfigOptions = {}
) {
  pathTracer.minSamples = INTERACTIVE_PATH_TRACE_MIN_SAMPLES;
  pathTracer.renderDelay = 0;
  pathTracer.fadeDuration = 0;
  pathTracer.dynamicLowRes = false;
  pathTracer.rasterizeScene = false;
  pathTracer.renderScale = options.renderScale ?? 1;
  pathTracer.tiles.set(FULL_FRAME_TILE_COUNT, FULL_FRAME_TILE_COUNT);
  pathTracer.renderToCanvasCallback = (_target, renderer, quad) => {
    const previousAutoClear = renderer.autoClear;

    renderer.autoClear = true;
    renderer.clear();
    quad.render(renderer);
    renderer.autoClear = previousAutoClear;
  };
}
