import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const SCENE_TREE_SOURCE = readFileSync(
  new URL("../../../components/editor/sceneTreePanel.utils.tsx", import.meta.url),
  "utf8"
);
const PANEL_STATE_SOURCE = readFileSync(
  new URL("../../../components/editor/propertyPanel/usePropertyPanelState.ts", import.meta.url),
  "utf8"
);
const INSPECTOR_SOURCE = readFileSync(
  new URL("../../../components/editor/propertyPanel/entityInspectorContent.tsx", import.meta.url),
  "utf8"
);
const CSG_PANEL_SOURCE = readFileSync(
  new URL("../../../components/editor/propertyPanel/csgMeshInspectorSection.tsx", import.meta.url),
  "utf8"
);

test("scene tree hides CSG operands and shows CsgMesh entities", () => {
  assert.match(SCENE_TREE_SOURCE, /isMeshConsumedByCsg\(mesh\.id\)/);
  assert.match(SCENE_TREE_SOURCE, /project\.csgMeshes\.values\(\)/);
  assert.match(SCENE_TREE_SOURCE, /type: "csgMesh"/);
});

test("property panel switches to a CsgMesh inspector with release action", () => {
  assert.match(PANEL_STATE_SOURCE, /entityRecord\.kind === "csgMesh"/);
  assert.match(INSPECTOR_SOURCE, /CsgMeshInspectorSection/);
  assert.match(CSG_PANEL_SOURCE, /releaseMeshCsg/);
  assert.match(CSG_PANEL_SOURCE, /editor\.properties\.csgRelease/);
});

