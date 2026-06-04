import * as THREE from "three";

import type {
  StudioScenePresetDefinition,
  StudioSceneVariantDefinition
} from "../studioScenes";
import { StudioSceneCameraController } from "./studioScene/cameraController";
import { StudioSceneEnvironmentController } from "./studioScene/environmentController";
import { StudioSceneObjectRegistry } from "./studioScene/objectRegistry";
import { createStudioRuntimeObjects } from "./studioScene/objects";
import { createRoomBounds } from "./studioScene/room";
import {
  MIN_FRAME_RADIUS,
  type EditorRuntimeStudioSceneOptions,
  type StudioRoomBounds,
  type StudioSceneFrame,
  type StudioSceneRuntimeState
} from "./studioScene/types";

export type { StudioSceneFrame, StudioSceneRuntimeState } from "./studioScene/types";

export class EditorRuntimeStudioScene {
  private readonly scene: THREE.Scene;
  private readonly requestFrame: () => void;
  private readonly root = new THREE.Group();
  private readonly pmremGenerator: THREE.PMREMGenerator;
  private readonly objects: StudioSceneObjectRegistry;
  private readonly environment: StudioSceneEnvironmentController;
  private readonly cameraControls: StudioSceneCameraController;
  private active = false;
  private preset: StudioScenePresetDefinition | null = null;
  private variant: StudioSceneVariantDefinition | null = null;
  private frame: StudioSceneFrame | null = null;
  private roomBounds: StudioRoomBounds | null = null;

  constructor({
    scene,
    camera,
    renderer,
    orbitControls,
    requestFrame
  }: EditorRuntimeStudioSceneOptions) {
    this.scene = scene;
    this.requestFrame = requestFrame;
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.root.name = "studio-scene-runtime";
    this.root.userData.studioScene = true;
    this.root.visible = false;
    this.scene.add(this.root);
    this.objects = new StudioSceneObjectRegistry(this.root);
    this.environment = new StudioSceneEnvironmentController({
      scene,
      pmremGenerator: this.pmremGenerator,
      requestFrame,
      isActive: () => this.active,
      getActivePreset: () => this.preset
    });
    this.cameraControls = new StudioSceneCameraController({
      camera,
      orbitControls,
      requestFrame,
      isActive: () => this.active
    });
  }

  getState(): StudioSceneRuntimeState {
    return {
      active: this.active,
      presetId: this.preset?.id ?? null,
      variantId: this.variant?.id ?? null,
      hdriStatus: this.environment.getStatus(),
      hdriError: this.environment.getError()
    };
  }

  activate(
    preset: StudioScenePresetDefinition,
    variant: StudioSceneVariantDefinition,
    frame: StudioSceneFrame
  ) {
    this.environment.captureSnapshotIfNeeded();
    this.cameraControls.activate();
    this.active = true;
    this.root.visible = true;
    this.applyPreset(preset, variant, frame);
  }

  applyPreset(
    preset: StudioScenePresetDefinition,
    variant: StudioSceneVariantDefinition,
    frame: StudioSceneFrame
  ) {
    this.preset = preset;
    this.variant = variant;
    this.frame = {
      center: frame.center.clone(),
      radius: Math.max(frame.radius, MIN_FRAME_RADIUS),
      footprintRadius: Math.max(frame.footprintRadius, 0.1),
      height: Math.max(frame.height, MIN_FRAME_RADIUS),
      floorY: frame.floorY
    };
    this.root.userData.studioScenePresetId = preset.id;
    this.root.userData.studioSceneVariantId = variant.id;
    this.roomBounds = createRoomBounds(preset, this.frame);
    this.objects.replaceObjects(
      createStudioRuntimeObjects({ preset, variant, frame: this.frame, bounds: this.roomBounds })
    );
    this.environment.applyBackgroundColor(preset);
    this.cameraControls.applyPreset(preset, this.frame, this.roomBounds);
    this.requestFrame();
  }

  async loadHdri(url: string, assetName = url) {
    await this.environment.loadHdri(url, assetName);
  }

  clearHdri() {
    this.environment.clearHdri();
  }

  deactivate() {
    this.active = false;
    this.preset = null;
    this.variant = null;
    this.frame = null;
    this.roomBounds = null;
    this.root.visible = false;
    this.objects.disposeAll();
    this.environment.deactivate();
    this.cameraControls.deactivate();
    this.requestFrame();
  }

  dispose() {
    this.deactivate();
    this.scene.remove(this.root);
    this.pmremGenerator.dispose();
  }
}
