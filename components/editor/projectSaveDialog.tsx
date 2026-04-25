"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import type { EditorProjectMetaJSON } from "@/render/editor";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";

type ProjectSaveDialogProps = {
  open: boolean;
  initialMeta: EditorProjectMetaJSON | null;
  theme: EditorThemeTokens;
  onClose: () => void;
  onConfirm: (meta: EditorProjectMetaJSON) => void;
  isSaving: boolean;
};

export default function ProjectSaveDialog({
  open,
  initialMeta,
  theme,
  onClose,
  onConfirm,
  isSaving
}: ProjectSaveDialogProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(initialMeta?.title ?? "");
    setDescription(initialMeta?.description ?? "");
    setTags(initialMeta?.tags?.join(", ") ?? "");
  }, [initialMeta, open]);

  const parsedTags = useMemo(
    () =>
      tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 10),
    [tags]
  );

  return (
    <Dialog
      open={open}
      onClose={isSaving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
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
        {t("editor.project.saveDialogTitle")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.4} sx={{ pt: 0.75 }}>
          <Typography sx={{ fontSize: 12, color: theme.mutedText }}>
            {t("editor.project.saveDialogDescription")}
          </Typography>
          <TextField
            value={title}
            label={t("editor.project.fieldTitle")}
            onChange={(event) => setTitle(event.target.value)}
            required
            autoFocus
            disabled={isSaving}
            inputProps={{ maxLength: 120 }}
          />
          <TextField
            value={description}
            label={t("editor.project.fieldDescription")}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isSaving}
            inputProps={{ maxLength: 500 }}
            multiline
            minRows={3}
          />
          <TextField
            value={tags}
            label={t("editor.project.fieldTags")}
            onChange={(event) => setTags(event.target.value)}
            disabled={isSaving}
            helperText={t("editor.project.fieldTagsHint")}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button color="inherit" onClick={onClose} disabled={isSaving}>
          {t("editor.project.cancel")}
        </Button>
        <Button
          variant="contained"
          disabled={!title.trim() || isSaving}
          onClick={() =>
            onConfirm({
              title: title.trim(),
              ...(description.trim() ? { description: description.trim() } : {}),
              ...(parsedTags.length > 0 ? { tags: parsedTags } : {})
            })
          }
        >
          {isSaving ? t("common.processing") : t("editor.project.confirmSave")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
