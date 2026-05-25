import type { Ai3DMeshDraft, Ai3DPlan } from "../ai3d/plan";
import { buildAi3DMeshDrafts } from "../ai3d/plan";
import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorAppEvent } from "../core/events";
import type { SyncSource } from "../core/types";
import type { EditorProjectModel } from "../models";
import {
  createDefaultGroupLabel,
  createDefaultMeshLabel,
  createGroupEntityId,
  createMeshEntityId
} from "./entityFactories";

type Emit = (event: EditorAppEvent) => void;

export class Ai3DPlanSessionController {
  private readonly registry: BindingRegistry;
  private readonly emit: Emit;
  private readonly getProjectModel: () => EditorProjectModel | null;
  private readonly ensureProject: () => Promise<void>;
  private readonly rebuildGroupHierarchy: () => void;
  private readonly setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
  private readonly clearPreview: () => void;

  constructor(options: {
    registry: BindingRegistry;
    emit: Emit;
    getProjectModel: () => EditorProjectModel | null;
    ensureProject: () => Promise<void>;
    rebuildGroupHierarchy: () => void;
    setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
    clearPreview: () => void;
  }) {
    this.registry = options.registry;
    this.emit = options.emit;
    this.getProjectModel = options.getProjectModel;
    this.ensureProject = options.ensureProject;
    this.rebuildGroupHierarchy = options.rebuildGroupHierarchy;
    this.setSelectedEntity = options.setSelectedEntity;
    this.clearPreview = options.clearPreview;
  }

  async applyPlan(plan: Ai3DPlan, source: SyncSource = "ui") {
    const drafts = buildAi3DMeshDrafts(plan);

    await this.ensureProject();
    const projectModel = this.getProjectModel();
    if (!projectModel) return;

    if (drafts.length > 1) {
      const groupId = this.createGroupFromDrafts(drafts, source);
      this.clearPreview();
      this.setSelectedEntity(groupId, source);
      return;
    }

    let lastCreatedEntityId: string | null = null;
    drafts.forEach((draft) => {
      lastCreatedEntityId = this.createMeshFromDraft(draft, source);
    });

    this.clearPreview();

    if (lastCreatedEntityId) {
      this.setSelectedEntity(lastCreatedEntityId, source);
    }
  }

  createMeshFromDraft(draft: Ai3DMeshDraft, source: SyncSource) {
    const projectModel = this.getProjectModel();
    if (!projectModel) {
      throw new Error("Project model is not initialized.");
    }

    const mesh = projectModel.addMesh({
      ...draft.mesh,
      label:
        draft.mesh.label ||
        draft.label ||
        createDefaultMeshLabel(draft.mesh.geometryName ?? "", projectModel.meshes.size),
      id: createMeshEntityId()
    });
    this.registry.create(mesh);
    this.rebuildGroupHierarchy();
    this.emit({
      type: "entityUpdated",
      entityId: mesh.id,
      entityKind: "mesh",
      source
    });
    return mesh.id;
  }

  private createGroupFromDrafts(drafts: Ai3DMeshDraft[], source: SyncSource) {
    const projectModel = this.getProjectModel();
    if (!projectModel) {
      throw new Error("Project model is not initialized.");
    }

    const center = drafts.reduce<[number, number, number]>(
      (acc, draft) => {
        acc[0] += draft.mesh.position?.[0] ?? 0;
        acc[1] += draft.mesh.position?.[1] ?? 0;
        acc[2] += draft.mesh.position?.[2] ?? 0;
        return acc;
      },
      [0, 0, 0]
    );

    center[0] /= drafts.length;
    center[1] /= drafts.length;
    center[2] /= drafts.length;

    const childIds = drafts.map((draft) =>
      this.createMeshFromDraft(
        {
          ...draft,
          mesh: {
            ...draft.mesh,
            position: [
              (draft.mesh.position?.[0] ?? 0) - center[0],
              (draft.mesh.position?.[1] ?? 0) - center[1],
              (draft.mesh.position?.[2] ?? 0) - center[2]
            ]
          }
        },
        source
      )
    );

    const group = projectModel.addGroup({
      id: createGroupEntityId(),
      label: createDefaultGroupLabel(projectModel.groups.size),
      children: childIds,
      locked: false,
      visible: true,
      position: center,
      quaternion: [0, 0, 0, 1],
      scale: [1, 1, 1]
    });

    this.registry.create(group);
    this.rebuildGroupHierarchy();
    this.emit({
      type: "entityUpdated",
      entityId: group.id,
      entityKind: "group",
      source
    });
    return group.id;
  }
}
