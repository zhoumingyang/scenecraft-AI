"use client";

import { useState } from "react";
import { Button } from "@mui/material";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { useRouter } from "next/navigation";
import DropdownMenu from "@/components/common/dropdownMenu";
import { useI18n } from "@/lib/i18n";
import { authClient } from "@/lib/authClient";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useEditorStore } from "@/stores/editorStore";

type AvatarMenuProps = {
  userEmail: string | null;
};

const EMAIL_MAX_LENGTH = 26;

const truncateEmail = (email: string) =>
  email.length > EMAIL_MAX_LENGTH ? `${email.slice(0, EMAIL_MAX_LENGTH - 3)}...` : email;

export default function AvatarMenu({ userEmail }: AvatarMenuProps) {
  const router = useRouter();
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const setEditorThemeMode = useEditorStore((state) => state.setEditorThemeMode);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const displayLabel = userEmail ? truncateEmail(userEmail) : t("editor.avatar.default");
  const theme = getEditorThemeTokens(editorThemeMode);

  const onSignOut = async () => {
    setSignOutBusy(true);
    try {
      await authClient.signOut();
      router.push("/home");
      router.refresh();
    } finally {
      setSignOutBusy(false);
      setAnchorEl(null);
    }
  };

  return (
    <>
      <Button
        size="small"
        color="inherit"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        startIcon={<AccountCircleRoundedIcon />}
        endIcon={<KeyboardArrowDownRoundedIcon />}
        sx={{
          position: "absolute",
          left: 20,
          top: 18,
          zIndex: 21,
          borderRadius: 99,
          border: theme.pillBorder,
          background: theme.pillBg,
          backdropFilter: "blur(10px)",
          boxShadow: theme.pillShadow,
          color: theme.pillText,
          maxWidth: 280
        }}
        title={userEmail || undefined}
      >
        <span
          style={{
            maxWidth: 180,
            display: "inline-block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            verticalAlign: "bottom"
          }}
        >
          {displayLabel}
        </span>
      </Button>

      <DropdownMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        items={[
          {
            key: "themeDark",
            label: (
              <>
                <DarkModeRoundedIcon sx={{ mr: 1, fontSize: 18, verticalAlign: "text-bottom" }} />
                {t("editor.avatar.themeDark")}
              </>
            ),
            selected: editorThemeMode === "dark",
            onClick: () => {
              setEditorThemeMode("dark");
              setAnchorEl(null);
            }
          },
          {
            key: "themeLight",
            label: (
              <>
                <LightModeRoundedIcon sx={{ mr: 1, fontSize: 18, verticalAlign: "text-bottom" }} />
                {t("editor.avatar.themeLight")}
              </>
            ),
            selected: editorThemeMode === "light",
            onClick: () => {
              setEditorThemeMode("light");
              setAnchorEl(null);
            }
          },
          {
            key: "signOut",
            label: t("editor.avatar.signOut"),
            disabled: signOutBusy,
            onClick: onSignOut
          }
        ]}
        themeMode={editorThemeMode}
      />
    </>
  );
}
