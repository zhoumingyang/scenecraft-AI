"use client";

import { useState } from "react";
import { Button, Menu, MenuItem } from "@mui/material";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { authClient } from "@/lib/authClient";

export default function AvatarMenu() {
  const router = useRouter();
  const { t } = useI18n();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [signOutBusy, setSignOutBusy] = useState(false);

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
          right: 20,
          top: 18,
          zIndex: 21,
          borderRadius: 99,
          border: "1px solid rgba(180,205,255,0.3)",
          background: "rgba(8,12,24,0.72)",
          backdropFilter: "blur(10px)"
        }}
      >
        {t("editor.avatar.default")}
      </Button>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem disabled={signOutBusy} onClick={onSignOut}>
          {t("editor.avatar.signOut")}
        </MenuItem>
      </Menu>
    </>
  );
}
