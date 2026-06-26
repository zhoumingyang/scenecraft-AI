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

test("path trace denoise toggles runtime denoise and emits a view update", () => {
  const denoiseStates: boolean[] = [];
  let viewUpdates = 0;

  const viewState = new EditorAppViewState({
    runtime: {
      getRenderMode: () => "pathTrace",
      setRenderMode: () => false,
      isFirstPersonCamera: () => false,
      getPathTraceDenoiseEnabled: () => true,
      setPathTraceDenoiseEnabled: (enabled: boolean) => {
        denoiseStates.push(enabled);
        return true;
      },
      getGridHelperVisible: () => true,
      getTransformGizmoVisible: () => true,
      getLightHelpersVisible: () => true,
      getShadowEnabled: () => false,
      getActiveTransformRotationDrag: () => null,
      setShadowEnabled: () => undefined,
      setTransformGizmoVisible: () => undefined,
      setLightHelpersVisible: () => undefined
    } as never,
    session: {
      updateGroundConfig: () => undefined
    } as never,
    getProjectModel: () => null,
    updateCamera: () => undefined,
    emitViewStateUpdated: () => {
      viewUpdates += 1;
    }
  });

  assert.equal(viewState.getPathTraceDenoiseEnabled(), true);

  viewState.setPathTraceDenoiseEnabled(false);

  assert.deepEqual(denoiseStates, [false]);
  assert.equal(viewUpdates, 1);
});
