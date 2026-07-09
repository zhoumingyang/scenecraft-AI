import { z } from "zod";
import {
  ASSET_UNITS,
  MODEL_ANIMATION_PLAYBACK_STATES,
  MODEL_FILE_FORMATS
} from "@/render/editor/constants/model";
import {
  assetRefSchema,
  editorCameraSchema,
  editorMeshMaterialSchema,
  externalAssetSourceSchema,
  numericArraySchema,
  optionalTrimmedString,
  trimmedString
} from "./shared";

const editorModelSchema = z
  .object({
    id: trimmedString(120),
    label: optionalTrimmedString(120),
    source: trimmedString(2048),
    sourceAssetId: z.string().trim().max(120).optional(),
    externalSource: externalAssetSourceSchema.nullable().optional(),
    format: z.enum(MODEL_FILE_FORMATS).optional(),
    assetUnit: z.enum(ASSET_UNITS).optional(),
    assetImportScale: z.number().finite().positive().optional(),
    animations: z
      .array(
        z
          .object({
            id: trimmedString(120),
            name: trimmedString(240),
            duration: z.number().finite().nonnegative()
          })
          .strict()
      )
      .optional(),
    activeAnimationId: z.string().trim().max(120).nullable().optional(),
    animationTimeScale: z.number().finite().positive().optional(),
    animationPlaybackState: z.enum(MODEL_ANIMATION_PLAYBACK_STATES).optional(),
    locked: z.boolean().optional(),
    visible: z.boolean().optional(),
    position: numericArraySchema.optional(),
    quaternion: numericArraySchema.optional(),
    scale: numericArraySchema.optional()
  })
  .strict();

const editorMeshSchema = z
  .object({
    id: trimmedString(120),
    label: optionalTrimmedString(120),
    type: z.number().finite(),
    geometryName: optionalTrimmedString(120),
    vertices: z.array(z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }).strict()).optional(),
    uvs: z.array(z.object({ x: z.number().finite(), y: z.number().finite() }).strict()).optional(),
    normals: z.array(z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }).strict()).optional(),
    indices: z.array(z.number().int()).optional(),
    color: z.string().trim().optional(),
    textureUrl: z.string().trim().optional(),
    material: editorMeshMaterialSchema.optional(),
    locked: z.boolean().optional(),
    visible: z.boolean().optional(),
    position: numericArraySchema.optional(),
    quaternion: numericArraySchema.optional(),
    scale: numericArraySchema.optional()
  })
  .strict();

const csgOperationSchema = z.enum(["SUBTRACTION", "INTERSECTION", "ADDITION"]);
const csgMaterialModeSchema = z.enum(["sourceParts", "single"]);

const editorCsgMeshMaterialPartSchema = z
  .object({
    id: trimmedString(120),
    sourceEntityId: trimmedString(120),
    label: optionalTrimmedString(120),
    material: editorMeshMaterialSchema.optional()
  })
  .strict();

const editorCsgMeshSchema = z
  .object({
    id: trimmedString(120),
    label: optionalTrimmedString(120),
    operation: csgOperationSchema.optional(),
    operandIds: z.array(trimmedString(120)).optional(),
    materialMode: csgMaterialModeSchema.optional(),
    material: editorMeshMaterialSchema.optional(),
    materialParts: z.array(editorCsgMeshMaterialPartSchema).optional(),
    locked: z.boolean().optional(),
    visible: z.boolean().optional(),
    position: numericArraySchema.optional(),
    quaternion: numericArraySchema.optional(),
    scale: numericArraySchema.optional()
  })
  .strict();

const editorLightSchema = z
  .object({
    id: trimmedString(120),
    label: optionalTrimmedString(120),
    type: z.union([z.number().finite(), z.string().trim()]),
    locked: z.boolean().optional(),
    position: numericArraySchema.optional(),
    quaternion: numericArraySchema.optional(),
    scale: numericArraySchema.optional(),
    color: z.string().trim().optional(),
    groundColor: z.string().trim().optional(),
    intensity: z.number().finite().optional(),
    distance: z.number().finite().optional(),
    decay: z.number().finite().optional(),
    angle: z.number().finite().optional(),
    penumbra: z.number().finite().optional(),
    width: z.number().finite().optional(),
    height: z.number().finite().optional()
  })
  .strict();

const editorGroupSchema = z
  .object({
    id: trimmedString(120),
    label: optionalTrimmedString(120),
    children: z.array(trimmedString(120)),
    locked: z.boolean().optional(),
    visible: z.boolean().optional(),
    position: numericArraySchema.optional(),
    quaternion: numericArraySchema.optional(),
    scale: numericArraySchema.optional()
  })
  .strict();

const editorGroundConfigSchema = z
  .object({
    mode: z.enum(["grid", "plane"]).optional(),
    visible: z.boolean().optional(),
    scale: numericArraySchema.optional(),
    material: editorMeshMaterialSchema.optional()
  })
  .strict();

const editorEnvConfigSchema = z
  .object({
    panoAssetId: z.string().trim().max(120).optional(),
    panoAssetName: z.string().trim().max(255).optional(),
    panoUrl: z.string().trim().optional(),
    externalSource: externalAssetSourceSchema.optional(),
    environment: z.number().finite().optional(),
    environmentIntensity: z.number().finite().optional(),
    backgroundShow: z.number().finite().optional(),
    backgroundIntensity: z.number().finite().optional(),
    backgroundBlurriness: z.number().finite().optional(),
    environmentRotationY: z.number().finite().optional(),
    toneMapping: z.number().finite().optional(),
    toneMappingExposure: z.number().finite().optional(),
    postProcessing: z
      .object({
        passes: z.record(z.string(), z.unknown()).optional()
      })
      .strict()
      .optional(),
    ground: editorGroundConfigSchema.optional()
  })
  .strict();

export const projectMetaSchema = z
  .object({
    title: trimmedString(120),
    description: z.string().trim().max(500).optional(),
    tags: z.array(trimmedString(40)).max(10).optional()
  })
  .strict();

export const projectThumbnailSchema = assetRefSchema
  .extend({
    width: z.number().int().nonnegative(),
    height: z.number().int().nonnegative(),
    capturedAt: trimmedString(64),
    camera: editorCameraSchema
  })
  .strict();

export const editorProjectSchema = z
  .object({
    id: trimmedString(120),
    meta: projectMetaSchema.optional(),
    thumbnail: projectThumbnailSchema.optional(),
    envConfig: editorEnvConfigSchema.optional(),
    model: z.array(editorModelSchema).optional(),
    mesh: z.array(editorMeshSchema).optional(),
    csgMesh: z.array(editorCsgMeshSchema).optional(),
    light: z.array(editorLightSchema).optional(),
    groups: z.array(editorGroupSchema).optional(),
    camera: editorCameraSchema.optional()
  })
  .strict();
