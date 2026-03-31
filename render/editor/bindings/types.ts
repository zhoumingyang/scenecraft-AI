import * as THREE from "three";

import type { EntityKind } from "../core/types";
import type { EntityModel } from "../models";
import type { ModelLoaderFactory } from "../runtime/modelLoaderFactory";

export type RenderBinding = {
  kind: EntityKind;
  model: EntityModel;
  object: THREE.Object3D;
  pickTargets?: THREE.Object3D[];
  dispose: () => void;
  lastTransformSignature: string;
  refresh?: () => void;
};

export type BindingContext = {
  scene: THREE.Scene;
  modelLoaderFactory: ModelLoaderFactory;
  textureLoader: THREE.TextureLoader;
};
