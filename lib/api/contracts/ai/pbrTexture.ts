import { z } from "zod";
import type { ImageGenerationModelId } from "@/lib/ai/image-generation/models";
import { imageGenerationSizeSchema, promptSchema } from "./shared";

const aiPbrTextureTargetKindSchema = z.enum(["mesh", "ground"]);

export const generateAiPbrTextureRequestSchema = z
  .object({
    prompt: promptSchema,
    seed: z
      .number()
      .int("Seed must be an integer between 0 and 9999999999.")
      .min(0, "Seed must be an integer between 0 and 9999999999.")
      .max(9_999_999_999, "Seed must be an integer between 0 and 9999999999.")
      .optional(),
    imageSize: imageGenerationSizeSchema.optional(),
    targetKind: aiPbrTextureTargetKindSchema.optional(),
    targetId: z.string().trim().max(120).optional()
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (payload.targetKind === "ground" && payload.targetId !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["targetId"],
        message: "Ground texture generation should not include targetId."
      });
    }

    if (payload.targetKind === "mesh" && !payload.targetId) {
      ctx.addIssue({
        code: "custom",
        path: ["targetId"],
        message: "Mesh texture generation requires targetId."
      });
    }
  });

export type GenerateAiPbrTextureRequest = z.infer<typeof generateAiPbrTextureRequestSchema>;

export type GenerateAiPbrTextureResponse = {
  atlasImageUrl: string;
  model: ImageGenerationModelId;
  prompt: string;
  seed: number | null;
  traceId: string | null;
  layoutVersion: 1;
};
