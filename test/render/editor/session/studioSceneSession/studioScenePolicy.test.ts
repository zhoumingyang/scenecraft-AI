import { strict as assert } from "node:assert";
import test from "node:test";

import { canUseStudioSceneEntityAction } from "../../../../../render/editor/session/studioSceneSession/policy";
import type { ActiveStudioSceneSession } from "../../../../../render/editor/session/studioSceneSession/types";

function createPolicySession() {
  return {
    targetEntityId: "target-model",
    visibleOriginalEntityIds: new Set(["target-model", "target-child"]),
    transientEntityIds: new Set(),
    transientEntityRoles: new Map()
  } as unknown as ActiveStudioSceneSession;
}

test("studio scene target model can be transformed from the property panel", () => {
  const session = createPolicySession();

  assert.equal(canUseStudioSceneEntityAction(session, "target-model", "select"), true);
  assert.equal(canUseStudioSceneEntityAction(session, "target-model", "transform"), true);
});

test("studio scene non-target visible originals remain selection-only", () => {
  const session = createPolicySession();

  assert.equal(canUseStudioSceneEntityAction(session, "target-child", "select"), true);
  assert.equal(canUseStudioSceneEntityAction(session, "target-child", "transform"), false);
});
