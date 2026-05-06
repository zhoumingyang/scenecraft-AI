import * as THREE from "three";

import type {
  EditorMeshMaterialJSON,
  ResolvedMeshMaterialJSON,
  ResolvedTextureSchema
} from "../core/types";
import type { MeshEntityModel } from "../models";
import {
  applyTextureColorSpace,
  ensureSecondaryUvAttribute,
  normalizeMaterialColorSpaces
} from "../runtime/colorManagement";
import { createMeshGeometry } from "../utils/geometry";
import { buildTransformSignature, removeObjectFromParent, setEntityId } from "../utils/object3d";
import type { BindingContext, RenderBinding } from "./types";

function configureTexture(texture: THREE.Texture, schema: ResolvedTextureSchema) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.offset.set(schema.offset[0], schema.offset[1]);
  texture.repeat.set(schema.repeat[0], schema.repeat[1]);
  texture.rotation = schema.rotation;
  texture.needsUpdate = true;
}

function applyTexture(
  loader: THREE.TextureLoader,
  schema: ResolvedTextureSchema,
  assign: (texture: THREE.Texture | null) => void,
  role: "color" | "emissive" | "normal" | "roughness" | "metalness" | "ao"
) {
  if (!schema.url) {
    assign(null);
    return;
  }

  loader.load(schema.url, (texture) => {
    configureTexture(texture, schema);
    applyTextureColorSpace(texture, role);
    assign(texture);
  });
}

function applyMeshMaterial(
  material: THREE.MeshStandardMaterial,
  source: ResolvedMeshMaterialJSON,
  loader: THREE.TextureLoader
) {
  material.color.set(source.color);
  material.opacity = source.opacity;
  material.transparent = source.opacity < 1;
  material.metalness = source.metalness;
  material.roughness = source.roughness;
  material.normalScale.set(source.normalScale[0], source.normalScale[1]);
  material.aoMapIntensity = source.aoMapIntensity;
  material.emissive.set(source.emissive);
  material.emissiveIntensity = source.emissiveIntensity;

  applyTexture(loader, source.diffuseMap, (texture) => {
    material.map = texture;
    material.needsUpdate = true;
  }, "color");
  applyTexture(loader, source.metalnessMap, (texture) => {
    material.metalnessMap = texture;
    material.needsUpdate = true;
  }, "metalness");
  applyTexture(loader, source.roughnessMap, (texture) => {
    material.roughnessMap = texture;
    material.needsUpdate = true;
  }, "roughness");
  applyTexture(loader, source.normalMap, (texture) => {
    material.normalMap = texture;
    material.needsUpdate = true;
  }, "normal");
  applyTexture(loader, source.aoMap, (texture) => {
    material.aoMap = texture;
    material.needsUpdate = true;
  }, "ao");
  applyTexture(loader, source.emissiveMap, (texture) => {
    material.emissiveMap = texture;
    material.needsUpdate = true;
  }, "emissive");

  normalizeMaterialColorSpaces(material);
}

function disposeTexture(texture: THREE.Texture | null) {
  texture?.dispose();
}

function disposeMaterialTextures(material: THREE.MeshStandardMaterial) {
  disposeTexture(material.map);
  disposeTexture(material.metalnessMap);
  disposeTexture(material.roughnessMap);
  disposeTexture(material.normalMap);
  disposeTexture(material.aoMap);
  disposeTexture(material.emissiveMap);
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
      disposeMaterialTextures(material);
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

  disposeMaterialTextures(material);
  applyMeshMaterial(material, model.material, textureLoader);
  material.needsUpdate = true;
}
