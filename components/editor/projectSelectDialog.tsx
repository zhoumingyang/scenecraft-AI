"use client";

import { Alert, Dialog, DialogContent, DialogTitle, Grid, Stack, Typography } from "@mui/material";
import type { ProjectSummary } from "@/lib/api/contracts/projects";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import ProjectListCard from "./projectListCard";

type ProjectSelectDialogProps = {
  open: boolean;
  projects: ProjectSummary[];
  isLoading: boolean;
  errorMessage: string | null;
  theme: EditorThemeTokens;
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
};

export default function ProjectSelectDialog({
  open,
  projects,
  isLoading,
  errorMessage,
  theme,
  onClose,
  onSelectProject
}: ProjectSelectDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          border: theme.panelBorder,
          background: theme.panelBg,
          color: theme.text,
          boxShadow: theme.panelShadow,
          backdropFilter: "blur(16px)"
        }
      }}
    >
      <DialogTitle sx={{ color: theme.titleText, fontWeight: 700 }}>
        {t("editor.project.selectDialogTitle")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.4}>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          {isLoading ? (
            <Typography sx={{ color: theme.mutedText, fontSize: 12 }}>
              {t("editor.project.loading")}
            </Typography>
          ) : null}
          {!isLoading && projects.length === 0 ? (
            <Typography sx={{ color: theme.mutedText, fontSize: 12 }}>
              {t("editor.project.empty")}
            </Typography>
          ) : null}
          <Grid container spacing={1.5}>
            {projects.map((project) => (
              <Grid key={project.id} size={{ xs: 12, sm: 6 }}>
                <ProjectListCard
                  project={project}
                  theme={theme}
                  onSelect={() => onSelectProject(project.id)}
                />
              </Grid>
            ))}
          </Grid>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
