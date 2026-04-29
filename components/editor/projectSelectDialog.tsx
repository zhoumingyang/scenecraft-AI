"use client";

import { Alert, Box, Dialog, DialogContent, DialogTitle, Grid, Stack, Typography } from "@mui/material";
import type { ProjectSummary } from "@/lib/api/contracts/projects";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import ProjectListCard from "./projectListCard";

type ProjectSelectDialogProps = {
  open: boolean;
  projects: ProjectSummary[];
  isLoading: boolean;
  deletingProjectId: string | null;
  errorMessage: string | null;
  theme: EditorThemeTokens;
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
};

export default function ProjectSelectDialog({
  open,
  projects,
  isLoading,
  deletingProjectId,
  errorMessage,
  theme,
  onClose,
  onSelectProject,
  onDeleteProject
}: ProjectSelectDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "min(1440px, calc(100vw - 32px))",
          minHeight: "min(760px, calc(100vh - 32px))",
          maxHeight: "calc(100vh - 32px)",
          border: theme.panelBorder,
          background: theme.panelBg,
          color: theme.text,
          boxShadow: theme.panelShadow,
          backdropFilter: "blur(16px)",
          borderRadius: "13px",
          overflow: "hidden"
        }
      }}
    >
      <DialogTitle
        sx={{
          px: { xs: 2.25, md: 3 },
          pt: { xs: 2.25, md: 2.75 },
          pb: 1.5
        }}
      >
        <Typography sx={{ color: theme.titleText, fontWeight: 800, fontSize: { xs: 22, md: 26 } }}>
          {t("editor.project.selectDialogTitle")}
        </Typography>
      </DialogTitle>
      <DialogContent
        sx={{
          px: { xs: 2.25, md: 3 },
          pb: { xs: 2.25, md: 3 },
          pt: 0,
          display: "flex",
          minHeight: 0
        }}
      >
        <Stack spacing={1.6} sx={{ flex: 1, minHeight: 0 }}>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          {isLoading ? (
            <Typography sx={{ color: theme.mutedText, fontSize: 12.5 }}>
              {t("editor.project.loading")}
            </Typography>
          ) : null}
          {!isLoading && projects.length === 0 ? (
            <Typography sx={{ color: theme.mutedText, fontSize: 12.5 }}>
              {t("editor.project.empty")}
            </Typography>
          ) : null}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              pr: { md: 0.5 }
            }}
          >
            <Grid container spacing={{ xs: 1.5, md: 2 }}>
              {projects.map((project) => (
                <Grid key={project.id} size={{ xs: 12, sm: 6, md: 3 }}>
                  <ProjectListCard
                    project={project}
                    theme={theme}
                    isDeleting={deletingProjectId === project.id}
                    onSelect={() => onSelectProject(project.id)}
                    onDelete={() => onDeleteProject(project.id)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
