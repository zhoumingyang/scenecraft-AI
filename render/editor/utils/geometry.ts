import * as THREE from "three";

import type { EditorMeshJSON, EditorMeshUvJSON, EditorMeshVertexJSON } from "../core/types";
import type { MeshEntityModel } from "../models";

export type ShapePreset = "star" | "heart" | "leaf" | "wing" | "fin";
export type TubePreset = "arc" | "wave" | "loop" | "s_curve" | "snake";

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

function readAttributeVec3(attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  const output: EditorMeshVertexJSON[] = [];
  for (let index = 0; index < attribute.count; index += 1) {
    output.push({
      x: attribute.getX(index),
      y: attribute.getY(index),
      z: attribute.getZ(index)
    });
  }
  return output;
}

function readAttributeVec2(attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  const output: EditorMeshUvJSON[] = [];
  for (let index = 0; index < attribute.count; index += 1) {
    output.push({
      x: attribute.getX(index),
      y: attribute.getY(index)
    });
  }
  return output;
}

export function createShapePresetShape(preset: ShapePreset): THREE.Shape {
  if (preset === "leaf") {
    const shape = new THREE.Shape();
    shape.moveTo(0, -1);
    shape.bezierCurveTo(-0.75, -0.45, -0.95, 0.45, 0, 1);
    shape.bezierCurveTo(0.95, 0.45, 0.75, -0.45, 0, -1);
    shape.closePath();
    return shape;
  }

  if (preset === "wing") {
    const shape = new THREE.Shape();
    shape.moveTo(-0.9, -0.2);
    shape.quadraticCurveTo(-0.55, 0.9, 0.15, 0.8);
    shape.quadraticCurveTo(0.85, 0.45, 1, -0.15);
    shape.quadraticCurveTo(0.35, -0.05, -0.2, -0.55);
    shape.quadraticCurveTo(-0.6, -0.75, -0.9, -0.2);
    shape.closePath();
    return shape;
  }

  if (preset === "fin") {
    const shape = new THREE.Shape();
    shape.moveTo(-0.9, -0.5);
    shape.quadraticCurveTo(-0.25, 0.95, 0.9, 0);
    shape.quadraticCurveTo(0.05, 0.15, -0.9, -0.5);
    shape.closePath();
    return shape;
  }

  if (preset === "heart") {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.3);
    shape.bezierCurveTo(0, 0.8, -0.8, 1.05, -0.8, 0.35);
    shape.bezierCurveTo(-0.8, -0.15, -0.25, -0.55, 0, -0.9);
    shape.bezierCurveTo(0.25, -0.55, 0.8, -0.15, 0.8, 0.35);
    shape.bezierCurveTo(0.8, 1.05, 0, 0.8, 0, 0.3);
    return shape;
  }

  const shape = new THREE.Shape();
  const outerRadius = 1;
  const innerRadius = 0.45;
  const points = 5;
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = (index / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();
  return shape;
}

export function createTubePresetCurve(preset: TubePreset): THREE.Curve<THREE.Vector3> {
  if (preset === "snake") {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.2, -0.15, 0),
      new THREE.Vector3(-0.75, 0.15, 0.24),
      new THREE.Vector3(-0.2, -0.1, -0.18),
      new THREE.Vector3(0.35, 0.12, 0.16),
      new THREE.Vector3(0.82, 0.02, -0.1),
      new THREE.Vector3(1.15, 0.2, 0.08)
    ]);
  }

  if (preset === "s_curve") {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.1, -0.55, 0),
      new THREE.Vector3(-0.55, -0.05, 0.12),
      new THREE.Vector3(0.05, 0.5, -0.1),
      new THREE.Vector3(0.55, 0.1, 0.08),
      new THREE.Vector3(1.05, -0.38, 0)
    ]);
  }

  if (preset === "loop") {
    return new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-0.7, 0, 0),
        new THREE.Vector3(0, 0.65, 0.35),
        new THREE.Vector3(0.7, 0, 0),
        new THREE.Vector3(0, -0.65, -0.35),
        new THREE.Vector3(-0.7, 0, 0)
      ],
      true
    );
  }

  if (preset === "wave") {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.2, 0, 0),
      new THREE.Vector3(-0.5, 0.45, 0.15),
      new THREE.Vector3(0.2, -0.35, -0.15),
      new THREE.Vector3(0.8, 0.35, 0.12),
      new THREE.Vector3(1.2, 0, 0)
    ]);
  }

  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.9, -0.35, 0),
    new THREE.Vector3(-0.45, 0.4, 0.18),
    new THREE.Vector3(0.1, 0.55, 0.08),
    new THREE.Vector3(0.65, 0.15, -0.1),
    new THREE.Vector3(0.95, -0.18, 0)
  ]);
}

export function geometryToCustomMesh(geometry: THREE.BufferGeometry): Pick<
  EditorMeshJSON,
  "type" | "geometryName" | "vertices" | "uvs" | "normals" | "indices"
> {
  const clone = geometry.clone();
  if (!clone.getAttribute("normal")) {
    clone.computeVertexNormals();
  }

  const positionAttribute = clone.getAttribute("position");
  const normalAttribute = clone.getAttribute("normal");
  const uvAttribute = clone.getAttribute("uv");

  if (!positionAttribute) {
    clone.dispose();
    throw new Error("Custom geometry requires position data.");
  }

  const indices = clone.getIndex();
  const mesh = {
    type: 2,
    geometryName: "Custom",
    vertices: readAttributeVec3(positionAttribute),
    normals: normalAttribute ? readAttributeVec3(normalAttribute) : [],
    uvs: uvAttribute ? readAttributeVec2(uvAttribute) : [],
    indices: indices ? Array.from(indices.array as ArrayLike<number>, (item) => Number(item)) : []
  } satisfies Pick<EditorMeshJSON, "type" | "geometryName" | "vertices" | "uvs" | "normals" | "indices">;

  clone.dispose();
  return mesh;
}

export function createShapePresetGeometry(preset: ShapePreset) {
  return new THREE.ShapeGeometry(createShapePresetShape(preset), 24);
}

export function createExtrudedShapePresetGeometry(
  preset: ShapePreset,
  depth = 0.35,
  bevelEnabled = false
) {
  return new THREE.ExtrudeGeometry(createShapePresetShape(preset), {
    depth,
    steps: 1,
    bevelEnabled,
    curveSegments: 24
  });
}

export function createTubePresetGeometry(
  preset: TubePreset,
  radius = 0.14,
  tubularSegments = 64,
  radialSegments = 10,
  closed = false
) {
  return new THREE.TubeGeometry(
    createTubePresetCurve(preset),
    tubularSegments,
    radius,
    radialSegments,
    closed
  );
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
