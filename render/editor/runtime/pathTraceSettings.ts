export type PathTraceSettings = {
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

export const PATH_TRACE_SETTINGS_LIMITS = {
  bounces: {
    min: 1,
    max: 12
  },
  filterGlossyFactor: {
    min: 0,
    max: 2
  },
  interactiveRenderScale: {
    min: 0.25,
    max: 1
  },
  interactiveSamples: {
    min: 1,
    max: 128
  },
  renderScale: {
    min: 0.25,
    max: 1
  },
  tiles: {
    min: 1,
    max: 4
  },
  minSamples: {
    min: 1,
    max: 16
  },
  fadeDuration: {
    min: 0,
    max: 2
  },
  renderDelay: {
    min: 0,
    max: 1000
  },
  realtimeSamples: {
    min: 32,
    max: 1024
  },
  exportSamples: {
    min: 256,
    max: 8192
  }
};

export const DEFAULT_PATH_TRACE_SETTINGS: PathTraceSettings = {
  bounces: 5,
  filterGlossyFactor: 1,
  interactiveRenderScale: 0.5,
  interactiveSamples: 48,
  renderScale: 1,
  tiles: 1,
  minSamples: 1,
  fadeDuration: 0,
  renderDelay: 0,
  realtimeSamples: 256,
  exportSamples: 2048
};

export function normalizePathTraceSettings(
  source: Partial<PathTraceSettings> | undefined,
  fallback: PathTraceSettings = DEFAULT_PATH_TRACE_SETTINGS
): PathTraceSettings {
  return {
    bounces: normalizeInteger(
      source?.bounces,
      fallback.bounces,
      PATH_TRACE_SETTINGS_LIMITS.bounces.min,
      PATH_TRACE_SETTINGS_LIMITS.bounces.max
    ),
    filterGlossyFactor: normalizeNumber(
      source?.filterGlossyFactor,
      fallback.filterGlossyFactor,
      PATH_TRACE_SETTINGS_LIMITS.filterGlossyFactor.min,
      PATH_TRACE_SETTINGS_LIMITS.filterGlossyFactor.max
    ),
    interactiveRenderScale: normalizeNumber(
      source?.interactiveRenderScale,
      fallback.interactiveRenderScale,
      PATH_TRACE_SETTINGS_LIMITS.interactiveRenderScale.min,
      PATH_TRACE_SETTINGS_LIMITS.interactiveRenderScale.max
    ),
    interactiveSamples: normalizeInteger(
      source?.interactiveSamples,
      fallback.interactiveSamples,
      PATH_TRACE_SETTINGS_LIMITS.interactiveSamples.min,
      PATH_TRACE_SETTINGS_LIMITS.interactiveSamples.max
    ),
    renderScale: normalizeNumber(
      source?.renderScale,
      fallback.renderScale,
      PATH_TRACE_SETTINGS_LIMITS.renderScale.min,
      PATH_TRACE_SETTINGS_LIMITS.renderScale.max
    ),
    tiles: normalizeInteger(
      source?.tiles,
      fallback.tiles,
      PATH_TRACE_SETTINGS_LIMITS.tiles.min,
      PATH_TRACE_SETTINGS_LIMITS.tiles.max
    ),
    minSamples: normalizeInteger(
      source?.minSamples,
      fallback.minSamples,
      PATH_TRACE_SETTINGS_LIMITS.minSamples.min,
      PATH_TRACE_SETTINGS_LIMITS.minSamples.max
    ),
    fadeDuration: normalizeNumber(
      source?.fadeDuration,
      fallback.fadeDuration,
      PATH_TRACE_SETTINGS_LIMITS.fadeDuration.min,
      PATH_TRACE_SETTINGS_LIMITS.fadeDuration.max
    ),
    renderDelay: normalizeNumber(
      source?.renderDelay,
      fallback.renderDelay,
      PATH_TRACE_SETTINGS_LIMITS.renderDelay.min,
      PATH_TRACE_SETTINGS_LIMITS.renderDelay.max
    ),
    realtimeSamples: normalizeInteger(
      source?.realtimeSamples,
      fallback.realtimeSamples,
      PATH_TRACE_SETTINGS_LIMITS.realtimeSamples.min,
      PATH_TRACE_SETTINGS_LIMITS.realtimeSamples.max
    ),
    exportSamples: normalizeInteger(
      source?.exportSamples,
      fallback.exportSamples,
      PATH_TRACE_SETTINGS_LIMITS.exportSamples.min,
      PATH_TRACE_SETTINGS_LIMITS.exportSamples.max
    )
  };
}

export function getPathTraceCaptureSampleBudget(settings: Pick<PathTraceSettings, "exportSamples">) {
  return {
    targetSamples: settings.exportSamples,
    maxIterations: settings.exportSamples
  };
}

function normalizeInteger(value: unknown, fallback: number, min: number, max: number) {
  return Math.round(normalizeNumber(value, fallback, min, max));
}

function normalizeNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
