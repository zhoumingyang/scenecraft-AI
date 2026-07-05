import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const TOP_BAR_SOURCE = readFileSync(
  new URL("../../../components/editor/topBar.tsx", import.meta.url),
  "utf8"
);

test("render export failures do not open a notice confirmation dialog", () => {
  assert.doesNotMatch(
    TOP_BAR_SOURCE,
    /notify\(\{\s*message:\s*t\("editor\.export\.failed"\)\s*\}\)/
  );
});
