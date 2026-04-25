"use client";

import { Alert, Snackbar } from "@mui/material";
import type { ProjectSaveStatus } from "@/stores/editorStore";

type ProjectSaveProgressToastProps = {
  status: ProjectSaveStatus;
  onClose: () => void;
};

export default function ProjectSaveProgressToast({
  status,
  onClose
}: ProjectSaveProgressToastProps) {
  if (status.phase === "idle") {
    return null;
  }

  return (
    <Snackbar
      open
      autoHideDuration={status.phase === "saving" ? null : 3500}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity={status.phase === "error" ? "error" : status.phase === "saving" ? "info" : "success"}
        variant="filled"
        onClose={status.phase === "saving" ? undefined : onClose}
      >
        {status.message ?? (status.phase === "saving" ? "Saving..." : "Saved")}
      </Alert>
    </Snackbar>
  );
}
