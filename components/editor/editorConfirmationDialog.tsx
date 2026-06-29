"use client";

import { useCallback, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from "@mui/material";
import type { EditorThemeTokens } from "@/components/editor/theme";
import type { TranslationKey } from "@/lib/i18n";

type EditorConfirmationDialogOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "primary" | "error";
  showCancel?: boolean;
};

type PendingConfirmation = Required<Pick<EditorConfirmationDialogOptions, "message" | "showCancel">> &
  Omit<EditorConfirmationDialogOptions, "message" | "showCancel"> & {
    resolve: (confirmed: boolean) => void;
  };

type UseEditorConfirmationDialogOptions = {
  theme: EditorThemeTokens;
  t: (key: TranslationKey) => string;
};

export function useEditorConfirmationDialog({
  theme,
  t
}: UseEditorConfirmationDialogOptions) {
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  const requestConfirmation = useCallback(
    (options: EditorConfirmationDialogOptions) =>
      new Promise<boolean>((resolve) => {
        setPendingConfirmation({
          ...options,
          showCancel: options.showCancel ?? true,
          resolve
        });
      }),
    []
  );

  const confirm = useCallback(
    (options: Omit<EditorConfirmationDialogOptions, "showCancel">) =>
      requestConfirmation({ ...options, showCancel: true }),
    [requestConfirmation]
  );

  const notify = useCallback(
    (options: Omit<EditorConfirmationDialogOptions, "showCancel" | "cancelLabel">) =>
      requestConfirmation({ ...options, showCancel: false }).then(() => undefined),
    [requestConfirmation]
  );

  const closePendingConfirmation = (confirmed: boolean) => {
    if (!pendingConfirmation) {
      return;
    }

    pendingConfirmation.resolve(confirmed);
    setPendingConfirmation(null);
  };

  const confirmationDialog = (
    <Dialog
      open={Boolean(pendingConfirmation)}
      onClose={() => closePendingConfirmation(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1.5,
          border: theme.panelBorder,
          background: theme.panelBg,
          color: theme.text
        }
      }}
    >
      <DialogTitle sx={{ color: theme.titleText, fontWeight: 700, pb: 1.25 }}>
        {pendingConfirmation?.title ??
          (pendingConfirmation?.showCancel ? t("dialog.confirmTitle") : t("dialog.noticeTitle"))}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ color: theme.text, fontSize: 14, lineHeight: 1.65 }}>
          {pendingConfirmation?.message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {pendingConfirmation?.showCancel ? (
          <Button
            variant="text"
            color="inherit"
            onClick={() => closePendingConfirmation(false)}
          >
            {pendingConfirmation.cancelLabel ?? t("dialog.cancel")}
          </Button>
        ) : null}
        <Button
          variant="contained"
          color={pendingConfirmation?.confirmColor ?? "primary"}
          onClick={() => closePendingConfirmation(true)}
        >
          {pendingConfirmation?.confirmLabel ?? t("dialog.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return {
    confirm,
    confirmationDialog,
    notify
  };
}
