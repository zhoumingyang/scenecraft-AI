"use client";

import { ChangeEvent } from "react";
import { Stack, Typography } from "@mui/material";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import CompositeReferenceUploader from "@/components/editor/compositeReferenceUploader";
import { useI18n } from "@/lib/i18n";
import type { AiReferenceImageSlot } from "@/stores/editorStore";

type AiImageReferenceImagesSectionProps = {
  referenceImages: AiReferenceImageSlot[];
  onUploadFromFile: (index: number, event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onCaptureViewport: (index: number) => void;
  onClearReferenceImage: (index: number) => void;
};

export default function AiImageReferenceImagesSection({
  referenceImages,
  onUploadFromFile,
  onCaptureViewport,
  onClearReferenceImage
}: AiImageReferenceImagesSectionProps) {
  const { t } = useI18n();
  const filledReferenceCount = referenceImages.filter((item) => item.dataUrl).length;

  return (
    <PropertyPanelSection title={t("editor.ai.sectionReferenceImages")}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={0.8}>
          {referenceImages.map((slot, index) => (
            <CompositeReferenceUploader
              key={`reference-slot-${index}`}
              index={index}
              slot={slot}
              onUploadFromFile={onUploadFromFile}
              onCaptureViewport={onCaptureViewport}
              onClear={() => onClearReferenceImage(index)}
            />
          ))}
        </Stack>

        <Typography sx={{ fontSize: 11, color: "rgba(176,193,228,0.82)" }}>
          {t("editor.ai.referenceImageCount", { count: filledReferenceCount })}
        </Typography>
      </Stack>
    </PropertyPanelSection>
  );
}
