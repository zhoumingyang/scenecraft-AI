"use client";

import { ChangeEvent, useRef } from "react";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import { useI18n } from "@/lib/i18n";
import type { AiReferenceImageSlot } from "@/stores/editorStore";

type CompositeReferenceUploaderProps = {
  index: number;
  slot: AiReferenceImageSlot;
  onUploadFromFile: (index: number, event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onCaptureViewport: (index: number) => void;
  onClear: () => void;
};

export default function CompositeReferenceUploader({
  index,
  slot,
  onUploadFromFile,
  onCaptureViewport,
  onClear
}: CompositeReferenceUploaderProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void onUploadFromFile(index, event);
        }}
      />

      <Stack
        spacing={0}
        sx={{
          overflow: "hidden",
          borderRadius: 1,
          border: "1px solid rgba(160,190,255,0.18)",
          background: "rgba(255,255,255,0.03)"
        }}
      >
        <Box
          onClick={() => fileInputRef.current?.click()}
          sx={{
            position: "relative",
            height: 96,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderBottom: "1px solid rgba(160,190,255,0.12)",
            background: slot.dataUrl
              ? "rgba(12,18,36,0.96)"
              : "linear-gradient(180deg, rgba(21,32,64,0.9), rgba(13,19,38,0.98))"
          }}
        >
          {slot.dataUrl ? (
            <>
              <Box
                component="img"
                src={slot.dataUrl}
                alt={slot.fileName ?? `reference-slot-${index + 1}`}
                sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  onClear();
                }}
                sx={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  color: "#eef5ff",
                  background: "rgba(8,12,24,0.72)"
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </>
          ) : (
            <Stack spacing={0.5} alignItems="center">
              <AddPhotoAlternateRoundedIcon sx={{ fontSize: 22, color: "rgba(219,230,255,0.9)" }} />
              <Typography sx={{ fontSize: 10, color: "rgba(176,193,228,0.78)", textAlign: "center" }}>
                {t("editor.ai.uploadSlot")}
              </Typography>
            </Stack>
          )}
        </Box>

        <Box
          onClick={() => onCaptureViewport(index)}
          sx={{
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            background: "rgba(8,12,24,0.9)"
          }}
        >
          <PhotoCameraRoundedIcon sx={{ fontSize: 18, color: "rgba(230,239,255,0.92)" }} />
        </Box>
      </Stack>
    </Box>
  );
}
