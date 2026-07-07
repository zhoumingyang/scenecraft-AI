"use client";

import { recommendAiExternalAssets } from "@/frontend/api/ai";
import { getApiErrorMessage } from "@/lib/http/axios";
import type { TranslationFunction } from "@/lib/i18n";
import {
  GROUND_HELPER_NODE_ID,
  SCENE_NODE_ID,
  type EditorApp
} from "@/render/editor";
import type {
  AiExternalAssetRecommendationBundle,
  AiExternalAssetRecommendationFile,
  AiExternalAssetRecommendationAsset,
  AiExternalAssetRecommendationSelectedTarget
} from "@/lib/api/contracts/ai";
import type { ExternalAssetSourceJSON } from "@/lib/externalAssets/types";
import type { MeshMaterialPatch } from "@/render/editor";

type AiAssetRecommendationState = {
  prompt: string;
  isGenerating: boolean;
  isApplying: boolean;
  selectedItemIds: Record<string, boolean>;
};

type Params = {
  app: EditorApp | null;
  aiAssetRecommendations: AiAssetRecommendationState;
  isPromptActionPending: boolean;
  setAiAssetRecommendationState: (payload: {
    isGenerating?: boolean;
    isApplying?: boolean;
    errorMessage?: string | null;
    applyMessage?: string | null;
    bundles?: AiExternalAssetRecommendationBundle[];
    selectedItemIds?: Record<string, boolean>;
    lastTraceId?: string | null;
    cacheHit?: boolean;
  }) => void;
  t: TranslationFunction;
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

function createRecommendationExternalSource(
  asset: AiExternalAssetRecommendationAsset,
  file: AiExternalAssetRecommendationFile
): ExternalAssetSourceJSON {
  return {
    provider: asset.provider,
    assetId: asset.assetId,
    assetType: asset.assetType,
    displayName: asset.displayName,
    pageUrl: asset.pageUrl,
    licenseLabel: asset.licenseLabel,
    authorLabel: asset.authorLabel,
    selectedFile: {
      url: file.url,
      fileName: file.fileName,
      sizeBytes: file.sizeBytes,
      md5: file.md5,
      ...(file.includes && file.includes.length > 0
        ? {
            includes: file.includes
          }
        : {})
    },
    resolution: file.resolution,
    format: file.format
  };
}

function getActiveMeshId(app: EditorApp | null) {
  const selectedEntityId = app?.getSelectedEntityId() ?? null;
  if (!app || !selectedEntityId) return null;

  const record = app.projectModel?.getEntityById(selectedEntityId);
  return record?.kind === "mesh" ? record.item.id : null;
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

  const handleAssetRecommendationApply = async (bundle: AiExternalAssetRecommendationBundle) => {
    if (!app || aiAssetRecommendations.isApplying) {
      return;
    }

    setAiAssetRecommendationState({
      isApplying: true,
      errorMessage: null,
      applyMessage: null
    });

    const failures: string[] = [];
    const isSelected = (itemId: string) => aiAssetRecommendations.selectedItemIds[itemId] ?? true;

    try {
      if (bundle.hdri && isSelected(bundle.hdri.id)) {
        try {
          app.updateSceneEnvConfig({
            panoAssetId: "",
            panoAssetName: bundle.hdri.file.fileName,
            panoUrl: bundle.hdri.file.url,
            externalSource: createRecommendationExternalSource(bundle.hdri.asset, bundle.hdri.file)
          });
          app.setSelectedEntity(SCENE_NODE_ID);
        } catch {
          failures.push(bundle.hdri.asset.displayName);
        }
      }

      for (const texture of bundle.textures) {
        if (!isSelected(texture.id)) continue;

        try {
          const patch: MeshMaterialPatch = {};
          texture.maps.forEach((textureMap) => {
            (patch as Record<string, unknown>)[textureMap.materialField] = {
              assetId: "",
              url: textureMap.file.url,
              externalSource: createRecommendationExternalSource(texture.asset, textureMap.file)
            };
          });

          if (texture.target === "ground") {
            app.updateGroundMaterial(patch);
          } else {
            const targetId = texture.targetId ?? getActiveMeshId(app);
            if (!targetId) {
              throw new Error("No mesh target is selected.");
            }
            app.updateMeshMaterial(targetId, patch);
          }
        } catch {
          failures.push(texture.asset.displayName);
        }
      }

      for (const model of bundle.models) {
        if (!isSelected(model.id)) continue;

        try {
          if (model.file.format !== "gltf" && model.file.format !== "fbx") {
            throw new Error("Unsupported model format.");
          }

          await app.importModelFromSource({
            sourceUrl: model.file.url,
            format: model.file.format,
            label: model.asset.displayName,
            externalSource: createRecommendationExternalSource(model.asset, model.file)
          });
        } catch {
          failures.push(model.asset.displayName);
        }
      }

      setAiAssetRecommendationState({
        isApplying: false,
        applyMessage:
          failures.length > 0
            ? t("editor.aiAssets.applyPartialFailed", { count: failures.length })
            : t("editor.aiAssets.applySucceeded")
      });
    } catch (error) {
      setAiAssetRecommendationState({
        isApplying: false,
        errorMessage: getApiErrorMessage(error, t("editor.aiAssets.applyFailed"))
      });
    }
  };

  return {
    handleAssetRecommendationSubmit,
    handleAssetRecommendationApply
  };
}
