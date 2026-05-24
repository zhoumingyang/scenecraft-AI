"use client";

import { Box, Button, FormControl, MenuItem, Select, Slider, Stack, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  STUDIO_SCENE_PRESET_IDS,
  STUDIO_SCENE_PRESETS,
  type StudioScenePresetId
} from "@/render/editor";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";
import { getEditorThemeTokens } from "@/components/editor/theme";

function formatScale(value: number) {
  return `${value.toFixed(2)}x`;
}

function formatDegrees(value: number) {
  return `${Math.round(value)}°`;
}

export default function StudioSceneControls() {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const app = useEditorStore((state) => state.app);
  const studioScene = useEditorStore((state) => state.studioScene);
  const theme = getEditorThemeTokens(editorThemeMode);

  if (!studioScene.active || !studioScene.presetId) {
    return null;
  }

  const rotationDegrees = THREE_RAD_TO_DEG * studioScene.targetRotationY;
  const hdriLabel =
    studioScene.hdriStatus === "ready"
      ? t("editor.studioScene.hdri.ready")
      : studioScene.hdriStatus === "loading"
        ? t("editor.studioScene.hdri.loading")
        : studioScene.hdriStatus === "error"
          ? t("editor.studioScene.hdri.error")
          : "";

  return (
    <Box
      sx={{
        position: "absolute",
        left: "50%",
        bottom: 20,
        zIndex: 24,
        width: "min(560px, calc(100vw - 28px))",
        transform: "translateX(-50%)",
        pointerEvents: "auto",
        borderRadius: 2,
        border: theme.panelBorder,
        background: theme.panelBg,
        boxShadow: theme.panelShadow,
        backdropFilter: "blur(14px)",
        p: 1.15
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TuneRoundedIcon sx={{ fontSize: 17, color: theme.titleText }} />
          <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 700, color: theme.pillText }}>
            {t("editor.studioScene.title")}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RestartAltRoundedIcon />}
            onClick={() => app?.resetStudioSceneTargetTransform()}
            sx={{
              minWidth: 0,
              px: 1,
              color: theme.pillText,
              borderColor: "rgba(150,190,255,0.34)"
            }}
          >
            {t("editor.studioScene.reset")}
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<CloseRoundedIcon />}
            onClick={() => app?.exitStudioScene()}
            sx={{ minWidth: 0, px: 1 }}
          >
            {t("editor.studioScene.exit")}
          </Button>
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.2}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              value={studioScene.presetId}
              onChange={(event) => {
                app?.setStudioScenePreset(event.target.value as StudioScenePresetId);
              }}
              sx={{
                height: 34,
                fontSize: 12,
                color: theme.pillText,
                ".MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(150,190,255,0.34)"
                },
                ".MuiSvgIcon-root": {
                  color: theme.pillText
                }
              }}
            >
              {STUDIO_SCENE_PRESET_IDS.map((presetId) => {
                const preset = STUDIO_SCENE_PRESETS[presetId];
                return (
                  <MenuItem key={presetId} value={presetId}>
                    {t(preset.labelKey)}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <Stack spacing={0.25} sx={{ flex: 1, minWidth: 130 }}>
            <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
              {t("editor.studioScene.scale")} · {formatScale(studioScene.targetScale)}
            </Typography>
            <Slider
              size="small"
              min={0.2}
              max={3}
              step={0.01}
              value={studioScene.targetScale}
              onChange={(_, value) => {
                app?.updateStudioSceneTargetTransform({ scale: value as number });
              }}
            />
          </Stack>

          <Stack spacing={0.25} sx={{ flex: 1, minWidth: 130 }}>
            <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
              {t("editor.studioScene.rotation")} · {formatDegrees(rotationDegrees)}
            </Typography>
            <Slider
              size="small"
              min={-180}
              max={180}
              step={1}
              value={rotationDegrees}
              onChange={(_, value) => {
                app?.updateStudioSceneTargetTransform({
                  rotationY: (value as number) / THREE_RAD_TO_DEG
                });
              }}
            />
          </Stack>
        </Stack>

        {hdriLabel ? (
          <Typography
            sx={{
              fontSize: 11,
              color: studioScene.hdriStatus === "error" ? "#ffb86b" : theme.mutedText
            }}
          >
            {hdriLabel}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}

const THREE_RAD_TO_DEG = 180 / Math.PI;
