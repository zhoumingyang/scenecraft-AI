import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import {
  shouldUsePreviewLighting,
  type PreviewLightingEnvState,
  type PreviewLightingLightState
} from "./previewLightingRules";

const PREVIEW_HEMISPHERE_SKY_COLOR = "#d9e7ff";
const PREVIEW_HEMISPHERE_GROUND_COLOR = "#39465f";
const PREVIEW_HEMISPHERE_INTENSITY = 0.55;
const PREVIEW_DIRECTIONAL_COLOR = "#ffffff";
const PREVIEW_DIRECTIONAL_INTENSITY = 1.25;
const PREVIEW_DIRECTIONAL_DISTANCE = 8;

export class EditorPreviewLighting {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly orbitControls: OrbitControls;
  private readonly root = new THREE.Group();
  private readonly hemisphereLight = new THREE.HemisphereLight(
    PREVIEW_HEMISPHERE_SKY_COLOR,
    PREVIEW_HEMISPHERE_GROUND_COLOR,
    PREVIEW_HEMISPHERE_INTENSITY
  );
  private readonly directionalLight = new THREE.DirectionalLight(
    PREVIEW_DIRECTIONAL_COLOR,
    PREVIEW_DIRECTIONAL_INTENSITY
  );
  private readonly directionalTarget = new THREE.Object3D();
  private enabled = false;

  constructor({
    scene,
    camera,
    orbitControls
  }: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    orbitControls: OrbitControls;
  }) {
    this.scene = scene;
    this.camera = camera;
    this.orbitControls = orbitControls;
    this.root.name = "editor-preview-lighting";
    this.root.userData.editorRuntimeHelper = true;
    this.root.visible = false;
    this.directionalLight.name = "editor-preview-key-light";
    this.hemisphereLight.name = "editor-preview-fill-light";
    this.directionalTarget.name = "editor-preview-light-target";
    this.directionalLight.target = this.directionalTarget;
    this.root.add(this.hemisphereLight, this.directionalLight, this.directionalTarget);
    this.scene.add(this.root);
  }

  syncFromSceneState(input: {
    lights: PreviewLightingLightState[];
    environment: PreviewLightingEnvState;
  }) {
    return this.setEnabled(shouldUsePreviewLighting(input.lights, input.environment));
  }

  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return false;
    this.enabled = enabled;
    this.root.visible = enabled;
    this.syncFromCamera();
    return true;
  }

  syncFromCamera() {
    if (!this.enabled) return;

    const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const target =
      this.orbitControls.enabled
        ? this.orbitControls.target
        : this.camera.position.clone().add(cameraDirection.multiplyScalar(PREVIEW_DIRECTIONAL_DISTANCE));
    const lightPosition = this.camera.position
      .clone()
      .add(new THREE.Vector3(1.8, 2.4, 1.2).applyQuaternion(this.camera.quaternion).normalize().multiplyScalar(PREVIEW_DIRECTIONAL_DISTANCE));

    this.directionalLight.position.copy(lightPosition);
    this.directionalTarget.position.copy(target);
    this.root.updateMatrixWorld(true);
  }

  isEnabled() {
    return this.enabled;
  }

  dispose() {
    this.scene.remove(this.root);
    this.root.clear();
  }
}
