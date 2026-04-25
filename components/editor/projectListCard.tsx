"use client";

import { Box, Button, Card, CardActionArea, CardContent, Stack, Typography } from "@mui/material";
import type { ProjectSummary } from "@/lib/api/contracts/projects";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";

type ProjectListCardProps = {
  project: ProjectSummary;
  theme: EditorThemeTokens;
  onSelect: () => void;
};

export default function ProjectListCard({ project, theme, onSelect }: ProjectListCardProps) {
  const { t } = useI18n();

  return (
    <Card
      elevation={0}
      sx={{
        border: theme.sectionBorder,
        background: theme.sectionBg,
        overflow: "hidden"
      }}
    >
      <CardActionArea onClick={onSelect}>
        <Box
          sx={{
            height: 150,
            background: theme.panelBgMuted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}
        >
          {project.thumbnailUrl ? (
            <Box
              component="img"
              src={project.thumbnailUrl}
              alt={project.title}
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Typography sx={{ color: theme.mutedText, fontSize: 12 }}>
              {t("editor.project.empty")}
            </Typography>
          )}
        </Box>
        <CardContent>
          <Stack spacing={0.75}>
            <Typography sx={{ color: theme.titleText, fontWeight: 700 }}>{project.title}</Typography>
            {project.description ? (
              <Typography sx={{ color: theme.text, fontSize: 12 }}>{project.description}</Typography>
            ) : null}
            <Typography sx={{ color: theme.mutedText, fontSize: 11 }}>
              {new Date(project.updatedAt).toLocaleString()}
            </Typography>
            <Button size="small" variant="outlined" onClick={onSelect}>
              {t("editor.project.select")}
            </Button>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
