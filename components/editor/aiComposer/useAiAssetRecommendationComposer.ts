"use client";

import { recommendAiExternalAssets } from "@/frontend/api/ai";
import { getApiErrorMessage } from "@/lib/http/axios";
import {
  GROUND_HELPER_NODE_ID,
  SCENE_NODE_ID,
  type EditorApp
} from "@/render/editor";
import type {
  AiExternalAssetRecommendationBundle,
  AiExternalAssetRecommendationSelectedTarget
} from "@/lib/api/contracts/ai";

type AiAssetRecommendationState = {
  prompt: string;
  isGenerating: boolean;
  isApplying: boolean;
};

type Params = {
  app: EditorApp | null;
  aiAssetRecommendations: AiAssetRecommendationState;
  isPromptActionPending: boolean;
  setAiAssetRecommendationState: (payload: {
    isGenerating?: boolean;
    errorMessage?: string | null;
    applyMessage?: string | null;
    bundles?: AiExternalAssetRecommendationBundle[];
    selectedItemIds?: Record<string, boolean>;
    lastTraceId?: string | null;
    cacheHit?: boolean;
  }) => void;
  t: (key: any, params?: Record<string, string | number>) => string;
};

function collectRecommendationItemIds(bundles: AiExternalAssetRecommendationBundle[]) {
  const itemIds: Record<string, boolean> = {};

  bundles.forEach((bundle) => {
    if (bundle.hdri) {
      itemIds[bundle.hdri.id] = true;
    }

    bundle.textures.forEach((texture) => {
      itemIds[texture.id] = true;
    });

    bundle.models.forEach((model) => {
      itemIds[model.id] = true;
    });
  });

  return itemIds;
}

function resolveSelectedTarget(app: EditorApp | null): AiExternalAssetRecommendationSelectedTarget | null {
  const selectedEntityId = app?.getSelectedEntityId() ?? null;
  const project = app?.projectModel;

  if (!selectedEntityId || !project) {
    return null;
  }

  if (selectedEntityId === SCENE_NODE_ID) {
    return {
      kind: "scene",
      id: SCENE_NODE_ID,
      label: "Scene"
    };
  }

  if (selectedEntityId === GROUND_HELPER_NODE_ID) {
    return {
      kind: "ground",
      id: GROUND_HELPER_NODE_ID,
      label: "Ground"
    };
  }

  const entityRecord = project.getEntityById(selectedEntityId);
  if (!entityRecord) {
    return null;
  }

  if (entityRecord.kind === "light") {
    return null;
  }

  return {
    kind: entityRecord.kind,
    id: entityRecord.item.id,
    label: entityRecord.item.label
  };
}

function buildSceneContext(app: EditorApp | null) {
  const project = app?.projectModel;
  if (!project) return undefined;

  return {
    entityLabels: [
      ...Array.from(project.groups.values()),
      ...Array.from(project.models.values()),
      ...Array.from(project.meshes.values()),
      ...Array.from(project.lights.values())
    ]
      .map((entity) => entity.label)
      .filter((label) => label.trim().length > 0)
      .slice(0, 40),
    selectedEntityId: app.getSelectedEntityId(),
    environmentLabel: project.envConfig.panoAssetName || project.envConfig.panoUrl || undefined
  };
}

export function useAiAssetRecommendationComposer({
  app,
  aiAssetRecommendations,
  isPromptActionPending,
  setAiAssetRecommendationState,
  t
}: Params) {
  const handleAssetRecommendationSubmit = async () => {
    const trimmedPrompt = aiAssetRecommendations.prompt.trim();
    if (
      !trimmedPrompt ||
      aiAssetRecommendations.isGenerating ||
      aiAssetRecommendations.isApplying ||
      isPromptActionPending
    ) {
      return;
    }

    setAiAssetRecommendationState({
      isGenerating: true,
      errorMessage: null,
      applyMessage: null
    });

    try {
      const payload = await recommendAiExternalAssets({
        prompt: trimmedPrompt,
        scope: "scene",
        selectedTarget: resolveSelectedTarget(app),
        sceneContext: buildSceneContext(app)
      });

      setAiAssetRecommendationState({
        isGenerating: false,
        errorMessage: null,
        bundles: payload.bundles,
        selectedItemIds: collectRecommendationItemIds(payload.bundles),
        lastTraceId: payload.traceId,
        cacheHit: payload.cacheHit
      });
    } catch (error) {
      setAiAssetRecommendationState({
        isGenerating: false,
        errorMessage: getApiErrorMessage(error, t("editor.aiAssets.generateFailed"))
      });
    }
  };

  return {
    handleAssetRecommendationSubmit
  };
}
