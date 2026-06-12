"use client";

import { useEffect, useState } from "react";
import { FormControl, MenuItem, Select, Stack, Typography } from "@mui/material";
import type { TranslationKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import type {
  EditorApp,
  StudioDecorationKind,
  StudioPlinthKind,
  StudioScenePostProcessingPatch,
  StudioScenePostProcessingState,
  StudioSceneState,
  StudioTransientEntityMetadata
} from "@/render/editor";
import { SCENE_NODE_ID } from "@/render/editor";
import type { getEditorThemeTokens } from "@/components/editor/theme";
import { SliderField } from "@/components/editor/propertyPanelSections/sceneSettingsFields";

type EditorThemeTokens = ReturnType<typeof getEditorThemeTokens>;

const STUDIO_PLINTH_KIND_OPTIONS: StudioPlinthKind[] = [
  "cylinder",
  "roundedBox",
  "box",
  "square",
  "tiered",
  "multiLevel",
  "beveled",
  "floating",
  "extrudedShape"
];

const STUDIO_DECORATION_KIND_OPTIONS: StudioDecorationKind[] = [
  "sphere",
  "cylinder",
  "ring",
  "box",
  "roundedBox",
  "arch",
  "semiDisc",
  "verticalPanel",
  "curvedPanel",
  "wavePanel",
  "floatingGeometry",
  "extrudedShape",
  "sculpturalLoop",
  "ribbonPanel",
  "steppedTotem",
  "foldedScreen",
  "layeredArch",
  "orbitCluster",
  "organicShard",
  "modularBlocks"
];

type StudioScenePropertySectionProps = {
  app: EditorApp | null;
  metadata: StudioTransientEntityMetadata | null;
  postProcessingState: StudioScenePostProcessingState | null;
  selectedEntityId: string | null;
  studioScene: StudioSceneState | null;
  theme: EditorThemeTokens;
};

export default function StudioScenePropertySection({
  app,
  metadata,
  postProcessingState,
  selectedEntityId,
  studioScene,
  theme
}: StudioScenePropertySectionProps) {
  const { t } = useI18n();
  const [decorationKind, setDecorationKind] = useState<StudioDecorationKind>("sphere");

  useEffect(() => {
    if (metadata?.decorationKind) {
      setDecorationKind(metadata.decorationKind);
    }
  }, [metadata?.decorationKind]);

  if (!studioScene?.active) return null;

  const updatePostProcessing = (patch: StudioScenePostProcessingPatch) => {
    app?.updateStudioScenePostProcessing(patch);
  };

  const sectionSx = {
    p: 0.65,
    borderRadius: 1.2,
    border: theme.sectionBorder,
    background: theme.sectionBg
  };

  if (selectedEntityId === SCENE_NODE_ID && postProcessingState) {
    return (
      <Stack spacing={0.8} sx={sectionSx}>
        <Typography
          sx={{
            px: 0.1,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: theme.mutedText
          }}
        >
          {t("editor.studioScene.color")}
        </Typography>
        <SliderField
          label={t("editor.properties.toneMappingExposure")}
          min={0}
          max={5}
          step={0.01}
          value={postProcessingState.exposure}
          onChange={(value) => updatePostProcessing({ exposure: value })}
        />
        <SliderField
          label={t("editor.studioScene.color.contrast")}
          min={-1}
          max={1}
          step={0.01}
          value={postProcessingState.colorGrading.contrast}
          onChange={(value) => updatePostProcessing({ colorGrading: { contrast: value } })}
        />
        <SliderField
          label={t("editor.studioScene.color.saturation")}
          min={-1}
          max={1}
          step={0.01}
          value={postProcessingState.colorGrading.saturation}
          onChange={(value) => updatePostProcessing({ colorGrading: { saturation: value } })}
        />
        <SliderField
          label={t("editor.studioScene.color.temperature")}
          min={-1}
          max={1}
          step={0.01}
          value={postProcessingState.colorGrading.temperature}
          onChange={(value) => updatePostProcessing({ colorGrading: { temperature: value } })}
        />
        <SliderField
          label={t("editor.studioScene.color.tint")}
          min={-1}
          max={1}
          step={0.01}
          value={postProcessingState.colorGrading.tint}
          onChange={(value) => updatePostProcessing({ colorGrading: { tint: value } })}
        />
        <SliderField
          label={t("editor.studioScene.color.vignette")}
          min={0}
          max={1}
          step={0.01}
          value={postProcessingState.colorGrading.vignette}
          onChange={(value) => updatePostProcessing({ colorGrading: { vignette: value } })}
        />
        <SliderField
          label={t("editor.studioScene.color.detail")}
          min={-1}
          max={1}
          step={0.01}
          value={postProcessingState.colorGrading.detail}
          onChange={(value) => updatePostProcessing({ colorGrading: { detail: value } })}
        />
      </Stack>
    );
  }

  if (!metadata) return null;

  if (metadata.role === "root") {
    return null;
  }

  if (metadata.role === "plinth" && studioScene.plinthKind) {
    return (
      <Stack spacing={0.75} sx={sectionSx}>
        <FormControl size="small" fullWidth>
          <Select
            value={studioScene.plinthKind}
            onChange={(event) => app?.setStudioScenePlinthKind(event.target.value as StudioPlinthKind)}
            sx={{ height: 34, fontSize: 12 }}
          >
            {STUDIO_PLINTH_KIND_OPTIONS.map((kind) => (
              <MenuItem key={kind} value={kind}>
                {t(`editor.studioScene.plinth.${kind}` as TranslationKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    );
  }

  if (metadata.role === "decoration" && selectedEntityId) {
    return (
      <Stack spacing={0.75} sx={sectionSx}>
        <FormControl size="small" fullWidth>
          <Select
            value={decorationKind}
            onChange={(event) => {
              const nextKind = event.target.value as StudioDecorationKind;
              setDecorationKind(nextKind);
              app?.replaceStudioSceneDecoration(selectedEntityId, nextKind);
            }}
            sx={{ height: 34, fontSize: 12 }}
          >
            {STUDIO_DECORATION_KIND_OPTIONS.map((kind) => (
              <MenuItem key={kind} value={kind}>
                {t(`editor.studioScene.decoration.${kind}` as TranslationKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    );
  }

  return null;
}
