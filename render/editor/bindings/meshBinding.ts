import * as THREE from "three";

import type { MeshEntityModel } from "../models";
import { createMeshGeometry } from "../utils/geometry";
import { buildTransformSignature, setEntityId } from "../utils/object3d";
import type { BindingContext, RenderBinding } from "./types";

function applyTexture(
  material: THREE.MeshStandardMaterial,
  textureUrl: string,
  loader: THREE.TextureLoader
) {
  if (!textureUrl) return;
  loader.load(textureUrl, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    material.map = texture;
    material.needsUpdate = true;
  });
}

export function createMeshBinding(context: BindingContext, model: MeshEntityModel): RenderBinding {
  const { scene, textureLoader } = context;
  const geometry = createMeshGeometry(model);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(model.color),
    metalness: 0.15,
    roughness: 0.7
  });
  applyTexture(material, model.textureUrl, textureLoader);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `mesh:${model.id}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  model.applyTransformToObject(mesh);
  setEntityId(mesh, model.id);
  scene.add(mesh);

  return {
    kind: "mesh",
    model,
    object: mesh,
    lastTransformSignature: buildTransformSignature(mesh),
    dispose: () => {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    }
  };
}

export function updateMeshBindingMaterial(
  binding: RenderBinding,
  textureLoader: THREE.TextureLoader,
  patch: { color?: string; textureUrl?: string }
) {
  if (binding.kind !== "mesh") return;

  const model = binding.model as MeshEntityModel;
  model.patchMaterial(patch);

  const mesh = binding.object as THREE.Mesh;
  const material = mesh.material;
  if (!(material instanceof THREE.MeshStandardMaterial)) return;

  material.color.set(model.color);
  if (patch.textureUrl !== undefined) {
    material.map = null;
    applyTexture(material, model.textureUrl, textureLoader);
  }
  material.needsUpdate = true;
}
