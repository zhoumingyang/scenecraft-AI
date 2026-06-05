import { z } from "zod";
import { projectAiLibrarySchema } from "./aiLibrary";
import { uploadedProjectAssetSchema } from "./assetUpload";
import { editorProjectSchema } from "./projectSnapshot";

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
