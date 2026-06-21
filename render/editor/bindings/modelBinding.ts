import * as THREE from "three";

import { getExternalAssetIncludedFiles } from "@/lib/externalAssets/source";
import type { ModelEntityModel } from "../models";
import { normalizeObject3DMaterials } from "../runtime/colorManagement";
import {
  captureObjectTransformState,
  disposeObject3D,
  removeObjectFromParent,
  setEntityId
} from "../utils/object3d";
import type { BindingContext, RenderBinding } from "./types";

const STEP_SECONDS = 1 / 30;

function enableShadowForAsset(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
}

function poseAllSkeletons(root: THREE.Object3D) {
  root.traverse((object) => {
    const skinnedMesh = object as THREE.SkinnedMesh;
    skinnedMesh.skeleton?.pose();
  });
}

function hasSkeleton(root: THREE.Object3D) {
  let result = false;
  root.traverse((object) => {
    if (result) return;
    const skinnedMesh = object as THREE.SkinnedMesh;
    result = Boolean(skinnedMesh.skeleton?.bones.length);
  });
  return result;
}

function disposeLoadedAsset(
  object: THREE.Object3D,
  customDispose: ((object: THREE.Object3D) => void) | null | undefined
) {
  if (customDispose) {
    customDispose(object);
    return;
  }

  disposeObject3D(object);
}

export function createModelBinding(context: BindingContext, model: ModelEntityModel): RenderBinding {
  const { scene, modelLoaderFactory } = context;
  const group = new THREE.Group();
  const assetRoot = new THREE.Group();
  group.name = `model:${model.id}`;
  model.applyTransformToObject(group);
  assetRoot.name = `model-asset:${model.id}`;
  assetRoot.scale.setScalar(model.getAssetScaleInMeters());
  group.add(assetRoot);
  setEntityId(group, model.id);
  scene.add(group);

  const applyState = () => {
    group.visible = model.visible;
  };
  applyState();

  let disposed = false;
  let mixer: THREE.AnimationMixer | null = null;
  let currentAssetRoot: THREE.Object3D | null = null;
  let currentAssetUpdate: ((deltaSeconds: number) => void) | null = null;
  let currentAssetDispose: ((object: THREE.Object3D) => void) | null = null;
  let clipsById = new Map<string, THREE.AnimationClip>();
  let actionsById = new Map<string, THREE.AnimationAction>();
  let currentActionId: string | null = null;
  let skeletonHelper: THREE.SkeletonHelper | null = null;

  const stopAction = (action: THREE.AnimationAction) => {
    action.stop();
    action.reset();
    action.paused = false;
    action.enabled = true;
  };

  const stopAllActions = (exceptAnimationId: string | null = null) => {
    actionsById.forEach((action, animationId) => {
      if (exceptAnimationId && animationId === exceptAnimationId) return;
      action.stop();
      action.reset();
      action.paused = false;
      action.enabled = true;
    });
  };

  const disposeSkeletonHelper = () => {
    if (!skeletonHelper) return;
    removeObjectFromParent(skeletonHelper);
    skeletonHelper.geometry.dispose();
    const material = skeletonHelper.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else {
      material.dispose();
    }
    skeletonHelper = null;
  };

  const setSkeletonVisible = (visible: boolean) => {
    if (!currentAssetRoot || !model.hasSkeleton) {
      model.skeletonVisible = false;
      disposeSkeletonHelper();
      return false;
    }

    model.skeletonVisible = visible;
    if (!visible) {
      disposeSkeletonHelper();
      context.invalidateScene?.();
      return false;
    }

    if (!skeletonHelper) {
      skeletonHelper = new THREE.SkeletonHelper(currentAssetRoot);
      skeletonHelper.name = `skeleton-helper:${model.id}`;
      skeletonHelper.userData.editorRuntimeHelper = true;
      scene.add(skeletonHelper);
    }
    skeletonHelper.visible = true;
    context.invalidateScene?.();
    return true;
  };

  const applyAnimationState = () => {
    const activeAnimationId = model.activeAnimationId;
    const activeAction = activeAnimationId ? actionsById.get(activeAnimationId) ?? null : null;

    if (!mixer || !currentAssetRoot || !activeAction) {
      if (model.animationPlaybackState === "stopped" && currentAssetRoot) {
        poseAllSkeletons(currentAssetRoot);
      }
      return;
    }

    mixer.timeScale = model.animationTimeScale;
    stopAllActions(activeAnimationId);

    activeAction.enabled = true;
    activeAction.setLoop(THREE.LoopRepeat, Infinity);
    activeAction.clampWhenFinished = false;

    if (model.animationPlaybackState === "stopped") {
      stopAction(activeAction);
      currentActionId = null;
      poseAllSkeletons(currentAssetRoot);
      return;
    }

    if (currentActionId !== activeAnimationId) {
      activeAction.reset();
      currentActionId = activeAnimationId;
    }
    activeAction.play();
    activeAction.paused = model.animationPlaybackState === "paused";
  };

  const stepAnimation = () => {
    const activeAnimationId = model.activeAnimationId;
    const activeAction = activeAnimationId ? actionsById.get(activeAnimationId) ?? null : null;
    if (!mixer || !activeAction) return false;

    stopAllActions(activeAnimationId);
    activeAction.enabled = true;
    activeAction.setLoop(THREE.LoopRepeat, Infinity);
    if (currentActionId !== activeAnimationId) {
      activeAction.reset();
      currentActionId = activeAnimationId;
    }
    activeAction.play();
    activeAction.paused = false;
    mixer.timeScale = model.animationTimeScale;
    mixer.update(STEP_SECONDS);
    activeAction.paused = true;
    return true;
  };

  const ready = modelLoaderFactory
    .load(model.source, model.format, {
      includedFiles: getExternalAssetIncludedFiles(model.externalSource)
    })
    .then((asset) => {
      if (disposed) {
        disposeLoadedAsset(asset.object, asset.dispose);
        return;
      }
      currentAssetRoot = asset.object;
      currentAssetUpdate = asset.update ?? null;
      currentAssetDispose = asset.dispose ?? null;
      enableShadowForAsset(asset.object);
      normalizeObject3DMaterials(asset.object);
      model.hasSkeleton = hasSkeleton(asset.object);
      if (!model.hasSkeleton) {
        model.skeletonVisible = false;
      }
      mixer = new THREE.AnimationMixer(asset.object);
      clipsById = new Map(asset.animations.map((clip, index) => [clip.id, asset.clips[index]]));
      actionsById = new Map(
        asset.animations.map((clip, index) => [clip.id, mixer!.clipAction(asset.clips[index])])
      );
      model.setAnimations(asset.animations);
      assetRoot.clear();
      assetRoot.add(asset.object);
      setEntityId(group, model.id);
      applyAnimationState();
      setSkeletonVisible(model.skeletonVisible);
      context.invalidateScene?.();
      context.onModelRuntimeStateChanged?.(model.id);
    });

  return {
    kind: "model",
    model,
    object: group,
    ready,
    applyState,
    modelAnimation: {
      applyState: applyAnimationState,
      step: stepAnimation,
      hasClip: (animationId: string | null) => (animationId ? clipsById.has(animationId) : false),
      hasSkeleton: () => model.hasSkeleton,
      setSkeletonVisible
    },
    lastTransformState: captureObjectTransformState(group),
    refresh: (deltaSeconds) => {
      let sceneChanged = false;
      if (mixer && model.animationPlaybackState === "playing") {
        mixer.timeScale = model.animationTimeScale;
        mixer.update(deltaSeconds);
        sceneChanged = true;
      }
      if (currentAssetUpdate) {
        currentAssetUpdate(deltaSeconds);
        sceneChanged = true;
      }
      if (sceneChanged) {
        context.invalidateScene?.();
      }
      return sceneChanged;
    },
    dispose: () => {
      disposed = true;
      stopAllActions();
      mixer?.stopAllAction();
      mixer = null;
      currentActionId = null;
      disposeSkeletonHelper();
      clipsById.clear();
      actionsById.clear();
      removeObjectFromParent(group);
      if (currentAssetRoot) {
        disposeLoadedAsset(currentAssetRoot, currentAssetDispose);
        currentAssetRoot = null;
      }
      currentAssetUpdate = null;
      currentAssetDispose = null;
      group.clear();
      disposeObject3D(group);
    }
  };
}
