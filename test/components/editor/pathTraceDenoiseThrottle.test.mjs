import { strict as assert } from "node:assert";
import test from "node:test";

import { createRafThrottledCommitter } from "../../../components/editor/pathTraceDenoiseThrottle.ts";

function createScheduler() {
  let nextId = 1;
  const callbacks = new Map();

  return {
    callbacks,
    request(callback) {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id;
    },
    cancel(id) {
      callbacks.delete(id);
    },
    runNext() {
      const [id, callback] = callbacks.entries().next().value;
      callbacks.delete(id);
      callback();
    }
  };
}

test("raf throttled denoise committer sends only the latest value per frame", () => {
  const scheduler = createScheduler();
  const committed = [];
  const throttler = createRafThrottledCommitter((value) => {
    committed.push(value);
  }, scheduler);

  throttler.schedule(1);
  throttler.schedule(2);
  throttler.schedule(3);

  assert.equal(scheduler.callbacks.size, 1);
  assert.deepEqual(committed, []);

  scheduler.runNext();

  assert.deepEqual(committed, [3]);
});

test("raf throttled denoise committer cancels pending values", () => {
  const scheduler = createScheduler();
  const committed = [];
  const throttler = createRafThrottledCommitter((value) => {
    committed.push(value);
  }, scheduler);

  throttler.schedule(1);
  throttler.cancel();

  assert.equal(scheduler.callbacks.size, 0);
  assert.deepEqual(committed, []);
});
