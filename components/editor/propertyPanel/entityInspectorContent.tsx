import CenterFocusStrongRoundedIcon from "@mui/icons-material/CenterFocusStrongRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import { IconButton, Stack, Tooltip, Typography } from "@mui/material";
import {
  GroundScaleSection,
  LightSettingsSection,
  MeshAppearanceSection,
  ModelAnimationSection,
  SceneSettingsSection,
  TransformSection
} from "@/components/editor/propertyPanelSections";
import StudioScenePropertySection from "@/components/editor/studioScenePropertySection";
import { EmptyPropertyPanel } from "./emptyPropertyPanel";
import { StudioHeaderActions } from "./headerActions";
import type { PropertyPanelContentProps } from "./types";

export function EntityInspectorContent(props: PropertyPanelContentProps) {
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
