"use client";

import { useEffect, useState } from "react";
import { FormControl, IconButton, MenuItem, Select, Stack, Tooltip } from "@mui/material";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import ViewQuiltRoundedIcon from "@mui/icons-material/ViewQuiltRounded";
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

const STUDIO_BACKGROUND_ROLES = new Set([
  "background",
  "cove",
  "floor",
  "backWall",
  "sideWall"
]);

const STUDIO_LIGHT_ROLES = new Set([
  "keyLight",
  "keyShadowLight",
  "fillLight",
  "rimLight",
  "topLight",
  "accentLight"
]);

const STUDIO_MODIFIER_ROLES = new Set([
  "reflector",
  "negativeFill",
  "stripPanel"
]);

type StudioScenePropertySectionProps = {
  app: EditorApp | null;
  isSceneSelected: boolean;
  metadata: StudioTransientEntityMetadata | null;
  selectedEntityId: string | null;
  studioScene: StudioSceneState | null;
  theme: EditorThemeTokens;
};

export default function StudioScenePropertySection({
  app,
  isSceneSelected,
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
  const canResetSelected = Boolean(metadata?.hasDefaultSnapshot && selectedEntityId);
  const iconButtonSx = {
    width: 32,
    height: 32,
    color: theme.pillText,
    border: theme.sectionBorder,
    background: "transparent",
    "&:hover": {
      background: theme.iconButtonBg
    }
  };

  const iconButton = (
    title: TranslationKey,
    onClick: () => void,
    icon: React.ReactNode
  ) => (
    <Tooltip title={t(title)} arrow>
      <IconButton size="small" aria-label={t(title)} onClick={onClick} sx={iconButtonSx}>
        {icon}
      </IconButton>
    </Tooltip>
  );

  const resetSelectedButton = () =>
    canResetSelected
      ? iconButton(
          "editor.studioScene.resetSelected",
          () => selectedEntityId && app?.resetStudioSceneEntity(selectedEntityId),
          <RestartAltRoundedIcon sx={{ fontSize: 17 }} />
        )
      : null;

  if (isSceneSelected) {
    return null;
  }

  if (!metadata) return null;

  if (metadata.role === "root") {
    return (
      <Stack direction="row" spacing={0.6} sx={sectionSx}>
        {iconButton(
          "editor.studioScene.restoreLayout",
          () => app?.resetStudioSceneGeneratedLayout(),
          <ViewQuiltRoundedIcon sx={{ fontSize: 17 }} />
        )}
        {iconButton(
          "editor.studioScene.restoreLighting",
          () => app?.resetStudioSceneLighting(),
          <LightbulbRoundedIcon sx={{ fontSize: 17 }} />
        )}
      </Stack>
    );
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
        <Stack direction="row" spacing={0.6}>
          {resetSelectedButton()}
        </Stack>
      </Stack>
    );
  }

  if (STUDIO_BACKGROUND_ROLES.has(metadata.role)) {
    return (
      <Stack direction="row" spacing={0.6} sx={sectionSx}>
        {resetSelectedButton()}
      </Stack>
    );
  }

  if (metadata.role === "decoration" && selectedEntityId) {
    return (
      <Stack spacing={0.75} sx={sectionSx}>
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
        <Stack direction="row" spacing={0.6}>
          {resetSelectedButton()}
          {iconButton(
            "editor.studioScene.replaceDecoration",
            () => app?.replaceStudioSceneDecoration(selectedEntityId, decorationKind),
            <SwapHorizRoundedIcon sx={{ fontSize: 17 }} />
          )}
        </Stack>
      </Stack>
    );
  }

  if (STUDIO_LIGHT_ROLES.has(metadata.role)) {
    return (
      <Stack direction="row" spacing={0.6} sx={sectionSx}>
        {resetSelectedButton()}
      </Stack>
    );
  }

  if (STUDIO_MODIFIER_ROLES.has(metadata.role)) {
    return (
      <Stack direction="row" spacing={0.6} sx={sectionSx}>
        {resetSelectedButton()}
      </Stack>
    );
  }

  return null;
}
