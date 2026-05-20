"use client";

import { CircularProgress, IconButton, Stack/*, Typography*/ } from "@mui/material";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import type { EditorThemeTokens } from "@/components/editor/theme";

type Props = {
  theme: EditorThemeTokens;
  utilityIconButtonSx: object;
  isAi3dBusy: boolean;
  isPromptActionPending: boolean;
  prompt: string;
  isGenerating: boolean;
  isOptimizing: boolean;
  canOptimizePrompt?: boolean;
  activePromptAction: "optimize" | "translate-en" | null;
  handlePromptTransform: (mode: "optimize" | "translate-en") => Promise<void>;
  t: (key: any, params?: Record<string, string | number>) => string;
};

export default function Ai3dToolbar({
  theme,
  utilityIconButtonSx,
  isAi3dBusy,
  isPromptActionPending,
  prompt,
  // isGenerating,
  // isOptimizing,
  canOptimizePrompt = false,
  activePromptAction,
  handlePromptTransform,
  t
}: Props) {
  return (
    <Stack direction="row" spacing={0.8} alignItems="center">
      {/* <Typography sx={{ fontSize: 12, color: theme.mutedText }}>
        {isGenerating
          ? t("editor.ai3d.generatingLabel")
          : isOptimizing
            ? t("editor.ai3d.optimizingLabel")
            : ""}
      </Typography> */}
      {canOptimizePrompt ? (
        <IconButton
          size="small"
          disabled={isAi3dBusy || isPromptActionPending || !prompt.trim()}
          onClick={() => {
            void handlePromptTransform("optimize");
          }}
          title={t("editor.ai.optimizePrompt")}
          sx={utilityIconButtonSx}
        >
          {activePromptAction === "optimize" ? (
            <CircularProgress size={16} sx={{ color: theme.pillText }} />
          ) : (
            <AutoFixHighRoundedIcon sx={{ fontSize: 18 }} />
          )}
        </IconButton>
      ) : null}
      <IconButton
        size="small"
        disabled={isAi3dBusy || isPromptActionPending || !prompt.trim()}
        onClick={() => {
          void handlePromptTransform("translate-en");
        }}
        title={t("editor.ai.translatePrompt")}
        sx={utilityIconButtonSx}
      >
        {activePromptAction === "translate-en" ? (
          <CircularProgress size={16} sx={{ color: theme.pillText }} />
        ) : (
          <TranslateRoundedIcon sx={{ fontSize: 18 }} />
        )}
      </IconButton>
    </Stack>
  );
}
