import { z } from "zod";
import { PROJECT_ASSET_KINDS } from "@/lib/api/contracts/assets";
import {
  ASSET_UNITS,
  MODEL_ANIMATION_PLAYBACK_STATES,
  MODEL_FILE_FORMATS
} from "@/render/editor/constants/model";

const trimmedString = (max: number) => z.string().trim().min(1).max(max);
const optionalTrimmedString = (max: number) => z.string().trim().max(max).optional();
const numericArraySchema = z.array(z.number().finite()).max(16);
const externalAssetSourceSchema = z
  .object({
    provider: z.literal("polyhaven"),
    assetId: trimmedString(120),
    assetType: z.enum(["hdri", "texture", "model"]),
    displayName: trimmedString(255),
    pageUrl: trimmedString(2048),
    licenseLabel: trimmedString(120),
    authorLabel: trimmedString(255),
    selectedFile: z
      .object({
        url: trimmedString(2048),
        fileName: trimmedString(255),
        sizeBytes: z.number().int().nonnegative().nullable().optional(),
        md5: z.string().trim().max(255).nullable().optional(),
        includes: z
          .array(
            z
              .object({
                path: trimmedString(2048),
                url: trimmedString(2048),
                sizeBytes: z.number().int().nonnegative().nullable().optional(),
                md5: z.string().trim().max(255).nullable().optional()
              })
              .strict()
          )
          .max(128)
          .optional()
      })
      .strict(),
    resolution: trimmedString(40),
    format: trimmedString(40)
  })
  .strict();
const textureSchema = z
  .object({
    assetId: z.string().trim().max(120).optional(),
    url: z.string().trim().optional(),
    externalSource: externalAssetSourceSchema.optional(),
    offset: numericArraySchema.optional(),
    repeat: numericArraySchema.optional(),
    rotation: z.number().finite().optional()
  })
  .strict();

const editorMeshMaterialSchema = z
  .object({
    color: z.string().trim().optional(),
    opacity: z.number().finite().optional(),
    diffuseMap: textureSchema.optional(),
    metalness: z.number().finite().optional(),
    metalnessMap: textureSchema.optional(),
    roughness: z.number().finite().optional(),
    roughnessMap: textureSchema.optional(),
    normalMap: textureSchema.optional(),
    normalScale: numericArraySchema.optional(),
    aoMap: textureSchema.optional(),
    aoMapIntensity: z.number().finite().optional(),
    emissive: z.string().trim().optional(),
    emissiveIntensity: z.number().finite().optional(),
    emissiveMap: textureSchema.optional()
  })
  .strict();

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

const editorCameraSchema = z
  .object({
    type: z.number().finite().optional(),
    fov: z.number().finite().optional(),
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

export const assetRefSchema = z
  .object({
    assetId: trimmedString(120),
    url: trimmedString(2048),
    mimeType: z.string().trim().max(255).optional(),
    originalName: z.string().trim().max(255).optional(),
    sizeBytes: z.number().int().nonnegative().nullable().optional()
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

export const projectAiImageResultSchema = assetRefSchema
  .extend({
    id: trimmedString(120),
    appliedMeshIds: z.array(trimmedString(120)).optional()
  })
  .strict();

export const projectAiImageGenerationSchema = z
  .object({
    id: trimmedString(120),
    createdAt: trimmedString(64),
    prompt: trimmedString(4000),
    model: trimmedString(120),
    seed: z.number().int().nonnegative().nullable().optional(),
    imageSize: z.string().trim().max(40).optional(),
    cfg: z.number().finite(),
    inferenceSteps: z.number().int().positive(),
    traceId: z.string().trim().max(255).nullable().optional(),
    referenceImages: z.array(assetRefSchema).optional(),
    results: z.array(projectAiImageResultSchema).min(1)
  })
  .strict();

export const projectAiLibrarySchema = z
  .object({
    version: z.literal(1),
    imageGenerations: z.array(projectAiImageGenerationSchema)
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
    light: z.array(editorLightSchema).optional(),
    groups: z.array(editorGroupSchema).optional(),
    camera: editorCameraSchema.optional()
  })
  .strict();

export const uploadedProjectAssetSchema = z
  .object({
    assetId: trimmedString(120),
    projectId: trimmedString(120),
    kind: z.enum(PROJECT_ASSET_KINDS),
    provider: z.literal("vercel-blob"),
    objectKey: trimmedString(2048),
    url: trimmedString(2048),
    mimeType: trimmedString(255),
    sizeBytes: z.number().int().nonnegative(),
    originalName: trimmedString(255),
    metadata: z.record(z.string(), z.unknown()).nullable().optional()
  })
  .strict();

export const prepareAssetUploadRequestSchema = z
  .object({
    assetId: trimmedString(120),
    projectId: trimmedString(120),
    kind: z.enum(PROJECT_ASSET_KINDS),
    fileName: trimmedString(255),
    contentType: trimmedString(255),
    sizeBytes: z.number().int().positive(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional()
  })
  .strict();

export const projectSaveRequestSchema = z
  .object({
    snapshot: editorProjectSchema,
    aiSnapshot: projectAiLibrarySchema,
    uploadedAssets: z.array(uploadedProjectAssetSchema).optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.snapshot.meta) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Project metadata is required."
      });
    }

    if (!value.snapshot.thumbnail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Project thumbnail is required."
      });
    }
  });

export function createEmptyProjectAiLibrary() {
  return {
    version: 1 as const,
    imageGenerations: []
  };
}
