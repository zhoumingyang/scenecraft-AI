import * as THREE from "three";

import type {
  EditorMeshMaterialJSON,
  ResolvedMeshMaterialJSON
} from "../core/types";
import type { MeshEntityModel } from "../models";
import { ensureSecondaryUvAttribute } from "../runtime/colorManagement";
import {
  applyMeshStandardMaterial,
  disposeMeshStandardMaterialTextures
} from "../materials/meshMaterial";
import { createMeshGeometry } from "../utils/geometry";
import { buildTransformSignature, removeObjectFromParent, setEntityId } from "../utils/object3d";
import type { BindingContext, RenderBinding } from "./types";

function applyMeshMaterial(
  material: THREE.MeshStandardMaterial,
  source: ResolvedMeshMaterialJSON,
  loader: THREE.TextureLoader
) {
  applyMeshStandardMaterial(material, source, loader);
}

export function createMeshBinding(context: BindingContext, model: MeshEntityModel): RenderBinding {
  const { scene, textureLoader } = context;
  const geometry = createMeshGeometry(model);
  ensureSecondaryUvAttribute(geometry);
  const material = new THREE.MeshStandardMaterial();
  applyMeshMaterial(material, model.material, textureLoader);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `mesh:${model.id}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  model.applyTransformToObject(mesh);
  setEntityId(mesh, model.id);
  scene.add(mesh);

  const applyState = () => {
    mesh.visible = model.visible;
  };
  applyState();

  return {
    kind: "mesh",
    model,
    object: mesh,
    applyState,
    lastTransformSignature: buildTransformSignature(mesh),
    dispose: () => {
      removeObjectFromParent(mesh);
      geometry.dispose();
      disposeMeshStandardMaterialTextures(material);
      material.dispose();
    }
  };
}

export function updateMeshBindingMaterial(
  binding: RenderBinding,
  textureLoader: THREE.TextureLoader,
  patch: Partial<EditorMeshMaterialJSON>
) {
  if (binding.kind !== "mesh") return;

  const model = binding.model as MeshEntityModel;
  model.patchMaterial(patch);

  const mesh = binding.object as THREE.Mesh;
  const material = mesh.material;
  if (!(material instanceof THREE.MeshStandardMaterial)) return;

  disposeMeshStandardMaterialTextures(material);
  applyMeshMaterial(material, model.material, textureLoader);
  material.needsUpdate = true;
}
