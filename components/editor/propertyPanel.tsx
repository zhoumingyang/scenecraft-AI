"use client";

import { useMemo, useState } from "react";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import CenterFocusStrongRoundedIcon from "@mui/icons-material/CenterFocusStrongRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  ExternalAssetBrowserDialog,
  type ExternalTextureApplyPayload
} from "@/components/editor/externalAssetBrowserDialog";
import { isPolyhavenProviderEnabled } from "@/lib/externalAssets/config";
import { useI18n } from "@/lib/i18n";
import { createExternalAssetSource } from "@/lib/externalAssets/source";
import { GROUND_HELPER_NODE_ID, SCENE_NODE_ID } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import {
  GroundScaleSection,
  LightSettingsSection,
  MeshAppearanceSection,
  ModelAnimationSection,
  SceneSettingsSection,
  TextureConfigDialog,
  TextureFieldKey,
  TransformSection
} from "@/components/editor/propertyPanelSections";
import AiImagePropertyPanel from "@/components/editor/aiImagePropertyPanel";
import { getLightTypeLabel, getTextureDialogTitle } from "@/components/editor/propertyPanelSections/util";
import { getEditorThemeTokens } from "@/components/editor/theme";

const PANEL_WIDTH = 272;
const COLLAPSED_VISIBLE_WIDTH = 44;

export default function PropertyPanel() {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const app = useEditorStore((state) => (open ? state.app : null));
  const selectedEntityId = useEditorStore((state) => (open ? state.selectedEntityId : null));
  const viewStateVersion = useEditorStore((state) => (open ? state.viewStateVersion : 0));
  const selectedEntityVersion = useEditorStore((state) =>
    open && selectedEntityId ? state.entityVersions[selectedEntityId] ?? 0 : 0
  );
  const inspectorMode = useEditorStore((state) => (open ? state.aiImage.inspectorMode : "entity"));
  const [activeTextureField, setActiveTextureField] = useState<TextureFieldKey | null>(null);
  const [materialLibraryOpen, setMaterialLibraryOpen] = useState(false);
  const theme = getEditorThemeTokens(editorThemeMode);
  const isPolyhavenEnabled = isPolyhavenProviderEnabled();

  const entityRecord = useMemo(() => {
    if (!open) return null;
    const project = app?.projectModel;
    if (!project || !selectedEntityId) return null;
    if (selectedEntityId === SCENE_NODE_ID) {
      return {
        kind: "scene" as const,
        envConfig: project.envConfig
      };
    }

    if (selectedEntityId === GROUND_HELPER_NODE_ID) {
      if (!project.envConfig.ground.visible) return null;
      return {
        kind: "gridHelper" as const,
        item: project.envConfig.ground
      };
    }

    const record = project.getEntityById(selectedEntityId);
    if (!record) return null;

    return {
      ...record
    };
  }, [app, open, selectedEntityId, selectedEntityVersion, viewStateVersion]);

  const panelTitle =
    inspectorMode === "ai"
      ? t("editor.ai.panelTitle")
      : entityRecord
        ? entityRecord.kind === "scene"
          ? t("editor.sceneTree.scene")
          : entityRecord.kind === "group"
            ? t("editor.sceneTree.group")
          : entityRecord.kind === "model"
            ? t("editor.sceneTree.model")
            : entityRecord.kind === "mesh"
              ? t("editor.sceneTree.meshes")
              : entityRecord.kind === "gridHelper"
                ? t("editor.view.gridHelper")
              : getLightTypeLabel(entityRecord.item.lightType, t)
        : t("editor.properties.none");

  const isolatedEntityId = useMemo(
    () => (open ? app?.getIsolatedEntityId() ?? null : null),
    [app, open, viewStateVersion]
  );
  const canIsolateCurrentEntity =
    inspectorMode !== "ai" &&
    Boolean(
      entityRecord &&
        (entityRecord.kind === "group" || entityRecord.kind === "model" || entityRecord.kind === "mesh")
    );
  const currentIsolatableEntityId =
    entityRecord && (entityRecord.kind === "group" || entityRecord.kind === "model" || entityRecord.kind === "mesh")
      ? entityRecord.item.id
      : null;
  const isCurrentEntityIsolated = Boolean(
    canIsolateCurrentEntity && currentIsolatableEntityId && isolatedEntityId === currentIsolatableEntityId
  );

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
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  maxHeight: "100%",
                  overflowY: "auto",
                  pr: 0.25
                }}
              >
                {inspectorMode === "ai" ? (
                  <AiImagePropertyPanel />
                ) : !entityRecord ? (
                  <Stack
                    spacing={0.7}
                    justifyContent="center"
                    sx={{ height: "100%", minHeight: 180, color: theme.mutedText }}
                  >
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                      {t("editor.properties.none")}
                    </Typography>
                    <Typography sx={{ fontSize: 12 }}>
                      {t("editor.properties.emptyHint")}
                    </Typography>
                  </Stack>
                ) : (
                  <Stack spacing={0.9}>
                    <Stack direction="row" spacing={0.6} alignItems="center" sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          px: 0.15,
                          minWidth: 0,
                          flex: 1,
                          fontSize: 13,
                          fontWeight: 600,
                          color: theme.pillText
                        }}
                      >
                        {panelTitle}
                      </Typography>
                      {canIsolateCurrentEntity && currentIsolatableEntityId ? (
                        <Tooltip
                          title={
                            isCurrentEntityIsolated
                              ? t("editor.properties.restoreVisibility")
                              : t("editor.properties.isolate")
                          }
                          arrow
                        >
                          <IconButton
                            size="small"
                            onClick={() => app?.toggleEntityIsolation(currentIsolatableEntityId)}
                            sx={{
                              color: isCurrentEntityIsolated ? theme.pillText : theme.mutedText,
                              border: theme.sectionBorder,
                              background: isCurrentEntityIsolated ? theme.iconButtonBg : "transparent",
                              "&:hover": {
                                background: theme.iconButtonBg
                              }
                            }}
                          >
                            <CenterFocusStrongRoundedIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </Stack>

                    {entityRecord.kind === "scene" ? (
                      <SceneSettingsSection envConfig={entityRecord.envConfig} />
                    ) : entityRecord.kind === "gridHelper" ? (
                      <GroundScaleSection scale={entityRecord.item.scale} />
                    ) : (
                      <TransformSection
                        entityId={entityRecord.item.id}
                        position={entityRecord.item.position}
                        quaternion={entityRecord.item.quaternion}
                        scaleValues={entityRecord.item.scale}
                      />
                    )}

                    {entityRecord.kind === "mesh" ? (
                      <MeshAppearanceSection
                        entityId={entityRecord.item.id}
                        material={entityRecord.item.material}
                        onTextureConfigOpen={setActiveTextureField}
                        onMaterialLibraryOpen={() => setMaterialLibraryOpen(true)}
                        materialLibraryEnabled={isPolyhavenEnabled}
                      />
                    ) : null}

                    {entityRecord.kind === "gridHelper" && entityRecord.item.mode === "plane" ? (
                      <MeshAppearanceSection
                        material={entityRecord.item.material}
                        onMaterialPatch={(patch) => app?.updateGroundMaterial(patch)}
                        onTextureConfigOpen={setActiveTextureField}
                        onMaterialLibraryOpen={() => setMaterialLibraryOpen(true)}
                        materialLibraryEnabled={isPolyhavenEnabled}
                      />
                    ) : null}

                    {entityRecord.kind === "model" ? (
                      <ModelAnimationSection
                        entityId={entityRecord.item.id}
                        animations={entityRecord.item.animations}
                        activeAnimationId={entityRecord.item.activeAnimationId}
                        timeScale={entityRecord.item.animationTimeScale}
                        playbackState={entityRecord.item.animationPlaybackState}
                        externalSource={entityRecord.item.externalSource}
                      />
                    ) : null}

                    {entityRecord.kind === "light" ? (
                      <LightSettingsSection
                        entityId={entityRecord.item.id}
                        lightType={entityRecord.item.lightType}
                        color={entityRecord.item.color}
                        groundColor={entityRecord.item.groundColor}
                        angle={entityRecord.item.angle}
                        penumbra={entityRecord.item.penumbra}
                        intensity={entityRecord.item.intensity}
                        distance={entityRecord.item.distance}
                        decay={entityRecord.item.decay}
                        width={entityRecord.item.width}
                        height={entityRecord.item.height}
                      />
                    ) : null}
                  </Stack>
                )}
              </Box>
            ) : null}
          </Stack>
        </Box>

        {(entityRecord?.kind === "mesh" || entityRecord?.kind === "gridHelper") && activeTextureField ? (
          <TextureConfigDialog
            open
            entityId={entityRecord.kind === "mesh" ? entityRecord.item.id : undefined}
            textureField={activeTextureField}
            title={getTextureDialogTitle(activeTextureField, t)}
            texture={entityRecord.item.material[activeTextureField]}
            targetPath={
              entityRecord.kind === "gridHelper"
                ? `ground:${activeTextureField}`
                : `mesh:${entityRecord.item.id}:${activeTextureField}`
            }
            onTexturePatch={
              entityRecord.kind === "gridHelper"
                ? (texture) => app?.updateGroundMaterial({ [activeTextureField]: texture })
                : undefined
            }
            onClose={() => setActiveTextureField(null)}
          />
        ) : null}

        {(entityRecord?.kind === "mesh" || entityRecord?.kind === "gridHelper") && isPolyhavenEnabled ? (
          <ExternalAssetBrowserDialog
            open={materialLibraryOpen}
            theme={theme}
            assetType="texture"
            onClose={() => setMaterialLibraryOpen(false)}
            onApplyTexture={handleApplyTextureSet}
          />
        ) : null}
      </Box>
    </Box>
  );
}
