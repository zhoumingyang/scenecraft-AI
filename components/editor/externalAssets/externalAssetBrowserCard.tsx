"use client";

import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Box,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import type { EditorThemeTokens } from "@/components/editor/theme";
import type {
  ExternalAssetDetail,
  ExternalAssetListItem
} from "@/lib/externalAssets/types";
import { useI18n } from "@/lib/i18n";

type ExternalAssetBrowserCardProps = {
  item: ExternalAssetListItem;
  theme: EditorThemeTokens;
  isApplying: boolean;
  isSelected: boolean;
  detail: ExternalAssetDetail | null;
  detailError: string | null;
  isDetailLoading: boolean;
  selectedResolution: string;
  selectedFormat: string;
  availableResolutions: string[];
  availableFormats: string[];
  onSelect: () => void;
  onResolutionChange: (value: string) => void;
  onFormatChange: (value: string) => void;
  onViewDetails: () => void;
  onApply: (args: {
    asset: ExternalAssetDetail;
    resolution: string;
    format: string;
  }) => Promise<void> | void;
};

export function ExternalAssetBrowserCard({
  item,
  theme,
  isApplying,
  isSelected,
  detail,
  detailError,
  isDetailLoading,
  selectedResolution,
  selectedFormat,
  availableResolutions,
  availableFormats,
  onSelect,
  onResolutionChange,
  onFormatChange,
  onViewDetails,
  onApply
}: ExternalAssetBrowserCardProps) {
  const { t } = useI18n();
  const compactSelectSx = {
    "& .MuiOutlinedInput-root": {
      height: 34,
      color: theme.pillText,
      background: theme.inputBg,
      fontSize: 12
    },
    "& .MuiSelect-select": {
      py: "6px"
    },
    "& .MuiInputLabel-root": {
      fontSize: 12,
      transform: "translate(14px, 8px) scale(1)"
    },
    "& .MuiInputLabel-shrink": {
      transform: "translate(14px, -8px) scale(0.75)"
    }
  };

  const handleApply = async () => {
    if (!isSelected || !detail || isApplying || isDetailLoading) {
      return;
    }

    await onApply({
      asset: detail,
      resolution: selectedResolution,
      format: selectedFormat
    });
  };

  return (
    <Box
      onClick={onSelect}
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: 372,
        overflow: "hidden",
        borderRadius: 1.2,
        border: isSelected ? theme.itemSelectedBorder : theme.sectionBorder,
        background: isSelected ? theme.itemSelectedBg : theme.itemBg,
        cursor: isApplying ? "default" : "pointer",
        transition: "border-color 160ms ease, background 160ms ease, box-shadow 160ms ease",
        boxShadow: isSelected ? "0 0 0 1px rgba(124,183,255,0.16)" : "none",
        "&:hover": {
          background: isSelected ? theme.itemSelectedBg : theme.itemHoverBg
        }
      }}
    >
      <Box
        sx={{
          position: "relative",
          flex: "0 0 auto",
          width: "100%",
          aspectRatio: "4 / 3",
          overflow: "hidden",
          borderBottom: theme.sectionBorder,
          background: theme.inputBg
        }}
      >
        <Box
          component="img"
          src={item.thumbnailUrl}
          alt={item.displayName}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover"
          }}
        />

        {isSelected && detail ? (
          <Stack
            direction="row"
            spacing={0.5}
            onClick={(event) => event.stopPropagation()}
            sx={{
              position: "absolute",
              right: 8,
              bottom: 8
            }}
          >
            <Tooltip title={t("editor.assets.viewDetails")}>
              <span>
                <IconButton
                  size="small"
                  onClick={onViewDetails}
                  disabled={isDetailLoading}
                  sx={{
                    color: theme.pillText,
                    border: theme.sectionBorder,
                    background: theme.iconButtonBg,
                    backdropFilter: "blur(6px)"
                  }}
                >
                  <VisibilityRoundedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip
              title={
                detail.assetType === "hdri"
                  ? t("editor.assets.applyHdri")
                  : detail.assetType === "model"
                    ? t("editor.assets.importModel")
                    : t("editor.assets.applyTextureSet")
              }
            >
              <span>
                <IconButton
                  size="small"
                  onClick={() => {
                    void handleApply();
                  }}
                  disabled={isApplying || isDetailLoading}
                  sx={{
                    color: theme.pillText,
                    border: theme.sectionBorder,
                    background: theme.iconButtonBg,
                    backdropFilter: "blur(6px)"
                  }}
                >
                  <TaskAltRoundedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ) : null}
      </Box>
      <Stack spacing={1} sx={{ flex: 1, p: 1.1 }}>
        <Stack spacing={0.4}>
          <Typography
            title={item.displayName}
            sx={{
              fontSize: 13,
              fontWeight: 700,
              color: theme.titleText,
              lineHeight: 1.35,
              display: "-webkit-box",
              overflow: "hidden",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2
            }}
          >
            {item.displayName}
          </Typography>
          <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
            {item.authorLabel}
          </Typography>
          <Typography sx={{ fontSize: 11, color: theme.text }}>
            {item.maxResolutionLabel}
          </Typography>
        </Stack>

        <Stack
          spacing={0.85}
          onClick={(event) => {
            if (isSelected && detail) {
              event.stopPropagation();
            }
          }}
        >
          <TextField
            select
            size="small"
            label={t("editor.assets.resolution")}
            value={selectedResolution}
            disabled={!isSelected || !detail || isApplying}
            onChange={(event) => onResolutionChange(event.target.value)}
            sx={compactSelectSx}
          >
            {availableResolutions.map((resolution) => (
              <MenuItem key={resolution} value={resolution}>
                {resolution.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label={t("editor.assets.format")}
            value={selectedFormat}
            disabled={!isSelected || !detail || isApplying || availableFormats.length === 0}
            onChange={(event) => onFormatChange(event.target.value)}
            sx={compactSelectSx}
          >
            {availableFormats.map((format) => (
              <MenuItem key={format} value={format}>
                {format.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {isSelected && isDetailLoading ? (
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: theme.mutedText }}>
            <CircularProgress size={14} sx={{ color: theme.pillText }} />
            <Typography sx={{ fontSize: 12 }}>{t("common.processing")}</Typography>
          </Stack>
        ) : isSelected && detailError ? (
          <Typography sx={{ fontSize: 12, color: theme.mutedText }}>
            {detailError}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
