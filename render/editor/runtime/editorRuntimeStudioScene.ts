import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type {
  StudioSceneHdriStatus,
  StudioScenePresetDefinition,
  StudioSceneVariantId,
  StudioSceneVariantDefinition,
  StudioScenePresetId
} from "../studioScenes";
import { applyTextureColorSpace } from "./colorManagement";

export type StudioSceneFrame = {
  center: THREE.Vector3;
  radius: number;
  footprintRadius: number;
  height: number;
  floorY: number;
};

export type StudioSceneRuntimeState = {
  active: boolean;
  presetId: StudioScenePresetId | null;
  variantId: StudioSceneVariantId | null;
  hdriStatus: StudioSceneHdriStatus;
  hdriError: string | null;
};

type EditorRuntimeStudioSceneOptions = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  orbitControls: OrbitControls;
  requestFrame: () => void;
};

type SceneEnvironmentSnapshot = {
  background: THREE.Color | THREE.Texture | null;
  environment: THREE.Texture | null;
  backgroundIntensity: number;
  backgroundBlurriness: number;
  backgroundRotation: THREE.Euler;
  environmentIntensity: number;
  environmentRotation: THREE.Euler;
};

type RuntimeAssetRecord = {
  object: THREE.Object3D;
  dispose: () => void;
};

type StudioRoomBounds = {
  center: THREE.Vector3;
  radius: number;
  width: number;
  depth: number;
  wallHeight: number;
  floorY: number;
  ceilingY: number;
  leftX: number;
  rightX: number;
  backZ: number;
  frontZ: number;
};

type OrbitControlsSnapshot = {
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  minAzimuthAngle: number;
  maxAzimuthAngle: number;
  enablePan: boolean;
};

const MIN_FRAME_RADIUS = 1.2;
const WALL_HEIGHT_MULTIPLIER = 2.4;
const ROOM_HALF_EXTENT_RATIO = 0.48;
const ROOM_INTERIOR_MARGIN_RATIO = 0.16;
const ROOM_CAMERA_MARGIN_RATIO = 0.32;
const ROOM_TARGET_MARGIN_RATIO = 0.22;

function createMaterial(
  color: string,
  options: Partial<THREE.MeshStandardMaterialParameters> = {}
) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.82,
    metalness: 0,
    ...options
  });
}

function createEmissiveMaterial(color: string, intensity = 1.4) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0
  });
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((entry) => {
    const mesh = entry as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else {
      material?.dispose();
    }
  });
}

function lookAtQuaternion(position: THREE.Vector3, target: THREE.Vector3) {
  const helper = new THREE.Object3D();
  helper.position.copy(position);
  helper.lookAt(target);
  return helper.quaternion.clone();
}

function createPlaneMesh({
  name,
  width,
  height,
  position,
  rotation,
  material
}: {
  name: string;
  width: number;
  height: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  material: THREE.Material;
}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.name = name;
  mesh.position.copy(position);
  mesh.rotation.copy(rotation);
  mesh.receiveShadow = true;
  return mesh;
}

function createBoxMesh({
  name,
  size,
  position,
  material
}: {
  name: string;
  size: THREE.Vector3;
  position: THREE.Vector3;
  material: THREE.Material;
}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.name = name;
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createCylinderMesh({
  name,
  radius,
  height,
  position,
  material
}: {
  name: string;
  radius: number;
  height: number;
  position: THREE.Vector3;
  material: THREE.Material;
}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 64), material);
  mesh.name = name;
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createAreaLightPanel({
  name,
  position,
  target,
  width,
  height,
  color
}: {
  name: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  width: number;
  height: number;
  color: string;
}) {
  const panel = createPlaneMesh({
    name,
    width,
    height,
    position,
    rotation: new THREE.Euler(),
    material: createEmissiveMaterial(color)
  });
  panel.quaternion.copy(lookAtQuaternion(position, target));
  return panel;
}

function toWorldPoint(frame: StudioSceneFrame, offset: [number, number, number]) {
  const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
  return new THREE.Vector3(
    frame.center.x + offset[0] * radius,
    frame.floorY + offset[1] * radius,
    frame.center.z + offset[2] * radius
  );
}

function createRoomBounds(preset: StudioScenePresetDefinition, frame: StudioSceneFrame): StudioRoomBounds {
  const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
  const width = radius * 7;
  const depth = radius * 6.5;
  const wallHeight = Math.max(frame.height * WALL_HEIGHT_MULTIPLIER, radius * 4);
  const floorY = frame.floorY - preset.targetLift * radius;
  const center = frame.center.clone();

  return {
    center,
    radius,
    width,
    depth,
    wallHeight,
    floorY,
    ceilingY: floorY + wallHeight,
    leftX: center.x - width * ROOM_HALF_EXTENT_RATIO,
    rightX: center.x + width * ROOM_HALF_EXTENT_RATIO,
    backZ: center.z - depth * ROOM_HALF_EXTENT_RATIO,
    frontZ: center.z + depth * ROOM_HALF_EXTENT_RATIO
  };
}

function clampPointToRoom(point: THREE.Vector3, bounds: StudioRoomBounds, margin: number) {
  point.x = THREE.MathUtils.clamp(point.x, bounds.leftX + margin, bounds.rightX - margin);
  point.y = THREE.MathUtils.clamp(point.y, bounds.floorY + margin, bounds.ceilingY - margin);
  point.z = THREE.MathUtils.clamp(point.z, bounds.backZ + margin, bounds.frontZ - margin);
  return point;
}

function getRoomInteriorMargin(bounds: StudioRoomBounds, ratio = ROOM_INTERIOR_MARGIN_RATIO) {
  return Math.max(bounds.radius * ratio, 0.15);
}

function toRoomPoint(
  frame: StudioSceneFrame,
  bounds: StudioRoomBounds,
  offset: [number, number, number],
  marginRatio = ROOM_INTERIOR_MARGIN_RATIO
) {
  return clampPointToRoom(toWorldPoint(frame, offset), bounds, getRoomInteriorMargin(bounds, marginRatio));
}

function createRectAreaLight(
  preset: StudioScenePresetDefinition,
  key: "keyLight" | "fillLight",
  frame: StudioSceneFrame,
  bounds: StudioRoomBounds
) {
  const config = preset[key];
  const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
  const position = toRoomPoint(frame, bounds, config.position);
  const target = toRoomPoint(frame, bounds, config.target, ROOM_TARGET_MARGIN_RATIO);
  const width = Math.min((config.width ?? 2.5) * radius, bounds.width * 0.48);
  const height = Math.min((config.height ?? 2) * radius, bounds.wallHeight * 0.55);
  const light = new THREE.RectAreaLight(
    new THREE.Color(config.color),
    config.intensity,
    width,
    height
  );
  light.name = `studio-${key}`;
  light.position.copy(position);
  light.quaternion.copy(lookAtQuaternion(position, target));
  return light;
}

function createRimSpotLight(
  preset: StudioScenePresetDefinition,
  frame: StudioSceneFrame,
  bounds: StudioRoomBounds
) {
  const config = preset.rimLight;
  const position = toRoomPoint(frame, bounds, config.position);
  const target = toRoomPoint(frame, bounds, config.target, ROOM_TARGET_MARGIN_RATIO);
  const light = new THREE.SpotLight(
    new THREE.Color(config.color),
    config.intensity,
    config.distance ? config.distance * Math.max(frame.radius, MIN_FRAME_RADIUS) : 0,
    config.angle ?? Math.PI / 4,
    config.penumbra ?? 0.35,
    2
  );
  light.name = "studio-rim-light";
  light.position.copy(position);
  light.target.position.copy(target);
  light.castShadow = true;
  return { light, target: light.target };
}

function selectLoader(url: string) {
  const normalized = url.split("?")[0]?.toLowerCase() ?? url.toLowerCase();
  return normalized.endsWith(".exr") ? new EXRLoader() : new HDRLoader();
}

export class EditorRuntimeStudioScene {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly orbitControls: OrbitControls;
  private readonly requestFrame: () => void;
  private readonly root = new THREE.Group();
  private readonly pmremGenerator: THREE.PMREMGenerator;
  private active = false;
  private preset: StudioScenePresetDefinition | null = null;
  private variant: StudioSceneVariantDefinition | null = null;
  private frame: StudioSceneFrame | null = null;
  private environmentSnapshot: SceneEnvironmentSnapshot | null = null;
  private runtimeAssets: RuntimeAssetRecord[] = [];
  private environmentTexture: THREE.Texture | null = null;
  private environmentMapTexture: THREE.Texture | null = null;
  private hdriStatus: StudioSceneHdriStatus = "idle";
  private hdriError: string | null = null;
  private hdriRequestId = 0;
  private roomBounds: StudioRoomBounds | null = null;
  private orbitControlsSnapshot: OrbitControlsSnapshot | null = null;
  private constrainingOrbit = false;

  constructor({
    scene,
    camera,
    renderer,
    orbitControls,
    requestFrame
  }: EditorRuntimeStudioSceneOptions) {
    this.scene = scene;
    this.camera = camera;
    this.orbitControls = orbitControls;
    this.requestFrame = requestFrame;
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.root.name = "studio-scene-runtime";
    this.root.userData.studioScene = true;
    this.root.visible = false;
    this.scene.add(this.root);
  }

  getState(): StudioSceneRuntimeState {
    return {
      active: this.active,
      presetId: this.preset?.id ?? null,
      variantId: this.variant?.id ?? null,
      hdriStatus: this.hdriStatus,
      hdriError: this.hdriError
    };
  }

  activate(
    preset: StudioScenePresetDefinition,
    variant: StudioSceneVariantDefinition,
    frame: StudioSceneFrame
  ) {
    if (!this.environmentSnapshot) {
      this.environmentSnapshot = this.captureEnvironmentSnapshot();
    }
    if (!this.orbitControlsSnapshot) {
      this.orbitControlsSnapshot = this.captureOrbitControlsSnapshot();
      this.orbitControls.addEventListener("change", this.constrainOrbitToRoom);
    }
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
    this.disposeRuntimeAssets();
    this.createStudioObjects(preset, variant, this.frame, this.roomBounds);
    this.applyBackgroundColor(preset);
    this.frameCamera(preset, this.frame, this.roomBounds);
    this.applyOrbitControlsBounds(this.roomBounds);
    this.constrainOrbitToRoom();
    this.requestFrame();
  }

  async loadHdri(url: string, assetName = url) {
    const requestId = ++this.hdriRequestId;
    this.hdriStatus = "loading";
    this.hdriError = null;
    this.requestFrame();

    try {
      const loader = selectLoader(assetName || url);
      const texture = await loader.loadAsync(url);
      if (requestId !== this.hdriRequestId || !this.active || !this.preset) {
        texture.dispose();
        return;
      }

      texture.mapping = THREE.EquirectangularReflectionMapping;
      applyTextureColorSpace(texture, "environmentHdr");
      const environmentMapTexture = this.pmremGenerator.fromEquirectangular(texture).texture;
      this.disposeEnvironmentTextures();
      this.environmentTexture = texture;
      this.environmentMapTexture = environmentMapTexture;
      this.scene.environment = environmentMapTexture;
      this.scene.environmentIntensity = this.preset.hdri.environmentIntensity;
      this.scene.environmentRotation.set(0, this.preset.hdri.environmentRotationY, 0);
      this.hdriStatus = "ready";
      this.hdriError = null;
      this.requestFrame();
    } catch (error) {
      if (requestId !== this.hdriRequestId) return;
      this.disposeEnvironmentTextures();
      this.hdriStatus = "error";
      this.hdriError = error instanceof Error ? error.message : "Failed to load studio HDRI.";
      this.requestFrame();
    }
  }

  clearHdri() {
    this.hdriRequestId += 1;
    this.disposeEnvironmentTextures();
    this.hdriStatus = "idle";
    this.hdriError = null;
    if (this.preset) {
      this.scene.environment = null;
      this.scene.environmentIntensity = 1;
      this.scene.environmentRotation.set(0, this.preset.hdri.environmentRotationY, 0);
    }
    this.requestFrame();
  }

  deactivate() {
    this.active = false;
    this.preset = null;
    this.variant = null;
    this.frame = null;
    this.roomBounds = null;
    this.root.visible = false;
    this.disposeRuntimeAssets();
    this.clearHdri();
    this.restoreEnvironmentSnapshot();
    this.restoreOrbitControlsSnapshot();
    this.requestFrame();
  }

  dispose() {
    this.deactivate();
    this.scene.remove(this.root);
    this.pmremGenerator.dispose();
  }

  private createStudioObjects(
    preset: StudioScenePresetDefinition,
    variant: StudioSceneVariantDefinition,
    frame: StudioSceneFrame,
    bounds: StudioRoomBounds
  ) {
    const radius = bounds.radius;
    const { width, depth, wallHeight, floorY, ceilingY, center, backZ, frontZ, leftX, rightX } =
      bounds;
    const plinthHeight = Math.max(radius * 0.32, 0.18);
    const plinthRadius = Math.max(frame.footprintRadius * 1.16, radius * 0.72, 0.72);

    const floorMaterial = createMaterial(preset.floorColor, { side: THREE.DoubleSide });
    const wallMaterial = createMaterial(preset.wallColor, { side: THREE.DoubleSide });
    const accentMaterial = createMaterial(preset.accentColor, {
      roughness: 0.72,
      metalness: preset.id === "darkTechStudio" ? 0.25 : 0
    });
    const plinthMaterial = createMaterial(preset.plinthColor, {
      roughness: preset.id === "darkTechStudio" ? 0.45 : 0.68,
      metalness: preset.id === "darkTechStudio" ? 0.15 : 0
    });

    this.addRuntimeObject(
      createPlaneMesh({
        name: "studio-floor",
        width,
        height: depth,
        position: new THREE.Vector3(center.x, floorY, center.z),
        rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
        material: floorMaterial
      })
    );
    this.addRuntimeObject(
      createPlaneMesh({
        name: "studio-back-wall",
        width,
        height: wallHeight,
        position: new THREE.Vector3(center.x, floorY + wallHeight / 2, backZ),
        rotation: new THREE.Euler(0, 0, 0),
        material: wallMaterial
      })
    );
    this.addRuntimeObject(
      createPlaneMesh({
        name: "studio-left-wall",
        width: depth,
        height: wallHeight,
        position: new THREE.Vector3(leftX, floorY + wallHeight / 2, center.z),
        rotation: new THREE.Euler(0, Math.PI / 2, 0),
        material: wallMaterial.clone()
      })
    );
    this.addRuntimeObject(
      createPlaneMesh({
        name: "studio-right-wall",
        width: depth,
        height: wallHeight,
        position: new THREE.Vector3(rightX, floorY + wallHeight / 2, center.z),
        rotation: new THREE.Euler(0, -Math.PI / 2, 0),
        material: wallMaterial.clone()
      })
    );
    this.addRuntimeObject(
      createPlaneMesh({
        name: "studio-front-wall",
        width,
        height: wallHeight,
        position: new THREE.Vector3(center.x, floorY + wallHeight / 2, frontZ),
        rotation: new THREE.Euler(0, Math.PI, 0),
        material: wallMaterial.clone()
      })
    );
    this.addRuntimeObject(
      createPlaneMesh({
        name: "studio-ceiling",
        width,
        height: depth,
        position: new THREE.Vector3(center.x, ceilingY, center.z),
        rotation: new THREE.Euler(Math.PI / 2, 0, 0),
        material: wallMaterial.clone()
      })
    );
    this.addRuntimeObject(
      createCylinderMesh({
        name: "studio-plinth",
        radius: plinthRadius,
        height: plinthHeight,
        position: new THREE.Vector3(center.x, floorY + plinthHeight / 2, center.z),
        material: plinthMaterial
      })
    );

    this.addVariantDetails(variant, frame, bounds, floorY, plinthRadius, accentMaterial, plinthMaterial);

    this.addLighting(preset, frame, bounds);
  }

  private addVariantDetails(
    variant: StudioSceneVariantDefinition,
    frame: StudioSceneFrame,
    bounds: StudioRoomBounds,
    floorY: number,
    plinthRadius: number,
    accentMaterial: THREE.Material,
    plinthMaterial: THREE.Material
  ) {
    if (variant.id === "tieredStage") {
      this.addTieredStageDetails(frame, floorY, plinthRadius, accentMaterial, plinthMaterial);
    } else if (variant.id === "wallNiche") {
      this.addWallNicheDetails(frame, bounds, floorY, plinthRadius, accentMaterial);
    } else if (variant.id === "windowTable") {
      this.addWindowTableDetails(frame, bounds, floorY, plinthRadius, accentMaterial, plinthMaterial);
    } else {
      this.addRoundPlinthDetails(frame, floorY, accentMaterial);
    }
  }

  private addRoundPlinthDetails(frame: StudioSceneFrame, floorY: number, material: THREE.Material) {
    const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
    this.addRuntimeObject(
      createBoxMesh({
        name: "studio-round-reflector",
        size: new THREE.Vector3(radius * 0.08, radius * 2.2, radius * 1.7),
        position: new THREE.Vector3(
          frame.center.x + radius * 2.35,
          floorY + radius * 1.1,
          frame.center.z + radius * 0.75
        ),
        material
      })
    );
    this.addRuntimeObject(
      createBoxMesh({
        name: "studio-round-low-shelf",
        size: new THREE.Vector3(radius * 1.55, radius * 0.16, radius * 0.34),
        position: new THREE.Vector3(
          frame.center.x - radius * 1.55,
          floorY + radius * 0.08,
          frame.center.z - radius * 1.2
        ),
        material
      })
    );
  }

  private addTieredStageDetails(
    frame: StudioSceneFrame,
    floorY: number,
    plinthRadius: number,
    accentMaterial: THREE.Material,
    plinthMaterial: THREE.Material
  ) {
    const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
    this.addRuntimeObject(
      createBoxMesh({
        name: "studio-tiered-back-step",
        size: new THREE.Vector3(plinthRadius * 2.9, radius * 0.28, radius * 0.72),
        position: new THREE.Vector3(
          frame.center.x,
          floorY + radius * 0.14,
          frame.center.z - plinthRadius * 1.35
        ),
        material: plinthMaterial.clone()
      })
    );
    this.addRuntimeObject(
      createBoxMesh({
        name: "studio-tiered-side-step-left",
        size: new THREE.Vector3(radius * 0.68, radius * 0.2, plinthRadius * 1.75),
        position: new THREE.Vector3(
          frame.center.x - plinthRadius * 1.45,
          floorY + radius * 0.1,
          frame.center.z + radius * 0.25
        ),
        material: accentMaterial.clone()
      })
    );
    this.addRuntimeObject(
      createBoxMesh({
        name: "studio-tiered-side-step-right",
        size: new THREE.Vector3(radius * 0.5, radius * 0.14, plinthRadius * 1.25),
        position: new THREE.Vector3(
          frame.center.x + plinthRadius * 1.55,
          floorY + radius * 0.07,
          frame.center.z + radius * 0.1
        ),
        material: accentMaterial.clone()
      })
    );
  }

  private addWallNicheDetails(
    frame: StudioSceneFrame,
    bounds: StudioRoomBounds,
    floorY: number,
    plinthRadius: number,
    material: THREE.Material
  ) {
    const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
    const nicheZ = bounds.backZ + radius * 0.04;
    const nicheY = floorY + Math.min(bounds.wallHeight * 0.5, radius * 2.1);
    const frameWidth = Math.max(plinthRadius * 2.6, radius * 2.4);
    const frameHeight = Math.max(radius * 2.4, frame.height * 1.35);
    const railThickness = radius * 0.12;

    this.addRuntimeObject(
      createBoxMesh({
        name: "studio-niche-left-frame",
        size: new THREE.Vector3(railThickness, frameHeight, radius * 0.12),
        position: new THREE.Vector3(frame.center.x - frameWidth / 2, nicheY, nicheZ),
        material
      })
    );
    this.addRuntimeObject(
      createBoxMesh({
        name: "studio-niche-right-frame",
        size: new THREE.Vector3(railThickness, frameHeight, radius * 0.12),
        position: new THREE.Vector3(frame.center.x + frameWidth / 2, nicheY, nicheZ),
        material: material.clone()
      })
    );
    this.addRuntimeObject(
      createBoxMesh({
        name: "studio-niche-top-frame",
        size: new THREE.Vector3(frameWidth + railThickness, railThickness, radius * 0.12),
        position: new THREE.Vector3(frame.center.x, nicheY + frameHeight / 2, nicheZ),
        material: material.clone()
      })
    );
    this.addRuntimeObject(
      createBoxMesh({
        name: "studio-niche-bottom-frame",
        size: new THREE.Vector3(frameWidth + railThickness, railThickness, radius * 0.12),
        position: new THREE.Vector3(frame.center.x, nicheY - frameHeight / 2, nicheZ),
        material: material.clone()
      })
    );
    this.addRuntimeObject(
      createBoxMesh({
        name: "studio-niche-side-panel",
        size: new THREE.Vector3(radius * 0.08, frameHeight * 0.86, radius * 0.1),
        position: new THREE.Vector3(frame.center.x - frameWidth * 0.68, nicheY, nicheZ + radius * 0.04),
        material: material.clone()
      })
    );
  }

  private addWindowTableDetails(
    frame: StudioSceneFrame,
    bounds: StudioRoomBounds,
    floorY: number,
    plinthRadius: number,
    accentMaterial: THREE.Material,
    plinthMaterial: THREE.Material
  ) {
    const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
    const windowX = bounds.rightX - radius * 0.04;
    const windowY = floorY + Math.min(bounds.wallHeight * 0.55, radius * 2.15);
    const windowZ = frame.center.z - radius * 1.2;
    const glowMaterial = createEmissiveMaterial("#dceeff", 1.65);

    this.addRuntimeObject(
      createPlaneMesh({
        name: "studio-window-glow",
        width: radius * 1.65,
        height: radius * 1.95,
        position: new THREE.Vector3(windowX, windowY, windowZ),
        rotation: new THREE.Euler(0, -Math.PI / 2, 0),
        material: glowMaterial
      })
    );
    this.addRuntimeObject(
      createBoxMesh({
        name: "studio-window-vertical-frame",
        size: new THREE.Vector3(radius * 0.08, radius * 2.1, radius * 0.08),
        position: new THREE.Vector3(windowX - radius * 0.02, windowY, windowZ),
        material: accentMaterial.clone()
      })
    );
    this.addRuntimeObject(
      createBoxMesh({
        name: "studio-window-horizontal-frame",
        size: new THREE.Vector3(radius * 0.08, radius * 0.08, radius * 1.9),
        position: new THREE.Vector3(windowX - radius * 0.02, windowY, windowZ),
        material: accentMaterial.clone()
      })
    );
    this.addRuntimeObject(
      createBoxMesh({
        name: "studio-window-table",
        size: new THREE.Vector3(plinthRadius * 2.7, radius * 0.16, radius * 0.82),
        position: new THREE.Vector3(frame.center.x, floorY + radius * 0.08, frame.center.z + plinthRadius * 1.25),
        material: plinthMaterial.clone()
      })
    );
    this.addRuntimeObject(
      createCylinderMesh({
        name: "studio-window-side-plinth",
        radius: radius * 0.32,
        height: radius * 0.5,
        position: new THREE.Vector3(
          frame.center.x - plinthRadius * 1.35,
          floorY + radius * 0.25,
          frame.center.z - radius * 0.75
        ),
        material: accentMaterial.clone()
      })
    );
  }

  private addLighting(
    preset: StudioScenePresetDefinition,
    frame: StudioSceneFrame,
    bounds: StudioRoomBounds
  ) {
    const keyLight = createRectAreaLight(preset, "keyLight", frame, bounds);
    const fillLight = createRectAreaLight(preset, "fillLight", frame, bounds);
    const rimLight = createRimSpotLight(preset, frame, bounds);
    const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);

    this.addRuntimeObject(keyLight);
    this.addRuntimeObject(fillLight);
    this.addRuntimeObject(rimLight.light);
    this.addRuntimeObject(rimLight.target);

    this.addRuntimeObject(
      createAreaLightPanel({
        name: "studio-key-softbox-panel",
        position: keyLight.position.clone(),
        target: frame.center,
        width: keyLight.width,
        height: keyLight.height,
        color: preset.keyLight.color
      })
    );
    this.addRuntimeObject(
      createAreaLightPanel({
        name: "studio-fill-softbox-panel",
        position: fillLight.position.clone(),
        target: frame.center,
        width: fillLight.width,
        height: fillLight.height,
        color: preset.fillLight.color
      })
    );

    const ambient = new THREE.HemisphereLight(
      new THREE.Color(preset.keyLight.color),
      new THREE.Color(preset.floorColor),
      preset.id === "darkTechStudio" ? 0.25 : 0.38
    );
    ambient.name = "studio-ambient-fill";
    this.addRuntimeObject(ambient);

    const bounce = createPlaneMesh({
      name: "studio-bounce-card",
      width: radius * 1.1,
      height: radius * 1.7,
      position: toRoomPoint(frame, bounds, [-2.2, 1.2, 1.2]),
      rotation: new THREE.Euler(0, -Math.PI / 5, 0),
      material: createMaterial("#f6f3ea")
    });
    this.addRuntimeObject(bounce);
  }

  private addRuntimeObject(object: THREE.Object3D) {
    object.userData.studioScene = true;
    this.root.add(object);
    this.runtimeAssets.push({
      object,
      dispose: () => disposeObject(object)
    });
  }

  private frameCamera(
    preset: StudioScenePresetDefinition,
    frame: StudioSceneFrame,
    bounds: StudioRoomBounds
  ) {
    const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
    const target = frame.center.clone();
    target.y = frame.floorY + Math.max(frame.height * 0.48, radius * 0.65);
    const distance = Math.max(radius * preset.cameraDistanceMultiplier, 2.8);
    const yaw = preset.cameraYaw;
    const pitch = preset.cameraPitch;
    const cameraPosition = new THREE.Vector3(
      target.x + Math.sin(yaw) * Math.cos(pitch) * distance,
      target.y + Math.sin(pitch) * distance + radius * 0.35,
      target.z + Math.cos(yaw) * Math.cos(pitch) * distance
    );
    clampPointToRoom(target, bounds, getRoomInteriorMargin(bounds, ROOM_TARGET_MARGIN_RATIO));
    clampPointToRoom(cameraPosition, bounds, getRoomInteriorMargin(bounds, ROOM_CAMERA_MARGIN_RATIO));

    this.camera.fov = preset.cameraFov;
    this.camera.position.copy(cameraPosition);
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
    this.orbitControls.target.copy(target);
    this.orbitControls.update();
  }

  private applyBackgroundColor(preset: StudioScenePresetDefinition) {
    this.scene.background = new THREE.Color(preset.backgroundColor);
    this.scene.backgroundIntensity = 1;
    this.scene.backgroundBlurriness = 0;
    this.scene.backgroundRotation.set(0, preset.hdri.environmentRotationY, 0);
    this.scene.environment = null;
    this.scene.environmentIntensity = 1;
    this.scene.environmentRotation.set(0, preset.hdri.environmentRotationY, 0);
  }

  private captureOrbitControlsSnapshot(): OrbitControlsSnapshot {
    return {
      minDistance: this.orbitControls.minDistance,
      maxDistance: this.orbitControls.maxDistance,
      minPolarAngle: this.orbitControls.minPolarAngle,
      maxPolarAngle: this.orbitControls.maxPolarAngle,
      minAzimuthAngle: this.orbitControls.minAzimuthAngle,
      maxAzimuthAngle: this.orbitControls.maxAzimuthAngle,
      enablePan: this.orbitControls.enablePan
    };
  }

  private applyOrbitControlsBounds(bounds: StudioRoomBounds) {
    this.orbitControls.minDistance = Math.max(bounds.radius * 0.36, 0.45);
    this.orbitControls.maxDistance = Math.max(
      bounds.radius * 2.15,
      Math.min(bounds.width, bounds.depth) * 0.58
    );
    this.orbitControls.minPolarAngle = 0.08;
    this.orbitControls.maxPolarAngle = Math.PI * 0.56;
    this.orbitControls.minAzimuthAngle = -Infinity;
    this.orbitControls.maxAzimuthAngle = Infinity;
    this.orbitControls.enablePan = false;
  }

  private restoreOrbitControlsSnapshot() {
    if (!this.orbitControlsSnapshot) return;
    this.orbitControls.removeEventListener("change", this.constrainOrbitToRoom);
    this.orbitControls.minDistance = this.orbitControlsSnapshot.minDistance;
    this.orbitControls.maxDistance = this.orbitControlsSnapshot.maxDistance;
    this.orbitControls.minPolarAngle = this.orbitControlsSnapshot.minPolarAngle;
    this.orbitControls.maxPolarAngle = this.orbitControlsSnapshot.maxPolarAngle;
    this.orbitControls.minAzimuthAngle = this.orbitControlsSnapshot.minAzimuthAngle;
    this.orbitControls.maxAzimuthAngle = this.orbitControlsSnapshot.maxAzimuthAngle;
    this.orbitControls.enablePan = this.orbitControlsSnapshot.enablePan;
    this.orbitControlsSnapshot = null;
  }

  private constrainOrbitToRoom = () => {
    if (!this.active || !this.roomBounds || this.constrainingOrbit) return;

    const bounds = this.roomBounds;
    const targetBefore = this.orbitControls.target.clone();
    const cameraBefore = this.camera.position.clone();
    const targetMargin = getRoomInteriorMargin(bounds, ROOM_TARGET_MARGIN_RATIO);
    const cameraMargin = getRoomInteriorMargin(bounds, ROOM_CAMERA_MARGIN_RATIO);
    const nextTarget = clampPointToRoom(this.orbitControls.target.clone(), bounds, targetMargin);
    const targetDelta = nextTarget.clone().sub(this.orbitControls.target);

    if (targetDelta.lengthSq() > 1e-10) {
      this.orbitControls.target.copy(nextTarget);
      this.camera.position.add(targetDelta);
    }

    clampPointToRoom(this.camera.position, bounds, cameraMargin);

    if (
      targetBefore.distanceToSquared(this.orbitControls.target) > 1e-10 ||
      cameraBefore.distanceToSquared(this.camera.position) > 1e-10
    ) {
      this.constrainingOrbit = true;
      this.orbitControls.update();
      this.constrainingOrbit = false;
      this.requestFrame();
    }
  };

  private captureEnvironmentSnapshot(): SceneEnvironmentSnapshot {
    return {
      background: this.scene.background as THREE.Color | THREE.Texture | null,
      environment: this.scene.environment,
      backgroundIntensity: this.scene.backgroundIntensity,
      backgroundBlurriness: this.scene.backgroundBlurriness,
      backgroundRotation: this.scene.backgroundRotation.clone(),
      environmentIntensity: this.scene.environmentIntensity,
      environmentRotation: this.scene.environmentRotation.clone()
    };
  }

  private restoreEnvironmentSnapshot() {
    if (!this.environmentSnapshot) return;
    this.scene.background = this.environmentSnapshot.background;
    this.scene.environment = this.environmentSnapshot.environment;
    this.scene.backgroundIntensity = this.environmentSnapshot.backgroundIntensity;
    this.scene.backgroundBlurriness = this.environmentSnapshot.backgroundBlurriness;
    this.scene.backgroundRotation.copy(this.environmentSnapshot.backgroundRotation);
    this.scene.environmentIntensity = this.environmentSnapshot.environmentIntensity;
    this.scene.environmentRotation.copy(this.environmentSnapshot.environmentRotation);
    this.environmentSnapshot = null;
  }

  private disposeRuntimeAssets() {
    this.runtimeAssets.forEach((asset) => {
      this.root.remove(asset.object);
      asset.dispose();
    });
    this.runtimeAssets = [];
  }

  private disposeEnvironmentTextures() {
    this.environmentTexture?.dispose();
    this.environmentMapTexture?.dispose();
    this.environmentTexture = null;
    this.environmentMapTexture = null;
  }
}
