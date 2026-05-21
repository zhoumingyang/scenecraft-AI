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

const projectAiGenerationMetadataSchema = z
  .object({
    kind: z.enum(["pbr_texture_atlas", "panorama"]).optional(),
    atlasLayoutVersion: z.number().int().positive().optional(),
    targetKind: z.enum(["mesh", "ground"]).optional(),
    targetId: z.string().trim().max(120).nullable().optional()
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
    results: z.array(projectAiImageResultSchema).min(1),
    metadata: projectAiGenerationMetadataSchema.nullable().optional()
  })
  .strict();

const projectAiLibraryV1Schema = z
  .object({
    version: z.literal(1),
    imageGenerations: z.array(projectAiImageGenerationSchema)
  })
  .strict();

const projectAiAssetBaseSchema = assetRefSchema.extend({
  id: trimmedString(120),
  createdAt: trimmedString(64),
  prompt: trimmedString(4000),
  model: trimmedString(120),
  seed: z.number().int().nonnegative().nullable().optional(),
  imageSize: z.string().trim().max(40).optional(),
  cfg: z.number().finite().optional(),
  inferenceSteps: z.number().int().positive().optional(),
  traceId: z.string().trim().max(255).nullable().optional(),
  referenceImages: z.array(assetRefSchema).optional(),
  appliedMeshIds: z.array(trimmedString(120)).optional()
});

export const projectAiAssetSchema = z.discriminatedUnion("kind", [
  projectAiAssetBaseSchema
    .extend({
      kind: z.literal("image")
    })
    .strict(),
  projectAiAssetBaseSchema
    .extend({
      kind: z.literal("pbr_atlas"),
      atlasLayoutVersion: z.number().int().positive().optional(),
      targetKind: z.enum(["mesh", "ground"]).optional(),
      targetId: z.string().trim().max(120).nullable().optional()
    })
    .strict(),
  projectAiAssetBaseSchema
    .extend({
      kind: z.literal("panorama"),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      targetPath: z.literal("env:pano")
    })
    .strict()
]);

const projectAiLibraryV2Schema = z
  .object({
    version: z.literal(2),
    assets: z.array(projectAiAssetSchema)
  })
  .strict();

const projectAiLibraryInputSchema = z.union([projectAiLibraryV2Schema, projectAiLibraryV1Schema]);

export const projectAiLibrarySchema = projectAiLibraryInputSchema.transform((library) =>
  normalizeProjectAiLibrary(library)
);

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
    version: 2 as const,
    assets: []
  };
}

type ProjectAiLibraryInput = z.infer<typeof projectAiLibraryInputSchema>;
type ProjectAiLibraryV2 = z.infer<typeof projectAiLibraryV2Schema>;
type ProjectAiAsset = z.infer<typeof projectAiAssetSchema>;

function migrateAiGenerationResultToAsset(
  generation: z.infer<typeof projectAiImageGenerationSchema>,
  result: z.infer<typeof projectAiImageResultSchema>
): ProjectAiAsset {
  const base = {
    id: result.id,
    createdAt: generation.createdAt,
    prompt: generation.prompt,
    model: generation.model,
    seed: generation.seed,
    imageSize: generation.imageSize,
    cfg: generation.cfg,
    inferenceSteps: generation.inferenceSteps,
    traceId: generation.traceId,
    referenceImages: generation.referenceImages,
    assetId: result.assetId,
    url: result.url,
    mimeType: result.mimeType,
    originalName: result.originalName,
    sizeBytes: result.sizeBytes,
    appliedMeshIds: result.appliedMeshIds
  };

  if (generation.metadata?.kind === "pbr_texture_atlas") {
    return {
      ...base,
      kind: "pbr_atlas",
      atlasLayoutVersion: generation.metadata.atlasLayoutVersion,
      targetKind: generation.metadata.targetKind,
      targetId: generation.metadata.targetId
    };
  }

  if (generation.metadata?.kind === "panorama") {
    return {
      ...base,
      kind: "panorama",
      targetPath: "env:pano"
    };
  }

  return {
    ...base,
    kind: "image"
  };
}

export function normalizeProjectAiLibrary(library: ProjectAiLibraryInput): ProjectAiLibraryV2 {
  if (library.version === 2) {
    return library;
  }

  return {
    version: 2,
    assets: library.imageGenerations.flatMap((generation) =>
      generation.results.map((result) => migrateAiGenerationResultToAsset(generation, result))
    )
  };
}
