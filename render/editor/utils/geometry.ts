import * as THREE from "three";

import type { EditorMeshUvJSON, EditorMeshVertexJSON } from "../core/types";
import type { MeshEntityModel } from "../models";

export function createBuiltinGeometry(name: string): THREE.BufferGeometry {
  const normalized = name.trim().toLowerCase();
  if (normalized === "capsule") return new THREE.CapsuleGeometry(0.6, 1.2, 8, 16);
  if (normalized === "sphere") return new THREE.SphereGeometry(0.8, 24, 16);
  if (normalized === "circle") return new THREE.CircleGeometry(0.9, 32);
  if (normalized === "cylinder") return new THREE.CylinderGeometry(0.7, 0.7, 1.4, 24);
  return new THREE.BoxGeometry(1, 1, 1);
}

export function toFloatArray3(vertices: EditorMeshVertexJSON[]): Float32Array {
  const output: number[] = [];
  vertices.forEach((vertex) => {
    output.push(vertex.x, vertex.y, vertex.z);
  });
  return new Float32Array(output);
}

export function toFloatArray2(uvs: EditorMeshUvJSON[]): Float32Array {
  const output: number[] = [];
  uvs.forEach((uv) => {
    output.push(uv.x, uv.y);
  });
  return new Float32Array(output);
}

function createCustomGeometry(model: MeshEntityModel): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  if (model.vertices.length > 0) {
    geometry.setAttribute("position", new THREE.BufferAttribute(toFloatArray3(model.vertices), 3));
  }
  if (model.normals.length > 0) {
    geometry.setAttribute("normal", new THREE.BufferAttribute(toFloatArray3(model.normals), 3));
  }
  if (model.uvs.length > 0) {
    geometry.setAttribute("uv", new THREE.BufferAttribute(toFloatArray2(model.uvs), 2));
  }
  if (model.indices.length > 0) {
    geometry.setIndex(model.indices);
  }
  if (model.normals.length === 0 && model.vertices.length > 0) {
    geometry.computeVertexNormals();
  }
  if (model.vertices.length === 0) {
    return new THREE.BoxGeometry(1, 1, 1);
  }
  return geometry;
}

export function createMeshGeometry(model: MeshEntityModel): THREE.BufferGeometry {
  if (model.meshType === 2) {
    return createCustomGeometry(model);
  }
  return createBuiltinGeometry(model.geometryName || "Box");
}
