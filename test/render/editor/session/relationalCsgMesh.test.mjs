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
const CSG_BINDING_SOURCE = readFileSync(
  new URL("../../../../render/editor/bindings/csgMeshBinding.ts", import.meta.url),
  "utf8"
);
const EDITOR_SESSION_SOURCE = readFileSync(
  new URL("../../../../render/editor/session/editorSession.ts", import.meta.url),
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
  assert.match(PROJECT_BINDINGS_SOURCE, /projectModel\.isEntityConsumedByCsg\(csgMesh\.id\)/);
  assert.match(PROJECT_BINDINGS_SOURCE, /projectModel\.csgMeshes\.forEach/);
  assert.match(CSG_SESSION_SOURCE, /projectModel\.addCsgMesh/);
  assert.match(CSG_SESSION_SOURCE, /operandIds/);
  assert.match(CSG_SESSION_SOURCE, /copyCsgAnchorTransform\(operandRecords\[0\]\)/);
  assert.match(CSG_SESSION_SOURCE, /attachCsgMeshToAnchorParent\(projectModel, operandRecords\[0\]\.id, csgMesh\.id\)/);
  assert.doesNotMatch(CSG_SESSION_SOURCE, /position:\s*\[0,\s*0,\s*0\]/);
  assert.match(CSG_SESSION_SOURCE, /this\.registry\.remove\(operandId\)/);
  assert.match(CSG_SESSION_SOURCE, /release\(entityId: string/);
  assert.match(CSG_SESSION_SOURCE, /this\.registry\.create\(operand\)/);
});

test("CsgMesh operands can be recursively evaluated for parent CSG results", () => {
  assert.match(CSG_SESSION_SOURCE, /record\?\.kind === "mesh" \|\| record\?\.kind === "csgMesh"/);
  assert.match(CSG_SESSION_SOURCE, /projectModel\.isEntityConsumedByCsg\(entityId\)/);
  assert.match(CSG_BINDING_SOURCE, /type CsgOperandModel = MeshEntityModel \| CsgMeshEntityModel/);
  assert.match(CSG_BINDING_SOURCE, /createCsgResultBrush\(context, projectModel, operand, visited\)/);
  assert.match(CSG_BINDING_SOURCE, /CSG dependency cycle detected/);
});

test("deleting a CsgMesh removes its relationship and operand mesh data", () => {
  assert.match(CSG_SESSION_SOURCE, /deleteWithOperands\(entityId: string/);
  assert.match(CSG_SESSION_SOURCE, /deleteCsgEntityTree\(entityId, source\)/);
  assert.match(CSG_SESSION_SOURCE, /this\.deleteCsgEntityTree\(operandId, source, visited\)/);
  assert.match(CSG_SESSION_SOURCE, /projectModel\.removeEntity\(entityId\)/);
  assert.match(EDITOR_SESSION_SOURCE, /this\.meshCsgSession\.deleteWithOperands\(entityId, source\)/);
  assert.doesNotMatch(EDITOR_SESSION_SOURCE, /removeEntity\(entityId: string,[\s\S]*this\.releaseMeshCsg\(entityId, source\)/);
});
