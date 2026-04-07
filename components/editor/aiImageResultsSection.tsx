"use client";

import { Alert, Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import { useEditorStore, type AiImageResult } from "@/stores/editorStore";

type AiImageResultsSectionProps = {
  errorMessage: string | null;
  results: AiImageResult[];
  isGenerating: boolean;
  lastSeed: number | null;
  onDownloadImage: (url: string, index: number) => void;
  onViewImage: (url: string) => void;
};

export default function AiImageResultsSection({
  errorMessage,
  results,
  isGenerating,
  lastSeed,
  onDownloadImage,
  onViewImage
}: AiImageResultsSectionProps) {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  return (
    <PropertyPanelSection title={t("editor.ai.sectionResults")}>
      <Stack spacing={1}>
        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        {isGenerating ? (
          <Stack
            direction="row"
            spacing={0.8}
            alignItems="center"
            sx={{
              px: 1,
              py: 1.1,
              borderRadius: 1,
              border: theme.sectionBorder,
              background: theme.itemBg
            }}
          >
            <AutoAwesomeRoundedIcon sx={{ fontSize: 16, color: theme.titleText }} />
            <Typography sx={{ fontSize: 11, color: theme.text }}>
              {t("editor.ai.generating")}
            </Typography>
          </Stack>
        ) : null}

        {lastSeed !== null ? (
          <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
            {t("editor.ai.lastSeed", { seed: lastSeed })}
          </Typography>
        ) : null}

        <Stack spacing={0.9}>
          {results.length > 0 ? (
            results.map((result, index) => (
              <Box
                key={`${result.url}-${index}`}
                sx={{
                  overflow: "hidden",
                  borderRadius: 1,
                  border: theme.sectionBorder,
                  background: theme.sectionBg
                }}
              >
                <Box
                  component="img"
                  src={result.url}
                  alt={`generated-${index + 1}`}
                  sx={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 180 }}
                />
                <Stack direction="row" justifyContent="flex-end" spacing={0.4} sx={{ p: 0.7 }}>
                  <Tooltip title={t("editor.ai.downloadResult")}>
                    <IconButton
                      size="small"
                      onClick={() => onDownloadImage(result.url, index)}
                      sx={{
                        color: theme.pillText,
                        border: theme.sectionBorder,
                        background: theme.itemBg
                      }}
                    >
                      <DownloadRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("editor.ai.viewResult")}>
                    <IconButton
                      size="small"
                      onClick={() => onViewImage(result.url)}
                      sx={{
                        color: theme.pillText,
                        border: theme.sectionBorder,
                        background: theme.itemBg
                      }}
                    >
                      <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            ))
          ) : (
            <Box
              sx={{
                borderRadius: 1,
                border: `1px dashed ${editorThemeMode === "dark" ? "rgba(160,190,255,0.22)" : "rgba(140,167,206,0.4)"}`,
                background: theme.itemBg,
                px: 1,
                py: 1.4
              }}
            >
              <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
                {t("editor.ai.resultEmpty")}
              </Typography>
            </Box>
          )}
        </Stack>
      </Stack>
    </PropertyPanelSection>
  );
}
