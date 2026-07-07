import { strict as assert } from "node:assert";
import test from "node:test";
import * as THREE from "three";

import type { RenderBinding } from "../../../../render/editor/bindings/types";
import type { EditorAppEvent } from "../../../../render/editor/core/events";
import { createEmptyEditorProjectJSON } from "../../../../render/editor/factories/projectFactory";
import { EditorProjectModel } from "../../../../render/editor/models";
import { EditorSelectionSessionController } from "../../../../render/editor/session/selection";

function createSelectionHarness() {
  const project = EditorProjectModel.fromJSON(createEmptyEditorProjectJSON("project-selection"));
  const meshOne = project.addMesh({ id: "mesh-1", type: 1, geometryName: "Box" });
  const meshTwo = project.addMesh({ id: "mesh-2", type: 1, geometryName: "Sphere" });
  const objectOne = new THREE.Object3D();
  const objectTwo = new THREE.Object3D();
  const bindings = new Map<string, Partial<RenderBinding>>([
    ["mesh-1", { kind: "mesh", model: meshOne, object: objectOne }],
    ["mesh-2", { kind: "mesh", model: meshTwo, object: objectTwo }]
  ]);
  const transformTargets: Array<THREE.Object3D | null> = [];
  const outlineSelections: THREE.Object3D[][] = [];
  const events: EditorAppEvent[] = [];
  let selectedEntityIds: string[] = [];

  const controller = new EditorSelectionSessionController({
    runtime: {
      attachTransformTarget: (object: THREE.Object3D | null) => {
        transformTargets.push(object);
      },
      setOutlineSelection: (objects: THREE.Object3D[]) => {
        outlineSelections.push(objects);
      }
    } as never,
    registry: {
      get: (entityId: string) => bindings.get(entityId) ?? null,
      getObject: (entityId: string) => bindings.get(entityId)?.object ?? null,
      getPickTargets: () => []
    } as never,
    emit: (event) => events.push(event),
    getProjectModel: () => project,
    getSelectedEntityIds: () => selectedEntityIds,
    setSelectedEntityIds: (entityIds: string[]) => {
      selectedEntityIds = entityIds;
    },
    studioScene: {
      isActive: () => false,
      isStudioSceneEntityInteractive: () => true,
      isTransientStudioEntity: () => false
    } as never,
    canUseStudioSceneEntityAction: () => true
  });

  return {
    controller,
    events,
    objectOne,
    objectTwo,
    outlineSelections,
    getSelectedEntityIds: () => selectedEntityIds,
    transformTargets
  };
}

test("toggle selection adds and removes entity ids", () => {
  const harness = createSelectionHarness();

  harness.controller.setSelectedEntity("mesh-1", "ui", "toggle");
  harness.controller.setSelectedEntity("mesh-2", "ui", "toggle");
  assert.deepEqual(harness.getSelectedEntityIds(), ["mesh-1", "mesh-2"]);

  harness.controller.setSelectedEntity("mesh-1", "ui", "toggle");
  assert.deepEqual(harness.getSelectedEntityIds(), ["mesh-2"]);
});

test("multi-selection emits null single selection and full selected entity ids", () => {
  const harness = createSelectionHarness();

  harness.controller.setSelectedEntity("mesh-1", "ui", "toggle");
  harness.controller.setSelectedEntity("mesh-2", "ui", "toggle");

  assert.deepEqual(harness.events.at(-1), {
    type: "selectionChanged",
    selectedEntityId: null,
    selectedEntityIds: ["mesh-1", "mesh-2"],
    source: "ui"
  });
});

test("multi-selection detaches transform target and outlines all selected objects", () => {
  const harness = createSelectionHarness();

  harness.controller.setSelectedEntity("mesh-1", "ui", "toggle");
  harness.controller.setSelectedEntity("mesh-2", "ui", "toggle");

  assert.equal(harness.transformTargets.at(-1), null);
  assert.deepEqual(harness.outlineSelections.at(-1), [harness.objectOne, harness.objectTwo]);
});

test("single selection attaches transform target and outlines one object", () => {
  const harness = createSelectionHarness();

  harness.controller.setSelectedEntity("mesh-1", "ui");

  assert.deepEqual(harness.getSelectedEntityIds(), ["mesh-1"]);
  assert.equal(harness.transformTargets.at(-1), harness.objectOne);
  assert.deepEqual(harness.outlineSelections.at(-1), [harness.objectOne]);
});
