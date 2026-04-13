"use client";

import { CircularProgress, IconButton, Stack } from "@mui/material";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import AiImageModelMenu from "@/components/editor/aiImageModelMenu";
import type { EditorThemeTokens } from "@/components/editor/theme";

type Props = {
  model: string;
  theme: EditorThemeTokens;
  utilityIconButtonSx: object;
  isGenerating: boolean;
  isPromptActionPending: boolean;
  prompt: string;
  activePromptAction: "optimize" | "translate-en" | null;
  setAiModel: (model: any) => void;
  focusAiMode: () => void;
  handlePromptTransform: (mode: "optimize" | "translate-en") => Promise<void>;
  t: (key: any, params?: Record<string, string | number>) => string;
};

export default function ImageToolbar({
  model,
  theme,
  utilityIconButtonSx,
  isGenerating,
  isPromptActionPending,
  prompt,
  activePromptAction,
  setAiModel,
  focusAiMode,
  handlePromptTransform,
  t
}: Props) {
  return (
    <Stack direction="row" spacing={0.8} alignItems="center">
      <AiImageModelMenu model={model as any} onChange={setAiModel} onFocus={focusAiMode} />
      <IconButton
        size="small"
        disabled={isGenerating || isPromptActionPending || !prompt.trim()}
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
      <IconButton
        size="small"
        disabled={isGenerating || isPromptActionPending || !prompt.trim()}
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
