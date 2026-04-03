import * as THREE from "three";

import type { EditorMeshUvJSON, EditorMeshVertexJSON } from "../core/types";
import type { MeshEntityModel } from "../models";

export function createBuiltinGeometry(name: string): THREE.BufferGeometry {
  const normalized = name.trim().toLowerCase();
  if (normalized === "plane") return new THREE.PlaneGeometry(1.6, 1.6, 1, 1);
  if (normalized === "capsule") return new THREE.CapsuleGeometry(0.6, 1.2, 8, 16);
  if (normalized === "cone") return new THREE.ConeGeometry(0.75, 1.6, 24);
  if (normalized === "sphere") return new THREE.SphereGeometry(0.8, 24, 16);
  if (normalized === "circle") return new THREE.CircleGeometry(0.9, 32);
  if (normalized === "cylinder") return new THREE.CylinderGeometry(0.7, 0.7, 1.4, 24);
  if (normalized === "dodecahedron") return new THREE.DodecahedronGeometry(0.9);
  if (normalized === "icosahedron") return new THREE.IcosahedronGeometry(0.9);
  if (normalized === "lathe") {
    const points = Array.from({ length: 10 }, (_, index) => {
      const y = (index / 9) * 1.8 - 0.9;
      const radius = 0.2 + Math.sin((index / 9) * Math.PI) * 0.55;
      return new THREE.Vector2(radius, y);
    });
    return new THREE.LatheGeometry(points, 32);
  }
  if (normalized === "octahedron") return new THREE.OctahedronGeometry(0.9);
  if (normalized === "ring") return new THREE.RingGeometry(0.35, 0.85, 32);
  if (normalized === "tetrahedron") return new THREE.TetrahedronGeometry(0.9);
  if (normalized === "torus") return new THREE.TorusGeometry(0.7, 0.22, 18, 48);
  if (normalized === "torusknot") return new THREE.TorusKnotGeometry(0.55, 0.18, 128, 16);
  if (normalized === "tube") {
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.9, -0.3, 0),
      new THREE.Vector3(-0.45, 0.45, 0.25),
      new THREE.Vector3(0.15, -0.2, -0.2),
      new THREE.Vector3(0.9, 0.35, 0.1)
    ]);
    return new THREE.TubeGeometry(path, 64, 0.14, 16, false);
  }
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
