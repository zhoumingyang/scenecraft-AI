import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

const PROJECT_TYPES_SOURCE = readFileSync(
  new URL("../../../../render/editor/core/types/project.ts", import.meta.url),
  "utf8"
);
const CSG_TYPES_SOURCE = readFileSync(
  new URL("../../../../render/editor/core/types/csgMesh.ts", import.meta.url),
  "utf8"
);
const PROJECT_MODEL_SOURCE = readFileSync(
  new URL("../../../../render/editor/models/projectModel.ts", import.meta.url),
  "utf8"
);
const SERIALIZATION_SOURCE = readFileSync(
  new URL("../../../../render/editor/models/projectModelSerialization.ts", import.meta.url),
  "utf8"
);
const PROJECT_BINDINGS_SOURCE = readFileSync(
  new URL("../../../../render/editor/session/projectBindings.ts", import.meta.url),
  "utf8"
);
const CSG_SESSION_SOURCE = readFileSync(
  new URL("../../../../render/editor/session/meshCsgSession.ts", import.meta.url),
  "utf8"
);

test("project JSON stores CsgMesh relationships without baked mesh geometry", () => {
  assert.match(CSG_TYPES_SOURCE, /export type EditorCsgMeshJSON/);
  assert.match(CSG_TYPES_SOURCE, /operandIds\?: string\[\]/);
  assert.match(CSG_TYPES_SOURCE, /materialMode\?: EditorCsgMeshMaterialMode/);
  assert.doesNotMatch(CSG_TYPES_SOURCE, /vertices|indices|normals|uvs/);
  assert.match(PROJECT_TYPES_SOURCE, /csgMesh\?: EditorCsgMeshJSON\[\]/);
  assert.match(PROJECT_MODEL_SOURCE, /csgMeshes: Map<string, CsgMeshEntityModel>/);
  assert.match(SERIALIZATION_SOURCE, /csgMesh: Array\.from\(source\.csgMeshes\.values\(\)\)/);
});

test("CsgMesh owns the runtime result while operands keep model data only", () => {
  assert.match(PROJECT_BINDINGS_SOURCE, /projectModel\.isMeshConsumedByCsg\(mesh\.id\)/);
  assert.match(PROJECT_BINDINGS_SOURCE, /projectModel\.csgMeshes\.forEach/);
  assert.match(CSG_SESSION_SOURCE, /projectModel\.addCsgMesh/);
  assert.match(CSG_SESSION_SOURCE, /operandIds/);
  assert.match(CSG_SESSION_SOURCE, /this\.registry\.remove\(operandId\)/);
  assert.match(CSG_SESSION_SOURCE, /release\(entityId: string/);
  assert.match(CSG_SESSION_SOURCE, /this\.registry\.create\(operand\)/);
});

