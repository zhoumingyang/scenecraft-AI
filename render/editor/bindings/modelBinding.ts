import * as THREE from "three";

import type { ModelEntityModel } from "../models";
import { disposeObject3D, setEntityId, buildTransformSignature } from "../utils/object3d";
import type { BindingContext, RenderBinding } from "./types";

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
  void modelLoaderFactory
    .load(model.source, model.format)
    .then((object) => {
      if (disposed) {
        disposeObject3D(object);
        return;
      }
      assetRoot.clear();
      assetRoot.add(object);
      setEntityId(group, model.id);
    })
    .catch(() => {
      // Keep empty group when model loading fails.
    });

  return {
    kind: "model",
    model,
    object: group,
    applyState,
    lastTransformSignature: buildTransformSignature(group),
    dispose: () => {
      disposed = true;
      scene.remove(group);
      disposeObject3D(group);
      group.clear();
    }
  };
}
