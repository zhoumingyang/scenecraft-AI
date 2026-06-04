"use client";

import { Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CenterFocusStrongRoundedIcon from "@mui/icons-material/CenterFocusStrongRounded";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ViewQuiltRoundedIcon from "@mui/icons-material/ViewQuiltRounded";
import type { useI18n } from "@/lib/i18n";
import type {
  EditorApp,
  StudioScenePostProcessingState,
  StudioSceneState,
  StudioTransientEntityMetadata
} from "@/render/editor";
import type { AiMode, AiTextureSettings } from "@/stores/editorStore";
import {
  GroundScaleSection,
  LightSettingsSection,
  MeshAppearanceSection,
  ModelAnimationSection,
  SceneSettingsSection,
  TextureFieldKey,
  TransformSection
} from "@/components/editor/propertyPanelSections";
import AiImagePropertyPanel from "@/components/editor/aiImagePropertyPanel";
import StudioScenePropertySection from "@/components/editor/studioScenePropertySection";
import { SCENE_NODE_ID } from "@/render/editor";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { STUDIO_RESETTABLE_ENTITY_ROLES } from "./constants";
import type { PropertyPanelEntityRecord } from "./usePropertyPanelState";

type Translate = ReturnType<typeof useI18n>["t"];
type EditorThemeTokens = ReturnType<typeof getEditorThemeTokens>;

type PropertyPanelContentProps = {
  app: EditorApp | null;
  aiMode: AiMode;
  aiTexture: AiTextureSettings | null;
  canIsolateCurrentEntity: boolean;
  canPreviewCurrentEntityInStudio: boolean;
  currentIsolatableEntityId: string | null;
  entityRecord: PropertyPanelEntityRecord | null;
  inspectorMode: "entity" | "ai";
  isCurrentEntityInStudio: boolean;
  isCurrentEntityIsolated: boolean;
  isPolyhavenEnabled: boolean;
  panelTitle: string;
  selectedEntityId: string | null;
  studioEntityMetadata: StudioTransientEntityMetadata | null;
  studioPostProcessingState: StudioScenePostProcessingState | null;
  studioScene: StudioSceneState | null;
  theme: EditorThemeTokens;
  t: Translate;
  onAiLibraryOpen: () => void;
  onMaterialLibraryOpen: () => void;
  onStudioEntryOpen: (entityId: string) => void;
  onTextureConfigOpen: (field: TextureFieldKey) => void;
};

function HeaderActionButton({
  icon,
  title,
  theme,
  t,
  onClick
}: {
  icon: React.ReactNode;
  title: Parameters<Translate>[0];
  theme: EditorThemeTokens;
  t: Translate;
  onClick: () => void;
}) {
  return (
    <Tooltip title={t(title)} arrow>
      <IconButton
        size="small"
        aria-label={t(title)}
        onClick={onClick}
        sx={{
          color: theme.mutedText,
          border: theme.sectionBorder,
          background: "transparent",
          "&:hover": {
            background: theme.iconButtonBg
          }
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}

function StudioHeaderActions({
  app,
  selectedEntityId,
  studioEntityMetadata,
  studioScene,
  theme,
  t
}: Pick<
  PropertyPanelContentProps,
  "app" | "selectedEntityId" | "studioEntityMetadata" | "studioScene" | "theme" | "t"
>) {
  if (studioScene?.active && selectedEntityId === SCENE_NODE_ID) {
    return (
      <HeaderActionButton
        title="editor.studioScene.restorePost"
        onClick={() => app?.resetStudioScenePostProcessing()}
        icon={<RestartAltRoundedIcon sx={{ fontSize: 15 }} />}
        theme={theme}
        t={t}
      />
    );
  }

  if (studioScene?.active && studioEntityMetadata?.role === "root") {
    return (
      <>
        <HeaderActionButton
          title="editor.studioScene.restoreLayout"
          onClick={() => app?.resetStudioSceneGeneratedLayout()}
          icon={<ViewQuiltRoundedIcon sx={{ fontSize: 15 }} />}
          theme={theme}
          t={t}
        />
        <HeaderActionButton
          title="editor.studioScene.restoreLighting"
          onClick={() => app?.resetStudioSceneLighting()}
          icon={<LightbulbRoundedIcon sx={{ fontSize: 15 }} />}
          theme={theme}
          t={t}
        />
      </>
    );
  }

  if (
    studioScene?.active &&
    studioEntityMetadata?.hasDefaultSnapshot &&
    selectedEntityId &&
    STUDIO_RESETTABLE_ENTITY_ROLES.has(studioEntityMetadata.role)
  ) {
    return (
      <HeaderActionButton
        title="editor.studioScene.resetSelected"
        onClick={() => app?.resetStudioSceneEntity(selectedEntityId)}
        icon={<RestartAltRoundedIcon sx={{ fontSize: 15 }} />}
        theme={theme}
        t={t}
      />
    );
  }

  return null;
}

function EmptyPropertyPanel({
  aiMode,
  aiTexture,
  theme,
  t,
  onAiLibraryOpen
}: Pick<PropertyPanelContentProps, "aiMode" | "aiTexture" | "theme" | "t" | "onAiLibraryOpen">) {
  return (
    <Stack spacing={1} justifyContent="center" sx={{ height: "100%", minHeight: 180, color: theme.mutedText }}>
      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
        {t("editor.properties.none")}
      </Typography>
      <Typography sx={{ fontSize: 12 }}>
        {aiMode === "texture" ? t("editor.aiPbr.emptyTargetHint") : t("editor.properties.emptyHint")}
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
          onClick={onAiLibraryOpen}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onAiLibraryOpen();
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
  );
}

function EntityInspectorContent(props: PropertyPanelContentProps) {
  const {
    app,
    canIsolateCurrentEntity,
    canPreviewCurrentEntityInStudio,
    currentIsolatableEntityId,
    entityRecord,
    isCurrentEntityInStudio,
    isCurrentEntityIsolated,
    isPolyhavenEnabled,
    panelTitle,
    selectedEntityId,
    studioEntityMetadata,
    studioPostProcessingState,
    studioScene,
    theme,
    t,
    onAiLibraryOpen,
    onMaterialLibraryOpen,
    onStudioEntryOpen,
    onTextureConfigOpen
  } = props;

  if (!entityRecord) {
    return (
      <EmptyPropertyPanel
        aiMode={props.aiMode}
        aiTexture={props.aiTexture}
        theme={theme}
        t={t}
        onAiLibraryOpen={onAiLibraryOpen}
      />
    );
  }

  return (
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
              isCurrentEntityInStudio ? t("editor.studioScene.title") : t("editor.studioScene.enter")
            }
            arrow
          >
            <IconButton
              size="small"
              onClick={() => onStudioEntryOpen(currentIsolatableEntityId)}
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
        <StudioHeaderActions
          app={app}
          selectedEntityId={selectedEntityId}
          studioEntityMetadata={studioEntityMetadata}
          studioScene={studioScene}
          theme={theme}
          t={t}
        />
      </Stack>

      {entityRecord.kind === "scene" ? (
        <SceneSettingsSection
          envConfig={entityRecord.envConfig}
          onPanoramaPreviewClick={onAiLibraryOpen}
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
        metadata={studioEntityMetadata}
        postProcessingState={studioPostProcessingState}
        selectedEntityId={selectedEntityId}
        studioScene={studioScene}
        theme={theme}
      />

      {entityRecord.kind === "mesh" ? (
        <MeshAppearanceSection
          entityId={entityRecord.item.id}
          material={entityRecord.item.material}
          onTextureConfigOpen={onTextureConfigOpen}
          onMaterialLibraryOpen={onMaterialLibraryOpen}
          materialLibraryEnabled={isPolyhavenEnabled}
        />
      ) : null}

      {entityRecord.kind === "gridHelper" && entityRecord.item.mode === "plane" ? (
        <MeshAppearanceSection
          material={entityRecord.item.material}
          onMaterialPatch={(patch) => app?.updateGroundMaterial(patch)}
          onTextureConfigOpen={onTextureConfigOpen}
          onMaterialLibraryOpen={onMaterialLibraryOpen}
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
  );
}

export function PropertyPanelContent(props: PropertyPanelContentProps) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        maxHeight: "100%",
        overflowY: "auto",
        pr: 0.25
      }}
    >
      {props.inspectorMode === "ai" ? <AiImagePropertyPanel /> : <EntityInspectorContent {...props} />}
    </Box>
  );
}
