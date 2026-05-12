import * as THREE from "three";

export type ObjectTransformState = {
  px: number;
  py: number;
  pz: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  sx: number;
  sy: number;
  sz: number;
};

const TRANSFORM_EPSILON = 1e-6;

export function captureObjectTransformState(object: THREE.Object3D): ObjectTransformState {
  const p = object.position;
  const q = object.quaternion;
  const s = object.scale;
  return {
    px: p.x,
    py: p.y,
    pz: p.z,
    qx: q.x,
    qy: q.y,
    qz: q.z,
    qw: q.w,
    sx: s.x,
    sy: s.y,
    sz: s.z
  };
}

export function updateObjectTransformState(state: ObjectTransformState, object: THREE.Object3D) {
  const p = object.position;
  const q = object.quaternion;
  const s = object.scale;
  state.px = p.x;
  state.py = p.y;
  state.pz = p.z;
  state.qx = q.x;
  state.qy = q.y;
  state.qz = q.z;
  state.qw = q.w;
  state.sx = s.x;
  state.sy = s.y;
  state.sz = s.z;
}

function differs(left: number, right: number) {
  return Math.abs(left - right) > TRANSFORM_EPSILON;
}

export function hasObjectTransformChanged(object: THREE.Object3D, state: ObjectTransformState) {
  const p = object.position;
  const q = object.quaternion;
  const s = object.scale;
  return (
    differs(p.x, state.px) ||
    differs(p.y, state.py) ||
    differs(p.z, state.pz) ||
    differs(q.x, state.qx) ||
    differs(q.y, state.qy) ||
    differs(q.z, state.qz) ||
    differs(q.w, state.qw) ||
    differs(s.x, state.sx) ||
    differs(s.y, state.sy) ||
    differs(s.z, state.sz)
  );
}

export function setEntityId(object: THREE.Object3D, id: string) {
  object.userData.editorEntityId = id;
  object.traverse((child) => {
    child.userData.editorEntityId = id;
  });
}

export function removeObjectFromParent(object: THREE.Object3D) {
  object.parent?.remove(object);
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
