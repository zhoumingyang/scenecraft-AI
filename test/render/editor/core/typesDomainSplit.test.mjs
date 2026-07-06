import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const domainFiles = [
  "shared",
  "mesh",
  "model",
  "light",
  "group",
  "command",
  "event"
];

test("core editor types are split into domain modules behind compatibility barrels", () => {
  const coreTypes = readFileSync(join(process.cwd(), "render/editor/core/types.ts"), "utf8");
  const commands = readFileSync(join(process.cwd(), "render/editor/core/commands.ts"), "utf8");
  const events = readFileSync(join(process.cwd(), "render/editor/core/events.ts"), "utf8");

  for (const domain of domainFiles) {
    assert.equal(
      existsSync(join(process.cwd(), "render/editor/core/types", `${domain}.ts`)),
      true,
      `missing ${domain} type module`
    );
    assert.match(coreTypes, new RegExp(`\\./types/${domain}`));
  }

  assert.match(commands, /from "\.\/types\/command"/);
  assert.match(events, /from "\.\/types\/event"/);
  assert.ok(coreTypes.split("\n").length < 80, "core/types.ts should stay a small barrel file");
});
