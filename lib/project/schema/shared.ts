import { z } from "zod";

export const trimmedString = (max: number) => z.string().trim().min(1).max(max);
export const optionalTrimmedString = (max: number) => z.string().trim().max(max).optional();
export const numericArraySchema = z.array(z.number().finite()).max(16);

export const externalAssetSourceSchema = z
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

export const textureSchema = z
  .object({
    assetId: z.string().trim().max(120).optional(),
    url: z.string().trim().optional(),
    externalSource: externalAssetSourceSchema.optional(),
    offset: numericArraySchema.optional(),
    repeat: numericArraySchema.optional(),
    rotation: z.number().finite().optional()
  })
  .strict();

export const editorMeshMaterialSchema = z
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

export const editorCameraSchema = z
  .object({
    type: z.number().finite().optional(),
    fov: z.number().finite().optional(),
    position: numericArraySchema.optional(),
    quaternion: numericArraySchema.optional(),
    scale: numericArraySchema.optional()
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
