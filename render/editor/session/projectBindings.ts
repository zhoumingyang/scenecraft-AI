import type * as THREE from "three";

import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorProjectModel } from "../models";

type ReadyBinding = {
  ready?: Promise<void>;
};

export function createProjectBindings(
  projectModel: EditorProjectModel,
  registry: BindingRegistry
) {
  const pendingBindingReady: Promise<void>[] = [];
  const registerBinding = (binding: ReadyBinding) => {
    if (binding.ready) {
      pendingBindingReady.push(binding.ready);
    }
  };

  projectModel.groups.forEach((group) => registerBinding(registry.create(group)));
  projectModel.models.forEach((model) => registerBinding(registry.create(model)));
  projectModel.meshes.forEach((mesh) => registerBinding(registry.create(mesh)));
  projectModel.lights.forEach((light) => registerBinding(registry.create(light)));

  return pendingBindingReady;
}

export function rebuildProjectGroupHierarchy({
  projectModel,
  registry,
  scene
}: {
  projectModel: EditorProjectModel;
  registry: BindingRegistry;
  scene: THREE.Scene;
}) {
  projectModel.groups.forEach((group) => {
    const parentGroupId = projectModel.getParentGroupId(group.id);
    registry.attach(group.id, parentGroupId, scene);
  });

  projectModel.models.forEach((model) => {
    const parentGroupId = projectModel.getParentGroupId(model.id);
    registry.attach(model.id, parentGroupId, scene);
  });

  projectModel.meshes.forEach((mesh) => {
    const parentGroupId = projectModel.getParentGroupId(mesh.id);
    registry.attach(mesh.id, parentGroupId, scene);
  });

  projectModel.lights.forEach((light) => {
    const parentGroupId = projectModel.getParentGroupId(light.id);
    registry.attach(light.id, parentGroupId, scene);
  });
}
