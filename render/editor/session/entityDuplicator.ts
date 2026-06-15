import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorAppEvent } from "../core/events";
import type { SyncSource, Vec3Tuple } from "../core/types";
import { serializeMeshMaterial } from "../materials/meshMaterial";
import type { EditorProjectModel } from "../models";
import { createEntityId } from "./entityFactories";

type Emit = (event: EditorAppEvent) => void;

export type EntityDuplicateOptions = {
  positionOffset?: Vec3Tuple;
};

export function applyDuplicatePositionOffset(
  position: Vec3Tuple,
  offset: Vec3Tuple | undefined
): Vec3Tuple {
  if (!offset) return [...position];
  return [
    position[0] + offset[0],
    position[1] + offset[1],
    position[2] + offset[2]
  ];
}

export function cloneEditorEntity(options: {
  projectModel: EditorProjectModel;
  registry: BindingRegistry;
  entityId: string;
  source: SyncSource;
  emit: Emit;
  duplicateOptions?: EntityDuplicateOptions;
}): { id: string; kind: "group" | "model" | "mesh" | "light" } | null {
  const { projectModel, registry, entityId, source, emit, duplicateOptions } = options;
  const record = projectModel.getEntityById(entityId);
  if (!record || record.item.locked) return null;

  if (record.kind === "group") {
    const childIds = record.item.children
      .map((childId) =>
        cloneEditorEntity({
          projectModel,
          registry,
          entityId: childId,
          source,
          emit
        })?.id ?? null
      )
      .filter((childId): childId is string => Boolean(childId));

    const duplicate = projectModel.addGroup({
      id: createEntityId("group"),
      label: record.item.label,
      children: childIds,
      locked: false,
      visible: record.item.visible,
      position: applyDuplicatePositionOffset(record.item.position, duplicateOptions?.positionOffset),
      quaternion: [...record.item.quaternion],
      scale: [...record.item.scale]
    });
    registry.create(duplicate);
    emit({
      type: "entityUpdated",
      entityId: duplicate.id,
      entityKind: "group",
      source
    });
    return { id: duplicate.id, kind: "group" };
  }

  if (record.kind === "model") {
    const duplicate = projectModel.addModel({
      id: createEntityId("model"),
      label: record.item.label,
      source: record.item.source,
      sourceAssetId: record.item.sourceAssetId,
      externalSource: record.item.externalSource ?? undefined,
      format: record.item.format,
      assetUnit: record.item.assetUnit,
      assetImportScale: record.item.assetImportScale,
      animations: record.item.animations.map((clip) => ({ ...clip })),
      activeAnimationId: record.item.activeAnimationId,
      animationTimeScale: record.item.animationTimeScale,
      animationPlaybackState: record.item.animationPlaybackState,
      locked: false,
      visible: record.item.visible,
      position: applyDuplicatePositionOffset(record.item.position, duplicateOptions?.positionOffset),
      quaternion: [...record.item.quaternion],
      scale: [...record.item.scale]
    });
    registry.create(duplicate);
    emit({
      type: "entityUpdated",
      entityId: duplicate.id,
      entityKind: "model",
      source
    });
    return { id: duplicate.id, kind: "model" };
  }

  if (record.kind === "mesh") {
    const duplicate = projectModel.addMesh({
      id: createEntityId("mesh"),
      label: record.item.label,
      type: record.item.meshType,
      geometryName: record.item.geometryName,
      vertices: record.item.vertices.map((vertex) => ({ ...vertex })),
      uvs: record.item.uvs.map((uv) => ({ ...uv })),
      normals: record.item.normals.map((normal) => ({ ...normal })),
      indices: [...record.item.indices],
      material: serializeMeshMaterial(record.item.material),
      locked: false,
      visible: record.item.visible,
      position: applyDuplicatePositionOffset(record.item.position, duplicateOptions?.positionOffset),
      quaternion: [...record.item.quaternion],
      scale: [...record.item.scale]
    });
    registry.create(duplicate);
    emit({
      type: "entityUpdated",
      entityId: duplicate.id,
      entityKind: "mesh",
      source
    });
    return { id: duplicate.id, kind: "mesh" };
  }

  if (record.kind !== "light") {
    return null;
  }

  const duplicate = projectModel.addLight({
    id: createEntityId("light"),
    label: record.item.label,
    type: record.item.lightType,
    locked: false,
    position: applyDuplicatePositionOffset(record.item.position, duplicateOptions?.positionOffset),
    quaternion: [...record.item.quaternion],
    scale: [...record.item.scale],
    color: record.item.color,
    groundColor: record.item.groundColor,
    intensity: record.item.intensity,
    distance: record.item.distance,
    decay: record.item.decay,
    angle: record.item.angle,
    penumbra: record.item.penumbra,
    width: record.item.width,
    height: record.item.height
  });
  registry.create(duplicate);
  emit({
    type: "entityUpdated",
    entityId: duplicate.id,
    entityKind: "light",
    source
  });
  return { id: duplicate.id, kind: "light" };
}
