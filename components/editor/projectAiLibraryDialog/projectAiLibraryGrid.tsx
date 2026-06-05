import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import FormatPaintRoundedIcon from "@mui/icons-material/FormatPaintRounded";
import LandscapeRoundedIcon from "@mui/icons-material/LandscapeRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import type { EditorThemeTokens } from "@/components/editor/theme";
import type { ProjectAiAssetKindJSON } from "@/render/editor";
import type { AiAssetListItem } from "./types";

function getAssetAspectRatio(kind: ProjectAiAssetKindJSON) {
  if (kind === "panorama") return "2 / 1";
  return "1 / 1";
}

export function ProjectAiLibraryGrid({
  getAssetKindLabel,
  items,
  mode,
  onApply,
  onApplyPanorama,
  onApplyPbrAtlas,
  onDelete,
  onPreview,
  t,
  theme
}: {
  getAssetKindLabel: (kind: ProjectAiAssetKindJSON) => string;
  items: AiAssetListItem[];
  mode: "manage" | "apply";
  onApply?: (item: AiAssetListItem) => void;
  onApplyPanorama?: (item: AiAssetListItem) => void;
  onApplyPbrAtlas?: (item: AiAssetListItem) => void;
  onDelete: (item: AiAssetListItem) => void;
  onPreview: (item: AiAssetListItem) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  theme: EditorThemeTokens;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.25,
        gridTemplateColumns: {
          xs: "repeat(1, minmax(0, 1fr))",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))",
          lg: "repeat(5, minmax(0, 1fr))"
        }
      }}
    >
      {items.map((item) => (
        <ProjectAiLibraryCard
          key={item.key}
          getAssetKindLabel={getAssetKindLabel}
          item={item}
          mode={mode}
          onApply={onApply}
          onApplyPanorama={onApplyPanorama}
          onApplyPbrAtlas={onApplyPbrAtlas}
          onDelete={onDelete}
          onPreview={onPreview}
          t={t}
          theme={theme}
        />
      ))}
    </Box>
  );
}

function ProjectAiLibraryCard({
  getAssetKindLabel,
  item,
  mode,
  onApply,
  onApplyPanorama,
  onApplyPbrAtlas,
  onDelete,
  onPreview,
  t,
  theme
}: {
  getAssetKindLabel: (kind: ProjectAiAssetKindJSON) => string;
  item: AiAssetListItem;
  mode: "manage" | "apply";
  onApply?: (item: AiAssetListItem) => void;
  onApplyPanorama?: (item: AiAssetListItem) => void;
  onApplyPbrAtlas?: (item: AiAssetListItem) => void;
  onDelete: (item: AiAssetListItem) => void;
  onPreview: (item: AiAssetListItem) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  theme: EditorThemeTokens;
}) {
  return (
    <Box
      sx={{
        borderRadius: 1.5,
        border: theme.sectionBorder,
        background: theme.sectionBg,
        overflow: "hidden"
      }}
    >
      <Box sx={{ position: "relative", borderBottom: theme.sectionBorder }}>
        <Box
          component="img"
          src={item.imageUrl}
          alt={item.prompt}
          sx={{
            width: "100%",
            aspectRatio: getAssetAspectRatio(item.kind),
            objectFit: "cover",
            display: "block"
          }}
        />
        <Typography
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            borderRadius: 0.75,
            px: 0.7,
            py: 0.25,
            fontSize: 10,
            fontWeight: 800,
            color: theme.titleText,
            background: theme.panelBg,
            border: theme.sectionBorder,
            boxShadow: "0 8px 18px rgba(0,0,0,0.22)"
          }}
        >
          {getAssetKindLabel(item.kind)}
        </Typography>
      </Box>
      <Stack spacing={0.6} sx={{ p: 1 }}>
        <Typography
          title={item.prompt}
          sx={{
            fontSize: 12,
            fontWeight: 700,
            color: theme.titleText,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          {item.prompt}
        </Typography>
        <Typography sx={{ fontSize: 11, color: theme.text }}>
          {item.model}
        </Typography>
        <Tooltip title={item.traceId ? `${t("editor.project.aiTraceId")}: ${item.traceId}` : ""}>
          <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
            {new Date(item.createdAt).toLocaleString()}
          </Typography>
        </Tooltip>
        <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
          {mode === "manage" ? (
            <>
              <Tooltip title={t("editor.ai.viewResult")}>
                <IconButton
                  size="small"
                  onClick={() => onPreview(item)}
                  sx={{
                    color: theme.pillText,
                    border: theme.sectionBorder,
                    background: theme.iconButtonBg
                  }}
                >
                  <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("editor.project.delete")}>
                <IconButton
                  size="small"
                  onClick={() => onDelete(item)}
                  sx={{
                    color: theme.pillText,
                    border: theme.sectionBorder,
                    background: theme.iconButtonBg
                  }}
                >
                  <DeleteRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              {item.kind === "image" && onApply ? (
                <Tooltip title={t("editor.properties.applyAiAsset")}>
                  <IconButton
                    size="small"
                    onClick={() => onApply(item)}
                    sx={{
                      color: theme.pillText,
                      border: theme.sectionBorder,
                      background: theme.iconButtonBg
                    }}
                  >
                    <FormatPaintRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              ) : null}
              {item.kind === "pbr_atlas" && onApplyPbrAtlas ? (
                <Tooltip title={t("editor.project.applyPbrAtlas")}>
                  <IconButton
                    size="small"
                    onClick={() => onApplyPbrAtlas(item)}
                    sx={{
                      color: theme.pillText,
                      border: theme.sectionBorder,
                      background: theme.iconButtonBg
                    }}
                  >
                    <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              ) : null}
              {item.kind === "panorama" && onApplyPanorama ? (
                <Tooltip title={t("editor.project.applyPanorama")}>
                  <IconButton
                    size="small"
                    onClick={() => onApplyPanorama(item)}
                    sx={{
                      color: theme.pillText,
                      border: theme.sectionBorder,
                      background: theme.iconButtonBg
                    }}
                  >
                    <LandscapeRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              ) : null}
            </>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
