import { strict as assert } from "node:assert";
import test from "node:test";

import { applyDuplicatePositionOffset } from "../render/editor/session/entityDuplicator";

test("applyDuplicatePositionOffset adds a stable horizontal paste offset", () => {
  assert.deepEqual(applyDuplicatePositionOffset([1, 2, 3], [0.4, 0, 0.4]), [1.4, 2, 3.4]);
});

test("applyDuplicatePositionOffset ignores missing offsets for normal duplicate", () => {
  assert.deepEqual(applyDuplicatePositionOffset([1, 2, 3], undefined), [1, 2, 3]);
});
