"use client";

import { MouseEvent, useMemo, useState } from "react";
import { Box, Button, ClickAwayListener, Stack, Typography } from "@mui/material";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import BlurOnRoundedIcon from "@mui/icons-material/BlurOnRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import OpenWithRoundedIcon from "@mui/icons-material/OpenWithRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import type { EditorApp, EditorRenderMode } from "@/render/editor";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { persistViewHelperVisibility } from "@/components/editor/viewHelperPreferences";
import { getViewportPillSx } from "./viewportControlStyles";

type HelperKey = "gridHelper" | "transformGizmo" | "lightHelper" | "shadow";

type ViewControlProps = {
  app: EditorApp | null;
  viewStateVersion: number;
};

export default function ViewControl({ app, viewStateVersion }: ViewControlProps) {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const currentProjectId = useEditorStore((state) => state.currentProjectId);
  const [open, setOpen] = useState(false);
  const theme = getEditorThemeTokens(editorThemeMode);
  const renderMode = useMemo(() => app?.getRenderMode() ?? "webgl", [app, viewStateVersion]);

  const helperVisibility = useMemo(
    () =>
      app?.getViewHelperVisibility() ?? {
        gridHelper: true,
        transformGizmo: true,
        lightHelper: true,
        shadow: false
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
      key: "shadow",
      icon: DarkModeRoundedIcon,
      label: t("editor.view.shadow"),
      visible: helperVisibility.shadow
    }
  ];

  const onToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen((value) => !value);
  };

  const nextRenderMode: EditorRenderMode = renderMode === "webgl" ? "pathTrace" : "webgl";

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
              <Button
                color="inherit"
                disabled={!app}
                onClick={() => {
                  app?.setRenderMode(nextRenderMode);
                }}
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
                  <BlurOnRoundedIcon sx={{ fontSize: 16 }} />
                  <Typography sx={{ flex: 1, fontSize: 13, textAlign: "left" }}>
                    {t("editor.view.renderer")}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: theme.mutedText }}>
                    {renderMode === "webgl"
                      ? t("editor.view.renderer.webgl")
                      : t("editor.view.renderer.pathTrace")}
                  </Typography>
                </Stack>
              </Button>
              {helperItems.map((item) => (
                <Button
                  key={item.key}
                  color="inherit"
                  disabled={item.disabled}
                  onClick={() => {
                    if (!app) return;
                    app.setViewHelperVisibility(item.key, !item.visible);
                    persistViewHelperVisibility(currentProjectId, app.getViewHelperVisibility());
                  }}
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
