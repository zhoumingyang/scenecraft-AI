import * as THREE from "three";
import {
  ADDITION,
  Brush,
  type CSGOperation,
  Evaluator,
  INTERSECTION,
  SUBTRACTION
} from "three-bvh-csg/src/index.js";

import type { CsgMeshEntityModel, EditorProjectModel, MeshEntityModel } from "../models";
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

type CsgOperandModel = MeshEntityModel | CsgMeshEntityModel;

function cloneMaterial(source: THREE.Material | THREE.Material[]) {
  return Array.isArray(source) ? source.map((material) => material.clone()) : source.clone();
}

function createMaterialFromModel(
  context: BindingContext,
  model: CsgMeshEntityModel,
  operand: CsgOperandModel
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

function isCsgMeshEntityModel(model: CsgOperandModel): model is CsgMeshEntityModel {
  return "operandIds" in model;
}

function createMeshOperandBrush(
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

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
    return;
  }
  material.dispose();
}

function applyParentOperandMaterial(
  context: BindingContext,
  parentModel: CsgMeshEntityModel,
  operand: CsgOperandModel,
  brush: Brush
) {
  const overrideMaterial =
    parentModel.materialMode === "single"
      ? createSingleMaterial(context, parentModel)
      : parentModel.getMaterialPart(operand.id)?.material
        ? createMaterialFromModel(context, parentModel, operand)
        : null;

  if (!overrideMaterial) return brush;

  disposeMaterial(brush.material);
  brush.material = overrideMaterial;
  return brush;
}

function createCsgOperandBrush(
  context: BindingContext,
  projectModel: EditorProjectModel,
  parentModel: CsgMeshEntityModel,
  operand: CsgOperandModel,
  visited: Set<string>
): Brush {
  if (!isCsgMeshEntityModel(operand)) {
    return createMeshOperandBrush(context, parentModel, operand);
  }

  const brush = createCsgResultBrush(context, projectModel, operand, visited);
  return applyParentOperandMaterial(context, parentModel, operand, brush);
}

function disposeBrush(brush: Brush) {
  brush.geometry.dispose();
  disposeMaterial(brush.material);
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
  let mesh: THREE.Mesh;

  try {
    if (!projectModel) {
      throw new Error("Project model is not initialized.");
    }

    const resultBrush = createCsgResultBrush(context, projectModel, model, new Set());
    mesh = new THREE.Mesh(resultBrush.geometry.clone(), cloneMaterial(resultBrush.material));
    disposeBrush(resultBrush);
  } catch {
    mesh = new THREE.Mesh(new THREE.BufferGeometry(), createSingleMaterial(context, model));
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

function resolveCsgOperand(projectModel: EditorProjectModel, operandId: string) {
  const record = projectModel.getEntityById(operandId);
  if (!record || (record.kind !== "mesh" && record.kind !== "csgMesh")) return null;
  return record.item;
}

function createCsgResultBrush(
  context: BindingContext,
  projectModel: EditorProjectModel,
  model: CsgMeshEntityModel,
  visited: Set<string>
): Brush {
  if (visited.has(model.id)) {
    throw new Error("CSG dependency cycle detected.");
  }

  const nextVisited = new Set(visited);
  nextVisited.add(model.id);
  const operands = model.operandIds
    .map((operandId) => resolveCsgOperand(projectModel, operandId))
    .filter((operand): operand is CsgOperandModel => Boolean(operand));
  const brushes: Brush[] = [];
  const evaluator = new Evaluator();
  evaluator.useGroups = model.materialMode === "sourceParts";
  evaluator.consolidateMaterials = true;

  let resultBrush: Brush | null = null;

  try {
    operands.forEach((operand) => {
      brushes.push(createCsgOperandBrush(context, projectModel, model, operand, nextVisited));
    });

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
    const evaluatedBrush = resultBrush;

    const geometry = evaluatedBrush.geometry.clone();
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

    const brush = new Brush(geometry, cloneMaterial(evaluatedBrush.material));
    model.applyTransformToObject(brush);
    brush.updateMatrixWorld(true);
    return brush;
  } catch {
    throw new Error("CSG operation failed.");
  } finally {
    brushes.forEach(disposeBrush);
    if (resultBrush && !brushes.includes(resultBrush)) {
      disposeBrush(resultBrush);
    }
  }
}
