import * as THREE from "three";

import type { EntityModel } from "../models";
import {
  hasObjectTransformChanged,
  updateObjectTransformState
} from "../utils/object3d";
import { createBinding } from "./bindingFactory";
import type { BindingContext, RenderBinding } from "./types";

export class BindingRegistry {
  private readonly context: BindingContext;
  private readonly bindingsById = new Map<string, RenderBinding>();

  constructor(context: BindingContext) {
    this.context = context;
  }

  clear() {
    this.bindingsById.forEach((binding) => binding.dispose());
    this.bindingsById.clear();
  }

  create(model: EntityModel) {
    const binding = createBinding(this.context, model);
    this.bindingsById.set(model.id, binding);
    return binding;
  }

  remove(entityId: string) {
    const binding = this.bindingsById.get(entityId);
    if (!binding) return null;
    binding.dispose();
    this.bindingsById.delete(entityId);
    return binding;
  }

  get(entityId: string) {
    return this.bindingsById.get(entityId) ?? null;
  }

  getObject(entityId: string): THREE.Object3D | null {
    return this.bindingsById.get(entityId)?.object ?? null;
  }

  attach(entityId: string, parentId: string | null, scene: THREE.Scene) {
    const binding = this.bindingsById.get(entityId);
    if (!binding) return null;

    const nextParent = parentId ? this.bindingsById.get(parentId)?.object ?? null : scene;
    if (!nextParent || binding.object.parent === nextParent) return binding;

    nextParent.add(binding.object);
    binding.model.applyTransformToObject(binding.object);
    updateObjectTransformState(binding.lastTransformState, binding.object);
    return binding;
  }

  list() {
    return Array.from(this.bindingsById.values());
  }

  getPickTargets(): THREE.Object3D[] {
    return this.list()
      .filter((binding) => !binding.model.locked)
      .flatMap((binding) => binding.pickTargets ?? [binding.object]);
  }

  syncModelTransformToObject(entityId: string) {
    const binding = this.bindingsById.get(entityId);
    if (!binding) return null;
    binding.model.applyTransformToObject(binding.object);
    binding.applyState?.();
    updateObjectTransformState(binding.lastTransformState, binding.object);
    return binding;
  }

  syncObjectTransformToModel(entityId: string) {
    const binding = this.bindingsById.get(entityId);
    if (!binding) return null;

    if (!hasObjectTransformChanged(binding.object, binding.lastTransformState)) return null;

    binding.model.copyTransformFromObject(binding.object);
    updateObjectTransformState(binding.lastTransformState, binding.object);
    return binding;
  }

  syncAllObjectTransformsToModel(): RenderBinding[] {
    const changed: RenderBinding[] = [];
    this.bindingsById.forEach((binding) => {
      if (!hasObjectTransformChanged(binding.object, binding.lastTransformState)) return;
      binding.model.copyTransformFromObject(binding.object);
      updateObjectTransformState(binding.lastTransformState, binding.object);
      changed.push(binding);
    });
    return changed;
  }

  refresh(deltaSeconds = 0) {
    let sceneChanged = false;
    this.bindingsById.forEach((binding) => {
      sceneChanged = binding.refresh?.(deltaSeconds) === true || sceneChanged;
    });
    return sceneChanged;
  }
}
