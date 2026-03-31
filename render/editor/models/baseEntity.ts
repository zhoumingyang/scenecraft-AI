import * as THREE from "three";

import type { QuatTuple, TransformLike, TransformPatch, Vec3Tuple } from "../core/types";
import {
  DEFAULT_POSITION,
  DEFAULT_QUATERNION,
  DEFAULT_SCALE,
  normalizeQuat,
  normalizeVec3
} from "../utils/normalize";

export class BaseEntityModel {
  readonly id: string;
  position: Vec3Tuple;
  quaternion: QuatTuple;
  scale: Vec3Tuple;

  constructor(id: string, transform?: TransformLike) {
    this.id = id;
    this.position = normalizeVec3(transform?.position, DEFAULT_POSITION);
    this.quaternion = normalizeQuat(transform?.quaternion, DEFAULT_QUATERNION);
    this.scale = normalizeVec3(transform?.scale, DEFAULT_SCALE);
  }

  patchTransform(patch: TransformPatch) {
    if (patch.position) {
      this.position = normalizeVec3(patch.position, this.position);
    }
    if (patch.quaternion) {
      this.quaternion = normalizeQuat(patch.quaternion, this.quaternion);
    }
    if (patch.scale) {
      this.scale = normalizeVec3(patch.scale, this.scale);
    }
  }

  copyTransformFromObject(object: THREE.Object3D) {
    this.position = [object.position.x, object.position.y, object.position.z];
    this.quaternion = [
      object.quaternion.x,
      object.quaternion.y,
      object.quaternion.z,
      object.quaternion.w
    ];
    this.scale = [object.scale.x, object.scale.y, object.scale.z];
  }

  applyTransformToObject(object: THREE.Object3D) {
    object.position.set(this.position[0], this.position[1], this.position[2]);
    object.quaternion.set(
      this.quaternion[0],
      this.quaternion[1],
      this.quaternion[2],
      this.quaternion[3]
    );
    object.scale.set(this.scale[0], this.scale[1], this.scale[2]);
  }
}
