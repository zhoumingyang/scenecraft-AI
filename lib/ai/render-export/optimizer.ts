import { getImageGenerationModelConfig, type ImageGenerationModelId } from "@/lib/ai/image-generation/models";
import { createImageGenerationProvider } from "@/lib/ai/image-generation/providerRegistry";
import type { ImageGenerationProvider } from "@/lib/ai/image-generation/types";
import type { OptimizeRenderExportResponse } from "@/lib/api/contracts/ai/renderExport";

export const AI_RENDER_EXPORT_OPTIMIZATION_MODEL_ID: ImageGenerationModelId =
  "openai/gpt-5.4-image-2";

type FetchImage = (url: string) => Promise<{
  arrayBuffer: () => Promise<ArrayBuffer>;
  headers: {
    get(name: string): string | null;
  };
  ok: boolean;
  status: number;
}>;

export type OptimizeRenderExportImageOptions = {
  imageDataUrl: string;
  provider?: ImageGenerationProvider;
  fetchImage?: FetchImage;
};

export function buildRenderExportOptimizationPrompt() {
  return [
    "对图片进行优化。",
    "保持图片内容、构图、整体色彩、主体和画面语义不变。",
    "不增删对象，不改变背景，不添加文字、水印、边框或界面元素。",
    "输出优化后的单张图片。"
  ].join("\n");
}

export async function optimizeRenderExportImage({
  imageDataUrl,
  provider,
  fetchImage = fetch
}: OptimizeRenderExportImageOptions): Promise<OptimizeRenderExportResponse> {
  const modelConfig = getImageGenerationModelConfig(AI_RENDER_EXPORT_OPTIMIZATION_MODEL_ID);
  const imageProvider = provider ?? createImageGenerationProvider(modelConfig.providerId);
  const result = await imageProvider.generateImage({
    providerId: modelConfig.providerId,
    model: AI_RENDER_EXPORT_OPTIMIZATION_MODEL_ID,
    prompt: buildRenderExportOptimizationPrompt(),
    cfg: 7,
    inferenceSteps: 28,
    referenceImages: [imageDataUrl]
  });
  const imageUrl = result.images[0]?.url;

  if (!imageUrl) {
    throw new Error("The provider returned no optimized render export image.");
  }

  return {
    imageDataUrl: await resolveOptimizedImageDataUrl(imageUrl, fetchImage),
    traceId: result.traceId
  };
}

async function resolveOptimizedImageDataUrl(imageUrl: string, fetchImage: FetchImage) {
  if (imageUrl.startsWith("data:image/")) {
    return imageUrl;
  }

  const response = await fetchImage(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download optimized render export image (${response.status}).`);
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
