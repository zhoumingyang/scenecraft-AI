import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const COMMAND_SOURCE = readFileSync(
  new URL("../../../../render/editor/core/types/command.ts", import.meta.url),
  "utf8"
);
const DISPATCHER_SOURCE = readFileSync(
  new URL("../../../../render/editor/session/commandDispatcher.ts", import.meta.url),
  "utf8"
);
const HISTORY_SOURCE = readFileSync(
  new URL("../../../../render/editor/session/historyCommands.ts", import.meta.url),
  "utf8"
);
const SESSION_SOURCE = readFileSync(
  new URL("../../../../render/editor/session/editorSession.ts", import.meta.url),
  "utf8"
);

test("mesh CSG is exposed as a history-captured editor command", () => {
  assert.match(COMMAND_SOURCE, /type MeshCsgOperation = EditorCsgMeshOperation/);
  assert.match(COMMAND_SOURCE, /type: "mesh\.csg"/);
  assert.match(DISPATCHER_SOURCE, /applyMeshCsg\(command\.operation, source\)/);
  assert.match(SESSION_SOURCE, /applyMeshCsg\(operation: MeshCsgOperation/);
  assert.match(HISTORY_SOURCE, /case "mesh\.csg":\s+return "Apply CSG"/);
  const skippedTypesBlock = HISTORY_SOURCE.match(/skippedHistoryCommandTypes[\s\S]*?\]\);/)?.[0] ?? "";
  assert.doesNotMatch(skippedTypesBlock, /"mesh\.csg"/);
});
