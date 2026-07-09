import * as THREE from "three";

import type { EntityKind } from "../core/types";
import type { EntityModel } from "../models";
import type { ModelLoaderFactory } from "../runtime/modelLoaderFactory";
import type { ObjectTransformState } from "../utils/object3d";

export type RenderBinding = {
  kind: EntityKind;
  model: EntityModel;
  object: THREE.Object3D;
  ready?: Promise<void>;
  pickTargets?: THREE.Object3D[];
  applyState?: () => void;
  modelAnimation?: {
    applyState: () => void;
    step: () => boolean;
    hasClip: (animationId: string | null) => boolean;
    hasSkeleton: () => boolean;
    setSkeletonVisible: (visible: boolean) => boolean;
  };
  dispose: () => void;
  lastTransformState: ObjectTransformState;
  refresh?: (deltaSeconds: number) => boolean;
};

export type BindingContext = {
  scene: THREE.Scene;
  getProjectModel?: () => import("../models").EditorProjectModel | null;
  modelLoaderFactory: ModelLoaderFactory;
  textureLoader: THREE.TextureLoader;
  invalidateScene?: () => void;
  invalidateMaterials?: () => void;
  onModelRuntimeStateChanged?: (entityId: string) => void;
};
