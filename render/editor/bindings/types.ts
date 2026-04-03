import * as THREE from "three";

import type { EntityKind } from "../core/types";
import type { EntityModel } from "../models";
import type { ModelLoaderFactory } from "../runtime/modelLoaderFactory";

export type RenderBinding = {
  kind: EntityKind;
  model: EntityModel;
  object: THREE.Object3D;
  pickTargets?: THREE.Object3D[];
  applyState?: () => void;
  modelAnimation?: {
    applyState: () => void;
    step: () => boolean;
    hasClip: (animationId: string | null) => boolean;
  };
  dispose: () => void;
  lastTransformSignature: string;
  refresh?: (deltaSeconds: number) => void;
};

export type BindingContext = {
  scene: THREE.Scene;
  modelLoaderFactory: ModelLoaderFactory;
  textureLoader: THREE.TextureLoader;
};
