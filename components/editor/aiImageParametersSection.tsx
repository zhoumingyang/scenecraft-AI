"use client";

import { MenuItem, Slider, Stack, TextField, Typography } from "@mui/material";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import { getEditorThemeTokens } from "@/components/editor/theme";
import {
  IMAGE_SIZE_OPTIONS,
  getImageGenerationModelConfig
} from "@/lib/ai/image-generation/models";
import { useI18n } from "@/lib/i18n";
import { useEditorStore, type AiImageModelId, type AiImageSize } from "@/stores/editorStore";

type AiImageParametersSectionProps = {
  model: AiImageModelId;
  seed: string;
  imageSize: AiImageSize;
  cfg: number;
  inferenceSteps: number;
  onSeedChange: (value: string) => void;
  onImageSizeChange: (value: AiImageSize) => void;
  onCfgChange: (value: number) => void;
  onInferenceStepsChange: (value: number) => void;
};

export default function AiImageParametersSection({
  model,
  seed,
  imageSize,
  cfg,
  inferenceSteps,
  onSeedChange,
  onImageSizeChange,
  onCfgChange,
  onInferenceStepsChange
}: AiImageParametersSectionProps) {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const supportsImageSize = getImageGenerationModelConfig(model).supportsImageSize;
  const theme = getEditorThemeTokens(editorThemeMode);
  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      color: theme.pillText,
      background: theme.inputBg,
      minHeight: 30,
      fontSize: 12
    },
    "& .MuiInputLabel-root": {
      color: theme.mutedText
    }
  } as const;

  return (
    <PropertyPanelSection title={t("editor.ai.sectionParameters")}>
      <Stack spacing={1.1}>
        <TextField
          size="small"
          label={t("editor.ai.seed")}
          value={seed}
          placeholder={t("editor.ai.seedPlaceholder")}
          onChange={(event) => onSeedChange(event.target.value)}
          sx={fieldSx}
        />

        {supportsImageSize ? (
          <TextField
            select
            size="small"
            label={t("editor.ai.imageSize")}
            value={imageSize}
            onChange={(event) => onImageSizeChange(event.target.value as AiImageSize)}
            sx={fieldSx}
          >
            {IMAGE_SIZE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ) : null}

        <Stack spacing={0.55}>
          <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
            {t("editor.ai.cfg")}
          </Typography>
          <Stack direction="row" spacing={0.9} alignItems="center">
            <Slider
              size="small"
              min={0.1}
              max={20}
              step={0.01}
              value={cfg}
              onChange={(_, value) => onCfgChange(value as number)}
              sx={{ flex: 1, color: editorThemeMode === "dark" ? "#72a8ff" : "#5f93ef" }}
            />
            <Typography
              sx={{ minWidth: 36, textAlign: "right", fontSize: 11, color: theme.pillText }}
            >
              {cfg.toFixed(2)}
            </Typography>
          </Stack>
        </Stack>

        <Stack spacing={0.55}>
          <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
            {t("editor.ai.inferenceSteps")}
          </Typography>
          <Stack direction="row" spacing={0.9} alignItems="center">
            <Slider
              size="small"
              min={1}
              max={50}
              step={1}
              value={inferenceSteps}
              onChange={(_, value) => onInferenceStepsChange(value as number)}
              sx={{ flex: 1, color: editorThemeMode === "dark" ? "#72a8ff" : "#5f93ef" }}
            />
            <Typography
              sx={{ minWidth: 28, textAlign: "right", fontSize: 11, color: theme.pillText }}
            >
              {inferenceSteps}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </PropertyPanelSection>
  );
}
