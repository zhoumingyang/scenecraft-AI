import * as THREE from "three";
import type { BindingRegistry } from "../../bindings/bindingRegistry";
import { createStudioFrameFromObject } from "./target";
import type {
  ActiveStudioSceneSession,
  StudioTargetFrame,
  StudioTransientEntityRole
} from "./types";

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
    "floor",
    "plinth"
  ]);
  const noShadowRoles = new Set<StudioTransientEntityRole>([
    "background",
    "cove",
    "backWall",
    "sideWall",
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
    }
  });
}

export function configureStudioTransientLightShadows(
  object: THREE.Object3D,
  lightRole: string,
  frame: StudioTargetFrame
) {
  object.traverse((child) => {
    if (child instanceof THREE.DirectionalLight) {
      child.castShadow = lightRole === "keyShadow";
      if (!child.castShadow) return;
      const halfWidth = Math.max(frame.footprintRadius * 2.2, frame.radius * 1.9, 1.6);
      const top = Math.max(frame.height * 1.35, frame.radius * 2.2, 1.8);
      const bottom = -Math.max(frame.radius * 1.25, frame.footprintRadius * 1.4, 1.2);
      child.shadow.mapSize.set(2048, 2048);
      child.shadow.camera.left = -halfWidth;
      child.shadow.camera.right = halfWidth;
      child.shadow.camera.top = top;
      child.shadow.camera.bottom = bottom;
      child.shadow.camera.near = 0.5;
      child.shadow.camera.far = Math.max(frame.radius * 8, frame.height * 4, 24);
      child.shadow.bias = 0.00012;
      child.shadow.normalBias = 0.025;
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
