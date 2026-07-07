import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const EVENT_BRIDGE_SOURCE = readFileSync(
  new URL("../../../components/editor/useEditorAppEventBridge.ts", import.meta.url),
  "utf8"
);
const STORE_TYPES_SOURCE = readFileSync(
  new URL("../../../stores/editorStore.types.ts", import.meta.url),
  "utf8"
);
const STORE_UI_SOURCE = readFileSync(
  new URL("../../../stores/editorStore.ui.ts", import.meta.url),
  "utf8"
);

test("render-driven entity updates are batched into one store update", () => {
  assert.match(STORE_TYPES_SOURCE, /bumpRenderEntityVersions/);
  assert.match(STORE_UI_SOURCE, /bumpRenderEntityVersions/);
  assert.match(EVENT_BRIDGE_SOURCE, /bumpRenderEntityVersions\(Array\.from\(pendingRenderEntityIds\)\)/);
  assert.doesNotMatch(EVENT_BRIDGE_SOURCE, /pendingRenderEntityIds\.forEach\(\(entityId\) => \{\s*bumpEntityVersion/s);
});
