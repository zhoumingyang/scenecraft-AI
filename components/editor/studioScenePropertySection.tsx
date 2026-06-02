"use client";

import { useEffect, useState } from "react";
import { FormControl, MenuItem, Select, Stack } from "@mui/material";
import type { TranslationKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import type {
  EditorApp,
  StudioDecorationKind,
  StudioPlinthKind,
  StudioSceneState,
  StudioTransientEntityMetadata
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

  if (!studioScene?.active) return null;

  const sectionSx = {
    p: 0.65,
    borderRadius: 1.2,
    border: theme.sectionBorder,
    background: theme.sectionBg
  };

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
