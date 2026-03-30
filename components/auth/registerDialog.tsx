import { FormEvent, useMemo, useState } from "react";
import { Alert, Box, Stack, Typography } from "@mui/material";
import { authClient } from "@/lib/authClient";
import AuthTextField from "@/components/common/authTextField";
import AuthPrimaryButton from "@/components/common/authPrimaryButton";
import AuthDialogFrame from "@/components/common/authDialogFrame";
import { useI18n } from "@/lib/i18n";

type RegisterDialogProps = {
  open: boolean;
  onClose: () => void;
};

const rowLabelSx = {
  width: 92,
  flexShrink: 0,
  color: "rgba(236,244,255,0.9)",
  fontWeight: 600
};

function nameFromEmail(email: string) {
  const local = email.split("@")[0]?.trim();
  if (!local) return "creator";
  return local.slice(0, 36);
}

export default function RegisterDialog({ open, onClose }: RegisterDialogProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const signupCallbackURL = useMemo(() => "/home?authFlow=signup-verified", []);

  const closeDialog = () => {
    if (busy) return;
    onClose();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorText(t("auth.register.errorRequired"));
      return;
    }

    setBusy(true);
    setErrorText("");
    setSuccessText("");

    try {
      const result = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: nameFromEmail(email.trim()),
        callbackURL: signupCallbackURL
      });

      if (result.error) {
        setErrorText(result.error.message || t("auth.register.errorFailed"));
        return;
      }

      setSuccessText(t("auth.register.success"));
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthDialogFrame
      open={open}
      title={t("auth.register.title")}
      onClose={closeDialog}
      disableClose={busy}
    >
      <Typography color="text.secondary" sx={{ mb: 2.4, lineHeight: 1.7 }}>
        {t("auth.register.description")}
      </Typography>
      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={1.8}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography sx={rowLabelSx}>{t("common.email")}</Typography>
            <AuthTextField
              placeholder={t("auth.login.emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
              autoComplete="email"
            />
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography sx={rowLabelSx}>{t("common.password")}</Typography>
            <AuthTextField
              type="password"
              placeholder={t("common.passwordMin8")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              fullWidth
              autoComplete="new-password"
            />
          </Stack>
          {errorText ? <Alert severity="error">{errorText}</Alert> : null}
          {successText ? <Alert severity="success">{successText}</Alert> : null}
          <AuthPrimaryButton type="submit" size="large" disabled={busy}>
            {busy ? t("common.processing") : t("auth.register.submit")}
          </AuthPrimaryButton>
        </Stack>
      </Box>
    </AuthDialogFrame>
  );
}