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
import { useEditorStore } from "@/stores/editorStore";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { getViewportPillSx } from "./viewportControlStyles";

type HelperKey = "gridHelper" | "transformGizmo" | "lightHelper";

type ViewControlProps = {
  app: EditorApp | null;
  viewStateVersion: number;
};

export default function ViewControl({ app, viewStateVersion }: ViewControlProps) {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const [open, setOpen] = useState(false);
  const theme = getEditorThemeTokens(editorThemeMode);

  const helperVisibility = useMemo(
    () =>
      app?.getViewHelperVisibility() ?? {
        gridHelper: true,
        transformGizmo: true,
        lightHelper: true
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
              borderRadius: 1,
              border: theme.panelBorder,
              background: theme.panelBg,
              backdropFilter: "blur(12px)",
              boxShadow: theme.panelShadow
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
                  color: theme.titleText
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
                    background: theme.itemBg,
                    color: theme.text,
                    textTransform: "none"
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                    <item.icon sx={{ fontSize: 16 }} />
                    <Typography sx={{ flex: 1, fontSize: 13, textAlign: "left" }}>
                      {item.label}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: theme.mutedText }}>
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
          sx={getViewportPillSx(editorThemeMode)}
        >
          {t("editor.view.title")}
        </Button>
      </Box>
    </ClickAwayListener>
  );
}
