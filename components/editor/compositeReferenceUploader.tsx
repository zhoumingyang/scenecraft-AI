"use client";

import { ChangeEvent, useRef } from "react";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import { useEditorStore, type AiReferenceImageSlot } from "@/stores/editorStore";

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
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const theme = getEditorThemeTokens(editorThemeMode);

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
          border: theme.sectionBorder,
          background: theme.sectionBg
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
            borderBottom: theme.sectionBorder,
            background: slot.dataUrl
              ? theme.panelBg
              : editorThemeMode === "dark"
                ? "linear-gradient(180deg, rgba(21,32,64,0.9), rgba(13,19,38,0.98))"
                : "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(233,241,255,0.98))"
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
                  color: theme.pillText,
                  background: theme.pillBg
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </>
          ) : (
            <Stack spacing={0.5} alignItems="center">
              <AddPhotoAlternateRoundedIcon sx={{ fontSize: 22, color: theme.text }} />
              <Typography sx={{ fontSize: 10, color: theme.mutedText, textAlign: "center" }}>
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
            background: theme.pillBg
          }}
        >
          <PhotoCameraRoundedIcon sx={{ fontSize: 18, color: theme.pillText }} />
        </Box>
      </Stack>
    </Box>
  );
}
