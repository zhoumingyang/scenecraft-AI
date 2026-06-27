type PathTraceSampleLoopOptions = {
  targetSamples: number;
  maxIterations: number;
  getSamples: () => number;
  renderSample: () => void;
};

export type PathTraceSampleProgress = {
  samples: number;
  targetSamples: number;
  progress: number;
  renderedIterations: number;
};

type AsyncPathTraceSampleLoopOptions = PathTraceSampleLoopOptions & {
  batchSize?: number;
  signal?: AbortSignal;
  onProgress?: (progress: PathTraceSampleProgress) => void;
  waitForNextFrame?: () => Promise<void>;
};

export const PATH_TRACE_ASYNC_CAPTURE_BATCH_SIZE = 8;

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

export async function renderPathTraceSamplesUntilAsync({
  targetSamples,
  maxIterations,
  batchSize = PATH_TRACE_ASYNC_CAPTURE_BATCH_SIZE,
  signal,
  getSamples,
  renderSample,
  onProgress,
  waitForNextFrame = waitForAnimationFrame
}: AsyncPathTraceSampleLoopOptions) {
  let rendered = 0;
  const normalizedBatchSize = Math.max(1, Math.floor(batchSize));

  throwIfAborted(signal);

  while (getSamples() < targetSamples && rendered < maxIterations) {
    let batchRendered = 0;
    while (
      batchRendered < normalizedBatchSize &&
      getSamples() < targetSamples &&
      rendered < maxIterations
    ) {
      throwIfAborted(signal);
      renderSample();
      rendered += 1;
      batchRendered += 1;
    }

    onProgress?.(createSampleProgress({
      samples: getSamples(),
      targetSamples,
      renderedIterations: rendered
    }));

    if (getSamples() >= targetSamples || rendered >= maxIterations) {
      break;
    }

    throwIfAborted(signal);
    await waitForNextFrame();
    throwIfAborted(signal);
  }

  return rendered;
}

function createSampleProgress({
  samples,
  targetSamples,
  renderedIterations
}: {
  samples: number;
  targetSamples: number;
  renderedIterations: number;
}): PathTraceSampleProgress {
  return {
    samples,
    targetSamples,
    progress: targetSamples <= 0 ? 1 : Math.min(1, Math.max(0, samples / targetSamples)),
    renderedIterations
  };
}

function waitForAnimationFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (!signal?.aborted) return;
  throw createAbortError();
}

function createAbortError() {
  const error = new Error("Path trace capture was cancelled.");
  error.name = "AbortError";
  return error;
}
