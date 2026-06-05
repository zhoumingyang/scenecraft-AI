import { z } from "zod";
import { PROJECT_ASSET_KINDS } from "@/lib/api/contracts/assets";
import { trimmedString } from "./shared";

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
