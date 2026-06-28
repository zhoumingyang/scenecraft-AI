import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";

test("renders the path trace sample HUD in the viewport controls row before ViewControl", () => {
  const source = readFileSync(
    join(process.cwd(), "components/editor/viewportControls.tsx"),
    "utf8"
  );
  const rowStackMatch = source.match(/<Stack[\s\S]*?direction="row"[\s\S]*?<\/Stack>/);

  assert.ok(rowStackMatch, "expected viewport controls to render a row Stack");
  assert.match(
    rowStackMatch[0],
    /<PathTraceSampleHud[\s\S]*?<ViewControl/,
    "expected PathTraceSampleHud to appear in the same row before ViewControl"
  );
});
