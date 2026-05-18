"use client";

import { useEffect, useState } from "react";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { generateAiPbrTexture } from "@/frontend/api/ai";
import {
  AI_PBR_TEXTURE_CFG,
  AI_PBR_TEXTURE_IMAGE_SIZE,
  AI_PBR_TEXTURE_INFERENCE_STEPS
} from "@/lib/ai/pbr-texture/constants";
import { getApiErrorMessage } from "@/lib/http/axios";
import { useI18n } from "@/lib/i18n";
import type { GenerateAiPbrTextureResponse } from "@/lib/api/contracts/ai";
import { createPbrAtlasMaterialPatch } from "@/render/editor";
import { createClientUuid } from "@/components/editor/projectPersistence";
import { useEditorStore } from "@/stores/editorStore";
import { getEditorThemeTokens } from "./theme";

export type AiPbrTextureTarget = {
  kind: "mesh" | "ground";
  id?: string;
  label: string;
};

type AiPbrTextureGenerateDialogProps = {
  open: boolean;
  target: AiPbrTextureTarget | null;
  onGenerated?: (payload: GenerateAiPbrTextureResponse & { target: AiPbrTextureTarget }) => void;
  onClose: () => void;
};

export default function AiPbrTextureGenerateDialog({
  open,
  target,
  onGenerated,
  onClose
}: AiPbrTextureGenerateDialogProps) {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const appendPendingAiGeneration = useEditorStore((state) => state.appendPendingAiGeneration);
  const theme = getEditorThemeTokens(editorThemeMode);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setIsGenerating(false);
      setErrorMessage(null);
    }
  }, [open]);

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (!app || !target || !trimmedPrompt || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const result = await generateAiPbrTexture({
        prompt: trimmedPrompt,
        targetKind: target.kind,
        targetId: target.kind === "mesh" ? target.id : undefined
      });
      const patch = createPbrAtlasMaterialPatch({
        url: result.atlasImageUrl
      });

      if (target.kind === "mesh" && target.id) {
        app.updateMeshMaterial(target.id, patch);
      } else {
        app.updateGroundMaterial(patch);
      }

      appendPendingAiGeneration({
        id: createClientUuid("ai-pbr-generation"),
        createdAt: new Date().toISOString(),
        prompt: trimmedPrompt,
        model: result.model,
        seed: result.seed,
        imageSize: AI_PBR_TEXTURE_IMAGE_SIZE,
        cfg: AI_PBR_TEXTURE_CFG,
        inferenceSteps: AI_PBR_TEXTURE_INFERENCE_STEPS,
        traceId: result.traceId,
        referenceImages: [],
        results: [
          {
            id: createClientUuid("ai-pbr-result"),
            sourceUrl: result.atlasImageUrl,
            fileName: `pbr-atlas-${Date.now()}.png`,
            mimeType: "image/png",
            appliedMeshIds: target.kind === "mesh" && target.id ? [target.id] : []
          }
        ],
        metadata: {
          kind: "pbr_texture_atlas",
          atlasLayoutVersion: result.layoutVersion,
          targetKind: target.kind,
          targetId: target.kind === "mesh" ? target.id ?? null : null
        }
      });

      onGenerated?.({
        ...result,
        target
      });
      onClose();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t("editor.aiPbr.generateFailed")));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isGenerating ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1.5,
          border: theme.panelBorder,
          background: theme.panelBg,
          color: theme.text,
          boxShadow: theme.panelShadow
        }
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          color: theme.titleText,
          fontSize: 14,
          fontWeight: 700
        }}
      >
        <Stack direction="row" spacing={0.8} alignItems="center">
          <AutoAwesomeRoundedIcon sx={{ fontSize: 18 }} />
          <span>{t("editor.aiPbr.dialogTitle")}</span>
        </Stack>
        <IconButton
          size="small"
          disabled={isGenerating}
          onClick={onClose}
          sx={{ color: theme.pillText }}
        >
          <CloseRoundedIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={1.2} sx={{ pt: 0.5 }}>
          <Typography sx={{ fontSize: 12, color: theme.mutedText }}>
            {target
              ? t("editor.aiPbr.target", { target: target.label })
              : t("editor.aiPbr.noTarget")}
          </Typography>

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

          <TextField
            autoFocus
            multiline
            minRows={3}
            size="small"
            value={prompt}
            disabled={isGenerating}
            placeholder={t("editor.aiPbr.promptPlaceholder")}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void handleGenerate();
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: theme.pillText,
                background: theme.inputBg
              },
              "& textarea::placeholder": {
                color: theme.mutedText,
                opacity: 1
              }
            }}
          />

          <Button
            color="inherit"
            disabled={!app || !target || !prompt.trim() || isGenerating}
            onClick={() => void handleGenerate()}
            startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              minHeight: 38,
              borderRadius: 1,
              border: theme.sectionBorder,
              background: theme.iconButtonBg,
              color: theme.pillText,
              textTransform: "none"
            }}
          >
            {isGenerating ? t("editor.aiPbr.generating") : t("editor.aiPbr.generate")}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
