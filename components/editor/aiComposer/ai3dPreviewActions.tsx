"use client";

import { CircularProgress, IconButton, Stack, Typography } from "@mui/material";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import type { EditorThemeTokens } from "@/components/editor/theme";

type Props = {
  theme: EditorThemeTokens;
  utilityIconButtonSx: object;
  previewVariant: "original" | "optimized";
  primitiveCountText: string;
  canShowOriginal: boolean;
  canShowOptimized: boolean;
  isAi3dBusy: boolean;
  isOptimizing: boolean;
  onShowOriginal: () => void;
  onShowOptimized: () => void;
  onOptimize: () => Promise<void>;
  onDiscard: () => void;
  onApply: () => Promise<void>;
  t: (key: any, params?: Record<string, string | number>) => string;
};

export default function Ai3dPreviewActions({
  theme,
  utilityIconButtonSx,
  previewVariant,
  primitiveCountText,
  canShowOriginal,
  canShowOptimized,
  isAi3dBusy,
  isOptimizing,
  onShowOriginal,
  onShowOptimized,
  onOptimize,
  onDiscard,
  onApply,
  t
}: Props) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
      spacing={1}
      sx={{
        mt: 0.8,
        pt: 0.95,
        borderTop: theme.sectionBorder
      }}
    >
      <Stack spacing={0.2}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: theme.pillText }}>
          {previewVariant === "optimized"
            ? t("editor.ai3d.optimizedPreviewReady")
            : t("editor.ai3d.previewReady")}
        </Typography>
        <Typography sx={{ fontSize: 12, color: theme.mutedText }}>
          {primitiveCountText}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={0.8} alignItems="center" sx={{ flexWrap: "wrap" }}>
        {canShowOriginal ? (
          <IconButton
            size="small"
            onClick={onShowOriginal}
            title={t("editor.ai3d.showOriginal")}
            sx={utilityIconButtonSx}
          >
            <RestoreRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        ) : null}
        {canShowOptimized ? (
          <IconButton
            size="small"
            onClick={onShowOptimized}
            title={t("editor.ai3d.showOptimized")}
            sx={utilityIconButtonSx}
          >
            <AutoFixHighRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        ) : null}
        <IconButton
          size="small"
          disabled={isAi3dBusy}
          onClick={() => {
            void onOptimize();
          }}
          title={t("editor.ai3d.optimize")}
          sx={utilityIconButtonSx}
        >
          {isOptimizing ? (
            <CircularProgress size={16} sx={{ color: theme.pillText }} />
          ) : (
            <AutoFixHighRoundedIcon sx={{ fontSize: 18 }} />
          )}
        </IconButton>
        <IconButton
          size="small"
          disabled={isAi3dBusy}
          onClick={onDiscard}
          title={t("editor.ai3d.discard")}
          sx={utilityIconButtonSx}
        >
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <IconButton
          size="small"
          disabled={isAi3dBusy}
          onClick={() => {
            void onApply();
          }}
          title={t("editor.ai3d.apply")}
          sx={utilityIconButtonSx}
        >
          <CheckRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>
    </Stack>
  );
}
