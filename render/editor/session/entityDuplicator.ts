import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorAppEvent } from "../core/events";
import type { SyncSource, Vec3Tuple } from "../core/types";
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
      material: {
        color: record.item.material.color,
        opacity: record.item.material.opacity,
        diffuseMap: {
          assetId: record.item.material.diffuseMap.assetId,
          url: record.item.material.diffuseMap.url,
          externalSource: record.item.material.diffuseMap.externalSource ?? undefined,
          offset: [...record.item.material.diffuseMap.offset],
          repeat: [...record.item.material.diffuseMap.repeat],
          rotation: record.item.material.diffuseMap.rotation
        },
        metalness: record.item.material.metalness,
        metalnessMap: {
          assetId: record.item.material.metalnessMap.assetId,
          url: record.item.material.metalnessMap.url,
          externalSource: record.item.material.metalnessMap.externalSource ?? undefined,
          offset: [...record.item.material.metalnessMap.offset],
          repeat: [...record.item.material.metalnessMap.repeat],
          rotation: record.item.material.metalnessMap.rotation
        },
        roughness: record.item.material.roughness,
        roughnessMap: {
          assetId: record.item.material.roughnessMap.assetId,
          url: record.item.material.roughnessMap.url,
          externalSource: record.item.material.roughnessMap.externalSource ?? undefined,
          offset: [...record.item.material.roughnessMap.offset],
          repeat: [...record.item.material.roughnessMap.repeat],
          rotation: record.item.material.roughnessMap.rotation
        },
        normalMap: {
          assetId: record.item.material.normalMap.assetId,
          url: record.item.material.normalMap.url,
          externalSource: record.item.material.normalMap.externalSource ?? undefined,
          offset: [...record.item.material.normalMap.offset],
          repeat: [...record.item.material.normalMap.repeat],
          rotation: record.item.material.normalMap.rotation
        },
        normalScale: [...record.item.material.normalScale],
        aoMap: {
          assetId: record.item.material.aoMap.assetId,
          url: record.item.material.aoMap.url,
          externalSource: record.item.material.aoMap.externalSource ?? undefined,
          offset: [...record.item.material.aoMap.offset],
          repeat: [...record.item.material.aoMap.repeat],
          rotation: record.item.material.aoMap.rotation
        },
        aoMapIntensity: record.item.material.aoMapIntensity,
        emissive: record.item.material.emissive,
        emissiveIntensity: record.item.material.emissiveIntensity,
        emissiveMap: {
          assetId: record.item.material.emissiveMap.assetId,
          url: record.item.material.emissiveMap.url,
          externalSource: record.item.material.emissiveMap.externalSource ?? undefined,
          offset: [...record.item.material.emissiveMap.offset],
          repeat: [...record.item.material.emissiveMap.repeat],
          rotation: record.item.material.emissiveMap.rotation
        }
      },
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
