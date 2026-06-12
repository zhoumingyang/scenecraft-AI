import * as THREE from "three";
import type { BindingRegistry } from "../../bindings/bindingRegistry";
import type { StudioLayoutBounds } from "../../studioSceneLayoutGenerator";
import { createStudioFrameFromObject } from "./target";
import type {
  ActiveStudioSceneSession,
  StudioTargetFrame,
  StudioTransientEntityRole
} from "./types";

const STUDIO_SHADOW_SCENE_EXTENT_RATIO = 6.8;
const STUDIO_SHADOW_MIN_HALF_EXTENT = 5;
const STUDIO_SHADOW_MIN_VERTICAL_EXTENT = 5;
const STUDIO_SHADOW_ROOM_MARGIN_RATIO = 0.18;

export function markTransientObject(
  registry: BindingRegistry,
  entityId: string,
  role: StudioTransientEntityRole
) {
  const binding = registry.get(entityId);
  if (!binding) return;
  binding.object.userData.studioScene = true;
  binding.object.userData.studioSceneRole = role;
  binding.pickTargets?.forEach((target) => {
    target.userData.studioScene = true;
    target.userData.studioSceneRole = role;
  });
}

export function configureStudioTransientMeshShadows(
  object: THREE.Object3D | null,
  role: StudioTransientEntityRole
) {
  if (!object) return;
  const receiveOnlyRoles = new Set<StudioTransientEntityRole>([
    "background",
    "cove",
    "floor",
    "backWall",
    "sideWall"
  ]);
  const noShadowRoles = new Set<StudioTransientEntityRole>([
    "reflector",
    "negativeFill",
    "stripPanel"
  ]);

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (noShadowRoles.has(role)) {
      child.castShadow = false;
      child.receiveShadow = false;
      return;
    }
    if (receiveOnlyRoles.has(role)) {
      child.castShadow = false;
      child.receiveShadow = true;
      return;
    }
    if (role === "plinth") {
      child.castShadow = true;
      child.receiveShadow = true;
      return;
    }
    if (role === "decoration") {
      child.castShadow = true;
      child.receiveShadow = true;
      return;
    }
  });
}

export function configureStudioTransientLightShadows(
  object: THREE.Object3D,
  lightRole: string,
  frame: StudioTargetFrame,
  bounds?: StudioLayoutBounds
) {
  object.traverse((child) => {
    if (child instanceof THREE.DirectionalLight) {
      child.castShadow = lightRole === "keyShadow";
      if (!child.castShadow) return;
      const roomMargin = bounds ? bounds.radius * STUDIO_SHADOW_ROOM_MARGIN_RATIO : 0;
      const halfWidth = Math.max(
        frame.footprintRadius * 3.6,
        frame.radius * STUDIO_SHADOW_SCENE_EXTENT_RATIO,
        bounds ? bounds.width * 0.5 + roomMargin : 0,
        bounds ? bounds.depth * 0.5 + roomMargin : 0,
        STUDIO_SHADOW_MIN_HALF_EXTENT
      );
      const verticalExtent = Math.max(
        frame.height * 3.2,
        frame.radius * STUDIO_SHADOW_SCENE_EXTENT_RATIO,
        bounds ? bounds.wallHeight + roomMargin : 0,
        STUDIO_SHADOW_MIN_VERTICAL_EXTENT
      );
      const far = Math.max(
        frame.radius * 14,
        frame.height * 6,
        bounds ? bounds.width + bounds.depth + bounds.wallHeight : 0,
        36
      );
      child.shadow.mapSize.set(4096, 4096);
      child.shadow.camera.left = -halfWidth;
      child.shadow.camera.right = halfWidth;
      child.shadow.camera.top = verticalExtent;
      child.shadow.camera.bottom = -verticalExtent;
      child.shadow.camera.near = 0.1;
      child.shadow.camera.far = far;
      child.shadow.bias = 0.00008;
      child.shadow.normalBias = 0.012;
      child.shadow.radius = 3;
      child.shadow.camera.updateProjectionMatrix();
      child.shadow.needsUpdate = true;
      return;
    }

    if (child instanceof THREE.SpotLight || child instanceof THREE.PointLight) {
      child.castShadow = false;
    }
  });
}

export function placeTransientEntityAtSpawn(
  registry: BindingRegistry,
  session: ActiveStudioSceneSession,
  entityId: string
) {
  const targetBinding = registry.get(session.targetEntityId);
  const binding = registry.get(entityId);
  if (!targetBinding || !binding) return;

  const frame = createStudioFrameFromObject(targetBinding.object);
  const offset = Math.max(frame.radius * 0.7, 0.7);
  binding.model.patchTransform({
    position: [
      frame.center.x,
      frame.floorY + Math.max(frame.radius * 0.35, 0.3),
      frame.center.z + offset
    ]
  });
  registry.syncModelTransformToObject(entityId);
}
