import * as THREE from "three";

import type { Vector2Tuple } from "../core/types";

export function toThreeVector2(value: Vector2Tuple): THREE.Vector2 {
  return new THREE.Vector2(value[0], value[1]);
}
