import { useRef, useState, type ChangeEvent } from "react";
import { createExternalAssetSource } from "@/lib/externalAssets/source";
import {
  SCENE_NODE_ID,
  inferModelFileFormat,
  isHighDynamicRangeEnvironmentAssetName,
  type EditorApp
} from "@/render/editor";
import type { EditorStoreState } from "@/stores/editorStore";
import { readImageDimensions } from "@/components/editor/projectPersistence";
import type {
  ExternalHdriApplyPayload,
  ExternalModelApplyPayload
} from "@/components/editor/externalAssetBrowserDialog";
import type { TopBarTranslate } from "./types";

type UseTopBarImportActionsOptions = {
  app: EditorApp | null;
  isPolyhavenEnabled: boolean;
  isStudioSceneActive: boolean;
  notify: (options: { message: string; title?: string; confirmLabel?: string }) => Promise<void>;
  registerLocalProjectAsset: EditorStoreState["registerLocalProjectAsset"];
  t: TopBarTranslate;
};

export function useTopBarImportActions({
  app,
  isPolyhavenEnabled,
  isStudioSceneActive,
  notify,
  registerLocalProjectAsset,
  t
}: UseTopBarImportActionsOptions) {
  const modelImportInputRef = useRef<HTMLInputElement | null>(null);
  const panoImportInputRef = useRef<HTMLInputElement | null>(null);
  const [polyhavenHdriDialogOpen, setPolyhavenHdriDialogOpen] = useState(false);
  const [polyhavenModelDialogOpen, setPolyhavenModelDialogOpen] = useState(false);

  const onImportModel = () => {
    modelImportInputRef.current?.click();
  };

  const onImportPano = () => {
    panoImportInputRef.current?.click();
  };

  const onImportLibraryHdri = () => {
    if (!isPolyhavenEnabled) {
      return;
    }

    setPolyhavenHdriDialogOpen(true);
  };

  const onImportLibraryModel = () => {
    if (!isPolyhavenEnabled) {
      return;
    }

    setPolyhavenModelDialogOpen(true);
  };

  const onImportModelFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!app || !file) return;
    if (!inferModelFileFormat(file.name)) return;

    const imported = await app.importModel(file);
    if (!imported) {
      return;
    }

    if (!isStudioSceneActive) {
      registerLocalProjectAsset({
        sourceUrl: imported.sourceUrl,
        file,
        kind: "model_source",
        targetPath: `model:${imported.entityId}`,
        entityId: imported.entityId
      });
    }
  };

  const onImportPanoFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!app || !file) return;

    if (isHighDynamicRangeEnvironmentAssetName(file.name)) {
      try {
        const imported = await app.importPanorama(file);
        if (imported?.sourceUrl && !isStudioSceneActive) {
          registerLocalProjectAsset({
            sourceUrl: imported.sourceUrl,
            file,
            kind: "environment_image",
            targetPath: "env:pano"
          });
        }
      } catch {
        await notify({ message: t("editor.import.panoLoadError") });
      }
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    try {
      const dimensions = await readImageDimensions(imageUrl);
      if (dimensions.width !== dimensions.height * 2) {
        await notify({ message: t("editor.import.panoRatioError") });
        return;
      }

      const imported = await app.importPanorama(file);
      if (imported?.sourceUrl && !isStudioSceneActive) {
        registerLocalProjectAsset({
          sourceUrl: imported.sourceUrl,
          file,
          kind: "environment_image",
          targetPath: "env:pano"
        });
      }
    } catch {
      await notify({ message: t("editor.import.panoLoadError") });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const onApplyExternalHdri = async ({ asset, file }: ExternalHdriApplyPayload) => {
    if (!app) {
      return;
    }

    await app.dispatch({
      type: "scene.envConfig.patch",
      patch: {
        panoAssetId: "",
        panoAssetName: file.fileName,
        panoUrl: file.url,
        externalSource: createExternalAssetSource(asset, file)
      },
      source: "ui"
    });
    app.setSelectedEntity(SCENE_NODE_ID);
  };

  const onApplyExternalModel = async ({ asset, file }: ExternalModelApplyPayload) => {
    if (!app) {
      return;
    }

    await app.importModelFromSource({
      sourceUrl: file.url,
      format: file.format,
      label: asset.displayName,
      externalSource: createExternalAssetSource(asset, file)
    });
  };

  return {
    closePolyhavenHdriDialog: () => setPolyhavenHdriDialogOpen(false),
    closePolyhavenModelDialog: () => setPolyhavenModelDialogOpen(false),
    modelImportInputRef,
    onApplyExternalHdri,
    onApplyExternalModel,
    onImportLibraryHdri,
    onImportLibraryModel,
    onImportModel,
    onImportModelFile,
    onImportPano,
    onImportPanoFile,
    panoImportInputRef,
    polyhavenHdriDialogOpen,
    polyhavenModelDialogOpen
  };
}
