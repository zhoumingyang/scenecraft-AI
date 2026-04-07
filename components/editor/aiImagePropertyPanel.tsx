"use client";

import { ChangeEvent, useState } from "react";
import { Stack, Typography } from "@mui/material";
import AiImageParametersSection from "@/components/editor/aiImageParametersSection";
import AiImagePreviewDialog from "@/components/editor/aiImagePreviewDialog";
import AiImageReferenceImagesSection from "@/components/editor/aiImageReferenceImagesSection";
import AiImageResultsSection from "@/components/editor/aiImageResultsSection";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export default function AiImagePropertyPanel() {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const app = useEditorStore((state) => state.app);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const {
    model,
    seed,
    imageSize,
    cfg,
    inferenceSteps,
    referenceImages,
    errorMessage,
    results,
    isGenerating,
    lastSeed
  } = useEditorStore((state) => state.aiImage);
  const setAiSeed = useEditorStore((state) => state.setAiSeed);
  const setAiImageSize = useEditorStore((state) => state.setAiImageSize);
  const setAiCfg = useEditorStore((state) => state.setAiCfg);
  const setAiInferenceSteps = useEditorStore((state) => state.setAiInferenceSteps);
  const setAiReferenceImageAt = useEditorStore((state) => state.setAiReferenceImageAt);
  const clearAiReferenceImageAt = useEditorStore((state) => state.clearAiReferenceImageAt);
  const theme = getEditorThemeTokens(editorThemeMode);

  const isEditModel = model === "Qwen/Qwen-Image-Edit-2509";

  const handleUploadFromFile = async (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setAiReferenceImageAt(index, {
      dataUrl,
      fileName: file.name
    });
    event.target.value = "";
  };

  const handleCaptureViewport = (index: number) => {
    if (!app) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    setAiReferenceImageAt(index, {
      dataUrl: app.captureViewportImage(),
      fileName: `viewport-${timestamp}.png`
    });
  };

  const handleDownloadImage = (url: string, index: number) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `generated-${index + 1}.png`;
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Stack spacing={0.9}>
      <Typography sx={{ px: 0.15, fontSize: 13, fontWeight: 600, color: theme.pillText }}>
        {t("editor.ai.panelTitle")}
      </Typography>

      {isEditModel ? (
        <AiImageReferenceImagesSection
          referenceImages={referenceImages}
          onUploadFromFile={handleUploadFromFile}
          onCaptureViewport={handleCaptureViewport}
          onClearReferenceImage={clearAiReferenceImageAt}
        />
      ) : null}

      <AiImageParametersSection
        model={model}
        seed={seed}
        imageSize={imageSize}
        cfg={cfg}
        inferenceSteps={inferenceSteps}
        onSeedChange={setAiSeed}
        onImageSizeChange={setAiImageSize}
        onCfgChange={setAiCfg}
        onInferenceStepsChange={setAiInferenceSteps}
      />

      <AiImageResultsSection
        errorMessage={errorMessage}
        results={results}
        isGenerating={isGenerating}
        lastSeed={lastSeed}
        onDownloadImage={handleDownloadImage}
        onViewImage={setPreviewImageUrl}
      />

      <AiImagePreviewDialog imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
    </Stack>
  );
}
