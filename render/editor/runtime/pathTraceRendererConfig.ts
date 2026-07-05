import type { WebGLPathTracer } from "three-gpu-pathtracer";

export const INTERACTIVE_PATH_TRACE_MIN_SAMPLES = 1;
export const PATH_TRACE_INTERACTIVE_TARGET_SAMPLES = 256;
export const PATH_TRACE_CAPTURE_SAMPLES = 512;
export const PATH_TRACE_CAPTURE_MAX_ITERATIONS = 512;
export const PATH_TRACE_GLOSSY_FILTER_FACTOR = 1;

const FULL_FRAME_TILE_COUNT = 1;

type PathTracerConfigTarget = {
  dynamicLowRes: boolean;
  fadeDuration: number;
  minSamples: number;
  rasterizeScene: boolean;
  renderDelay: number;
  renderScale: number;
  renderToCanvasCallback: WebGLPathTracer["renderToCanvasCallback"];
  tiles: { set: (x: number, y: number) => void };
};

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
  (pathTracer as PathTracerConfigTarget & { stableNoise: boolean }).stableNoise = true;
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
