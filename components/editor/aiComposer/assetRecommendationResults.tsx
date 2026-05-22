"use client";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Stack,
  Typography
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import type { AiExternalAssetRecommendationBundle } from "@/lib/api/contracts/ai";
import type { EditorThemeTokens } from "@/components/editor/theme";

type Props = {
  theme: EditorThemeTokens;
  bundles: AiExternalAssetRecommendationBundle[];
  selectedItemIds: Record<string, boolean>;
  isGenerating: boolean;
  isApplying: boolean;
  errorMessage: string | null;
  applyMessage: string | null;
  onItemSelected: (itemId: string, selected: boolean) => void;
  onApply?: (bundle: AiExternalAssetRecommendationBundle) => void;
  t: (key: any, params?: Record<string, string | number>) => string;
};

function AssetPreview({
  itemId,
  imageUrl,
  title,
  subtitle,
  reason,
  selected,
  disabled,
  theme,
  onSelected
}: {
  itemId: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  reason: string;
  selected: boolean;
  disabled: boolean;
  theme: EditorThemeTokens;
  onSelected: (itemId: string, selected: boolean) => void;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "64px minmax(0, 1fr) auto",
        gap: 0.9,
        alignItems: "center",
        borderRadius: 1,
        border: theme.sectionBorder,
        background: theme.itemBg,
        p: 0.7
      }}
    >
      <Box
        component="img"
        src={imageUrl}
        alt={title}
        sx={{
          width: 64,
          height: 48,
          objectFit: "cover",
          borderRadius: 0.8,
          border: theme.sectionBorder,
          background: theme.sectionBg
        }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 12, fontWeight: 700, color: theme.titleText }}>
          {title}
        </Typography>
        <Typography noWrap sx={{ fontSize: 11, color: theme.mutedText }}>
          {subtitle}
        </Typography>
        <Typography
          sx={{
            mt: 0.25,
            fontSize: 11,
            color: theme.text,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}
        >
          {reason}
        </Typography>
      </Box>
      <Checkbox
        size="small"
        checked={selected}
        disabled={disabled}
        onChange={(event) => onSelected(itemId, event.target.checked)}
        sx={{ color: theme.mutedText }}
      />
    </Box>
  );
}

function countSelectedItems(
  bundle: AiExternalAssetRecommendationBundle,
  selectedItemIds: Record<string, boolean>
) {
  const ids = [
    bundle.hdri?.id,
    ...bundle.textures.map((texture) => texture.id),
    ...bundle.models.map((model) => model.id)
  ].filter((id): id is string => Boolean(id));

  return ids.filter((id) => selectedItemIds[id] ?? true).length;
}

export default function AssetRecommendationResults({
  theme,
  bundles,
  selectedItemIds,
  isGenerating,
  isApplying,
  errorMessage,
  applyMessage,
  onItemSelected,
  onApply,
  t
}: Props) {
  if (isGenerating) {
    return (
      <Stack
        direction="row"
        spacing={0.8}
        alignItems="center"
        sx={{ p: 1, borderRadius: 1, border: theme.sectionBorder, background: theme.itemBg }}
      >
        <CircularProgress size={14} sx={{ color: theme.titleText }} />
        <Typography sx={{ fontSize: 12, color: theme.text }}>
          {t("editor.aiAssets.generating")}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={1} sx={{ maxHeight: 360, overflowY: "auto", pr: 0.2 }}>
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {applyMessage ? <Alert severity="info">{applyMessage}</Alert> : null}

      {bundles.length === 0 && !errorMessage ? (
        <Box sx={{ borderRadius: 1, border: theme.sectionBorder, background: theme.itemBg, p: 1 }}>
          <Typography sx={{ fontSize: 12, color: theme.mutedText }}>
            {t("editor.aiAssets.empty")}
          </Typography>
        </Box>
      ) : null}

      {bundles.map((bundle) => {
        const selectedCount = countSelectedItems(bundle, selectedItemIds);

        return (
          <Box
            key={bundle.id}
            sx={{
              borderRadius: 1,
              border: theme.sectionBorder,
              background: theme.sectionBg,
              p: 1
            }}
          >
            <Stack spacing={0.9}>
              <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={0.6} alignItems="center">
                    <AutoAwesomeRoundedIcon sx={{ fontSize: 15, color: theme.titleText }} />
                    <Typography noWrap sx={{ fontSize: 13, fontWeight: 800, color: theme.titleText }}>
                      {bundle.title}
                    </Typography>
                  </Stack>
                  <Typography sx={{ mt: 0.2, fontSize: 11, color: theme.mutedText }}>
                    {bundle.description}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={t("editor.aiAssets.selectedCount", { count: selectedCount })}
                  sx={{
                    height: 22,
                    borderRadius: 1,
                    color: theme.text,
                    background: theme.itemBg,
                    border: theme.sectionBorder,
                    fontSize: 11
                  }}
                />
              </Stack>

              {bundle.hdri ? (
                <AssetPreview
                  itemId={bundle.hdri.id}
                  imageUrl={bundle.hdri.asset.thumbnailUrl}
                  title={bundle.hdri.asset.displayName}
                  subtitle={`HDRI · ${bundle.hdri.file.resolution} · ${bundle.hdri.file.format.toUpperCase()}`}
                  reason={bundle.hdri.reason}
                  selected={selectedItemIds[bundle.hdri.id] ?? true}
                  disabled={isApplying}
                  theme={theme}
                  onSelected={onItemSelected}
                />
              ) : null}

              {bundle.textures.map((texture) => (
                <AssetPreview
                  key={texture.id}
                  itemId={texture.id}
                  imageUrl={texture.asset.thumbnailUrl}
                  title={texture.asset.displayName}
                  subtitle={`${texture.targetLabel} · ${texture.maps.length} maps`}
                  reason={texture.reason}
                  selected={selectedItemIds[texture.id] ?? true}
                  disabled={isApplying}
                  theme={theme}
                  onSelected={onItemSelected}
                />
              ))}

              {bundle.models.map((model) => (
                <AssetPreview
                  key={model.id}
                  itemId={model.id}
                  imageUrl={model.asset.thumbnailUrl}
                  title={model.asset.displayName}
                  subtitle={`Model · ${model.file.resolution} · ${model.file.format.toUpperCase()}`}
                  reason={model.reason}
                  selected={selectedItemIds[model.id] ?? true}
                  disabled={isApplying}
                  theme={theme}
                  onSelected={onItemSelected}
                />
              ))}

              <Button
                color="inherit"
                size="small"
                disabled={!onApply || isApplying || selectedCount === 0}
                onClick={() => onApply?.(bundle)}
                sx={{
                  alignSelf: "flex-end",
                  minHeight: 32,
                  borderRadius: 1,
                  border: theme.sectionBorder,
                  background: theme.iconButtonBg,
                  color: theme.pillText,
                  textTransform: "none",
                  fontSize: 12
                }}
              >
                {isApplying ? t("common.processing") : t("editor.aiAssets.applyBundle")}
              </Button>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
