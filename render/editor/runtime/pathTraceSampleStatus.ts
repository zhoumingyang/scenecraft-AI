import type { PathTraceAdaptiveQualityMode } from "./pathTraceAdaptiveQuality";

export type PathTraceSampleStatus = {
  dirty: boolean;
  mode: PathTraceAdaptiveQualityMode;
  progress: number;
  samples: number;
  sampling: boolean;
  targetSamples: number;
};

export function createPathTraceSampleStatus({
  dirty,
  mode,
  samples,
  targetSamples
}: {
  dirty: boolean;
  mode: PathTraceAdaptiveQualityMode;
  samples: number;
  targetSamples: number;
}): PathTraceSampleStatus {
  const progress = targetSamples <= 0
    ? 1
    : Math.min(1, Math.max(0, samples / targetSamples));

  return {
    dirty,
    mode,
    progress,
    samples,
    sampling: dirty || samples < targetSamples,
    targetSamples
  };
}
