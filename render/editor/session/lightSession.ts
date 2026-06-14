import type { BindingRegistry } from "../bindings/bindingRegistry";
import { updateLightBinding } from "../bindings/lightBinding";
import type { EditorAppEvent } from "../core/events";
import type { EditorLightJSON, SyncSource } from "../core/types";
import { createAdaptiveLightPresetDefinition } from "../lightPresets";
import type { LightPresetFrame, LightPresetId } from "../lightPresets";
import type { EditorProjectModel } from "../models";
import type { EditorRuntime } from "../runtime/editorRuntime";
import {
  createDefaultLightLabel,
  createGroupEntityId,
  createLightEntityId,
  createLightPayload
} from "./entityFactories";

type Emit = (event: EditorAppEvent) => void;

export class LightSessionController {
  private readonly runtime: EditorRuntime;
  private readonly registry: BindingRegistry;
  private readonly emit: Emit;
  private readonly getProjectModel: () => EditorProjectModel | null;
  private readonly ensureProject: () => Promise<void>;
  private readonly rebuildGroupHierarchy: () => void;
  private readonly setSelectedEntity: (entityId: string | null, source: SyncSource) => void;

  constructor(options: {
    runtime: EditorRuntime;
    registry: BindingRegistry;
    emit: Emit;
    getProjectModel: () => EditorProjectModel | null;
    ensureProject: () => Promise<void>;
    rebuildGroupHierarchy: () => void;
    setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
  }) {
    this.runtime = options.runtime;
    this.registry = options.registry;
    this.emit = options.emit;
    this.getProjectModel = options.getProjectModel;
    this.ensureProject = options.ensureProject;
    this.rebuildGroupHierarchy = options.rebuildGroupHierarchy;
    this.setSelectedEntity = options.setSelectedEntity;
  }

  updateLight(entityId: string, patch: Partial<EditorLightJSON>, source: SyncSource = "ui") {
    const binding = this.registry.get(entityId);
    if (!binding || binding.kind !== "light" || binding.model.locked) return;

    updateLightBinding(binding, patch);
    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: "light",
      source,
      affectsSceneTree: false
    });
  }

  createLight(lightType: EditorLightJSON["type"], source: SyncSource = "ui") {
    const projectModel = this.getProjectModel();
    if (!projectModel) return null;

    const light = projectModel.addLight({
      ...createLightPayload(lightType),
      label: createDefaultLightLabel(lightType, projectModel.lights.size)
    });
    this.registry.create(light);
    this.runtime.syncLightHelperVisibility();
    this.emit({
      type: "entityUpdated",
      entityId: light.id,
      entityKind: "light",
      source
    });
    this.setSelectedEntity(light.id, source);
    return light.id;
  }

  async createLightPreset(
    presetId: LightPresetId,
    source: SyncSource = "ui",
    options: { adaptiveFrame?: LightPresetFrame | null } = {}
  ) {
    await this.ensureProject();
    const projectModel = this.getProjectModel();
    if (!projectModel) return null;

    const preset = createAdaptiveLightPresetDefinition(presetId, options.adaptiveFrame ?? null);
    const group = projectModel.addGroup({
      id: createGroupEntityId(),
      label: preset.label,
      children: [],
      locked: false,
      visible: true,
      position: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      scale: [1, 1, 1]
    });

    this.registry.create(group);

    const childIds = preset.lights.map((presetLight) => {
      const light = projectModel.addLight({
        id: createLightEntityId(),
        label: presetLight.label,
        locked: false,
        ...presetLight.light
      });
      this.registry.create(light);
      this.emit({
        type: "entityUpdated",
        entityId: light.id,
        entityKind: "light",
        source
      });
      return light.id;
    });

    group.children = childIds;
    this.rebuildGroupHierarchy();
    this.runtime.syncLightHelperVisibility();
    this.emit({
      type: "entityUpdated",
      entityId: group.id,
      entityKind: "group",
      source
    });
    this.setSelectedEntity(group.id, source);
    return {
      groupId: group.id,
      childIds
    };
  }
}
