"use client";

import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import type { EditorThemeTokens } from "@/components/editor/theme";
import type {
  ExternalAssetDetail,
  ExternalAssetListItem
} from "@/lib/externalAssets/types";
import { useI18n } from "@/lib/i18n";
import { ExternalAssetBrowserCard } from "./externalAssetBrowserCard";

type ExternalAssetBrowserResultsProps = {
  theme: EditorThemeTokens;
  assets: ExternalAssetListItem[];
  isApplying: boolean;
  isListLoading: boolean;
  page: number;
  pageCount: number;
  selectedAssetId: string | null;
  selectedAssetDetail: ExternalAssetDetail | null;
  selectedDetailError: string | null;
  isDetailLoading: boolean;
  selectedResolution: string;
  selectedFormat: string;
  selectedAvailableResolutions: string[];
  selectedAvailableFormats: string[];
  onSelectAsset: (item: ExternalAssetListItem) => void;
  onResolutionChange: (value: string) => void;
  onFormatChange: (value: string) => void;
  onViewDetails: () => void;
  onApply: (args: {
    asset: ExternalAssetDetail;
    resolution: string;
    format: string;
  }) => Promise<void> | void;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export function ExternalAssetBrowserResults({
  theme,
  assets,
  isApplying,
  isListLoading,
  page,
  pageCount,
  selectedAssetId,
  selectedAssetDetail,
  selectedDetailError,
  isDetailLoading,
  selectedResolution,
  selectedFormat,
  selectedAvailableResolutions,
  selectedAvailableFormats,
  onSelectAsset,
  onResolutionChange,
  onFormatChange,
  onViewDetails,
  onApply,
  onPreviousPage,
  onNextPage
}: ExternalAssetBrowserResultsProps) {
  const { t } = useI18n();

  return (
    <Stack
      spacing={1}
      sx={{
        minHeight: 420,
        borderRadius: 1.5,
        border: theme.sectionBorder,
        background: theme.sectionBg,
        p: 1
      }}
    >
      {isListLoading ? (
        <Stack
          spacing={1}
          alignItems="center"
          justifyContent="center"
          sx={{
            minHeight: 372,
            color: theme.mutedText
          }}
        >
          <CircularProgress size={22} sx={{ color: theme.pillText }} />
          <Typography sx={{ fontSize: 12 }}>{t("common.processing")}</Typography>
        </Stack>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: {
              xs: "repeat(1, minmax(0, 1fr))",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(3, minmax(0, 1fr))",
              xl: "repeat(4, minmax(0, 1fr))"
            }
          }}
        >
          {assets.map((item) => {
            const isSelected = selectedAssetId === item.assetId;
            return (
              <ExternalAssetBrowserCard
                key={item.assetId}
                item={item}
                theme={theme}
                isApplying={isApplying}
                isSelected={isSelected}
                detail={isSelected ? selectedAssetDetail : null}
                detailError={isSelected ? selectedDetailError : null}
                isDetailLoading={isSelected ? isDetailLoading : false}
                selectedResolution={isSelected ? selectedResolution : ""}
                selectedFormat={isSelected ? selectedFormat : ""}
                availableResolutions={isSelected ? selectedAvailableResolutions : []}
                availableFormats={isSelected ? selectedAvailableFormats : []}
                onSelect={() => onSelectAsset(item)}
                onResolutionChange={onResolutionChange}
                onFormatChange={onFormatChange}
                onViewDetails={onViewDetails}
                onApply={onApply}
              />
            );
          })}
        </Box>
      )}

      {!isListLoading && assets.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: "center",
            color: theme.mutedText
          }}
        >
          <Typography sx={{ fontSize: 13 }}>{t("editor.assets.empty")}</Typography>
        </Box>
      ) : null}

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 0.5 }}>
        <Typography sx={{ fontSize: 12, color: theme.mutedText }}>
          {t("editor.assets.pageStatus", { page, total: pageCount })}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            color="inherit"
            disabled={isApplying || isListLoading || page <= 1}
            onClick={onPreviousPage}
            sx={{
              minWidth: 84,
              borderRadius: 1,
              border: theme.sectionBorder,
              color: theme.pillText,
              textTransform: "none"
            }}
          >
            {t("editor.assets.previousPage")}
          </Button>
          <Button
            color="inherit"
            disabled={isApplying || isListLoading || page >= pageCount}
            onClick={onNextPage}
            sx={{
              minWidth: 84,
              borderRadius: 1,
              border: theme.sectionBorder,
              color: theme.pillText,
              textTransform: "none"
            }}
          >
            {t("editor.assets.nextPage")}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
