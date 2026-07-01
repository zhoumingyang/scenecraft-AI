export type PathTraceAdaptiveQualityMode = "interactive" | "settled";

export type PathTraceAdaptiveQuality = {
  mode: PathTraceAdaptiveQualityMode;
  renderScale: number;
  targetSamples: number;
};

export const PATH_TRACE_INTERACTIVE_RENDER_SCALE_FACTOR = 0.5;
export const PATH_TRACE_INTERACTIVE_MIN_RENDER_SCALE = 0.25;
export const PATH_TRACE_INTERACTIVE_ACTIVE_TARGET_SAMPLES = 48;
export const PATH_TRACE_INTERACTIVE_SETTLED_TARGET_SAMPLES = 256;

export type PathTraceInteractionQualityInput = {
  transformDragging: boolean;
  firstPersonInputActive: boolean;
  orbitDampingFramesRemaining: number;
  runtimeChanged: boolean;
  sessionChanged: boolean;
};

export function getInteractivePathTraceQuality({
  displayPixelRenderScale,
  interactive,
  settledTargetSamples = PATH_TRACE_INTERACTIVE_SETTLED_TARGET_SAMPLES
}: {
  displayPixelRenderScale: number;
  interactive: boolean;
  settledTargetSamples?: number;
}): PathTraceAdaptiveQuality {
  if (!interactive) {
    return {
      mode: "settled",
      renderScale: displayPixelRenderScale,
      targetSamples: settledTargetSamples
    };
  }

  return {
    mode: "interactive",
    renderScale: Math.max(
      PATH_TRACE_INTERACTIVE_MIN_RENDER_SCALE,
      displayPixelRenderScale * PATH_TRACE_INTERACTIVE_RENDER_SCALE_FACTOR
    ),
    targetSamples: PATH_TRACE_INTERACTIVE_ACTIVE_TARGET_SAMPLES
  };
}

export function shouldUseInteractivePathTraceQuality({
  transformDragging,
  firstPersonInputActive,
  orbitDampingFramesRemaining,
  runtimeChanged
}: PathTraceInteractionQualityInput) {
  return (
    transformDragging ||
    firstPersonInputActive ||
    orbitDampingFramesRemaining > 0 ||
    runtimeChanged
  );
}

export function getPathTraceQualityTransition({
  currentMode,
  nextMode
}: {
  currentMode: PathTraceAdaptiveQualityMode;
  nextMode: PathTraceAdaptiveQualityMode;
}) {
  const modeChanged = currentMode !== nextMode;
  return {
    modeChanged,
    shouldResetSamples: modeChanged
  };
}
