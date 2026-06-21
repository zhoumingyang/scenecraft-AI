import type { WebGLPathTracer } from "three-gpu-pathtracer";

export const MIN_PRESENTABLE_PATH_TRACE_SAMPLES = 128;
export const PATH_TRACE_CAPTURE_SAMPLES = 192;
export const PATH_TRACE_CAPTURE_MAX_ITERATIONS = 256;

const FULL_FRAME_TILE_COUNT = 1;

type PathTracerConfigTarget = Pick<
  WebGLPathTracer,
  "dynamicLowRes" | "fadeDuration" | "minSamples" | "renderDelay" | "renderScale" | "tiles"
>;

export function configureEditorPathTracer(pathTracer: PathTracerConfigTarget) {
  pathTracer.minSamples = MIN_PRESENTABLE_PATH_TRACE_SAMPLES;
  pathTracer.renderDelay = 0;
  pathTracer.fadeDuration = 0;
  pathTracer.dynamicLowRes = false;
  pathTracer.renderScale = 1;
  pathTracer.tiles.set(FULL_FRAME_TILE_COUNT, FULL_FRAME_TILE_COUNT);
}
