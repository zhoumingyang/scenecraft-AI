"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button, MenuItem, Select, SelectChangeEvent, Typography } from "@mui/material";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/authClient";
import { useAppStore } from "@/stores/appStore";
import AuthDialog from "@/components/authDialog";
import { HomeEffect } from "@/render/homeEffect";
import { useI18n } from "@/lib/i18n";

type HomeViewProps = {
  isAuthenticated: boolean;
  displayName: string | null;
  socialProviders: {
    google: boolean;
    github: boolean;
  };
};

export default function HomeView({ isAuthenticated, displayName, socialProviders }: HomeViewProps) {
  const router = useRouter();
  const { authMode, setAuthMode } = useAppStore();
  const { locale, setLocale, t } = useI18n();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [resetPasswordToken, setResetPasswordToken] = useState<string | null>(null);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const effectRef = useRef<HomeEffect | null>(null);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const effect = new HomeEffect(host);
    effectRef.current = effect;
    effect.start();

    return () => {
      effect.dispose();
      effectRef.current = null;
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const authFlow = url.searchParams.get("authFlow");
    const token = url.searchParams.get("token");

    if (authFlow === "reset-password" && token) {
      setResetPasswordToken(token);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      return;
    }

    if (authFlow === "signup-verified" && isAuthenticated) {
      window.history.replaceState({}, "", "/home");
      router.push("/editor");
    }
  }, [isAuthenticated, router]);

  const openAuthModal = (mode: "login" | "register") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const signOut = async () => {
    setSignOutBusy(true);
    try {
      await authClient.signOut();
      router.refresh();
    } finally {
      setSignOutBusy(false);
    }
  };

  const onLocaleChange = (event: SelectChangeEvent) => {
    setLocale(event.target.value as "en" | "zh");
  };

  const topControlSx = {
    width: 112,
    height: 40,
    borderRadius: 2
  };

  return (
    <Box sx={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <Box
        ref={canvasHostRef}
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          cursor: "pointer"
        }}
      />
      <Box
        sx={{
          position: "absolute",
          right: 28,
          top: 22,
          zIndex: 10,
          display: "flex",
          gap: 1.5
        }}
      >
        {!isAuthenticated ? (
          <>
            <Button
              variant="contained"
              startIcon={<LoginRoundedIcon />}
              onClick={() => openAuthModal("login")}
              sx={topControlSx}
            >
              {t("home.login")}
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<PersonAddRoundedIcon />}
              onClick={() => openAuthModal("register")}
              sx={topControlSx}
            >
              {t("home.register")}
            </Button>
          </>
        ) : (
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<LogoutRoundedIcon />}
            onClick={signOut}
            disabled={signOutBusy}
            sx={topControlSx}
          >
            {t("home.signOut")}
          </Button>
        )}
        <Select
          size="small"
          value={locale}
          onChange={onLocaleChange}
          variant="outlined"
          aria-label={t("language.label")}
          sx={{
            ...topControlSx,
            color: "rgba(230,241,255,0.96)",
            "& .MuiSelect-select": {
              minHeight: "unset",
              display: "flex",
              alignItems: "center",
              py: 0
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(181,205,255,0.4)"
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(181,205,255,0.65)"
            },
            "& .MuiSvgIcon-root": {
              color: "rgba(230,241,255,0.9)"
            }
          }}
        >
          <MenuItem value="en">{t("language.english")}</MenuItem>
          <MenuItem value="zh">{t("language.chinese")}</MenuItem>
        </Select>
      </Box>
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          top: "calc(50% + clamp(120px, 18vh, 190px))",
          transform: "translateX(-50%)",
          zIndex: 9,
          pointerEvents: "none",
          textAlign: "center"
        }}
      >
        <Typography
          sx={{
            color: "rgba(220,233,255,0.88)",
            fontSize: { xs: 16, md: 19 },
            letterSpacing: "0.04em"
          }}
        >
          {t("home.slogan")}
        </Typography>
        {isAuthenticated ? (
          <Button
            variant="contained"
            size="large"
            startIcon={<OpenInNewRoundedIcon />}
            sx={{ mt: 2.2, pointerEvents: "auto" }}
            onClick={() => router.push("/editor")}
          >
            {t("home.enterEditor", { name: displayName || t("common.creator") })}
          </Button>
        ) : null}
      </Box>

      <AuthDialog
        open={isAuthModalOpen}
        mode={authMode}
        onClose={closeAuthModal}
        resetPasswordToken={resetPasswordToken}
        onResetPasswordTokenClear={() => setResetPasswordToken(null)}
        socialProviders={socialProviders}
      />
    </Box>
  );
}
