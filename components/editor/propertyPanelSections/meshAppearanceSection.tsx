"use client";

import { ChangeEvent } from "react";
import { Button, Slider, Stack, Typography } from "@mui/material";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import { ColorField } from "@/components/common/propertyFieldControls";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import type { ResolvedMeshMaterialJSON, ResolvedTextureSchema } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import { TextureFieldKey } from "./shared";
import { formatNumber } from "./util";

function MaterialSliderRow({
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
      <Typography sx={{ width: 78, fontSize: 11, color: theme.text }}>{label}</Typography>
      <Button
        size="small"
        color="inherit"
        onClick={onOpen}
        sx={{
          flex: 1,
          justifyContent: "space-between",
          minHeight: 30,
          borderRadius: 1,
          border: theme.sectionBorder,
          background: theme.inputBg,
          color: theme.pillText,
          textTransform: "none"
        }}
      >
        <span>
          {texture.url ? t("editor.properties.textureConfigured") : t("editor.properties.textureConfigure")}
        </span>
      </Button>
    </Stack>
  );
}

type MeshAppearanceSectionProps = {
  entityId: string;
  material: ResolvedMeshMaterialJSON;
  onTextureConfigOpen: (key: TextureFieldKey) => void;
};

export function MeshAppearanceSection({
  entityId,
  material,
  onTextureConfigOpen
}: MeshAppearanceSectionProps) {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  const updateColor = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    app?.updateMeshMaterial(entityId, { color: event.target.value });
  };

  const updateEmissive = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    app?.updateMeshMaterial(entityId, { emissive: event.target.value });
  };

  const updateMaterialValue = (
    key: "opacity" | "metalness" | "roughness" | "aoMapIntensity" | "emissiveIntensity",
    value: number
  ) => {
    app?.updateMeshMaterial(entityId, { [key]: value });
  };

  const updateNormalScale = (axis: "x" | "y", value: number) => {
    if (!app) return;
    const next = [...material.normalScale] as [number, number];
    next[axis === "x" ? 0 : 1] = value;
    app.updateMeshMaterial(entityId, { normalScale: next });
  };

  return (
    <PropertyPanelSection title={t("editor.properties.appearance")}>
      <Stack spacing={0.8}>
        <Stack direction="row" spacing={0.8} alignItems="center">
          <Typography sx={{ width: 78, fontSize: 11, color: theme.text }}>
            {t("editor.properties.color")}
          </Typography>
          <ColorField value={material.color} onChange={updateColor} compact />
        </Stack>

        <Stack direction="row" spacing={0.8} alignItems="center">
          <Typography sx={{ width: 78, fontSize: 11, color: theme.text }}>
            {t("editor.properties.emissive")}
          </Typography>
          <ColorField value={material.emissive} onChange={updateEmissive} compact />
        </Stack>

        <MaterialSliderRow
          label={t("editor.properties.opacity")}
          value={material.opacity}
          onChange={(value) => updateMaterialValue("opacity", value)}
        />
        <MaterialSliderRow
          label={t("editor.properties.metalness")}
          value={material.metalness}
          onChange={(value) => updateMaterialValue("metalness", value)}
        />
        <MaterialSliderRow
          label={t("editor.properties.roughness")}
          value={material.roughness}
          onChange={(value) => updateMaterialValue("roughness", value)}
        />
        <MaterialSliderRow
          label={t("editor.properties.aoMapIntensity")}
          value={material.aoMapIntensity}
          onChange={(value) => updateMaterialValue("aoMapIntensity", value)}
        />
        <MaterialSliderRow
          label={t("editor.properties.emissiveIntensity")}
          value={material.emissiveIntensity}
          max={5}
          onChange={(value) => updateMaterialValue("emissiveIntensity", value)}
        />

        <Stack spacing={0.45}>
          <Typography sx={{ fontSize: 11, color: theme.text }}>
            {t("editor.properties.normalScale")}
          </Typography>
          {(["x", "y"] as const).map((axis, index) => (
            <Stack key={axis} direction="row" spacing={0.9} alignItems="center">
              <Typography
                sx={{
                  width: 14,
                  fontSize: 11,
                  color: theme.titleText,
                  textTransform: "uppercase"
                }}
              >
                {axis}
              </Typography>
              <Slider
                size="small"
                min={0}
                max={1}
                step={0.01}
                value={material.normalScale[index]}
                onChange={(_, nextValue) => updateNormalScale(axis, nextValue as number)}
                sx={{ flex: 1 }}
              />
              <Typography
                sx={{
                  minWidth: 36,
                  textAlign: "right",
                  fontSize: 11,
                  color: theme.titleText,
                  fontWeight: 600
                }}
              >
                {formatNumber(material.normalScale[index], 2)}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <TextureConfigRow
          label={t("editor.properties.diffuseMap")}
          texture={material.diffuseMap}
          onOpen={() => onTextureConfigOpen("diffuseMap")}
        />
        <TextureConfigRow
          label={t("editor.properties.metalnessMap")}
          texture={material.metalnessMap}
          onOpen={() => onTextureConfigOpen("metalnessMap")}
        />
        <TextureConfigRow
          label={t("editor.properties.roughnessMap")}
          texture={material.roughnessMap}
          onOpen={() => onTextureConfigOpen("roughnessMap")}
        />
        <TextureConfigRow
          label={t("editor.properties.normalMap")}
          texture={material.normalMap}
          onOpen={() => onTextureConfigOpen("normalMap")}
        />
        <TextureConfigRow
          label={t("editor.properties.aoMap")}
          texture={material.aoMap}
          onOpen={() => onTextureConfigOpen("aoMap")}
        />
        <TextureConfigRow
          label={t("editor.properties.emissiveMap")}
          texture={material.emissiveMap}
          onOpen={() => onTextureConfigOpen("emissiveMap")}
        />
      </Stack>
    </PropertyPanelSection>
  );
}
