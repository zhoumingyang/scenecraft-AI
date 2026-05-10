"use client";

import { ChangeEvent, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import CollectionsRoundedIcon from "@mui/icons-material/CollectionsRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import { Box, Button, IconButton, Slider, Stack, Typography } from "@mui/material";
import ProjectAiLibraryDialog from "@/components/editor/projectAiLibraryDialog";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import type { ResolvedTextureSchema } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import type { TextureFieldKey } from "./shared";
import { formatNumber } from "./util";

const SIDE_PANEL_WIDTH = 288;

function TextureTransformSlider({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <Stack spacing={0.45}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ fontSize: 11, color: disabled ? "rgba(205,220,255,0.38)" : "rgba(205,220,255,0.78)" }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 11, color: disabled ? "rgba(227,236,255,0.38)" : "rgba(227,236,255,0.92)" }}>
          {formatNumber(value, 2)}
        </Typography>
      </Stack>
      <Slider
        size="small"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={value}
        onChange={(_, nextValue) => onChange(nextValue as number)}
      />
    </Stack>
  );
}

type TextureConfigDialogProps = {
  open: boolean;
  entityId?: string;
  textureField: TextureFieldKey;
  title: string;
  texture: ResolvedTextureSchema;
  targetPath?: string;
  onTexturePatch?: (texture: ResolvedTextureSchema) => void;
  onClose: () => void;
};

export function TextureConfigDialog({
  open,
  entityId,
  textureField,
  title,
  texture,
  targetPath,
  onTexturePatch,
  onClose
}: TextureConfigDialogProps) {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const loadedAiLibrary = useEditorStore((state) => state.loadedAiLibrary);
  const pendingAiImageGenerations = useEditorStore((state) => state.pendingAiImageGenerations);
  const registerLocalProjectAsset = useEditorStore((state) => state.registerLocalProjectAsset);
  const [inputKey, setInputKey] = useState(0);
  const [aiLibraryOpen, setAiLibraryOpen] = useState(false);
  const hasTexture = Boolean(texture.url);
  const theme = getEditorThemeTokens(editorThemeMode);

  const updateTexture = (
    patch: Partial<ResolvedTextureSchema> & {
      offset?: [number, number];
      repeat?: [number, number];
    }
  ) => {
    if (!app) return;
    const nextTexture = {
      ...texture,
      ...patch
    } as ResolvedTextureSchema;
    if (onTexturePatch) {
      onTexturePatch(nextTexture);
      return;
    }
    if (entityId) {
      app.updateMeshMaterial(entityId, {
        [textureField]: nextTexture
      });
    }
  };

  const onPickTexture = () => {
    const input = document.getElementById(`mesh-texture-input-${textureField}`) as HTMLInputElement | null;
    input?.click();
  };

  const onTextureSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setInputKey((value) => value + 1);
    if (!app || !file) return;

    const textureUrl = URL.createObjectURL(file);
    registerLocalProjectAsset({
      sourceUrl: textureUrl,
      file,
      kind: "texture_image",
      targetPath: targetPath ?? `mesh:${entityId ?? "unknown"}:${textureField}`,
      entityId
    });
    const nextTexture = {
      ...texture,
      assetId: "",
      externalSource: null,
      url: textureUrl
    } as ResolvedTextureSchema;
    if (onTexturePatch) {
      onTexturePatch(nextTexture);
      return;
    }
    if (entityId) {
      app.updateMeshMaterial(entityId, {
        [textureField]: nextTexture
      });
    }
  };

  const onApplyAiAsset = ({ imageUrl }: { imageUrl: string }) => {
    if (!app) return;
    const nextTexture = {
      ...texture,
      assetId: "",
      externalSource: null,
      url: imageUrl
    } as ResolvedTextureSchema;
    if (onTexturePatch) {
      onTexturePatch(nextTexture);
      return;
    }
    if (entityId) {
      app.updateMeshMaterial(entityId, {
        [textureField]: nextTexture
      });
    }
  };

  if (!open) return null;

  return (
    <>
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: `calc(100% + 12px)`,
          zIndex: 2,
          width: SIDE_PANEL_WIDTH,
          height: "100%",
          borderRadius: "10px 0 0 10px",
          border: "1px solid rgba(180,205,255,0.26)",
          background: "rgba(8,12,24,0.82)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
          overflow: "hidden"
        }}
      >
        <input
          key={inputKey}
          id={`mesh-texture-input-${textureField}`}
          type="file"
          accept="image/*"
          onChange={onTextureSelected}
          style={{ display: "none" }}
        />

        <Stack spacing={1} sx={{ height: "100%", p: 1.05 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(220,232,255,0.92)" }}>
              {title}
            </Typography>
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: "rgba(162,196,255,0.92)",
                border: "1px solid rgba(180,205,255,0.18)",
                background: "rgba(255,255,255,0.03)"
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>

          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", pr: 0.25 }}>
            <Stack spacing={1.1} sx={{ pt: 0.15 }}>
              <Stack direction="row" spacing={0.8}>
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<UploadRoundedIcon sx={{ fontSize: 15 }} />}
                  onClick={onPickTexture}
                  sx={{
                    flex: 1,
                    justifyContent: "center",
                    minHeight: 36,
                    borderRadius: 1,
                    border: "1px solid rgba(160,190,255,0.18)",
                    background: "rgba(10,18,38,0.55)",
                    color: "#eef5ff",
                    textTransform: "none"
                  }}
                >
                  {t("editor.properties.uploadTexture")}
                </Button>
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<CollectionsRoundedIcon sx={{ fontSize: 15 }} />}
                  onClick={() => setAiLibraryOpen(true)}
                  sx={{
                    flex: 1,
                    justifyContent: "center",
                    minHeight: 36,
                    borderRadius: 1,
                    border: "1px solid rgba(160,190,255,0.18)",
                    background: "rgba(10,18,38,0.55)",
                    color: "#eef5ff",
                    textTransform: "none"
                  }}
                >
                  {t("editor.properties.aiAssets")}
                </Button>
              </Stack>

              <Box
                sx={{
                  borderRadius: 1.2,
                  border: "1px solid rgba(160,190,255,0.18)",
                  background: "rgba(10,18,38,0.55)",
                  minHeight: 132,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden"
                }}
              >
                {hasTexture ? (
                  <img
                    src={texture.url}
                    alt={title}
                    style={{ width: "100%", height: "100%", maxHeight: 220, objectFit: "cover" }}
                  />
                ) : (
                  <Stack spacing={0.55} alignItems="center">
                    <ImageRoundedIcon sx={{ fontSize: 26, color: "rgba(176,193,228,0.56)" }} />
                    <Typography sx={{ fontSize: 12, color: "rgba(176,193,228,0.72)" }}>
                      {t("editor.properties.textureEmpty")}
                    </Typography>
                  </Stack>
                )}
              </Box>

              {texture.externalSource ? (
                <Stack spacing={0.35}>
                  <Typography sx={{ fontSize: 11, color: "rgba(176,193,228,0.72)" }}>
                    {t("editor.assets.sourceLine", {
                      provider: "Poly Haven",
                      license: texture.externalSource.licenseLabel
                    })}
                  </Typography>
                  <Box
                    component="a"
                    href={texture.externalSource.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      fontSize: 11,
                      color: "#dce7ff",
                      textDecoration: "underline"
                    }}
                  >
                    {t("editor.assets.viewSource")}
                  </Box>
                </Stack>
              ) : null}

              <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#dce7ff" }}>
                {t("editor.properties.uvTransform")}
              </Typography>
              <TextureTransformSlider
                label={t("editor.properties.offsetU")}
                value={texture.offset[0]}
                min={-5}
                max={5}
                step={0.01}
                disabled={!hasTexture}
                onChange={(value) => updateTexture({ offset: [value, texture.offset[1]] })}
              />
              <TextureTransformSlider
                label={t("editor.properties.offsetV")}
                value={texture.offset[1]}
                min={-5}
                max={5}
                step={0.01}
                disabled={!hasTexture}
                onChange={(value) => updateTexture({ offset: [texture.offset[0], value] })}
              />
              <TextureTransformSlider
                label={t("editor.properties.repeatU")}
                value={texture.repeat[0]}
                min={0}
                max={10}
                step={0.01}
                disabled={!hasTexture}
                onChange={(value) => updateTexture({ repeat: [value, texture.repeat[1]] })}
              />
              <TextureTransformSlider
                label={t("editor.properties.repeatV")}
                value={texture.repeat[1]}
                min={0}
                max={10}
                step={0.01}
                disabled={!hasTexture}
                onChange={(value) => updateTexture({ repeat: [texture.repeat[0], value] })}
              />
              <TextureTransformSlider
                label={t("editor.properties.rotation")}
                value={texture.rotation}
                min={-Math.PI}
                max={Math.PI}
                step={0.01}
                disabled={!hasTexture}
                onChange={(value) => updateTexture({ rotation: value })}
              />
            </Stack>
          </Box>
        </Stack>
      </Box>

      <ProjectAiLibraryDialog
        open={aiLibraryOpen}
        theme={theme}
        loadedLibrary={loadedAiLibrary}
        pendingGenerations={pendingAiImageGenerations}
        mode="apply"
        onClose={() => setAiLibraryOpen(false)}
        onApplyAsset={onApplyAiAsset}
      />
    </>
  );
}
