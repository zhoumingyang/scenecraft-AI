type PathTraceSampleLoopOptions = {
  targetSamples: number;
  maxIterations: number;
  getSamples: () => number;
  renderSample: () => void;
};

export function renderPathTraceSamplesUntil({
  targetSamples,
  maxIterations,
  getSamples,
  renderSample
}: PathTraceSampleLoopOptions) {
  let rendered = 0;

  while (getSamples() < targetSamples && rendered < maxIterations) {
    renderSample();
    rendered += 1;
  }

  return rendered;
}
