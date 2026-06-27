"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { EditorApp } from "@/render/editor";
import type { PathTraceSampleStatus } from "@/render/editor/runtime/pathTraceSampleStatus";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { getViewportPillSx } from "./viewportControlStyles";

type PathTraceSampleHudProps = {
  app: EditorApp | null;
  disabled?: boolean;
  viewStateVersion: number;
};

export default function PathTraceSampleHud({
  app,
  disabled = false,
  viewStateVersion
}: PathTraceSampleHudProps) {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);
  const renderMode = useMemo(() => app?.getRenderMode() ?? "webgl", [app, viewStateVersion]);
  const statusKeyRef = useRef("");
  const [sampleStatus, setSampleStatus] = useState<PathTraceSampleStatus | null>(() =>
    app?.getPathTraceSampleStatus() ?? null
  );

  useEffect(() => {
    if (!app || disabled || renderMode !== "pathTrace") {
      statusKeyRef.current = "";
      setSampleStatus(null);
      return;
    }

    let frameId = 0;
    const update = () => {
      const nextStatus = app.getPathTraceSampleStatus();
      const nextKey = createStatusKey(nextStatus);
      if (nextKey !== statusKeyRef.current) {
        statusKeyRef.current = nextKey;
        setSampleStatus(nextStatus);
      }
      frameId = window.requestAnimationFrame(update);
    };

    update();

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [app, disabled, renderMode]);

  if (!app || disabled || renderMode !== "pathTrace" || !sampleStatus) {
    return null;
  }

  const progressPercent = Math.round(sampleStatus.progress * 100);
  const sampleLabel = `${Math.floor(sampleStatus.samples)} / ${sampleStatus.targetSamples}`;
  const modeLabel = sampleStatus.mode === "interactive"
    ? t("editor.pathTraceHud.interactive")
    : sampleStatus.sampling
      ? t("editor.pathTraceHud.accumulating")
      : t("editor.pathTraceHud.ready");

  return (
    <Box
      sx={{
        ...getViewportPillSx(editorThemeMode),
        minWidth: 210,
        px: 1,
        py: 0.75,
        borderRadius: 1.2
      }}
    >
      <Stack spacing={0.55}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <AutoGraphRoundedIcon sx={{ flexShrink: 0, fontSize: 16, color: theme.titleText }} />
          <Typography sx={{ flex: 1, fontSize: 12, color: theme.pillText, fontWeight: 700 }}>
            {t("editor.pathTraceHud.title")}
          </Typography>
          <Typography sx={{ fontSize: 11, color: theme.mutedText }}>{sampleLabel}</Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={progressPercent}
          sx={{
            height: 3,
            borderRadius: 999,
            background: alpha("#69b7ff", 0.16),
            "& .MuiLinearProgress-bar": {
              borderRadius: 999,
              background: alpha("#69b7ff", 0.92)
            }
          }}
        />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography sx={{ fontSize: 11, color: theme.mutedText }}>{modeLabel}</Typography>
          <Typography sx={{ fontSize: 11, color: theme.titleText, fontWeight: 700 }}>
            {progressPercent}%
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

function createStatusKey(status: PathTraceSampleStatus) {
  return [
    status.dirty ? 1 : 0,
    status.mode,
    status.samples,
    status.targetSamples,
    status.sampling ? 1 : 0
  ].join(":");
}
