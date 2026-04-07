"use client";

import { KeyboardEvent, MouseEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";

const MODELS = [
  {
    id: "Qwen/Qwen-Image",
    icon: <ImageRoundedIcon sx={{ fontSize: 18 }} />,
    label: "Qwen/Qwen-Image"
  },
  {
    id: "Qwen/Qwen-Image-Edit-2509",
    icon: <EditRoundedIcon sx={{ fontSize: 18 }} />,
    label: "Qwen/Qwen-Image-Edit-2509"
  }
] as const;

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
  const app = useEditorStore((state) => state.app);
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

  const [modelMenuAnchor, setModelMenuAnchor] = useState<HTMLElement | null>(null);
  const activeModelMeta = useMemo(() => MODELS.find((item) => item.id === model) ?? MODELS[0], [model]);
  const filledReferenceImages = useMemo(
    () => referenceImages.filter((item) => Boolean(item.dataUrl)).map((item) => item.dataUrl as string),
    [referenceImages]
  );

  const focusAiMode = () => {
    setAiInspectorMode("ai");
    app?.setSelectedEntity(null);
  };

  const handleSubmit = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isGenerating) return;

    const parsedSeed = parseSeed(seed);

    if (parsedSeed === null) {
      setAiGeneratingState({
        isGenerating: false,
        errorMessage: t("editor.ai.seedInvalid")
      });
      return;
    }

    if (model === "Qwen/Qwen-Image-Edit-2509" && filledReferenceImages.length < 1) {
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
          imageSize: model === "Qwen/Qwen-Image" ? imageSize : undefined,
          cfg,
          inferenceSteps,
          referenceImages: model === "Qwen/Qwen-Image-Edit-2509" ? filledReferenceImages : []
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
            border: "1px solid rgba(180,205,255,0.28)",
            background:
              "linear-gradient(135deg, rgba(15,24,52,0.94), rgba(24,39,82,0.88) 55%, rgba(42,84,168,0.82))",
            boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
            color: "#eef5ff",
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
      <Stack spacing={1} alignItems="center">
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            borderRadius: "10px",
            border: "1px solid rgba(180,205,255,0.24)",
            background: "rgba(10,16,34,0.9)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.32)"
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
                  color: "#eef5ff",
                  background: "transparent",
                  fontSize: 14
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
              <Tooltip title={activeModelMeta.label}>
                <IconButton
                  size="small"
                  onClick={(event: MouseEvent<HTMLElement>) => setModelMenuAnchor(event.currentTarget)}
                  sx={{
                    color: "rgba(230,239,255,0.96)",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(180,205,255,0.14)"
                  }}
                >
                  {activeModelMeta.icon}
                </IconButton>
              </Tooltip>

              <Tooltip title={t("editor.ai.generate")}>
                <span>
                  <IconButton
                    size="small"
                    disabled={isGenerating || !prompt.trim()}
                    onClick={() => {
                      void handleSubmit();
                    }}
                    sx={{
                      color: "rgba(235,244,255,0.98)",
                      transform: "rotate(-90deg)",
                      background:
                        prompt.trim() && !isGenerating
                          ? "linear-gradient(135deg, #2f6df4, #63a4ff)"
                          : "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(180,205,255,0.14)"
                    }}
                  >
                    {isGenerating ? <CircularProgress size={16} sx={{ color: "#eef5ff" }} /> : <SendRoundedIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>

        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ color: "rgba(220,232,255,0.78)", cursor: "pointer" }}
          onClick={() => setAiComposerOpen(false)}
        >
          <CloseRoundedIcon sx={{ fontSize: 14 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{t("editor.ai.close")}</Typography>
        </Stack>
      </Stack>

      <Menu
        anchorEl={modelMenuAnchor}
        open={Boolean(modelMenuAnchor)}
        onClose={() => setModelMenuAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mb: 1,
              borderRadius: 2,
              border: "1px solid rgba(180,205,255,0.18)",
              background: "rgba(8,12,24,0.96)",
              backdropFilter: "blur(12px)",
              color: "#eef5ff"
            }
          }
        }}
      >
        {MODELS.map((item) => (
          <MenuItem
            key={item.id}
            selected={item.id === model}
            onClick={() => {
              setAiModel(item.id);
              setModelMenuAnchor(null);
              focusAiMode();
            }}
            sx={{ gap: 1, minWidth: 240, fontSize: 13 }}
          >
            {item.icon}
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
