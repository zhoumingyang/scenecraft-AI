import * as THREE from "three";

import type { GroupEntityModel } from "../models";
import { captureObjectTransformState, removeObjectFromParent, setEntityId } from "../utils/object3d";
import type { BindingContext, RenderBinding } from "./types";

export function createGroupBinding(context: BindingContext, model: GroupEntityModel): RenderBinding {
  const { scene } = context;
  const group = new THREE.Group();
  group.name = `group:${model.id}`;
  model.applyTransformToObject(group);
  setEntityId(group, model.id);
  scene.add(group);

  const applyState = () => {
    group.visible = model.visible;
  };
  applyState();

  return {
    kind: "group",
    model,
    object: group,
    applyState,
    pickTargets: [],
    lastTransformState: captureObjectTransformState(group),
    dispose: () => {
      removeObjectFromParent(group);
    }
  };
}
