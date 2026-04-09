import * as THREE from "three";

import type { EntityModel } from "../models";
import { buildTransformSignature } from "../utils/object3d";
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
    binding.lastTransformSignature = buildTransformSignature(binding.object);
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
    binding.lastTransformSignature = buildTransformSignature(binding.object);
    return binding;
  }

  syncObjectTransformToModel(entityId: string) {
    const binding = this.bindingsById.get(entityId);
    if (!binding) return null;

    const nextSignature = buildTransformSignature(binding.object);
    if (nextSignature === binding.lastTransformSignature) return null;

    binding.model.copyTransformFromObject(binding.object);
    binding.lastTransformSignature = nextSignature;
    return binding;
  }

  syncAllObjectTransformsToModel(): RenderBinding[] {
    const changed: RenderBinding[] = [];
    this.bindingsById.forEach((binding) => {
      const nextSignature = buildTransformSignature(binding.object);
      if (nextSignature === binding.lastTransformSignature) return;
      binding.model.copyTransformFromObject(binding.object);
      binding.lastTransformSignature = nextSignature;
      changed.push(binding);
    });
    return changed;
  }

  refresh(deltaSeconds = 0) {
    this.bindingsById.forEach((binding) => {
      binding.refresh?.(deltaSeconds);
    });
  }
}
