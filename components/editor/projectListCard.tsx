"use client";

import { useState } from "react";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
  Box,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import ProjectThumbnailPreviewDialog from "@/components/editor/projectThumbnailPreviewDialog";
import type { ProjectSummary } from "@/lib/api/contracts/projects";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";

type ProjectListCardProps = {
  project: ProjectSummary;
  theme: EditorThemeTokens;
  isDeleting?: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

export default function ProjectListCard({
  project,
  theme,
  isDeleting = false,
  onSelect,
  onDelete
}: ProjectListCardProps) {
  const { t } = useI18n();
  const hasTags = project.tags.length > 0;
  const [previewOpen, setPreviewOpen] = useState(false);
  const hasThumbnail = Boolean(project.thumbnailUrl);

  const handleOpenPreview = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!hasThumbnail) return;
    setPreviewOpen(true);
  };

  return (
    <>
      <Card
        elevation={0}
        sx={{
          border: theme.sectionBorder,
          background: theme.sectionBg,
          overflow: "hidden",
          borderRadius: "13px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 18px 36px rgba(0,0,0,0.12)",
          transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: theme.panelShadow
          }
        }}
      >
        <CardActionArea
          disabled={isDeleting}
          onClick={onSelect}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            flex: 1
          }}
        >
          <Box
            sx={{
              height: { xs: 160, md: 148, lg: 136 },
              background: `linear-gradient(180deg, transparent, rgba(0,0,0,0.08)), ${theme.panelBgMuted}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              position: "relative"
            }}
          >
            {project.thumbnailUrl ? (
              <Box
                component="img"
                src={project.thumbnailUrl}
                alt={project.title}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "transform 240ms ease",
                  ".MuiCardActionArea-root:hover &": {
                    transform: "scale(1.03)"
                  }
                }}
              />
            ) : (
              <Stack spacing={0.6} sx={{ alignItems: "center", px: 2 }}>
                <Typography sx={{ color: theme.titleText, fontSize: 13, fontWeight: 700 }}>
                  {project.title}
                </Typography>
                <Typography sx={{ color: theme.mutedText, fontSize: 11.5 }}>
                  {t("editor.project.empty")}
                </Typography>
              </Stack>
            )}
            <Stack
              direction="row"
              spacing={0.8}
              sx={{
                position: "absolute",
                inset: "auto 12px 12px auto",
                alignItems: "center"
              }}
            >
              <Tooltip title={t("editor.project.previewThumbnail")}>
                <span>
                  <IconButton
                    component="span"
                    size="small"
                    disabled={!hasThumbnail}
                    onClick={handleOpenPreview}
                    sx={{
                      width: 28,
                      height: 28,
                      color: theme.pillText,
                      border: theme.pillBorder,
                      background: theme.pillBg,
                      backdropFilter: "blur(10px)",
                      "&:hover": {
                        background: theme.itemHoverBg
                      }
                    }}
                  >
                    <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <Box
                sx={{
                  px: 1,
                  py: 0.45,
                  borderRadius: "999px",
                  background: theme.pillBg,
                  border: theme.pillBorder,
                  color: theme.pillText,
                  fontSize: 10.5,
                  lineHeight: 1,
                  backdropFilter: "blur(10px)"
                }}
              >
                v{project.version}
              </Box>
            </Stack>
          </Box>
          <CardContent sx={{ px: 1.5, pt: 1.15, pb: 0.9, width: "100%" }}>
            <Stack spacing={0.55}>
              <Typography
                sx={{
                  color: theme.titleText,
                  fontWeight: 700,
                  fontSize: 13.5,
                  lineHeight: 1.25,
                  minHeight: "2.5em",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}
              >
                {project.title}
              </Typography>
              {project.description ? (
                <Typography
                  sx={{
                    color: theme.text,
                    fontSize: 11.5,
                    lineHeight: 1.35,
                    minHeight: "2.7em",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}
                >
                  {project.description}
                </Typography>
              ) : null}
              {hasTags ? (
                <Typography
                  sx={{
                    color: theme.mutedText,
                    fontSize: 10.5,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  #{project.tags.join("  #")}
                </Typography>
              ) : null}
              <Typography sx={{ color: theme.mutedText, fontSize: 10.5, lineHeight: 1.2 }}>
                {new Date(project.updatedAt).toLocaleString()}
              </Typography>
            </Stack>
          </CardContent>
        </CardActionArea>
        <CardActions sx={{ px: 1.35, pb: 1.2, pt: 0, justifyContent: "flex-end", gap: 0.35 }}>
          <Tooltip title={t("editor.project.delete")}>
            <span>
              <IconButton
                size="small"
                disabled={isDeleting}
                onClick={onDelete}
                sx={{
                  color: theme.mutedText,
                  border: theme.sectionBorder,
                  background: theme.itemBg,
                  "&:hover": {
                    color: theme.titleText,
                    background: theme.itemHoverBg
                  }
                }}
              >
                <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t("editor.project.select")}>
            <span>
              <IconButton
                size="small"
                disabled={isDeleting}
                onClick={onSelect}
                sx={{
                  color: theme.titleText,
                  border: theme.pillBorder,
                  background: theme.pillBg,
                  "&:hover": {
                    background: theme.itemHoverBg
                  }
                }}
              >
                {isDeleting ? (
                  <CircularProgress size={15} thickness={5} sx={{ color: "inherit" }} />
                ) : (
                  <OpenInFullRoundedIcon sx={{ fontSize: 17 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </CardActions>
      </Card>
      <ProjectThumbnailPreviewDialog
        open={previewOpen}
        title={project.title}
        thumbnailUrl={project.thumbnailUrl}
        theme={theme}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}
