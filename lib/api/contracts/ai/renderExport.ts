import { z } from "zod";

export const AI_RENDER_EXPORT_MAX_INPUT_BYTES = 700 * 1024;
export const AI_RENDER_EXPORT_SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

const DATA_URL_PATTERN = /^data:([^;,]+);base64,([a-zA-Z0-9+/=\s]+)$/;

function parseImageDataUrl(value: string) {
  const match = DATA_URL_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1].toLowerCase(),
    base64: match[2].replace(/\s/g, "")
  };
}

function getBase64DecodedByteLength(base64: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export const optimizeRenderExportRequestSchema = z
  .object({
    imageDataUrl: z
      .string()
      .trim()
      .min(1, "Render export image is required.")
      .refine((value) => {
        const parsed = parseImageDataUrl(value);
        return parsed
          ? AI_RENDER_EXPORT_SUPPORTED_IMAGE_TYPES.includes(
              parsed.mimeType as (typeof AI_RENDER_EXPORT_SUPPORTED_IMAGE_TYPES)[number]
            )
          : false;
      }, "Render export image must be a JPEG, PNG, or WebP data URL.")
      .refine((value) => {
        const parsed = parseImageDataUrl(value);
        return parsed
          ? getBase64DecodedByteLength(parsed.base64) <= AI_RENDER_EXPORT_MAX_INPUT_BYTES
          : false;
      }, "Render export image must be 700KB or smaller."),
    width: z
      .number()
      .int("Render export width must be an integer.")
      .min(1, "Render export width must be at least 1.")
      .max(8192, "Render export width is too large."),
    height: z
      .number()
      .int("Render export height must be an integer.")
      .min(1, "Render export height must be at least 1.")
      .max(8192, "Render export height is too large.")
  })
  .strict();

export type OptimizeRenderExportRequest = z.infer<typeof optimizeRenderExportRequestSchema>;

export type OptimizeRenderExportResponse = {
  imageDataUrl: string;
  traceId: string | null;
};
