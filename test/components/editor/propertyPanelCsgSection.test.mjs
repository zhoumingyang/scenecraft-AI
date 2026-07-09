import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const STATE_SOURCE = readFileSync(
  new URL("../../../components/editor/propertyPanel/usePropertyPanelState.ts", import.meta.url),
  "utf8"
);
const TYPES_SOURCE = readFileSync(
  new URL("../../../components/editor/propertyPanel/types.ts", import.meta.url),
  "utf8"
);
const CONTENT_SOURCE = readFileSync(
  new URL("../../../components/editor/propertyPanel/entityInspectorContent.tsx", import.meta.url),
  "utf8"
);
const ZH_SOURCE = readFileSync(new URL("../../../lib/i18n/zh.ts", import.meta.url), "utf8");
const EN_SOURCE = readFileSync(new URL("../../../lib/i18n/en.ts", import.meta.url), "utf8");

test("property panel exposes CSG controls only for multi-selected mesh entities", () => {
  assert.match(STATE_SOURCE, /selectedMeshEntityIds/);
  assert.match(STATE_SOURCE, /selectedMeshEntityIds\.length === selectedEntityIds\.length/);
  assert.match(STATE_SOURCE, /isMeshMultiSelection/);
  assert.match(TYPES_SOURCE, /selectedMeshEntityIds: string\[\]/);
  assert.match(TYPES_SOURCE, /isMeshMultiSelection: boolean/);
  assert.match(CONTENT_SOURCE, /MeshCsgSection/);
  assert.match(CONTENT_SOURCE, /isMeshMultiSelection && selectedMeshEntityIds\.length > 1/);
  assert.match(ZH_SOURCE, /"editor\.properties\.csg": "CSG"/);
  assert.match(EN_SOURCE, /"editor\.properties\.csg": "CSG"/);
});
