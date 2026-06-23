import { strict as assert } from "node:assert";
import test from "node:test";

import { EditorAppViewState } from "../../../../render/editor/app/viewState";

test("shadow helper toggles runtime shadows without changing ground mode", () => {
  const groundPatches: unknown[] = [];
  const shadowStates: boolean[] = [];
  let viewUpdates = 0;

  const viewState = new EditorAppViewState({
    runtime: {
      getRenderMode: () => "webgl",
      setRenderMode: () => false,
      isFirstPersonCamera: () => false,
      getGridHelperVisible: () => true,
      getTransformGizmoVisible: () => true,
      getLightHelpersVisible: () => true,
      getShadowEnabled: () => false,
      getActiveTransformRotationDrag: () => null,
      setShadowEnabled: (enabled: boolean) => {
        shadowStates.push(enabled);
      },
      setTransformGizmoVisible: () => undefined,
      setLightHelpersVisible: () => undefined
    } as never,
    session: {
      updateGroundConfig: (patch: unknown) => {
        groundPatches.push(patch);
      }
    } as never,
    getProjectModel: () => null,
    updateCamera: () => undefined,
    emitViewStateUpdated: () => {
      viewUpdates += 1;
    }
  });

  viewState.setViewHelperVisibility("shadow", true);

  assert.deepEqual(shadowStates, [true]);
  assert.deepEqual(groundPatches, []);
  assert.equal(viewUpdates, 1);
});
