import * as THREE from "three";

import type { Ai3DMeshDraft, Ai3DPlan } from "../ai3d/plan";
import { buildAi3DMeshDrafts } from "../ai3d/plan";
import type { BindingRegistry } from "../bindings/bindingRegistry";
import { MeshEntityModel } from "../models";
import type { EditorRuntime } from "../runtime/editorRuntime";
import { createMeshGeometry } from "../utils/geometry";

type PreviewMeshRecord = {
  nodeId: string;
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
};

function createPreviewMeshRecord(draft: Ai3DMeshDraft): PreviewMeshRecord {
  const geometry = createMeshGeometry(new MeshEntityModel(0, draft.mesh));
  const material = new THREE.MeshStandardMaterial();
  material.color.set(draft.mesh.material?.color || "#d9e8ff");
  material.opacity = draft.mesh.material?.opacity ?? 1;
  material.transparent = (draft.mesh.material?.opacity ?? 1) < 1;
  material.metalness = draft.mesh.material?.metalness ?? 0;
  material.roughness = draft.mesh.material?.roughness ?? 1;
  material.emissive.set(draft.mesh.material?.emissive || "#000000");
  material.emissiveIntensity = draft.mesh.material?.emissiveIntensity ?? 1;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `ai-preview:${draft.nodeId}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(
    draft.mesh.position?.[0] ?? 0,
    draft.mesh.position?.[1] ?? 0.8,
    draft.mesh.position?.[2] ?? 0
  );
  mesh.quaternion.set(
    draft.mesh.quaternion?.[0] ?? 0,
    draft.mesh.quaternion?.[1] ?? 0,
    draft.mesh.quaternion?.[2] ?? 0,
    draft.mesh.quaternion?.[3] ?? 1
  );
  mesh.scale.set(
    draft.mesh.scale?.[0] ?? 1,
    draft.mesh.scale?.[1] ?? 1,
    draft.mesh.scale?.[2] ?? 1
  );

  return {
    nodeId: draft.nodeId,
    mesh,
    geometry,
    material
  };
}

function disposePreviewMeshRecord(record: PreviewMeshRecord) {
  record.geometry.dispose();
  record.material.dispose();
}

export class Ai3DPreviewSession {
  private readonly runtime: EditorRuntime;
  private readonly registry: BindingRegistry;
  private readonly previewRecords = new Map<string, PreviewMeshRecord>();

  constructor(runtime: EditorRuntime, registry: BindingRegistry) {
    this.runtime = runtime;
    this.registry = registry;
  }

  previewPlan(plan: Ai3DPlan) {
    const drafts = buildAi3DMeshDrafts(plan);
    this.clear();

    drafts.forEach((draft) => {
      const record = createPreviewMeshRecord(draft);
      this.runtime.scene.add(record.mesh);
      this.previewRecords.set(draft.nodeId, record);
    });
  }

  captureImages() {
    if (this.previewRecords.size === 0) {
      return [this.runtime.captureViewportImage("clean")];
    }

    const bindingVisibilitySnapshot = this.registry.list().map((binding) => ({
      binding,
      visible: binding.object.visible
    }));
    const previewVisibilitySnapshot = Array.from(this.previewRecords.values()).map((record) => ({
      record,
      visible: record.mesh.visible
    }));

    bindingVisibilitySnapshot.forEach(({ binding }) => {
      binding.object.visible = false;
    });
    previewVisibilitySnapshot.forEach(({ record }) => {
      record.mesh.visible = true;
    });

    try {
      return [this.runtime.captureViewportImage("clean")];
    } finally {
      bindingVisibilitySnapshot.forEach(({ binding, visible }) => {
        binding.object.visible = visible;
      });
      previewVisibilitySnapshot.forEach(({ record, visible }) => {
        record.mesh.visible = visible;
      });
    }
  }

  clear() {
    this.previewRecords.forEach((record) => {
      this.runtime.scene.remove(record.mesh);
      disposePreviewMeshRecord(record);
    });
    this.previewRecords.clear();
  }
}
