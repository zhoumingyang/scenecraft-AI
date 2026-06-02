"use client";

import { useEffect, useState } from "react";
import { Button, FormControl, MenuItem, Select, Stack, Typography } from "@mui/material";
import type { TranslationKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import type {
  EditorApp,
  StudioDecorationKind,
  StudioPlinthKind,
  StudioSceneState,
  StudioTransientEntityMetadata,
  StudioTransientEntityRole
} from "@/render/editor";
import type { getEditorThemeTokens } from "@/components/editor/theme";

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
  "extrudedShape"
];

const STUDIO_LIGHT_ROLE_LABEL_KEYS: Partial<Record<StudioTransientEntityRole, TranslationKey>> = {
  keyLight: "editor.studioScene.lightRole.key",
  keyShadowLight: "editor.studioScene.lightRole.keyShadow",
  fillLight: "editor.studioScene.lightRole.fill",
  rimLight: "editor.studioScene.lightRole.rim",
  topLight: "editor.studioScene.lightRole.top",
  accentLight: "editor.studioScene.lightRole.accent"
};

const STUDIO_MODIFIER_ROLE_LABEL_KEYS: Partial<Record<StudioTransientEntityRole, TranslationKey>> = {
  reflector: "editor.studioScene.modifierRole.reflector",
  negativeFill: "editor.studioScene.modifierRole.negativeFill",
  stripPanel: "editor.studioScene.modifierRole.stripPanel"
};

type StudioScenePropertySectionProps = {
  app: EditorApp | null;
  metadata: StudioTransientEntityMetadata | null;
  selectedEntityId: string | null;
  studioScene: StudioSceneState | null;
  theme: EditorThemeTokens;
};

export default function StudioScenePropertySection({
  app,
  metadata,
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

  if (!studioScene?.active || !metadata) return null;

  const sectionSx = {
    p: 0.85,
    borderRadius: 1.2,
    border: theme.sectionBorder,
    background: theme.sectionBg
  };
  const lightRoleLabelKey = STUDIO_LIGHT_ROLE_LABEL_KEYS[metadata.role];
  const modifierRoleLabelKey = STUDIO_MODIFIER_ROLE_LABEL_KEYS[metadata.role];

  if (metadata.role === "plinth" && studioScene.plinthKind) {
    return (
      <Stack spacing={0.75} sx={sectionSx}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.pillText }}>
          {t("editor.studioScene.plinthControls")}
        </Typography>
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
        <Button size="small" variant="outlined" onClick={() => app?.resetStudioSceneGeneratedLayout()}>
          {t("editor.studioScene.restoreLayout")}
        </Button>
      </Stack>
    );
  }

  if (metadata.role === "decoration" && selectedEntityId) {
    return (
      <Stack spacing={0.75} sx={sectionSx}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.pillText }}>
          {t("editor.studioScene.decorationControls")}
        </Typography>
        <FormControl size="small" fullWidth>
          <Select
            value={decorationKind}
            onChange={(event) => setDecorationKind(event.target.value as StudioDecorationKind)}
            sx={{ height: 34, fontSize: 12 }}
          >
            {STUDIO_DECORATION_KIND_OPTIONS.map((kind) => (
              <MenuItem key={kind} value={kind}>
                {t(`editor.studioScene.decoration.${kind}` as TranslationKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Stack direction="row" spacing={0.6} sx={{ flexWrap: "wrap", rowGap: 0.6 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => app?.replaceStudioSceneDecoration(selectedEntityId, decorationKind)}
          >
            {t("editor.studioScene.replaceDecoration")}
          </Button>
          <Button size="small" variant="outlined" onClick={() => app?.addStudioSceneDecoration(decorationKind)}>
            {t("editor.studioScene.addDecoration")}
          </Button>
          <Button size="small" variant="outlined" onClick={() => app?.setEntityVisible(selectedEntityId, false)}>
            {t("editor.studioScene.hideDecoration")}
          </Button>
          <Button size="small" variant="outlined" color="error" onClick={() => app?.removeEntity(selectedEntityId)}>
            {t("editor.studioScene.deleteDecoration")}
          </Button>
        </Stack>
      </Stack>
    );
  }

  if (lightRoleLabelKey) {
    return (
      <Stack spacing={0.45} sx={sectionSx}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.pillText }}>
          {t("editor.studioScene.lightControls")}
        </Typography>
        <Typography sx={{ fontSize: 11, color: theme.text }}>
          {t(lightRoleLabelKey)}
        </Typography>
      </Stack>
    );
  }

  if (modifierRoleLabelKey) {
    return (
      <Stack spacing={0.45} sx={sectionSx}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.pillText }}>
          {t("editor.studioScene.modifierControls")}
        </Typography>
        <Typography sx={{ fontSize: 11, color: theme.text }}>
          {t(modifierRoleLabelKey)}
        </Typography>
      </Stack>
    );
  }

  return null;
}
