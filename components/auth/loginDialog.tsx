import { FormEvent, useMemo, useState } from "react";
import { Alert, Box, Button, Divider, Link, Stack, Typography } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import GitHubIcon from "@mui/icons-material/GitHub";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/authClient";
import AuthTextField from "@/components/common/authTextField";
import AuthPrimaryButton from "@/components/common/authPrimaryButton";
import AuthDialogFrame from "@/components/common/authDialogFrame";
import { useI18n } from "@/lib/i18n";

type LoginDialogProps = {
  open: boolean;
  onClose: () => void;
  socialProviders: {
    google: boolean;
    github: boolean;
  };
};

const rowLabelSx = {
  width: 92,
  flexShrink: 0,
  color: "rgba(236,244,255,0.9)",
  fontWeight: 600
};

const socialButtonSx = {
  borderRadius: 2.5,
  py: 1,
  borderColor: "rgba(202,217,255,0.36)",
  backgroundColor: "rgba(255,255,255,0.04)"
};

export default function LoginDialog({ open, onClose, socialProviders }: LoginDialogProps) {
  const router = useRouter();
  const { t } = useI18n();
  const hasSocialProviders = socialProviders.google || socialProviders.github;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const resetRedirectURL = useMemo(() => "/home?authFlow=reset-password", []);

  const closeDialog = () => {
    if (busy || forgotBusy) return;
    onClose();
  };

  const onEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorText(t("auth.login.errorRequired"));
      return;
    }

    setBusy(true);
    setErrorText("");

    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
        callbackURL: "/editor"
      });

      if (result.error) {
        setErrorText(result.error.message || t("auth.login.errorInvalid"));
        return;
      }

      onClose();
      router.push("/editor");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const onSocialSignIn = async (provider: "google" | "github") => {
    setBusy(true);
    setErrorText("");

    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: "/editor"
      });

      if (result.error) {
        setErrorText(result.error.message || t("auth.login.errorSocial"));
        return;
      }

      onClose();
    } finally {
      setBusy(false);
    }
  };

  const onForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError(t("auth.forgot.errorRequired"));
      return;
    }

    setForgotBusy(true);
    setForgotError("");
    setForgotSuccess("");

    try {
      const result = await authClient.requestPasswordReset({
        email: forgotEmail.trim(),
        redirectTo: resetRedirectURL
      });

      if (result.error) {
        setForgotError(result.error.message || t("auth.forgot.errorSendFailed"));
        return;
      }

      setForgotSuccess(t("auth.forgot.success"));
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <AuthDialogFrame
      open={open}
      title={t("auth.login.title")}
      onClose={closeDialog}
      disableClose={busy || forgotBusy}
    >
      {!forgotMode ? (
        <>
          <Typography color="text.secondary" sx={{ mb: 2.4, lineHeight: 1.7 }}>
            {t("auth.login.description")}
          </Typography>
          <Box component="form" onSubmit={onEmailLogin}>
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
                  placeholder={t("auth.login.passwordPlaceholder")}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  fullWidth
                  autoComplete="current-password"
                />
              </Stack>
              <Box sx={{ textAlign: "right", mt: -0.4 }}>
                <Link
                  component="button"
                  type="button"
                  underline="hover"
                  onClick={() => {
                    setForgotMode(true);
                    setForgotEmail(email);
                    setForgotError("");
                    setForgotSuccess("");
                  }}
                >
                  {t("auth.login.forgotPassword")}
                </Link>
              </Box>
              {errorText ? <Alert severity="error">{errorText}</Alert> : null}
              <AuthPrimaryButton type="submit" size="large" disabled={busy}>
                {busy ? t("common.processing") : t("auth.login.submit")}
              </AuthPrimaryButton>
            </Stack>
          </Box>
          {hasSocialProviders ? (
            <>
              <Divider sx={{ my: 2.4 }}>{t("auth.login.socialDivider")}</Divider>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                {socialProviders.google ? (
                  <Button
                    variant="outlined"
                    startIcon={<GoogleIcon />}
                    onClick={() => onSocialSignIn("google")}
                    disabled={busy}
                    fullWidth
                    sx={socialButtonSx}
                  >
                    {t("auth.login.withGoogle")}
                  </Button>
                ) : null}
                {socialProviders.github ? (
                  <Button
                    variant="outlined"
                    startIcon={<GitHubIcon />}
                    onClick={() => onSocialSignIn("github")}
                    disabled={busy}
                    fullWidth
                    sx={socialButtonSx}
                  >
                    {t("auth.login.withGithub")}
                  </Button>
                ) : null}
              </Stack>
            </>
          ) : null}
        </>
      ) : (
        <>
          <Typography color="text.secondary" sx={{ mb: 2.4, lineHeight: 1.7 }}>
            {t("auth.forgot.description")}
          </Typography>
          <Box component="form" onSubmit={onForgotPassword}>
            <Stack spacing={1.8}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography sx={rowLabelSx}>{t("common.email")}</Typography>
                <AuthTextField
                  placeholder={t("auth.login.emailPlaceholder")}
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  fullWidth
                  autoComplete="email"
                />
              </Stack>
              {forgotError ? <Alert severity="error">{forgotError}</Alert> : null}
              {forgotSuccess ? <Alert severity="success">{forgotSuccess}</Alert> : null}
              <AuthPrimaryButton type="submit" size="large" disabled={forgotBusy}>
                {forgotBusy ? t("common.processing") : t("auth.forgot.submit")}
              </AuthPrimaryButton>
              <Button
                type="button"
                color="inherit"
                onClick={() => setForgotMode(false)}
                sx={{ borderRadius: 99 }}
              >
                {t("auth.login.backToLogin")}
              </Button>
            </Stack>
          </Box>
        </>
      )}
    </AuthDialogFrame>
  );
}
