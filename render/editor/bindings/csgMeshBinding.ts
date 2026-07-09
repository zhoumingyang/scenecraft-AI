import * as THREE from "three";
import {
  ADDITION,
  Brush,
  type CSGOperation,
  Evaluator,
  INTERSECTION,
  SUBTRACTION
} from "three-bvh-csg/src/index.js";

import type { CsgMeshEntityModel, MeshEntityModel } from "../models";
import {
  applyMeshPhysicalMaterial,
  disposeMeshPhysicalMaterialTextures,
  mergeMeshMaterialPatch
} from "../materials/meshMaterial";
import { createMeshGeometry } from "../utils/geometry";
import { captureObjectTransformState, removeObjectFromParent, setEntityId } from "../utils/object3d";
import type { BindingContext, RenderBinding } from "./types";

const CSG_OPERATIONS: Record<CsgMeshEntityModel["operation"], CSGOperation> = {
  SUBTRACTION,
  INTERSECTION,
  ADDITION
};

function cloneMaterial(source: THREE.Material | THREE.Material[]) {
  const material = Array.isArray(source) ? source[0] : source;
  return material.clone();
}

function createMaterialFromModel(
  context: BindingContext,
  model: CsgMeshEntityModel,
  operand: MeshEntityModel
) {
  const material = new THREE.MeshPhysicalMaterial();
  const part = model.getMaterialPart(operand.id);
  const materialSource = part?.material
    ? mergeMeshMaterialPatch(operand.material, part.material)
    : operand.material;
  applyMeshPhysicalMaterial(material, materialSource, context.textureLoader, context.invalidateMaterials);
  return material;
}

function createSingleMaterial(context: BindingContext, model: CsgMeshEntityModel) {
  const material = new THREE.MeshPhysicalMaterial();
  applyMeshPhysicalMaterial(material, model.material, context.textureLoader, context.invalidateMaterials);
  return material;
}

function createOperandBrush(
  context: BindingContext,
  csgModel: CsgMeshEntityModel,
  operand: MeshEntityModel
) {
  const geometry = createMeshGeometry(operand);
  geometry.clearGroups();
  const material =
    csgModel.materialMode === "single"
      ? createSingleMaterial(context, csgModel)
      : createMaterialFromModel(context, csgModel, operand);
  const brush = new Brush(geometry, material);
  operand.applyTransformToObject(brush);
  brush.updateMatrixWorld(true);
  return brush;
}

function disposeBrush(brush: Brush) {
  brush.geometry.dispose();
  const material = brush.material;
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
    return;
  }
  material.dispose();
}

function disposeResultMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((item) => {
      if (item instanceof THREE.MeshPhysicalMaterial) {
        disposeMeshPhysicalMaterialTextures(item);
      }
      item.dispose();
    });
    return;
  }
  if (material instanceof THREE.MeshPhysicalMaterial) {
    disposeMeshPhysicalMaterialTextures(material);
  }
  material.dispose();
}

export function createCsgMeshBinding(
  context: BindingContext,
  model: CsgMeshEntityModel
): RenderBinding {
  const projectModel = context.getProjectModel?.();
  const operands = model.operandIds
    .map((operandId) => projectModel?.meshes.get(operandId) ?? null)
    .filter((operand): operand is MeshEntityModel => Boolean(operand));
  const brushes = operands.map((operand) => createOperandBrush(context, model, operand));
  const evaluator = new Evaluator();
  evaluator.useGroups = model.materialMode === "sourceParts";
  evaluator.consolidateMaterials = true;

  let resultBrush: Brush | null = null;
  let mesh: THREE.Mesh;

  try {
    if (brushes.length < 2) {
      throw new Error("CSG requires at least two mesh operands.");
    }

    let current = brushes[0];
    for (let index = 1; index < brushes.length; index += 1) {
      const nextResult = evaluator.evaluate(current, brushes[index], CSG_OPERATIONS[model.operation]);
      if (!brushes.includes(current)) {
        disposeBrush(current);
      }
      current = nextResult;
    }
    resultBrush = current;

    const geometry = resultBrush.geometry.clone();
    if (!geometry.getAttribute("position")) {
      throw new Error("CSG produced an empty geometry.");
    }
    const inverseCsgMatrix = new THREE.Matrix4();
    const csgTransformObject = new THREE.Object3D();
    model.applyTransformToObject(csgTransformObject);
    csgTransformObject.updateMatrixWorld(true);
    inverseCsgMatrix.copy(csgTransformObject.matrixWorld).invert();
    geometry.applyMatrix4(inverseCsgMatrix);
    geometry.computeVertexNormals();

    mesh = new THREE.Mesh(geometry, cloneMaterial(resultBrush.material));
  } catch {
    mesh = new THREE.Mesh(new THREE.BufferGeometry(), createSingleMaterial(context, model));
  } finally {
    brushes.forEach(disposeBrush);
    if (resultBrush && !brushes.includes(resultBrush)) {
      disposeBrush(resultBrush);
    }
  }

  mesh.name = `csgMesh:${model.id}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  model.applyTransformToObject(mesh);
  setEntityId(mesh, model.id);
  context.scene.add(mesh);

  const applyState = () => {
    mesh.visible = model.visible;
  };
  applyState();

  return {
    kind: "csgMesh",
    model,
    object: mesh,
    applyState,
    lastTransformState: captureObjectTransformState(mesh),
    dispose: () => {
      removeObjectFromParent(mesh);
      mesh.geometry.dispose();
      disposeResultMaterial(mesh.material);
    }
  };
}
