import { NextResponse } from "next/server";
import { createImageGenerationProvider } from "@/lib/ai/image-generation/providerRegistry";
import type { ImageGenerationRequest } from "@/lib/ai/image-generation/types";
import { getSession } from "@/lib/server/auth/getSession";

const QWEN_IMAGE_SIZES = new Set([
  "1328x1328",
  "1664x928",
  "928x1664",
  "1472x1140",
  "1140x1472",
  "1584x1056",
  "1056x1584"
] as const);

function validateRequestBody(body: unknown): ImageGenerationRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Partial<ImageGenerationRequest>;
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";

  if (!prompt) {
    throw new Error("Prompt is required.");
  }

  if (payload.providerId !== "siliconflow") {
    throw new Error("Unsupported image generation provider.");
  }

  if (payload.model !== "Qwen/Qwen-Image" && payload.model !== "Qwen/Qwen-Image-Edit-2509") {
    throw new Error("Unsupported image generation model.");
  }

  if (
    typeof payload.cfg !== "number" ||
    Number.isNaN(payload.cfg) ||
    payload.cfg < 0.1 ||
    payload.cfg > 20
  ) {
    throw new Error("CFG must be a number between 0.1 and 20.");
  }

  if (
    typeof payload.inferenceSteps !== "number" ||
    Number.isNaN(payload.inferenceSteps) ||
    payload.inferenceSteps < 1 ||
    payload.inferenceSteps > 50
  ) {
    throw new Error("Inference Steps must be a number between 1 and 50.");
  }

  if (
    payload.seed !== undefined &&
    (!Number.isInteger(payload.seed) || payload.seed < 0 || payload.seed > 9_999_999_999)
  ) {
    throw new Error("Seed must be an integer between 0 and 9999999999.");
  }

  if (payload.imageSize !== undefined && !QWEN_IMAGE_SIZES.has(payload.imageSize)) {
    throw new Error("Unsupported image size.");
  }

  const referenceImages = Array.isArray(payload.referenceImages)
    ? payload.referenceImages.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];

  if (payload.model === "Qwen/Qwen-Image-Edit-2509") {
    if (referenceImages.length < 1 || referenceImages.length > 3) {
      throw new Error("Qwen/Qwen-Image-Edit-2509 requires between 1 and 3 reference images.");
    }

    if (payload.imageSize !== undefined) {
      throw new Error("Qwen/Qwen-Image-Edit-2509 does not support image_size.");
    }
  }

  return {
    providerId: payload.providerId,
    model: payload.model,
    prompt,
    seed: payload.seed,
    imageSize: payload.imageSize,
    cfg: payload.cfg,
    inferenceSteps: payload.inferenceSteps,
    referenceImages
  };
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = validateRequestBody(await request.json());
    const provider = createImageGenerationProvider(body.providerId);
    const result = await provider.generateImage(body);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
