"use client";

import { ChangeEvent } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Box, Button, IconButton, Slider, Stack, TextField, Typography } from "@mui/material";
import { ColorField } from "@/components/common/propertyFieldControls";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import type { MeshMaterialPatch, ResolvedMeshMaterialJSON, ResolvedTextureSchema } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import type { TextureFieldKey } from "./shared";
import { formatNumber } from "./util";

const SIDE_PANEL_WIDTH = 336;

type NumericMaterialKey =
  | "ior"
  | "specularIntensity"
  | "clearcoat"
  | "clearcoatRoughness"
  | "transmission"
  | "thickness"
  | "attenuationDistance"
  | "dispersion"
  | "sheen"
  | "sheenRoughness"
  | "iridescence"
  | "iridescenceIOR"
  | "anisotropy"
  | "anisotropyRotation";

type ColorMaterialKey = "specularColor" | "attenuationColor" | "sheenColor";

function Group({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  return (
    <Stack spacing={0.75}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: theme.mutedText
        }}
      >
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

function SliderRow({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  return (
    <Stack spacing={0.45}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ fontSize: 11, color: theme.text }}>{label}</Typography>
        <Typography sx={{ fontSize: 11, color: theme.titleText, fontWeight: 600 }}>
          {formatNumber(value, 2)}
        </Typography>
      </Stack>
      <Slider
        size="small"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(_, nextValue) => onChange(nextValue as number)}
      />
    </Stack>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  const commitValue = (rawValue: string) => {
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) return;
    const clamped = Math.min(max ?? numeric, Math.max(min ?? numeric, numeric));
    onChange(clamped);
  };

  return (
    <Stack direction="row" spacing={0.8} alignItems="center">
      <Typography sx={{ width: 116, fontSize: 11, color: theme.text }}>{label}</Typography>
      <TextField
        size="small"
        type="number"
        value={formatNumber(value, 3)}
        onChange={(event) => commitValue(event.target.value)}
        slotProps={{
          htmlInput: {
            inputMode: "decimal",
            min,
            max,
            step
          }
        }}
        sx={{
          flex: 1,
          "& .MuiOutlinedInput-root": {
            color: theme.pillText,
            background: theme.inputBg,
            minHeight: 30,
            fontSize: 11
          },
          "& .MuiOutlinedInput-input": {
            py: 0.65
          }
        }}
      />
    </Stack>
  );
}

function ColorRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  return (
    <Stack direction="row" spacing={0.8} alignItems="center">
      <Typography sx={{ width: 116, fontSize: 11, color: theme.text }}>{label}</Typography>
      <ColorField value={value} onChange={onChange} compact />
    </Stack>
  );
}

function TextureConfigRow({
  label,
  texture,
  onOpen
}: {
  label: string;
  texture: ResolvedTextureSchema;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  return (
    <Stack direction="row" spacing={0.8} alignItems="center">
      <Typography sx={{ width: 116, fontSize: 11, color: theme.text }}>{label}</Typography>
      <Button
        size="small"
        color="inherit"
        onClick={onOpen}
        sx={{
          flex: 1,
          justifyContent: "space-between",
          minHeight: 30,
          minWidth: 0,
          borderRadius: 1,
          border: theme.sectionBorder,
          background: theme.inputBg,
          color: theme.pillText,
          textTransform: "none"
        }}
      >
        <Box
          component="span"
          sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {texture.url ? t("editor.properties.textureConfigured") : t("editor.properties.textureConfigure")}
        </Box>
      </Button>
    </Stack>
  );
}

type AdvancedMaterialDialogProps = {
  open: boolean;
  entityId?: string;
  material: ResolvedMeshMaterialJSON;
  onMaterialPatch?: (patch: MeshMaterialPatch) => void;
  onTextureConfigOpen: (key: TextureFieldKey) => void;
  onClose: () => void;
};

export function AdvancedMaterialDialog({
  open,
  entityId,
  material,
  onMaterialPatch,
  onTextureConfigOpen,
  onClose
}: AdvancedMaterialDialogProps) {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);

  const patchMaterial = (patch: MeshMaterialPatch) => {
    if (onMaterialPatch) {
      onMaterialPatch(patch);
      return;
    }
    if (entityId) app?.updateMeshMaterial(entityId, patch);
  };

  const updateNumber = (key: NumericMaterialKey, value: number) => {
    patchMaterial({ [key]: value } as MeshMaterialPatch);
  };

  const updateColor = (key: ColorMaterialKey) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      patchMaterial({ [key]: event.target.value } as MeshMaterialPatch);
    };

  const updateClearcoatNormalScale = (axis: 0 | 1, value: number) => {
    const next: [number, number] = [...material.clearcoatNormalScale];
    next[axis] = value;
    patchMaterial({ clearcoatNormalScale: next });
  };

  const updateIridescenceThicknessRange = (axis: 0 | 1, value: number) => {
    const next: [number, number] = [...material.iridescenceThicknessRange];
    next[axis] = value;
    patchMaterial({ iridescenceThicknessRange: next });
  };

  if (!open) return null;

  return (
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
        background: "rgba(8,12,24,0.88)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
        overflow: "hidden"
      }}
    >
      <Stack spacing={1} sx={{ height: "100%", p: 1.05 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between">
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(220,232,255,0.92)"
            }}
          >
            {t("editor.properties.advancedMaterial")}
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
          <Stack spacing={1.3} sx={{ pt: 0.15 }}>
            <Group title={t("editor.properties.physicalSpecular")}>
              <NumberRow label={t("editor.properties.ior")} value={material.ior} min={1} max={2.333} step={0.001} onChange={(value) => updateNumber("ior", value)} />
              <SliderRow label={t("editor.properties.specularIntensity")} value={material.specularIntensity} onChange={(value) => updateNumber("specularIntensity", value)} />
              <ColorRow label={t("editor.properties.specularColor")} value={material.specularColor} onChange={updateColor("specularColor")} />
              <TextureConfigRow label={t("editor.properties.specularIntensityMap")} texture={material.specularIntensityMap} onOpen={() => onTextureConfigOpen("specularIntensityMap")} />
              <TextureConfigRow label={t("editor.properties.specularColorMap")} texture={material.specularColorMap} onOpen={() => onTextureConfigOpen("specularColorMap")} />
            </Group>

            <Group title={t("editor.properties.physicalClearcoat")}>
              <SliderRow label={t("editor.properties.clearcoatRoughness")} value={material.clearcoatRoughness} onChange={(value) => updateNumber("clearcoatRoughness", value)} />
              <SliderRow label={t("editor.properties.clearcoatNormalScaleX")} value={material.clearcoatNormalScale[0]} onChange={(value) => updateClearcoatNormalScale(0, value)} />
              <SliderRow label={t("editor.properties.clearcoatNormalScaleY")} value={material.clearcoatNormalScale[1]} onChange={(value) => updateClearcoatNormalScale(1, value)} />
              <TextureConfigRow label={t("editor.properties.clearcoatMap")} texture={material.clearcoatMap} onOpen={() => onTextureConfigOpen("clearcoatMap")} />
              <TextureConfigRow label={t("editor.properties.clearcoatRoughnessMap")} texture={material.clearcoatRoughnessMap} onOpen={() => onTextureConfigOpen("clearcoatRoughnessMap")} />
              <TextureConfigRow label={t("editor.properties.clearcoatNormalMap")} texture={material.clearcoatNormalMap} onOpen={() => onTextureConfigOpen("clearcoatNormalMap")} />
            </Group>

            <Group title={t("editor.properties.physicalTransmission")}>
              <NumberRow label={t("editor.properties.thickness")} value={material.thickness} min={0} max={10} step={0.01} onChange={(value) => updateNumber("thickness", value)} />
              <NumberRow label={t("editor.properties.attenuationDistance")} value={material.attenuationDistance} min={0} step={0.1} onChange={(value) => updateNumber("attenuationDistance", value)} />
              <ColorRow label={t("editor.properties.attenuationColor")} value={material.attenuationColor} onChange={updateColor("attenuationColor")} />
              <NumberRow label={t("editor.properties.dispersion")} value={material.dispersion} min={0} max={1} step={0.01} onChange={(value) => updateNumber("dispersion", value)} />
              <TextureConfigRow label={t("editor.properties.transmissionMap")} texture={material.transmissionMap} onOpen={() => onTextureConfigOpen("transmissionMap")} />
              <TextureConfigRow label={t("editor.properties.thicknessMap")} texture={material.thicknessMap} onOpen={() => onTextureConfigOpen("thicknessMap")} />
            </Group>

            <Group title={t("editor.properties.physicalSheen")}>
              <SliderRow label={t("editor.properties.sheen")} value={material.sheen} onChange={(value) => updateNumber("sheen", value)} />
              <ColorRow label={t("editor.properties.sheenColor")} value={material.sheenColor} onChange={updateColor("sheenColor")} />
              <SliderRow label={t("editor.properties.sheenRoughness")} value={material.sheenRoughness} onChange={(value) => updateNumber("sheenRoughness", value)} />
              <TextureConfigRow label={t("editor.properties.sheenColorMap")} texture={material.sheenColorMap} onOpen={() => onTextureConfigOpen("sheenColorMap")} />
              <TextureConfigRow label={t("editor.properties.sheenRoughnessMap")} texture={material.sheenRoughnessMap} onOpen={() => onTextureConfigOpen("sheenRoughnessMap")} />
            </Group>

            <Group title={t("editor.properties.physicalIridescence")}>
              <SliderRow label={t("editor.properties.iridescence")} value={material.iridescence} onChange={(value) => updateNumber("iridescence", value)} />
              <NumberRow label={t("editor.properties.iridescenceIOR")} value={material.iridescenceIOR} min={1} max={2.333} step={0.001} onChange={(value) => updateNumber("iridescenceIOR", value)} />
              <NumberRow label={t("editor.properties.iridescenceThicknessMin")} value={material.iridescenceThicknessRange[0]} min={0} max={1200} step={1} onChange={(value) => updateIridescenceThicknessRange(0, value)} />
              <NumberRow label={t("editor.properties.iridescenceThicknessMax")} value={material.iridescenceThicknessRange[1]} min={0} max={1200} step={1} onChange={(value) => updateIridescenceThicknessRange(1, value)} />
              <TextureConfigRow label={t("editor.properties.iridescenceMap")} texture={material.iridescenceMap} onOpen={() => onTextureConfigOpen("iridescenceMap")} />
              <TextureConfigRow label={t("editor.properties.iridescenceThicknessMap")} texture={material.iridescenceThicknessMap} onOpen={() => onTextureConfigOpen("iridescenceThicknessMap")} />
            </Group>

            <Group title={t("editor.properties.physicalAnisotropy")}>
              <SliderRow label={t("editor.properties.anisotropy")} value={material.anisotropy} onChange={(value) => updateNumber("anisotropy", value)} />
              <NumberRow label={t("editor.properties.anisotropyRotation")} value={material.anisotropyRotation} min={-6.283} max={6.283} step={0.01} onChange={(value) => updateNumber("anisotropyRotation", value)} />
              <TextureConfigRow label={t("editor.properties.anisotropyMap")} texture={material.anisotropyMap} onOpen={() => onTextureConfigOpen("anisotropyMap")} />
            </Group>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
