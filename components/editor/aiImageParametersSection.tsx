"use client";

import { MenuItem, Slider, Stack, TextField, Typography } from "@mui/material";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import { useI18n } from "@/lib/i18n";
import type { AiImageModelId, AiImageSize } from "@/stores/editorStore";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    color: "#eef5ff",
    background: "rgba(10,18,38,0.55)",
    minHeight: 30,
    fontSize: 12
  },
  "& .MuiInputLabel-root": {
    color: "rgba(176,197,238,0.78)"
  }
};

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

const QWEN_IMAGE_SIZE_OPTIONS: Array<{ value: AiImageSize; label: string }> = [
  { value: "1328x1328", label: "1328x1328 (1:1)" },
  { value: "1664x928", label: "1664x928 (16:9)" },
  { value: "928x1664", label: "928x1664 (9:16)" },
  { value: "1472x1140", label: "1472x1140 (4:3)" },
  { value: "1140x1472", label: "1140x1472 (3:4)" },
  { value: "1584x1056", label: "1584x1056 (3:2)" },
  { value: "1056x1584", label: "1056x1584 (2:3)" }
];

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
  const supportsImageSize = model === "Qwen/Qwen-Image";

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
            {QWEN_IMAGE_SIZE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ) : null}

        <Stack spacing={0.55}>
          <Typography sx={{ fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
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
              sx={{ flex: 1 }}
            />
            <Typography
              sx={{ minWidth: 36, textAlign: "right", fontSize: 11, color: "rgba(227,236,255,0.92)" }}
            >
              {cfg.toFixed(2)}
            </Typography>
          </Stack>
        </Stack>

        <Stack spacing={0.55}>
          <Typography sx={{ fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
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
              sx={{ flex: 1 }}
            />
            <Typography
              sx={{ minWidth: 28, textAlign: "right", fontSize: 11, color: "rgba(227,236,255,0.92)" }}
            >
              {inferenceSteps}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </PropertyPanelSection>
  );
}
