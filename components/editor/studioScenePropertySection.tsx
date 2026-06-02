"use client";

import { useEffect, useState } from "react";
import { Box, Button, FormControl, MenuItem, Select, Stack, Typography } from "@mui/material";
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

const STUDIO_BACKGROUND_ROLE_LABEL_KEYS: Partial<Record<StudioTransientEntityRole, TranslationKey>> = {
  background: "editor.studioScene.role.background",
  cove: "editor.studioScene.role.cove",
  floor: "editor.studioScene.role.floor",
  backWall: "editor.studioScene.role.backWall",
  sideWall: "editor.studioScene.role.sideWall"
};

const STUDIO_USER_ROLE_LABEL_KEYS: Partial<Record<StudioTransientEntityRole, TranslationKey>> = {
  userMesh: "editor.studioScene.role.userMesh",
  userLight: "editor.studioScene.role.userLight",
  userLightGroup: "editor.studioScene.role.userLightGroup",
  userModel: "editor.studioScene.role.userModel"
};

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
    p: 0.85,
    borderRadius: 1.2,
    border: theme.sectionBorder,
    background: theme.sectionBg
  };
  const compactTextSx = { fontSize: 11, color: theme.text };
  const mutedTextSx = { fontSize: 11, color: theme.mutedText };
  const lightRoleLabelKey = metadata ? STUDIO_LIGHT_ROLE_LABEL_KEYS[metadata.role] : undefined;
  const modifierRoleLabelKey = metadata ? STUDIO_MODIFIER_ROLE_LABEL_KEYS[metadata.role] : undefined;
  const backgroundRoleLabelKey = metadata ? STUDIO_BACKGROUND_ROLE_LABEL_KEYS[metadata.role] : undefined;
  const userRoleLabelKey = metadata ? STUDIO_USER_ROLE_LABEL_KEYS[metadata.role] : undefined;
  const canResetSelected = Boolean(metadata?.hasDefaultSnapshot && selectedEntityId);
  const canHideSelected = Boolean(metadata?.allowHide && selectedEntityId);
  const canDeleteSelected = Boolean(metadata?.allowDelete && selectedEntityId);

  const renderSelectedEntityActions = (options: {
    includeReset?: boolean;
    includeHide?: boolean;
    includeDelete?: boolean;
    includeRestoreLayout?: boolean;
    includeRestoreLighting?: boolean;
  }) => (
    <Stack direction="row" spacing={0.6} sx={{ flexWrap: "wrap", rowGap: 0.6 }}>
      {options.includeReset && canResetSelected ? (
        <Button size="small" variant="outlined" onClick={() => selectedEntityId && app?.resetStudioSceneEntity(selectedEntityId)}>
          {t("editor.studioScene.resetSelected")}
        </Button>
      ) : null}
      {options.includeRestoreLayout ? (
        <Button size="small" variant="outlined" onClick={() => app?.resetStudioSceneGeneratedLayout()}>
          {t("editor.studioScene.restoreLayout")}
        </Button>
      ) : null}
      {options.includeRestoreLighting ? (
        <Button size="small" variant="outlined" onClick={() => app?.resetStudioSceneLighting()}>
          {t("editor.studioScene.restoreLighting")}
        </Button>
      ) : null}
      {options.includeHide && canHideSelected ? (
        <Button size="small" variant="outlined" onClick={() => selectedEntityId && app?.setEntityVisible(selectedEntityId, false)}>
          {t("editor.studioScene.hideSelected")}
        </Button>
      ) : null}
      {options.includeDelete && canDeleteSelected ? (
        <Button size="small" variant="outlined" color="error" onClick={() => selectedEntityId && app?.removeEntity(selectedEntityId)}>
          {t("editor.studioScene.deleteSelected")}
        </Button>
      ) : null}
    </Stack>
  );

  if (isSceneSelected) {
    return (
      <Stack spacing={0.75} sx={sectionSx}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.pillText }}>
          {t("editor.studioScene.sceneControls")}
        </Typography>
        <Typography sx={compactTextSx}>
          {t(`editor.studioScene.hdri.${studioScene.hdriStatus}` as TranslationKey)}
        </Typography>
        {studioScene.hdriError ? (
          <Typography sx={mutedTextSx}>{studioScene.hdriError}</Typography>
        ) : null}
        {renderSelectedEntityActions({ includeRestoreLighting: true })}
      </Stack>
    );
  }

  if (!metadata) return null;

  if (metadata.role === "root") {
    const productProfile = studioScene.productProfile;
    return (
      <Stack spacing={0.75} sx={sectionSx}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.pillText }}>
          {t("editor.studioScene.rootControls")}
        </Typography>
        {productProfile ? (
          <Stack spacing={0.45}>
            <Typography sx={compactTextSx}>
              {t("editor.studioScene.entry.productType")}: {t(`editor.studioScene.product.${productProfile.productType}` as TranslationKey)}
            </Typography>
            <Typography sx={compactTextSx}>
              {t("editor.studioScene.entry.material")}: {t(`editor.studioScene.material.${productProfile.material}` as TranslationKey)}
            </Typography>
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Typography sx={compactTextSx}>{t("editor.studioScene.entry.brandColor")}:</Typography>
              {productProfile.brandColor ? (
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: 0.75,
                    border: theme.sectionBorder,
                    background: productProfile.brandColor
                  }}
                />
              ) : (
                <Typography sx={mutedTextSx}>{t("editor.studioScene.none")}</Typography>
              )}
            </Stack>
          </Stack>
        ) : null}
        <Typography sx={compactTextSx}>
          {t("editor.studioScene.lighting")}: {studioScene.styleProfileId ? t(`editor.studioScene.style.${studioScene.styleProfileId}` as TranslationKey) : t("editor.studioScene.none")}
        </Typography>
        <Typography sx={compactTextSx}>
          {t("editor.studioScene.variant")}: {studioScene.variantId ? t(`editor.studioScene.variant.${studioScene.variantId}` as TranslationKey) : t("editor.studioScene.none")}
        </Typography>
        <Typography sx={compactTextSx}>
          {t("editor.studioScene.styleSource")}: {studioScene.styleSelectionMode ? t(`editor.studioScene.styleSource.${studioScene.styleSelectionMode}` as TranslationKey) : t("editor.studioScene.none")}
        </Typography>
        <Stack direction="row" spacing={0.6} sx={{ flexWrap: "wrap", rowGap: 0.6 }}>
          <Button size="small" variant="outlined" onClick={() => app?.resetStudioSceneGeneratedLayout()}>
            {t("editor.studioScene.restoreLayout")}
          </Button>
          <Button size="small" variant="outlined" onClick={() => app?.resetStudioSceneLighting()}>
            {t("editor.studioScene.restoreLighting")}
          </Button>
          <Button size="small" variant="outlined" onClick={() => app?.exitStudioScene()}>
            {t("editor.studioScene.exit")}
          </Button>
        </Stack>
      </Stack>
    );
  }

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
        {canResetSelected ? (
          <Button size="small" variant="outlined" onClick={() => selectedEntityId && app?.resetStudioSceneEntity(selectedEntityId)}>
            {t("editor.studioScene.resetSelected")}
          </Button>
        ) : null}
      </Stack>
    );
  }

  if (backgroundRoleLabelKey) {
    return (
      <Stack spacing={0.75} sx={sectionSx}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.pillText }}>
          {t("editor.studioScene.backgroundControls")}
        </Typography>
        <Typography sx={compactTextSx}>{t(backgroundRoleLabelKey)}</Typography>
        <Typography sx={mutedTextSx}>{t("editor.studioScene.generatedLayoutHint")}</Typography>
        {renderSelectedEntityActions({ includeReset: true, includeHide: true, includeRestoreLayout: true })}
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
          {canResetSelected ? (
            <Button size="small" variant="outlined" onClick={() => app?.resetStudioSceneEntity(selectedEntityId)}>
              {t("editor.studioScene.resetSelected")}
            </Button>
          ) : null}
          {canHideSelected ? (
            <Button size="small" variant="outlined" onClick={() => app?.setEntityVisible(selectedEntityId, false)}>
              {t("editor.studioScene.hideSelected")}
            </Button>
          ) : null}
          {canDeleteSelected ? (
            <Button size="small" variant="outlined" color="error" onClick={() => app?.removeEntity(selectedEntityId)}>
              {t("editor.studioScene.deleteSelected")}
            </Button>
          ) : null}
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
        {renderSelectedEntityActions({
          includeReset: true,
          includeHide: true,
          includeDelete: true,
          includeRestoreLighting: true
        })}
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
        {renderSelectedEntityActions({
          includeReset: true,
          includeHide: true,
          includeDelete: true,
          includeRestoreLighting: true
        })}
      </Stack>
    );
  }

  if (userRoleLabelKey) {
    return (
      <Stack spacing={0.75} sx={sectionSx}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.pillText }}>
          {t("editor.studioScene.temporaryObject")}
        </Typography>
        <Typography sx={compactTextSx}>{t(userRoleLabelKey)}</Typography>
        <Typography sx={mutedTextSx}>{t("editor.studioScene.temporaryObjectHint")}</Typography>
        {renderSelectedEntityActions({ includeHide: true, includeDelete: true })}
      </Stack>
    );
  }

  return null;
}
