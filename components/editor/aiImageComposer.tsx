"use client";

import { KeyboardEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import AiImageModelMenu from "@/components/editor/aiImageModelMenu";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { getImageGenerationModelConfig } from "@/lib/ai/image-generation/models";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";

function parseSeed(seedText: string) {
  const trimmed = seedText.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

export default function AiImageComposer() {
  const router = useRouter();
  const { t } = useI18n();
  const [activePromptAction, setActivePromptAction] = useState<"optimize" | "translate-en" | null>(
    null
  );
  const promptActionLockRef = useRef(false);
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const {
    providerId,
    model,
    prompt,
    seed,
    imageSize,
    cfg,
    inferenceSteps,
    referenceImages,
    isComposerOpen,
    isGenerating
  } = useEditorStore((state) => state.aiImage);
  const setAiPrompt = useEditorStore((state) => state.setAiPrompt);
  const setAiModel = useEditorStore((state) => state.setAiModel);
  const setAiComposerOpen = useEditorStore((state) => state.setAiComposerOpen);
  const setAiInspectorMode = useEditorStore((state) => state.setAiInspectorMode);
  const setAiGeneratingState = useEditorStore((state) => state.setAiGeneratingState);
  const theme = getEditorThemeTokens(editorThemeMode);

  const filledReferenceImages = useMemo(
    () => referenceImages.filter((item) => Boolean(item.dataUrl)).map((item) => item.dataUrl as string),
    [referenceImages]
  );
  const isPromptActionPending = activePromptAction !== null;
  const utilityIconButtonSx = {
    color: theme.pillText,
    background: theme.iconButtonBg,
    border: theme.sectionBorder,
    "&:hover": {
      background: theme.itemHoverBg
    },
    "&.Mui-disabled": {
      color: theme.mutedText,
      background: theme.itemBg,
      border: theme.sectionBorder
    }
  } as const;

  const focusAiMode = () => {
    setAiInspectorMode("ai");
    app?.setSelectedEntity(null);
  };

  const handleSubmit = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isGenerating || isPromptActionPending) return;

    const parsedSeed = parseSeed(seed);
    const modelConfig = getImageGenerationModelConfig(model);

    if (parsedSeed === null) {
      setAiGeneratingState({
        isGenerating: false,
        errorMessage: t("editor.ai.seedInvalid")
      });
      return;
    }

    if (filledReferenceImages.length < modelConfig.minReferenceImages) {
      setAiGeneratingState({
        isGenerating: false,
        errorMessage: t("editor.ai.referenceImageRequired")
      });
      return;
    }

    setAiGeneratingState({
      isGenerating: true,
      errorMessage: null
    });

    try {
      const response = await fetch("/api/ai/images/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          providerId,
          model,
          prompt: trimmedPrompt,
          seed: parsedSeed,
          imageSize: modelConfig.supportsImageSize ? imageSize : undefined,
          cfg,
          inferenceSteps,
          referenceImages:
            modelConfig.maxReferenceImages > 0
              ? filledReferenceImages.slice(0, modelConfig.maxReferenceImages)
              : []
        })
      });

      if (response.status === 401) {
        router.push("/home");
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | { images?: Array<{ url: string }>; seed?: number | null; message?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message || t("editor.ai.generateFailed"));
      }

      const images = payload?.images ?? [];

      if (images.length === 0) {
        throw new Error(t("editor.ai.emptyResult"));
      }

      setAiGeneratingState({
        isGenerating: false,
        errorMessage: null,
        results: images,
        lastSeed: typeof payload?.seed === "number" ? payload.seed : null
      });
    } catch (error) {
      setAiGeneratingState({
        isGenerating: false,
        errorMessage: error instanceof Error ? error.message : t("editor.ai.generateFailed")
      });
    }
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const handlePromptTransform = async (mode: "optimize" | "translate-en") => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isGenerating || isPromptActionPending || promptActionLockRef.current) {
      return;
    }

    promptActionLockRef.current = true;
    setActivePromptAction(mode);
    setAiGeneratingState({
      isGenerating: false,
      errorMessage: null
    });

    try {
      const response = await fetch("/api/ai/prompts/transform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode,
          prompt: trimmedPrompt
        })
      });

      if (response.status === 401) {
        router.push("/home");
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | { prompt?: string; message?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message || t("editor.ai.promptTransformFailed"));
      }

      const nextPrompt = typeof payload?.prompt === "string" ? payload.prompt.trim() : "";

      if (!nextPrompt) {
        throw new Error(t("editor.ai.promptTransformEmpty"));
      }

      setAiPrompt(nextPrompt);
    } catch (error) {
      setAiGeneratingState({
        isGenerating: false,
        errorMessage: error instanceof Error ? error.message : t("editor.ai.promptTransformFailed")
      });
    } finally {
      promptActionLockRef.current = false;
      setActivePromptAction(null);
    }
  };

  if (!isComposerOpen) {
    return (
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          bottom: 32,
          transform: "translateX(-50%)",
          zIndex: 22
        }}
      >
        <Paper
          elevation={0}
          onClick={() => {
            setAiComposerOpen(true);
            focusAiMode();
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2.2,
            py: 1.2,
            borderRadius: "999px",
            border: theme.pillBorder,
            background:
              editorThemeMode === "dark"
                ? "linear-gradient(135deg, rgba(15,24,52,0.94), rgba(24,39,82,0.88) 55%, rgba(42,84,168,0.82))"
                : "linear-gradient(135deg, rgba(255,255,255,0.94), rgba(237,245,255,0.92) 55%, rgba(189,220,255,0.88))",
            boxShadow: theme.panelShadow,
            color: theme.pillText,
            cursor: "pointer"
          }}
        >
          <AutoAwesomeRoundedIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.03em" }}>
            {t("editor.ai.chatButton")}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: "absolute",
        left: "50%",
        bottom: 24,
        transform: "translateX(-50%)",
        zIndex: 22,
        width: "min(720px, calc(100vw - 144px))"
      }}
    >
      <Box sx={{ position: "relative", width: "100%" }}>
        <IconButton
          size="small"
          onClick={() => setAiComposerOpen(false)}
          sx={{
            position: "absolute",
            top: -14,
            right: -14,
            zIndex: 1,
            color: theme.pillText,
            background: theme.panelBg,
            border: theme.sectionBorder,
            boxShadow: theme.panelShadow,
            "&:hover": {
              background: theme.sectionBg
            }
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 16 }} />
        </IconButton>

        <Paper
          elevation={0}
          sx={{
            width: "100%",
            borderRadius: "10px",
            border: theme.panelBorder,
            background: theme.panelBg,
            backdropFilter: "blur(16px)",
            boxShadow: theme.panelShadow
          }}
        >
          <Stack spacing={0.5} sx={{ p: 1.2 }}>
            <TextField
              multiline
              minRows={2}
              maxRows={5}
              value={prompt}
              onFocus={focusAiMode}
              onChange={(event) => setAiPrompt(event.target.value)}
              onKeyDown={handlePromptKeyDown}
              placeholder={t("editor.ai.promptPlaceholder")}
              sx={{
                "& .MuiOutlinedInput-root": {
                  alignItems: "flex-start",
                  borderRadius: "12px",
                  color: theme.pillText,
                  background: "transparent",
                  fontSize: 14
                },
                "& .MuiInputBase-input::placeholder": {
                  color: theme.mutedText,
                  opacity: 1
                },
                "& .MuiOutlinedInput-input": {
                  px: 0.2
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  border: "none"
                }
              }}
            />

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 0.3 }}>
              <Stack direction="row" spacing={0.8} alignItems="center">
                <AiImageModelMenu model={model} onChange={setAiModel} onFocus={focusAiMode} />
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

              <IconButton
                size="small"
                disabled={isGenerating || isPromptActionPending || !prompt.trim()}
                onClick={() => {
                  void handleSubmit();
                }}
                sx={{
                  color: theme.pillText,
                  transform: "rotate(-90deg)",
                  background:
                    prompt.trim() && !isGenerating && !isPromptActionPending
                      ? editorThemeMode === "dark"
                        ? "linear-gradient(135deg, #2f6df4, #63a4ff)"
                        : "linear-gradient(135deg, #4c86f7, #86b7ff)"
                      : theme.itemBg,
                  border: theme.sectionBorder
                }}
              >
                {isGenerating ? (
                  <CircularProgress size={16} sx={{ color: theme.pillText }} />
                ) : (
                  <SendRoundedIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
