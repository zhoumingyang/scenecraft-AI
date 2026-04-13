"use client";

import type {
  GenerateAi3DRequest,
  GenerateAi3DResponse,
  GenerateAiImagesRequest,
  GenerateAiImagesResponse,
  OptimizeAi3DRequest,
  OptimizeAi3DResponse,
  TransformPromptRequest,
  TransformPromptResponse
} from "@/lib/api/contracts/ai";
import { postJson } from "@/lib/http/axios";
import { appApiClient } from "@/frontend/api/client";

export async function generateAiImages(payload: GenerateAiImagesRequest) {
  return postJson<GenerateAiImagesResponse, GenerateAiImagesRequest>(
    appApiClient,
    "/ai/images/generate",
    payload
  );
}

export async function generateAi3D(payload: GenerateAi3DRequest) {
  return postJson<GenerateAi3DResponse, GenerateAi3DRequest>(
    appApiClient,
    "/ai/3d/generate",
    payload,
    {
      timeout: 240_000
    }
  );
}

export async function optimizeAi3D(payload: OptimizeAi3DRequest) {
  return postJson<OptimizeAi3DResponse, OptimizeAi3DRequest>(
    appApiClient,
    "/ai/3d/optimize",
    payload,
    {
      timeout: 240_000
    }
  );
}

export async function transformAiPrompt(payload: TransformPromptRequest) {
  return postJson<TransformPromptResponse, TransformPromptRequest>(
    appApiClient,
    "/ai/prompts/transform",
    payload
  );
}
