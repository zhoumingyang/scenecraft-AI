"use client";

import { useMemo, useState } from "react";
import { Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CenterFocusStrongRoundedIcon from "@mui/icons-material/CenterFocusStrongRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
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
  GROUND_HELPER_NODE_ID,
  isStudioScenePreviewEntity,
  SCENE_NODE_ID,
  type ProjectAiLibraryV2JSON,
  type StudioProductProfile
} from "@/render/editor";
import { useEditorStore, type PendingAiAsset } from "@/stores/editorStore";
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
import ProjectAiLibraryDialog from "@/components/editor/projectAiLibraryDialog";
import StudioSceneEntryDialog from "@/components/editor/studioSceneEntryDialog";
import StudioScenePropertySection from "@/components/editor/studioScenePropertySection";
import { getLightTypeLabel, getTextureDialogTitle } from "@/components/editor/propertyPanelSections/util";
import { getEditorThemeTokens } from "@/components/editor/theme";

const PANEL_WIDTH = 272;
const COLLAPSED_VISIBLE_WIDTH = 44;
const CLOSED_AI_LIBRARY: ProjectAiLibraryV2JSON = { version: 2, assets: [] };
const CLOSED_PENDING_AI_ASSETS: PendingAiAsset[] = [];

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
  const sceneTreeVersion = useEditorStore((state) => (open ? state.sceneTreeVersion : 0));
  const inspectorMode = useEditorStore((state) => (open ? state.aiImage.inspectorMode : "entity"));
  const aiMode = useEditorStore((state) => (open ? state.aiMode : "image"));
  const aiTexture = useEditorStore((state) => (open ? state.aiTexture : null));
  const loadedAiLibrary = useEditorStore((state) =>
    open ? state.loadedAiLibrary : CLOSED_AI_LIBRARY
  );
  const pendingAiAssets = useEditorStore((state) =>
    open ? state.pendingAiAssets : CLOSED_PENDING_AI_ASSETS
  );
  const studioScene = useEditorStore((state) => (open ? state.studioScene : null));
  const [activeTextureField, setActiveTextureField] = useState<TextureFieldKey | null>(null);
  const [materialLibraryOpen, setMaterialLibraryOpen] = useState(false);
  const [aiLibraryOpen, setAiLibraryOpen] = useState(false);
  const [studioEntryTargetId, setStudioEntryTargetId] = useState<string | null>(null);
  const [studioEntryProfile, setStudioEntryProfile] = useState<StudioProductProfile | null>(null);
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
  }, [app, open, sceneTreeVersion, selectedEntityId, selectedEntityVersion, viewStateVersion]);

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
  const isStudioSceneActive = Boolean(studioScene?.active);
  const canIsolateCurrentEntity =
    inspectorMode !== "ai" &&
    !isStudioSceneActive &&
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
  const canPreviewCurrentEntityInStudio =
    inspectorMode !== "ai" &&
    !isStudioSceneActive &&
    Boolean(
      app?.projectModel &&
        currentIsolatableEntityId &&
        isStudioScenePreviewEntity(app.projectModel, currentIsolatableEntityId)
    );
  const isCurrentEntityInStudio = Boolean(
    studioScene?.active && currentIsolatableEntityId && studioScene.targetEntityId === currentIsolatableEntityId
  );
  const studioEntityMetadata = useMemo(
    () => (studioScene?.active ? app?.getStudioSceneEntityMetadata(selectedEntityId) ?? null : null),
    [app, selectedEntityId, studioScene?.active, viewStateVersion]
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
                    spacing={1}
                    justifyContent="center"
                    sx={{ height: "100%", minHeight: 180, color: theme.mutedText }}
                  >
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                      {t("editor.properties.none")}
                    </Typography>
                    <Typography sx={{ fontSize: 12 }}>
                      {aiMode === "texture"
                        ? t("editor.aiPbr.emptyTargetHint")
                        : t("editor.properties.emptyHint")}
                    </Typography>
                    {aiMode === "texture" && aiTexture?.isGenerating ? (
                      <Stack
                        direction="row"
                        spacing={0.7}
                        alignItems="center"
                        sx={{
                          mt: 0.4,
                          px: 1,
                          py: 0.9,
                          borderRadius: 1,
                          border: theme.sectionBorder,
                          background: theme.itemBg
                        }}
                      >
                        <CircularProgress size={14} sx={{ color: theme.titleText }} />
                        <Typography sx={{ fontSize: 11, color: theme.text }}>
                          {t("editor.aiPbr.generating")}
                        </Typography>
                      </Stack>
                    ) : null}
                    {aiMode === "texture" && aiTexture?.result ? (
                      <Box
                        role="button"
                        tabIndex={0}
                        onClick={() => setAiLibraryOpen(true)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          setAiLibraryOpen(true);
                        }}
                        sx={{
                          mt: 0.6,
                          width: "100%",
                          borderRadius: 1.2,
                          border: theme.sectionBorder,
                          background: theme.sectionBg,
                          overflow: "hidden",
                          cursor: "pointer",
                          "&:hover, &:focus-visible": {
                            outline: "none",
                            border: theme.itemSelectedBorder
                          }
                        }}
                      >
                        <Box
                          component="img"
                          src={aiTexture.result.atlasImageUrl}
                          alt={aiTexture.result.prompt}
                          sx={{
                            width: "100%",
                            aspectRatio: "1 / 1",
                            objectFit: "cover",
                            display: "block",
                            borderBottom: theme.sectionBorder
                          }}
                        />
                        <Stack direction="row" spacing={0.6} alignItems="center" sx={{ p: 0.8 }}>
                          <AutoAwesomeRoundedIcon sx={{ fontSize: 15, color: theme.titleText }} />
                          <Typography
                            sx={{
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: 11,
                              color: theme.text
                            }}
                          >
                            {t("editor.aiPbr.openAssets")}
                          </Typography>
                        </Stack>
                      </Box>
                    ) : null}
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
                      {canPreviewCurrentEntityInStudio && currentIsolatableEntityId ? (
                        <Tooltip
                          title={
                            isCurrentEntityInStudio
                              ? t("editor.studioScene.title")
                              : t("editor.studioScene.enter")
                          }
                          arrow
                        >
                          <IconButton
                            size="small"
                            onClick={() => {
                              if (!app || !currentIsolatableEntityId) return;
                              setStudioEntryTargetId(currentIsolatableEntityId);
                              setStudioEntryProfile(app.suggestStudioProductProfile(currentIsolatableEntityId));
                            }}
                            sx={{
                              color: isCurrentEntityInStudio ? theme.pillText : theme.mutedText,
                              border: theme.sectionBorder,
                              background: isCurrentEntityInStudio ? theme.iconButtonBg : "transparent",
                              "&:hover": {
                                background: theme.iconButtonBg
                              }
                            }}
                          >
                            <PhotoCameraRoundedIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </Stack>

                    {entityRecord.kind === "scene" ? (
                      <SceneSettingsSection
                        envConfig={entityRecord.envConfig}
                        onPanoramaPreviewClick={() => setAiLibraryOpen(true)}
                      />
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

                    <StudioScenePropertySection
                      app={app}
                      isSceneSelected={selectedEntityId === SCENE_NODE_ID}
                      metadata={studioEntityMetadata}
                      selectedEntityId={selectedEntityId}
                      studioScene={studioScene}
                      theme={theme}
                    />

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
            onApplyPbrAtlas={({ imageUrl, assetId }) => {
              const patch = createPbrAtlasMaterialPatch({
                url: imageUrl,
                assetId
              });

              if (entityRecord.kind === "gridHelper") {
                app?.updateGroundMaterial(patch);
                return;
              }

              app?.updateMeshMaterial(entityRecord.item.id, patch);
            }}
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

        <ProjectAiLibraryDialog
          open={aiLibraryOpen}
          theme={theme}
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
