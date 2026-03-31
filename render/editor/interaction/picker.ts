import * as THREE from "three";

import { toThreeVector2 } from "../utils/math";

type PickArgs = {
  camera: THREE.Camera;
  raycaster: THREE.Raycaster;
  domElement: HTMLCanvasElement;
  pickTargets: THREE.Object3D[];
  clientX: number;
  clientY: number;
};

export function pickEntityId({
  camera,
  raycaster,
  domElement,
  pickTargets,
  clientX,
  clientY
}: PickArgs): string | null {
  const rect = domElement.getBoundingClientRect();
  const pointer = toThreeVector2([
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1
  ]);

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(pickTargets, true);
  if (intersects.length === 0) return null;

  let current: THREE.Object3D | null = intersects[0].object;
  while (current) {
    const entityId = current.userData.editorEntityId;
    if (typeof entityId === "string") {
      return entityId;
    }
    current = current.parent;
  }

  return null;
}
