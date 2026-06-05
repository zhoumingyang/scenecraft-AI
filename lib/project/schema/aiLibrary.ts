import { z } from "zod";
import { assetRefSchema, trimmedString } from "./shared";

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
