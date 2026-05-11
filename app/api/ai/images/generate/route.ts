import { NextResponse } from "next/server";
import {
  getImageGenerationModelConfig,
  IMAGE_SIZE_OPTIONS
} from "@/lib/ai/image-generation/models";
import { createImageGenerationProvider } from "@/lib/ai/image-generation/providerRegistry";
import type { ImageGenerationRequest } from "@/lib/ai/image-generation/types";
import type { GenerateAiImagesRequest } from "@/lib/api/contracts/ai";
import { getSession } from "@/lib/server/auth/getSession";

export const maxDuration = 180;

const IMAGE_SIZES = new Set(IMAGE_SIZE_OPTIONS.map((item) => item.value));

function getImageGenerationErrorStatus(message: string) {
  return message.includes("_API_KEY is not configured") ? 500 : 400;
}

function validateRequestBody(body: unknown): ImageGenerationRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Partial<GenerateAiImagesRequest>;
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  const modelConfig = payload.model ? getImageGenerationModelConfig(payload.model) : null;

  if (!prompt) {
    throw new Error("Prompt is required.");
  }

  if (!modelConfig) {
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

  if (payload.imageSize !== undefined && !IMAGE_SIZES.has(payload.imageSize)) {
    throw new Error("Unsupported image size.");
  }

  const referenceImages = Array.isArray(payload.referenceImages)
    ? payload.referenceImages.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];

  if (
    referenceImages.length < modelConfig.minReferenceImages ||
    referenceImages.length > modelConfig.maxReferenceImages
  ) {
    if (modelConfig.maxReferenceImages === 0) {
      throw new Error(`${payload.model} does not support reference images.`);
    }

    throw new Error(
      `${payload.model} requires between ${modelConfig.minReferenceImages} and ${modelConfig.maxReferenceImages} reference images.`
    );
  }

  if (payload.imageSize !== undefined && !modelConfig.supportsImageSize) {
    throw new Error(`${payload.model} does not support image_size.`);
  }

  const model = modelConfig.id;

  return {
    providerId: modelConfig.providerId,
    model,
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
    return NextResponse.json({ message }, { status: getImageGenerationErrorStatus(message) });
  }
}
