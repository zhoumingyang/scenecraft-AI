import * as THREE from "three";

import { toThreeVector2 } from "../utils/math";

type PickArgs = {
  camera: THREE.Camera;
  raycaster: THREE.Raycaster;
  domElement: HTMLCanvasElement;
  pickTargets: THREE.Object3D[];
  clientX: number;
  clientY: number;
  isEntityPickable?: (entityId: string) => boolean;
};

function isObjectEffectivelyVisible(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

export function pickEntityId({
  camera,
  raycaster,
  domElement,
  pickTargets,
  clientX,
  clientY,
  isEntityPickable
}: PickArgs): string | null {
  const rect = domElement.getBoundingClientRect();
  const pointer = toThreeVector2([
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  ]);

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(pickTargets, true);
  if (intersects.length === 0) return null;

  for (const hit of intersects) {
    if (!isObjectEffectivelyVisible(hit.object)) continue;

    let current: THREE.Object3D | null = hit.object;
    while (current) {
      const entityId = current.userData.editorEntityId;
      if (typeof entityId === "string") {
        if (isEntityPickable && !isEntityPickable(entityId)) break;
        return entityId;
      }
      current = current.parent;
    }
  }

  return null;
}
