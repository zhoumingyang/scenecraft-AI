type RafScheduler = {
  request: (callback: () => void) => number;
  cancel: (id: number) => void;
};

function createBrowserRafScheduler(): RafScheduler {
  return {
    request: (callback) => window.requestAnimationFrame(callback),
    cancel: (id) => window.cancelAnimationFrame(id)
  };
}

export function createRafThrottledCommitter<T>(
  commit: (value: T) => void,
  scheduler: RafScheduler = createBrowserRafScheduler()
) {
  let frameId: number | null = null;
  let pendingValue: T | null = null;
  let hasPendingValue = false;

  const flush = () => {
    frameId = null;
    if (!hasPendingValue) return;

    const value = pendingValue as T;
    pendingValue = null;
    hasPendingValue = false;
    commit(value);
  };

  return {
    schedule(value: T) {
      pendingValue = value;
      hasPendingValue = true;
      if (frameId !== null) return;
      frameId = scheduler.request(flush);
    },
    cancel() {
      if (frameId !== null) {
        scheduler.cancel(frameId);
      }
      frameId = null;
      pendingValue = null;
      hasPendingValue = false;
    },
    flush() {
      if (frameId !== null) {
        scheduler.cancel(frameId);
      }
      flush();
    }
  };
}
