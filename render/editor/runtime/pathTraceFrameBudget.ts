type InteractivePathTraceSampleInput = {
  samples: number;
  targetSamples: number;
};

type InteractivePathTraceContinueInput = InteractivePathTraceSampleInput & {
  dirty: boolean;
};

export function shouldRenderInteractivePathTraceSample({
  samples,
  targetSamples
}: InteractivePathTraceSampleInput) {
  return samples < targetSamples;
}

export function shouldContinueInteractivePathTrace({
  dirty,
  samples,
  targetSamples
}: InteractivePathTraceContinueInput) {
  return (
    dirty ||
    shouldRenderInteractivePathTraceSample({ samples, targetSamples })
  );
}
