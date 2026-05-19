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
  GROUND_HELPER_NODE_ID,
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
    target?: AiTextureTarget | null;
  }) => void;
  t: (key: any, params?: Record<string, string | number>) => string;
};

function resolveCurrentTextureTarget(app: EditorApp | null): AiTextureTarget | null {
  const entityId = app?.getSelectedEntityId() ?? null;
  const project = app?.projectModel;
  if (!entityId || !project) return null;

  if (entityId === GROUND_HELPER_NODE_ID) {
    if (!project.envConfig.ground.visible || project.envConfig.ground.mode !== "plane") {
      return null;
    }

    return {
      kind: "ground",
      label: "Ground"
    };
  }

  const record = project.getEntityById(entityId);
  if (!record || record.kind !== "mesh") {
    return null;
  }

  return {
    kind: "mesh",
    id: record.item.id,
    label: record.item.label || "Mesh"
  };
}

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
    const activeTarget = resolveCurrentTextureTarget(app) ?? target;

    setAiTextureState({
      isGenerating: true,
      errorMessage: null
    });

    try {
      const payload = await generateAiPbrTexture({
        prompt: trimmedPrompt,
        targetKind: activeTarget?.kind,
        targetId: activeTarget?.kind === "mesh" ? activeTarget.id : undefined
      });
      const result: AiTextureResult = {
        atlasImageUrl: payload.atlasImageUrl,
        prompt: trimmedPrompt,
        model: payload.model,
        seed: payload.seed,
        traceId: payload.traceId,
        layoutVersion: payload.layoutVersion
      };
      const appliedMeshIds =
        activeTarget?.kind === "mesh" && activeTarget.id ? [activeTarget.id] : [];

      if (app && activeTarget) {
        const patch = createPbrAtlasMaterialPatch({
          url: payload.atlasImageUrl
        });

        if (activeTarget.kind === "mesh" && activeTarget.id) {
          app.updateMeshMaterial(activeTarget.id, patch);
        } else if (activeTarget.kind === "ground") {
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
          targetKind: activeTarget?.kind,
          targetId: activeTarget?.kind === "mesh" ? activeTarget.id ?? null : null
        }
      });

      setAiTextureState({
        isGenerating: false,
        errorMessage: null,
        result,
        lastSeed: payload.seed,
        target: activeTarget
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
