"use client";

import { generateAiPanorama } from "@/frontend/api/ai";
import { appApiClient } from "@/frontend/api/client";
import {
  AI_PANORAMA_CFG,
  AI_PANORAMA_HEIGHT,
  AI_PANORAMA_IMAGE_SIZE_LABEL,
  AI_PANORAMA_INFERENCE_STEPS,
  AI_PANORAMA_OUTPUT_EXTENSION,
  AI_PANORAMA_OUTPUT_MIME_TYPE,
  AI_PANORAMA_WIDTH
} from "@/lib/ai/panorama/constants";
import { getApiErrorMessage } from "@/lib/http/axios";
import type { TranslationFunction } from "@/lib/i18n";
import { createClientUuid } from "@/components/editor/projectPersistence";
import type { EditorApp } from "@/render/editor";
import type { LocalProjectAssetEntry, PendingAiAsset } from "@/stores/editorStore";

type AiPanoramaResult = {
  imageUrl: string;
  prompt: string;
};

type Params = {
  app: EditorApp | null;
  prompt: string;
  isGenerating: boolean;
  isPromptActionPending: boolean;
  appendPendingAiAsset: (asset: PendingAiAsset) => void;
  registerLocalProjectAsset: (asset: LocalProjectAssetEntry) => void;
  setAiPanoramaState: (payload: {
    isGenerating?: boolean;
    errorMessage?: string | null;
    result?: AiPanoramaResult | null;
  }) => void;
  t: TranslationFunction;
};

const PANORAMA_TARGET_ASPECT_RATIO = AI_PANORAMA_WIDTH / AI_PANORAMA_HEIGHT;

async function sourceUrlToBlob(sourceUrl: string) {
  const parsedUrl = URL.canParse(sourceUrl) ? new URL(sourceUrl) : null;

  if (parsedUrl?.protocol === "https:" || parsedUrl?.protocol === "http:") {
    const response = await appApiClient.post<Blob>(
      "/assets/fetch",
      { url: sourceUrl },
      { responseType: "blob" }
    );
    return response.data;
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated panorama: ${response.status}.`);
  }

  return response.blob();
}

async function loadImageElement(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load generated panorama."));
    };
    image.src = objectUrl;
  });
}

async function createPanoramaJpegFile(sourceUrl: string) {
  const sourceBlob = await sourceUrlToBlob(sourceUrl);
  const image = await loadImageElement(sourceBlob);
  const sourceAspectRatio = image.naturalWidth / image.naturalHeight;
  const cropWidth =
    sourceAspectRatio > PANORAMA_TARGET_ASPECT_RATIO
      ? image.naturalHeight * PANORAMA_TARGET_ASPECT_RATIO
      : image.naturalWidth;
  const cropHeight =
    sourceAspectRatio > PANORAMA_TARGET_ASPECT_RATIO
      ? image.naturalHeight
      : image.naturalWidth / PANORAMA_TARGET_ASPECT_RATIO;
  const cropX = (image.naturalWidth - cropWidth) / 2;
  const cropY = (image.naturalHeight - cropHeight) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = AI_PANORAMA_WIDTH;
  canvas.height = AI_PANORAMA_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    AI_PANORAMA_WIDTH,
    AI_PANORAMA_HEIGHT
  );

  const jpegBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode generated panorama as JPEG."));
        return;
      }
      resolve(blob);
    }, AI_PANORAMA_OUTPUT_MIME_TYPE, 0.92);
  });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return new File([jpegBlob], `ai-panorama-${timestamp}.${AI_PANORAMA_OUTPUT_EXTENSION}`, {
    type: AI_PANORAMA_OUTPUT_MIME_TYPE
  });
}

export function useAiPanoramaComposer({
  app,
  prompt,
  isGenerating,
  isPromptActionPending,
  appendPendingAiAsset,
  registerLocalProjectAsset,
  setAiPanoramaState,
  t
}: Params) {
  const handlePanoramaSubmit = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isGenerating || isPromptActionPending || !app) return;

    setAiPanoramaState({
      isGenerating: true,
      errorMessage: null
    });

    try {
      const payload = await generateAiPanorama({
        prompt: trimmedPrompt
      });
      const file = await createPanoramaJpegFile(payload.panoramaImageUrl);
      const imported = await app.importPanorama(file);

      if (!imported?.sourceUrl) {
        throw new Error(t("editor.aiPanorama.generateFailed"));
      }

      if (payload.environmentPatch) {
        await app.updateSceneEnvConfig(payload.environmentPatch);
      }

      registerLocalProjectAsset({
        sourceUrl: imported.sourceUrl,
        file,
        kind: "environment_image",
        targetPath: "env:pano"
      });
      appendPendingAiAsset({
        id: createClientUuid("ai-panorama-result"),
        kind: "panorama",
        createdAt: new Date().toISOString(),
        prompt: trimmedPrompt,
        model: payload.model,
        seed: null,
        imageSize: AI_PANORAMA_IMAGE_SIZE_LABEL,
        cfg: AI_PANORAMA_CFG,
        inferenceSteps: AI_PANORAMA_INFERENCE_STEPS,
        traceId: payload.traceId,
        referenceImages: [],
        sourceUrl: imported.sourceUrl,
        fileName: file.name,
        mimeType: file.type || AI_PANORAMA_OUTPUT_MIME_TYPE,
        appliedMeshIds: [],
        width: AI_PANORAMA_WIDTH,
        height: AI_PANORAMA_HEIGHT,
        targetPath: "env:pano"
      });
      setAiPanoramaState({
        isGenerating: false,
        errorMessage: null,
        result: {
          imageUrl: imported.sourceUrl,
          prompt: trimmedPrompt
        }
      });
    } catch (error) {
      setAiPanoramaState({
        isGenerating: false,
        errorMessage: getApiErrorMessage(error, t("editor.aiPanorama.generateFailed"))
      });
    }
  };

  return {
    handlePanoramaSubmit
  };
}
