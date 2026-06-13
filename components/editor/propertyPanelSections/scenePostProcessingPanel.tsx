"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { Box, Checkbox, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { PANEL_WIDTH } from "@/components/editor/propertyPanel/constants";
import type { EditorPostProcessPassId, ResolvedEditorPostProcessingConfigJSON } from "@/render/editor";
import { EDITOR_POST_PROCESS_PASS_ORDER } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import {
  PERFORMANCE_HEAVY_PASSES,
  POST_PROCESS_LABEL_KEY_MAP,
  PostProcessingPassParams
} from "./scenePostProcessingControls";

type ScenePostProcessingPanelProps = {
  config: ResolvedEditorPostProcessingConfigJSON;
  t: (key: string, values?: Record<string, string | number>) => string;
  onTogglePass: (passId: EditorPostProcessPassId, enabled: boolean) => void;
  onPatchPassParams: (passId: EditorPostProcessPassId, patch: Record<string, boolean | number>) => void;
};

export function ScenePostProcessingPanel({
  config,
  t,
  onTogglePass,
  onPatchPassParams
}: ScenePostProcessingPanelProps) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);
  const panelAnchorRef = useRef<HTMLDivElement | null>(null);
  const [activePassId, setActivePassId] = useState<EditorPostProcessPassId | null>(null);
  const [paramsPanelTop, setParamsPanelTop] = useState(88);
  const activePassEnabled = activePassId ? config.passes[activePassId].enabled : false;

  const syncParamsPanelTop = useCallback(() => {
    const anchor = panelAnchorRef.current;
    if (!anchor) return;
    setParamsPanelTop(Math.max(12, Math.round(anchor.getBoundingClientRect().top)));
  }, []);

  useEffect(() => {
    if (!activePassId || config.passes[activePassId].enabled) return;
    setActivePassId(null);
  }, [activePassId, config]);

  useEffect(() => {
    if (!activePassId || !activePassEnabled) return;
    syncParamsPanelTop();
    window.addEventListener("resize", syncParamsPanelTop);
    window.addEventListener("scroll", syncParamsPanelTop, true);
    return () => {
      window.removeEventListener("resize", syncParamsPanelTop);
      window.removeEventListener("scroll", syncParamsPanelTop, true);
    };
  }, [activePassEnabled, activePassId, syncParamsPanelTop]);

  return (
    <Box
      ref={panelAnchorRef}
      sx={{
        borderRadius: 1,
        border: theme.sectionBorder,
        background: theme.sectionBg,
        p: 1.1
      }}
    >
      <Stack spacing={1}>
        <Stack spacing={0.3}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: theme.mutedText
            }}
          >
            {t("editor.post.section")}
          </Typography>
        </Stack>

        <Stack spacing={0.3}>
          {EDITOR_POST_PROCESS_PASS_ORDER.map((passId) => {
            const enabled = config.passes[passId].enabled;
            const selected = activePassId === passId && enabled;

            return (
              <Stack
                key={passId}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  px: 0.2,
                  py: 0.2,
                  borderRadius: 0.75,
                  background: selected ? theme.itemSelectedBg : enabled ? theme.itemBg : "transparent"
                }}
              >
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 12,
                      color: enabled ? theme.pillText : theme.text
                    }}
                  >
                    {t(POST_PROCESS_LABEL_KEY_MAP[passId])}
                  </Typography>
                  {PERFORMANCE_HEAVY_PASSES.has(passId) ? (
                    <Typography
                      sx={{ flexShrink: 0, fontSize: 10, color: "rgba(255,188,120,0.9)" }}
                    >
                      {t("editor.post.performance")}
                    </Typography>
                  ) : null}
                </Stack>

                <Stack direction="row" spacing={0.2} alignItems="center" sx={{ flexShrink: 0 }}>
                  <Checkbox
                    checked={enabled}
                    onChange={(event) => onTogglePass(passId, event.target.checked)}
                    sx={{ p: 0.25 }}
                  />
                  <Tooltip title={t(POST_PROCESS_LABEL_KEY_MAP[passId])} arrow>
                    <span>
                      <IconButton
                        size="small"
                        disabled={!enabled}
                        onClick={() => {
                          setActivePassId(passId);
                          window.requestAnimationFrame(syncParamsPanelTop);
                        }}
                        sx={{
                          width: 25,
                          height: 25,
                          color: selected ? theme.pillText : theme.titleText,
                          border: selected ? theme.itemSelectedBorder : theme.sectionBorder,
                          background: selected ? theme.itemSelectedBg : theme.iconButtonBg,
                          "&:hover": {
                            background: theme.itemHoverBg
                          },
                          "&.Mui-disabled": {
                            color: theme.menuItemDisabledText,
                            border: theme.sectionBorder,
                            background: "transparent"
                          }
                        }}
                      >
                        <TuneRoundedIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
            );
          })}
        </Stack>

        {activePassId && activePassEnabled ? (
          <Box
            sx={{
              position: "fixed",
              top: paramsPanelTop,
              right: PANEL_WIDTH,
              zIndex: 22,
              width: 300,
              maxWidth: `calc(100vw - ${PANEL_WIDTH + 44}px)`,
              maxHeight: "calc(100vh - 112px)",
              borderRadius: "10px 0 0 10px",
              border: theme.panelBorder,
              background: theme.panelBg,
              backdropFilter: "blur(12px)",
              boxShadow: theme.panelShadow,
              overflow: "hidden"
            }}
          >
            <Stack spacing={1} sx={{ p: 1.05 }}>
              <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between">
                <Typography
                  sx={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: theme.titleText
                  }}
                >
                  {t(POST_PROCESS_LABEL_KEY_MAP[activePassId])}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setActivePassId(null)}
                  sx={{
                    flexShrink: 0,
                    color: theme.titleText,
                    border: theme.sectionBorder,
                    background: theme.iconButtonBg
                  }}
                >
                  <CloseRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>

              <Box sx={{ maxHeight: "calc(100vh - 178px)", overflowY: "auto", pr: 0.25 }}>
                <PostProcessingPassParams
                  config={config}
                  onPatch={onPatchPassParams}
                  passId={activePassId}
                  t={t}
                />
              </Box>
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}
