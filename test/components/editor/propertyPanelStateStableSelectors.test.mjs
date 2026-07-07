import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const CONSTANTS_SOURCE = readFileSync(
  new URL("../../../components/editor/propertyPanel/constants.ts", import.meta.url),
  "utf8"
);
const STATE_SOURCE = readFileSync(
  new URL("../../../components/editor/propertyPanel/usePropertyPanelState.ts", import.meta.url),
  "utf8"
);

test("closed property panel selectors use stable fallback values", () => {
  assert.match(CONSTANTS_SOURCE, /CLOSED_SELECTED_ENTITY_IDS/);
  assert.match(STATE_SOURCE, /CLOSED_SELECTED_ENTITY_IDS/);
  assert.doesNotMatch(STATE_SOURCE, /open \? state\.selectedEntityIds : \[\]/);
});
