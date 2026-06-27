import { strict as assert } from "node:assert";
import test from "node:test";

import { EditorAppViewState } from "../../../../render/editor/app/viewState.ts";

test("shadow helper toggles runtime shadows without changing ground mode", () => {
  const groundPatches = [];
  const shadowStates = [];
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
      setShadowEnabled: (enabled) => {
        shadowStates.push(enabled);
      },
      setTransformGizmoVisible: () => undefined,
      setLightHelpersVisible: () => undefined
    },
    session: {
      updateGroundConfig: (patch) => {
        groundPatches.push(patch);
      }
    },
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
  const denoiseStates = [];
  let viewUpdates = 0;

  const viewState = new EditorAppViewState({
    runtime: {
      getRenderMode: () => "pathTrace",
      setRenderMode: () => false,
      isFirstPersonCamera: () => false,
      getPathTraceDenoiseEnabled: () => false,
      setPathTraceDenoiseEnabled: (enabled) => {
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
    },
    session: {
      updateGroundConfig: () => undefined
    },
    getProjectModel: () => null,
    updateCamera: () => undefined,
    emitViewStateUpdated: () => {
      viewUpdates += 1;
    }
  });

  assert.equal(viewState.getPathTraceDenoiseEnabled(), false);

  viewState.setPathTraceDenoiseEnabled(true);

  assert.deepEqual(denoiseStates, [true]);
  assert.equal(viewUpdates, 1);
});

test("path trace denoise settings update runtime settings and emit a view update", () => {
  const settingsUpdates = [];
  let viewUpdates = 0;

  const viewState = new EditorAppViewState({
    runtime: {
      getRenderMode: () => "pathTrace",
      setRenderMode: () => false,
      isFirstPersonCamera: () => false,
      getPathTraceDenoiseEnabled: () => true,
      setPathTraceDenoiseEnabled: () => false,
      getPathTraceDenoiseSettings: () => ({ sigma: 3.2, threshold: 0.045 }),
      setPathTraceDenoiseSettings: (settings) => {
        settingsUpdates.push(settings);
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
    },
    session: {
      updateGroundConfig: () => undefined
    },
    getProjectModel: () => null,
    updateCamera: () => undefined,
    emitViewStateUpdated: () => {
      viewUpdates += 1;
    }
  });

  assert.deepEqual(viewState.getPathTraceDenoiseSettings(), {
    sigma: 3.2,
    threshold: 0.045
  });

  viewState.setPathTraceDenoiseSettings({ sigma: 2.4 });

  assert.deepEqual(settingsUpdates, [{ sigma: 2.4 }]);
  assert.equal(viewUpdates, 1);
});
