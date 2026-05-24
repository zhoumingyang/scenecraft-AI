import * as THREE from "three";

import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorAppEvent } from "../core/events";
import type { SyncSource } from "../core/types";
import { ModelEntityModel } from "../models";

type Emit = (event: EditorAppEvent) => void;

export class ModelAnimationSessionController {
  private readonly registry: BindingRegistry;
  private readonly emit: Emit;

  constructor(registry: BindingRegistry, emit: Emit) {
    this.registry = registry;
    this.emit = emit;
  }

  selectAnimation(entityId: string, animationId: string, source: SyncSource = "ui") {
    const binding = this.registry.get(entityId);
    if (!binding || binding.kind !== "model" || binding.model.locked) return;
    const model = binding.model as ModelEntityModel;
    if (!binding.modelAnimation?.hasClip(animationId)) return;

    model.setActiveAnimation(animationId);
    model.animationPlaybackState = "playing";
    binding.modelAnimation.applyState();
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: "model",
      source,
      affectsSceneTree: false
    });
  }

  updateTimeScale(entityId: string, timeScale: number, source: SyncSource = "ui") {
    const binding = this.registry.get(entityId);
    if (!binding || binding.kind !== "model" || binding.model.locked) return;
    const model = binding.model as ModelEntityModel;

    model.animationTimeScale = THREE.MathUtils.clamp(timeScale, 0.1, 4);
    binding.modelAnimation?.applyState();
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: "model",
      source,
      affectsSceneTree: false
    });
  }

  control(
    entityId: string,
    action: "play" | "pause" | "stop" | "step",
    source: SyncSource = "ui"
  ) {
    const binding = this.registry.get(entityId);
    if (!binding || binding.kind !== "model" || binding.model.locked) return;
    const model = binding.model as ModelEntityModel;
    if (!model.animations.length) return;

    if (!model.activeAnimationId) {
      model.activeAnimationId = model.animations[0].id;
    }

    if (action === "play") {
      if (model.animationPlaybackState === "playing") return;
      model.animationPlaybackState = "playing";
      binding.modelAnimation?.applyState();
    } else if (action === "pause") {
      if (model.animationPlaybackState !== "playing") return;
      model.animationPlaybackState = "paused";
      binding.modelAnimation?.applyState();
    } else if (action === "stop") {
      if (model.animationPlaybackState === "stopped") return;
      model.animationPlaybackState = "stopped";
      binding.modelAnimation?.applyState();
    } else if (action === "step") {
      model.animationPlaybackState = "paused";
      const stepped = binding.modelAnimation?.step() ?? false;
      if (!stepped) return;
    }

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: "model",
      source,
      affectsSceneTree: false
    });
  }
}
