"use client";

import { useState } from "react";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  ExternalAssetBrowserDialog,
  type ExternalTextureApplyPayload
} from "@/components/editor/externalAssetBrowserDialog";
import { isPolyhavenProviderEnabled } from "@/lib/externalAssets/config";
import { useI18n } from "@/lib/i18n";
import { createExternalAssetSource } from "@/lib/externalAssets/source";
import {
  createPbrAtlasMaterialPatch,
  SCENE_NODE_ID,
  type StudioProductProfile
} from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import {
  AdvancedMaterialDialog,
  TextureConfigDialog,
  TextureFieldKey
} from "@/components/editor/propertyPanelSections";
import { BASE_MATERIAL_TEXTURE_FIELDS } from "@/render/editor/materials/materialFields";
import ProjectAiLibraryDialog from "@/components/editor/projectAiLibraryDialog";
import StudioSceneEntryDialog from "@/components/editor/studioSceneEntryDialog";
import { getTextureDialogTitle } from "@/components/editor/propertyPanelSections/util";
import { getEditorThemeTokens } from "@/components/editor/theme";
import {
  COLLAPSED_VISIBLE_WIDTH,
  PANEL_WIDTH
} from "@/components/editor/propertyPanel/constants";
import { PropertyPanelContent } from "@/components/editor/propertyPanel/propertyPanelContent";
import { usePropertyPanelState } from "@/components/editor/propertyPanel/usePropertyPanelState";

export default function PropertyPanel() {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const [activeTextureField, setActiveTextureField] = useState<TextureFieldKey | null>(null);
  const [materialLibraryOpen, setMaterialLibraryOpen] = useState(false);
  const [advancedMaterialOpen, setAdvancedMaterialOpen] = useState(false);
  const [aiLibraryOpen, setAiLibraryOpen] = useState(false);
  const [studioEntryTargetId, setStudioEntryTargetId] = useState<string | null>(null);
  const [studioEntryProfile, setStudioEntryProfile] = useState<StudioProductProfile | null>(null);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const {
    app,
    selectedEntityId,
    selectedEntityIds,
    selectedCsgOperandEntityIds,
    isMultiSelection,
    inspectorMode,
    aiMode,
    aiTexture,
    loadedAiLibrary,
    pendingAiAssets,
    studioScene,
    entityRecord,
    panelTitle,
    studioEntityMetadata,
    studioPostProcessingState,
    isCsgOperandMultiSelection,
    canIsolateCurrentEntity,
    currentIsolatableEntityId,
    isCurrentEntityIsolated,
    canPreviewCurrentEntityInStudio,
    isCurrentEntityInStudio
  } = usePropertyPanelState(open, t);
  const theme = getEditorThemeTokens(editorThemeMode);
  const isPolyhavenEnabled = isPolyhavenProviderEnabled();
  const materialPanelTarget =
    entityRecord?.kind === "mesh" ||
    entityRecord?.kind === "gridHelper"
      ? entityRecord
      : null;

  const handleApplyTextureSet = ({ asset, selections }: ExternalTextureApplyPayload) => {
    if (!app || (entityRecord?.kind !== "mesh" && entityRecord?.kind !== "gridHelper")) {
      return;
    }

    const materialPatch = selections.reduce<Record<string, unknown>>((patch, selection) => {
      patch[selection.materialField] = {
        ...entityRecord.item.material[selection.materialField],
        assetId: "",
        url: selection.file.url,
        externalSource: createExternalAssetSource(asset, selection.file)
      };
      return patch;
    }, {});

    if (entityRecord.kind === "gridHelper") {
      app.updateGroundMaterial(materialPatch);
      return;
    }

    app.updateMeshMaterial(entityRecord.item.id, materialPatch);
  };

  const handleApplyPanorama = ({
    imageUrl,
    assetId,
    assetName
  }: {
    imageUrl: string;
    assetId?: string;
    assetName?: string;
  }) => {
    app?.updateSceneEnvConfig({
      panoAssetId: assetId ?? "",
      panoAssetName: assetName ?? imageUrl,
      panoUrl: imageUrl,
      externalSource: null
    });
    app?.setSelectedEntity(SCENE_NODE_ID);
  };

  const handleStudioEntryOpen = (entityId: string) => {
    if (!app) return;
    setStudioEntryTargetId(entityId);
    setStudioEntryProfile(app.suggestStudioProductProfile(entityId));
  };

  return (
    <Box
      sx={{
        position: "absolute",
        right: 0,
        top: 72,
        zIndex: 21,
        width: PANEL_WIDTH,
        maxWidth: `calc(100vw - 20px)`,
        height: "min(calc(100vh - 88px), 760px)",
        transform: open ? "translateX(0)" : `translateX(${PANEL_WIDTH - COLLAPSED_VISIBLE_WIDTH}px)`,
        transition: "transform 180ms ease"
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: "100%",
          borderRadius: "10px 0 0 10px",
          border: theme.panelBorder,
          borderRight: 0,
          background: theme.panelBg,
          backdropFilter: "blur(12px)",
          boxShadow: theme.panelShadow,
          overflow: "visible"
        }}
      >
        <Box
          sx={{
            height: "100%",
            borderRadius: "10px 0 0 10px",
            overflow: "hidden",
            background: theme.panelBg
          }}
        >
          <Stack spacing={1} sx={{ height: "100%", p: open ? 1.05 : 0.7 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <IconButton
                size="small"
                onClick={() => setOpen((value) => !value)}
                sx={{
                  color: theme.titleText,
                  border: theme.sectionBorder,
                  background: theme.iconButtonBg
                }}
              >
                <TuneRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
              {open ? (
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: theme.titleText
                  }}
                >
                  {t("editor.properties.title")}
                </Typography>
              ) : null}
            </Stack>

            {open ? (
              <PropertyPanelContent
                app={app}
                aiMode={aiMode}
                aiTexture={aiTexture}
                canIsolateCurrentEntity={canIsolateCurrentEntity}
                canPreviewCurrentEntityInStudio={canPreviewCurrentEntityInStudio}
                currentIsolatableEntityId={currentIsolatableEntityId}
                entityRecord={entityRecord}
                inspectorMode={inspectorMode}
                isCurrentEntityInStudio={isCurrentEntityInStudio}
                isCurrentEntityIsolated={isCurrentEntityIsolated}
                isCsgOperandMultiSelection={isCsgOperandMultiSelection}
                isMultiSelection={isMultiSelection}
                isPolyhavenEnabled={isPolyhavenEnabled}
                panelTitle={panelTitle}
                selectedEntityId={selectedEntityId}
                selectedEntityIds={selectedEntityIds}
                selectedCsgOperandEntityIds={selectedCsgOperandEntityIds}
                studioEntityMetadata={studioEntityMetadata}
                studioPostProcessingState={studioPostProcessingState}
                studioScene={studioScene}
                theme={theme}
                t={t}
                onAiLibraryOpen={() => setAiLibraryOpen(true)}
                onAdvancedMaterialOpen={() => setAdvancedMaterialOpen(true)}
                onMaterialLibraryOpen={() => setMaterialLibraryOpen(true)}
                onStudioEntryOpen={handleStudioEntryOpen}
                onTextureConfigOpen={setActiveTextureField}
              />
            ) : null}
          </Stack>
        </Box>

        {materialPanelTarget && activeTextureField ? (
          <TextureConfigDialog
            open
            entityId={materialPanelTarget.kind === "mesh" ? materialPanelTarget.item.id : undefined}
            textureField={activeTextureField}
            title={getTextureDialogTitle(activeTextureField, t)}
            texture={materialPanelTarget.item.material[activeTextureField]}
            targetPath={
              materialPanelTarget.kind === "gridHelper"
                ? `ground:${activeTextureField}`
                : `mesh:${materialPanelTarget.item.id}:${activeTextureField}`
            }
            onTexturePatch={
              materialPanelTarget.kind === "gridHelper"
                ? (texture) => app?.updateGroundMaterial({ [activeTextureField]: texture })
                : undefined
            }
            onApplyPbrAtlas={
              (BASE_MATERIAL_TEXTURE_FIELDS as readonly string[]).includes(activeTextureField)
                ? ({ imageUrl, assetId }) => {
                    const patch = createPbrAtlasMaterialPatch({
                      url: imageUrl,
                      assetId
                    });

                    if (materialPanelTarget.kind === "gridHelper") {
                      app?.updateGroundMaterial(patch);
                      return;
                    }

                    app?.updateMeshMaterial(materialPanelTarget.item.id, patch);
                  }
                : undefined
            }
            onClose={() => setActiveTextureField(null)}
          />
        ) : null}

        {materialPanelTarget ? (
          <AdvancedMaterialDialog
            open={advancedMaterialOpen}
            entityId={materialPanelTarget.kind === "mesh" ? materialPanelTarget.item.id : undefined}
            material={materialPanelTarget.item.material}
            onMaterialPatch={
              materialPanelTarget.kind === "gridHelper"
                ? (patch) => app?.updateGroundMaterial(patch)
                : undefined
            }
            onTextureConfigOpen={setActiveTextureField}
            onClose={() => setAdvancedMaterialOpen(false)}
          />
        ) : null}

        {materialPanelTarget && isPolyhavenEnabled ? (
          <ExternalAssetBrowserDialog
            open={materialLibraryOpen}
            assetType="texture"
            onClose={() => setMaterialLibraryOpen(false)}
            onApplyTexture={handleApplyTextureSet}
          />
        ) : null}

        <ProjectAiLibraryDialog
          open={aiLibraryOpen}
          loadedLibrary={loadedAiLibrary}
          pendingAssets={pendingAiAssets}
          mode={entityRecord?.kind === "scene" ? "apply" : "manage"}
          allowedKinds={entityRecord?.kind === "scene" ? ["panorama"] : undefined}
          onClose={() => setAiLibraryOpen(false)}
          onApplyPanorama={handleApplyPanorama}
        />
        <StudioSceneEntryDialog
          open={Boolean(studioEntryTargetId)}
          initialProfile={studioEntryProfile}
          onClose={() => {
            setStudioEntryTargetId(null);
            setStudioEntryProfile(null);
          }}
          onConfirm={(productProfile) => {
            if (app && studioEntryTargetId) {
              void app.enterStudioScene(studioEntryTargetId, { productProfile });
            }
            setStudioEntryTargetId(null);
            setStudioEntryProfile(null);
          }}
        />
      </Box>
    </Box>
  );
}
