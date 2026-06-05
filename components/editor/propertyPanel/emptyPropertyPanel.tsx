import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import type { PropertyPanelContentProps } from "./types";

export function EmptyPropertyPanel({
  aiMode,
  aiTexture,
  theme,
  t,
  onAiLibraryOpen
}: Pick<PropertyPanelContentProps, "aiMode" | "aiTexture" | "theme" | "t" | "onAiLibraryOpen">) {
  return (
    <Stack spacing={1} justifyContent="center" sx={{ height: "100%", minHeight: 180, color: theme.mutedText }}>
      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
        {t("editor.properties.none")}
      </Typography>
      <Typography sx={{ fontSize: 12 }}>
        {aiMode === "texture" ? t("editor.aiPbr.emptyTargetHint") : t("editor.properties.emptyHint")}
      </Typography>
      {aiMode === "texture" && aiTexture?.isGenerating ? (
        <Stack
          direction="row"
          spacing={0.7}
          alignItems="center"
          sx={{
            mt: 0.4,
            px: 1,
            py: 0.9,
            borderRadius: 1,
            border: theme.sectionBorder,
            background: theme.itemBg
          }}
        >
          <CircularProgress size={14} sx={{ color: theme.titleText }} />
          <Typography sx={{ fontSize: 11, color: theme.text }}>
            {t("editor.aiPbr.generating")}
          </Typography>
        </Stack>
      ) : null}
      {aiMode === "texture" && aiTexture?.result ? (
        <Box
          role="button"
          tabIndex={0}
          onClick={onAiLibraryOpen}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onAiLibraryOpen();
          }}
          sx={{
            mt: 0.6,
            width: "100%",
            borderRadius: 1.2,
            border: theme.sectionBorder,
            background: theme.sectionBg,
            overflow: "hidden",
            cursor: "pointer",
            "&:hover, &:focus-visible": {
              outline: "none",
              border: theme.itemSelectedBorder
            }
          }}
        >
          <Box
            component="img"
            src={aiTexture.result.atlasImageUrl}
            alt={aiTexture.result.prompt}
            sx={{
              width: "100%",
              aspectRatio: "1 / 1",
              objectFit: "cover",
              display: "block",
              borderBottom: theme.sectionBorder
            }}
          />
          <Stack direction="row" spacing={0.6} alignItems="center" sx={{ p: 0.8 }}>
            <AutoAwesomeRoundedIcon sx={{ fontSize: 15, color: theme.titleText }} />
            <Typography
              sx={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 11,
                color: theme.text
              }}
            >
              {t("editor.aiPbr.openAssets")}
            </Typography>
          </Stack>
        </Box>
      ) : null}
    </Stack>
  );
}
