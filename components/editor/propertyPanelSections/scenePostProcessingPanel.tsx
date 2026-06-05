"use client";

import { Box, Checkbox, Stack, Typography } from "@mui/material";
import { getEditorThemeTokens } from "@/components/editor/theme";
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
  const enabledPassIds = EDITOR_POST_PROCESS_PASS_ORDER.filter((passId) => config.passes[passId].enabled);

  return (
    <Box
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
          {EDITOR_POST_PROCESS_PASS_ORDER.map((passId) => (
            <Stack
              key={passId}
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                px: 0.2,
                py: 0.2,
                borderRadius: 0.75,
                background: config.passes[passId].enabled ? theme.itemSelectedBg : "transparent"
              }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Typography sx={{ fontSize: 12, color: theme.pillText }}>
                  {t(POST_PROCESS_LABEL_KEY_MAP[passId])}
                </Typography>
                {PERFORMANCE_HEAVY_PASSES.has(passId) ? (
                  <Typography sx={{ fontSize: 10, color: "rgba(255,188,120,0.9)" }}>
                    {t("editor.post.performance")}
                  </Typography>
                ) : null}
              </Stack>
              <Checkbox
                checked={config.passes[passId].enabled}
                onChange={(event) => onTogglePass(passId, event.target.checked)}
                sx={{ p: 0.25 }}
              />
            </Stack>
          ))}
        </Stack>

        {enabledPassIds.length === 0 ? (
          <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
            {/* {t("editor.post.noEnabledPasses")} */}
          </Typography>
        ) : (
          <Stack spacing={0.9}>
            {enabledPassIds.map((passId) => (
              <Box
                key={passId}
                sx={{
                  borderRadius: 1,
                  border: theme.sectionBorder,
                  background: theme.panelBgMuted,
                  p: 1
                }}
              >
                <Stack spacing={0.85}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: theme.titleText }}>
                    {t(POST_PROCESS_LABEL_KEY_MAP[passId])}
                  </Typography>
                  <PostProcessingPassParams
                    config={config}
                    onPatch={onPatchPassParams}
                    passId={passId}
                    t={t}
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
