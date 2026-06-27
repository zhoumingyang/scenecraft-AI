import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import {
  withEditorHelperVisibility,
  withPathTraceCompatibleEnvironmentAsync,
  withPathTraceCompatibleEnvironment
} from "../../../../render/editor/runtime/pathTraceSceneState.ts";

test("keeps the ground visible when preparing a path traced scene", () => {
  const scene = new THREE.Scene();
  const groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial());
  const lightHelper = new THREE.Object3D();
  lightHelper.userData.editorLightHelper = true;
  lightHelper.visible = true;
  groundPlane.visible = true;
  scene.add(groundPlane, lightHelper);

  withEditorHelperVisibility(
    scene,
    {
      groundPlane,
      hideGroundPlane: false
    },
    () => {
      assert.equal(groundPlane.visible, true);
      assert.equal(lightHelper.visible, false);
    }
  );

  assert.equal(groundPlane.visible, true);
  assert.equal(lightHelper.visible, true);
});

test("hides runtime helper objects when preparing a path traced scene", () => {
  const scene = new THREE.Scene();
  const runtimeHelper = new THREE.Group();
  const runtimeHelperLight = new THREE.DirectionalLight();
  const userLight = new THREE.DirectionalLight();
  runtimeHelper.userData.editorRuntimeHelper = true;
  runtimeHelper.visible = true;
  runtimeHelperLight.visible = true;
  userLight.visible = true;
  runtimeHelper.add(runtimeHelperLight);
  scene.add(runtimeHelper, userLight);

  withEditorHelperVisibility(
    scene,
    {
      groundPlane: new THREE.Object3D(),
      hideGroundPlane: false
    },
    () => {
      assert.equal(runtimeHelper.visible, false);
      assert.equal(runtimeHelperLight.visible, false);
      assert.equal(userLight.visible, true);
    }
  );

  assert.equal(runtimeHelper.visible, true);
  assert.equal(runtimeHelperLight.visible, true);
  assert.equal(userLight.visible, true);
});

test("uses the source equirect texture for path traced image based lighting", () => {
  const scene = new THREE.Scene();
  const pmremTexture = new THREE.Texture();
  const sourceTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  scene.environment = pmremTexture;

  withPathTraceCompatibleEnvironment(scene, sourceTexture, () => {
    assert.equal(scene.environment, sourceTexture);
  });

  assert.equal(scene.environment, pmremTexture);
});

test("keeps the source environment active until async path trace work completes", async () => {
  const scene = new THREE.Scene();
  const pmremTexture = new THREE.Texture();
  const sourceTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  const observed = [];
  scene.environment = pmremTexture;

  await withPathTraceCompatibleEnvironmentAsync(scene, sourceTexture, async () => {
    observed.push(scene.environment);
    await Promise.resolve();
    observed.push(scene.environment);
  });

  assert.deepEqual(observed, [sourceTexture, sourceTexture]);
  assert.equal(scene.environment, pmremTexture);
});

test("does not enable image based lighting when the scene environment is disabled", () => {
  const scene = new THREE.Scene();
  const sourceTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  scene.environment = null;

  withPathTraceCompatibleEnvironment(scene, sourceTexture, () => {
    assert.equal(scene.environment, null);
  });

  assert.equal(scene.environment, null);
});
