"use client";

import { generateAiPbrTexture } from "@/frontend/api/ai";
import {
  AI_PBR_TEXTURE_CFG,
  AI_PBR_TEXTURE_IMAGE_SIZE,
  AI_PBR_TEXTURE_INFERENCE_STEPS
} from "@/lib/ai/pbr-texture/constants";
import { getApiErrorMessage } from "@/lib/http/axios";
import {
  createPbrAtlasMaterialPatch,
  type EditorApp
} from "@/render/editor";
import { createClientUuid } from "@/components/editor/projectPersistence";
import type {
  AiTextureResult,
  AiTextureTarget,
  PendingAiImageGeneration
} from "@/stores/editorStore";

type Params = {
  app: EditorApp | null;
  prompt: string;
  target: AiTextureTarget | null;
  isGenerating: boolean;
  isPromptActionPending: boolean;
  appendPendingAiGeneration: (generation: PendingAiImageGeneration) => void;
  setAiTextureState: (payload: {
    isGenerating?: boolean;
    errorMessage?: string | null;
    result?: AiTextureResult | null;
    lastSeed?: number | null;
  }) => void;
  t: (key: any, params?: Record<string, string | number>) => string;
};

export function useAiPbrTextureComposer({
  app,
  prompt,
  target,
  isGenerating,
  isPromptActionPending,
  appendPendingAiGeneration,
  setAiTextureState,
  t
}: Params) {
  const handleTextureSubmit = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isGenerating || isPromptActionPending) return;

    setAiTextureState({
      isGenerating: true,
      errorMessage: null
    });

    try {
      const payload = await generateAiPbrTexture({
        prompt: trimmedPrompt,
        targetKind: target?.kind,
        targetId: target?.kind === "mesh" ? target.id : undefined
      });
      const result: AiTextureResult = {
        atlasImageUrl: payload.atlasImageUrl,
        prompt: trimmedPrompt,
        model: payload.model,
        seed: payload.seed,
        traceId: payload.traceId,
        layoutVersion: payload.layoutVersion
      };
      const appliedMeshIds = target?.kind === "mesh" && target.id ? [target.id] : [];

      if (app && target) {
        const patch = createPbrAtlasMaterialPatch({
          url: payload.atlasImageUrl
        });

        if (target.kind === "mesh" && target.id) {
          app.updateMeshMaterial(target.id, patch);
        } else if (target.kind === "ground") {
          app.updateGroundMaterial(patch);
        }
      }

      appendPendingAiGeneration({
        id: createClientUuid("ai-pbr-generation"),
        createdAt: new Date().toISOString(),
        prompt: trimmedPrompt,
        model: payload.model,
        seed: payload.seed,
        imageSize: AI_PBR_TEXTURE_IMAGE_SIZE,
        cfg: AI_PBR_TEXTURE_CFG,
        inferenceSteps: AI_PBR_TEXTURE_INFERENCE_STEPS,
        traceId: payload.traceId,
        referenceImages: [],
        results: [
          {
            id: createClientUuid("ai-pbr-result"),
            sourceUrl: payload.atlasImageUrl,
            fileName: `pbr-atlas-${Date.now()}.png`,
            mimeType: "image/png",
            appliedMeshIds
          }
        ],
        metadata: {
          kind: "pbr_texture_atlas",
          atlasLayoutVersion: payload.layoutVersion,
          targetKind: target?.kind,
          targetId: target?.kind === "mesh" ? target.id ?? null : null
        }
      });

      setAiTextureState({
        isGenerating: false,
        errorMessage: null,
        result,
        lastSeed: payload.seed
      });
    } catch (error) {
      setAiTextureState({
        isGenerating: false,
        errorMessage: getApiErrorMessage(error, t("editor.aiPbr.generateFailed"))
      });
    }
  };

  return {
    handleTextureSubmit
  };
}
