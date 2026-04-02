"use client";

import { MouseEvent, useMemo, useState } from "react";
import { Box, Button, ClickAwayListener, Stack, Typography } from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import OpenWithRoundedIcon from "@mui/icons-material/OpenWithRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import type { EditorApp } from "@/render/editor";
import { useI18n } from "@/lib/i18n";
import { viewportPillSx } from "./viewportControlStyles";

type HelperKey = "gridHelper" | "transformGizmo" | "lightHelper" | "panorama";

type ViewControlProps = {
  app: EditorApp | null;
  viewStateVersion: number;
};

export default function ViewControl({ app, viewStateVersion }: ViewControlProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const helperVisibility = useMemo(
    () =>
      app?.getViewHelperVisibility() ?? {
        gridHelper: true,
        transformGizmo: true,
        lightHelper: true,
        panorama: false,
        panoramaAvailable: false
      },
    [app, viewStateVersion]
  );

  const helperItems: Array<{
    key: HelperKey;
    icon: typeof GridViewRoundedIcon;
    label: string;
    visible: boolean;
    disabled?: boolean;
  }> = [
    {
      key: "gridHelper",
      icon: GridViewRoundedIcon,
      label: t("editor.view.gridHelper"),
      visible: helperVisibility.gridHelper
    },
    {
      key: "transformGizmo",
      icon: OpenWithRoundedIcon,
      label: t("editor.view.transformGizmo"),
      visible: helperVisibility.transformGizmo
    },
    {
      key: "lightHelper",
      icon: LightModeRoundedIcon,
      label: t("editor.view.lightHelper"),
      visible: helperVisibility.lightHelper
    },
    {
      key: "panorama",
      icon: VisibilityRoundedIcon,
      label: t("editor.view.panorama"),
      visible: helperVisibility.panorama,
      disabled: !helperVisibility.panoramaAvailable
    }
  ];

  const onToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen((value) => !value);
  };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative" }}>
        {open ? (
          <Box
            sx={{
              position: "absolute",
              right: 0,
              bottom: 39.3,
              minWidth: 220,
              p: 1,
              borderRadius: 2,
              border: "1px solid rgba(180,205,255,0.26)",
              background: "rgba(8,12,24,0.78)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 18px 40px rgba(0,0,0,0.28)"
            }}
          >
            <Stack spacing={0.75}>
              <Typography
                sx={{
                  px: 1,
                  pb: 0.4,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "rgba(220,232,255,0.92)"
                }}
              >
                {t("editor.view.title")}
              </Typography>
              {helperItems.map((item) => (
                <Button
                  key={item.key}
                  color="inherit"
                  disabled={item.disabled}
                  onClick={() => app?.setViewHelperVisibility(item.key, !item.visible)}
                  sx={{
                    justifyContent: "flex-start",
                    px: 1.1,
                    py: 0.9,
                    borderRadius: 1.6,
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(219,230,255,0.84)",
                    textTransform: "none"
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                    <item.icon sx={{ fontSize: 16 }} />
                    <Typography sx={{ flex: 1, fontSize: 13, textAlign: "left" }}>
                      {item.label}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "rgba(170,188,225,0.74)" }}>
                      {item.visible ? t("editor.view.hide") : t("editor.view.show")}
                    </Typography>
                  </Stack>
                </Button>
              ))}
            </Stack>
          </Box>
        ) : null}

        <Button
          size="small"
          color="inherit"
          onClick={onToggle}
          startIcon={<VisibilityRoundedIcon />}
          endIcon={<KeyboardArrowUpRoundedIcon />}
          sx={viewportPillSx}
        >
          {t("editor.view.title")}
        </Button>
      </Box>
    </ClickAwayListener>
  );
}
