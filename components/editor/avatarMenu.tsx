"use client";

import { useState } from "react";
import { Button } from "@mui/material";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import { useRouter } from "next/navigation";
import DropdownMenu from "@/components/common/dropdownMenu";
import { useI18n } from "@/lib/i18n";
import { authClient } from "@/lib/authClient";

type AvatarMenuProps = {
  userEmail: string | null;
};

const EMAIL_MAX_LENGTH = 26;

const truncateEmail = (email: string) =>
  email.length > EMAIL_MAX_LENGTH ? `${email.slice(0, EMAIL_MAX_LENGTH - 3)}...` : email;

export default function AvatarMenu({ userEmail }: AvatarMenuProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const displayLabel = userEmail ? truncateEmail(userEmail) : t("editor.avatar.default");

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
          backdropFilter: "blur(10px)",
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
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        items={[
          {
            key: "signOut",
            label: t("editor.avatar.signOut"),
            disabled: signOutBusy,
            onClick: onSignOut
          }
        ]}
      />
    </>
  );
}
