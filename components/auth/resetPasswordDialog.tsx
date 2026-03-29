import { FormEvent, useState } from "react";
import { Alert, Box, Stack, Typography } from "@mui/material";
import { authClient } from "@/lib/authClient";
import AuthTextField from "@/components/common/authTextField";
import AuthPrimaryButton from "@/components/common/authPrimaryButton";
import AuthDialogFrame from "@/components/common/authDialogFrame";
import { useI18n } from "@/lib/i18n";

type ResetPasswordDialogProps = {
  token: string | null;
  onClose: () => void;
};

const rowLabelSx = { minWidth: 52, color: "rgba(236,244,255,0.9)", fontWeight: 600 };

export default function ResetPasswordDialog({ token, onClose }: ResetPasswordDialogProps) {
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState("");

  const closeDialog = () => {
    if (busy) return;
    setNewPassword("");
    setErrorText("");
    onClose();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    if (!newPassword.trim()) {
      setErrorText(t("auth.reset.errorRequired"));
      return;
    }

    setBusy(true);
    setErrorText("");

    try {
      const result = await authClient.resetPassword({
        token,
        newPassword: newPassword.trim()
      });

      if (result.error) {
        setErrorText(result.error.message || t("auth.reset.errorFailed"));
        return;
      }

      closeDialog();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthDialogFrame
      open={Boolean(token)}
      title={t("auth.reset.title")}
      onClose={closeDialog}
      disableClose={busy}
    >
      <Typography color="text.secondary" sx={{ mb: 2.4, lineHeight: 1.7 }}>
        {t("auth.reset.description")}
      </Typography>
      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={1.8}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography sx={rowLabelSx}>{t("auth.reset.labelNewPassword")}</Typography>
            <AuthTextField
              type="password"
              placeholder={t("common.passwordMin8")}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              fullWidth
              autoComplete="new-password"
            />
          </Stack>
          {errorText ? <Alert severity="error">{errorText}</Alert> : null}
          <AuthPrimaryButton type="submit" size="large" disabled={busy || !token}>
            {busy ? t("common.processing") : t("auth.reset.submit")}
          </AuthPrimaryButton>
        </Stack>
      </Box>
    </AuthDialogFrame>
  );
}
