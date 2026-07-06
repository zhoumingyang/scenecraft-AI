import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("declares and serializes path trace settings in scene env config", () => {
  const environmentTypes = readFileSync(
    join(process.cwd(), "render/editor/core/types/environment.ts"),
    "utf8"
  );
  const serialization = readFileSync(
    join(process.cwd(), "render/editor/models/projectModelSerialization.ts"),
    "utf8"
  );

  assert.match(environmentTypes, /pathTrace\?: EditorPathTraceConfigJSON/);
  assert.match(environmentTypes, /pathTrace: ResolvedEditorPathTraceConfigJSON/);
  assert.match(environmentTypes, /interactiveRenderScale\?: number/);
  assert.match(environmentTypes, /interactiveSamples\?: number/);
  assert.match(environmentTypes, /renderScale\?: number/);
  assert.match(environmentTypes, /tiles\?: number/);
  assert.match(environmentTypes, /minSamples\?: number/);
  assert.match(environmentTypes, /fadeDuration\?: number/);
  assert.match(environmentTypes, /renderDelay\?: number/);
  assert.match(serialization, /pathTrace: normalizePathTraceSettings\(source\?\.pathTrace\)/);
  assert.match(serialization, /pathTrace: \{\s*bounces: source\.envConfig\.pathTrace\.bounces,/);
  assert.match(serialization, /interactiveRenderScale: source\.envConfig\.pathTrace\.interactiveRenderScale/);
  assert.match(serialization, /interactiveSamples: source\.envConfig\.pathTrace\.interactiveSamples/);
  assert.match(serialization, /renderScale: source\.envConfig\.pathTrace\.renderScale/);
  assert.match(serialization, /tiles: source\.envConfig\.pathTrace\.tiles/);
  assert.match(serialization, /minSamples: source\.envConfig\.pathTrace\.minSamples/);
  assert.match(serialization, /fadeDuration: source\.envConfig\.pathTrace\.fadeDuration/);
  assert.match(serialization, /renderDelay: source\.envConfig\.pathTrace\.renderDelay/);
});
