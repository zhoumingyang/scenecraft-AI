import * as THREE from "three";

export function buildTransformSignature(object: THREE.Object3D): string {
  const p = object.position;
  const q = object.quaternion;
  const s = object.scale;
  return `${p.x.toFixed(6)}|${p.y.toFixed(6)}|${p.z.toFixed(6)}|${q.x.toFixed(6)}|${q.y.toFixed(6)}|${q.z.toFixed(6)}|${q.w.toFixed(6)}|${s.x.toFixed(6)}|${s.y.toFixed(6)}|${s.z.toFixed(6)}`;
}

export function setEntityId(object: THREE.Object3D, id: string) {
  object.userData.editorEntityId = id;
  object.traverse((child) => {
    child.userData.editorEntityId = id;
  });
}

export function disposeObject3D(root: THREE.Object3D) {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}
