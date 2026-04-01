"use client";

import * as THREE from "three";
import { ChangeEvent } from "react";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import { Button, Slider, Stack, Typography } from "@mui/material";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import {
  Axis,
  AxisNumberInputs,
  AxisSliderGroup,
  AxisTextValues,
  ColorField,
  CommitNumberField
} from "@/components/common/propertyFieldControls";
import { useI18n } from "@/lib/i18n";

export type LightNumberField = "intensity" | "distance" | "decay" | "width" | "height";
export type LightNumberDraft = Record<LightNumberField, string>;

function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "0";
  return Number(value.toFixed(digits)).toString();
}

function formatDegrees(value: number) {
  return `${Math.round(value)}°`;
}

type TransformSectionProps = {
  positionDraft: AxisTextValues;
  rotationValues: [number, number, number];
  scaleValues: [number, number, number];
  onPositionFocus: (axis: Axis) => void;
  onPositionChange: (axis: Axis, value: string) => void;
  onPositionCommit: () => void;
  onPositionNudge: (axis: Axis, delta: number) => void;
  onRotationStart: (axis: Axis) => void;
  onRotationChange: (axis: Axis, value: number) => void;
  onRotationCommit: (axis: Axis, value: number) => void;
  onScaleChange: (axis: Axis, value: number) => void;
};

export function TransformSection({
  positionDraft,
  rotationValues,
  scaleValues,
  onPositionFocus,
  onPositionChange,
  onPositionCommit,
  onPositionNudge,
  onRotationStart,
  onRotationChange,
  onRotationCommit,
  onScaleChange
}: TransformSectionProps) {
  const { t } = useI18n();

  return (
    <PropertyPanelSection title={t("editor.properties.transform")}>
      <AxisNumberInputs
        label={t("editor.properties.position")}
        values={positionDraft}
        onFocus={onPositionFocus}
        onChange={onPositionChange}
        onCommit={onPositionCommit}
        onNudge={onPositionNudge}
      />

      <AxisSliderGroup
        label={t("editor.properties.rotation")}
        values={rotationValues}
        min={0}
        max={360}
        step={1}
        formatter={formatDegrees}
        onChangeStart={onRotationStart}
        onChange={onRotationChange}
        onChangeCommit={onRotationCommit}
      />

      <AxisSliderGroup
        label={t("editor.properties.scale")}
        values={scaleValues}
        min={0}
        max={10}
        step={0.1}
        formatter={(value) => formatNumber(value, 1)}
        onChange={onScaleChange}
      />
    </PropertyPanelSection>
  );
}

type MeshAppearanceSectionProps = {
  color: string;
  textureLabel: string;
  onColorChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onTexturePick: () => void;
};

export function MeshAppearanceSection({
  color,
  textureLabel,
  onColorChange,
  onTexturePick
}: MeshAppearanceSectionProps) {
  const { t } = useI18n();

  return (
    <PropertyPanelSection title={t("editor.properties.appearance")}>
      <Stack spacing={0.7}>
        <Typography sx={{ fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
          {t("editor.properties.color")}
        </Typography>
        <ColorField value={color} onChange={onColorChange} />
        <Typography sx={{ pt: 0.2, fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
          {t("editor.properties.texture")}
        </Typography>
        <Button
          size="small"
          color="inherit"
          startIcon={<UploadRoundedIcon sx={{ fontSize: 15 }} />}
          onClick={onTexturePick}
          sx={{
            justifyContent: "flex-start",
            minHeight: 34,
            borderRadius: 1,
            border: "1px solid rgba(160,190,255,0.18)",
            background: "rgba(10,18,38,0.55)",
            color: "#eef5ff",
            textTransform: "none"
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "left"
            }}
          >
            {textureLabel}
          </span>
        </Button>
      </Stack>
    </PropertyPanelSection>
  );
}

type LightSettingsSectionProps = {
  lightType: number;
  color: string;
  angle: number;
  penumbra: number;
  lightNumberDraft: LightNumberDraft;
  onColorChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFieldFocus: (field: LightNumberField) => void;
  onFieldChange: (field: LightNumberField, value: string) => void;
  onFieldCommit: (field: LightNumberField) => void;
  onFieldNudge?: (field: LightNumberField, delta: number) => void;
  onAngleChange: (value: number) => void;
  onPenumbraChange: (value: number) => void;
};

export function LightSettingsSection({
  lightType,
  color,
  angle,
  penumbra,
  lightNumberDraft,
  onColorChange,
  onFieldFocus,
  onFieldChange,
  onFieldCommit,
  onFieldNudge,
  onAngleChange,
  onPenumbraChange
}: LightSettingsSectionProps) {
  const { t } = useI18n();
  const angleDegrees = THREE.MathUtils.radToDeg(angle);

  return (
    <PropertyPanelSection title={t("editor.properties.light")}>
      <Stack spacing={0.8}>
        <Stack direction="row" spacing={0.8} alignItems="center">
          <Typography sx={{ width: 64, fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
            {t("editor.properties.intensity")}
          </Typography>
          <CommitNumberField
            value={lightNumberDraft.intensity}
            onFocus={() => onFieldFocus("intensity")}
            onChange={(value) => onFieldChange("intensity", value)}
            onCommit={() => onFieldCommit("intensity")}
            onNudge={onFieldNudge ? (delta) => onFieldNudge("intensity", delta) : undefined}
            compact
          />
        </Stack>

        <Stack direction="row" spacing={0.8} alignItems="center">
          <Typography sx={{ width: 64, fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
            {t("editor.properties.color")}
          </Typography>
          <ColorField value={color} onChange={onColorChange} compact />
        </Stack>

        {lightType === 3 || lightType === 4 ? (
          <>
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Typography sx={{ width: 64, fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
                {t("editor.properties.distance")}
              </Typography>
              <CommitNumberField
                value={lightNumberDraft.distance}
                onFocus={() => onFieldFocus("distance")}
                onChange={(value) => onFieldChange("distance", value)}
                onCommit={() => onFieldCommit("distance")}
                onNudge={onFieldNudge ? (delta) => onFieldNudge("distance", delta) : undefined}
                compact
              />
            </Stack>
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Typography sx={{ width: 64, fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
                {t("editor.properties.decay")}
              </Typography>
              <CommitNumberField
                value={lightNumberDraft.decay}
                onFocus={() => onFieldFocus("decay")}
                onChange={(value) => onFieldChange("decay", value)}
                onCommit={() => onFieldCommit("decay")}
                onNudge={onFieldNudge ? (delta) => onFieldNudge("decay", delta) : undefined}
                compact
              />
            </Stack>
          </>
        ) : null}

        {lightType === 4 ? (
          <>
            <Stack spacing={0.55}>
              <Typography sx={{ fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
                {t("editor.properties.angle")}
              </Typography>
              <Stack direction="row" spacing={0.9} alignItems="center">
                <Slider
                  size="small"
                  min={0}
                  max={180}
                  step={1}
                  value={angleDegrees}
                  onChange={(_, value) => onAngleChange(value as number)}
                  sx={{ flex: 1 }}
                />
                <Typography
                  sx={{
                    minWidth: 36,
                    textAlign: "right",
                    fontSize: 11,
                    color: "rgba(227,236,255,0.92)"
                  }}
                >
                  {formatDegrees(angleDegrees)}
                </Typography>
              </Stack>
            </Stack>

            <Stack spacing={0.55}>
              <Typography sx={{ fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
                {t("editor.properties.penumbra")}
              </Typography>
              <Stack direction="row" spacing={0.9} alignItems="center">
                <Slider
                  size="small"
                  min={0}
                  max={1}
                  step={0.01}
                  value={penumbra}
                  onChange={(_, value) => onPenumbraChange(value as number)}
                  sx={{ flex: 1 }}
                />
                <Typography
                  sx={{
                    minWidth: 36,
                    textAlign: "right",
                    fontSize: 11,
                    color: "rgba(227,236,255,0.92)"
                  }}
                >
                  {formatNumber(penumbra, 2)}
                </Typography>
              </Stack>
            </Stack>
          </>
        ) : null}

        {lightType === 5 ? (
          <>
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Typography sx={{ width: 64, fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
                {t("editor.properties.width")}
              </Typography>
              <CommitNumberField
                value={lightNumberDraft.width}
                onFocus={() => onFieldFocus("width")}
                onChange={(value) => onFieldChange("width", value)}
                onCommit={() => onFieldCommit("width")}
                onNudge={onFieldNudge ? (delta) => onFieldNudge("width", delta) : undefined}
                compact
              />
            </Stack>
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Typography sx={{ width: 64, fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
                {t("editor.properties.height")}
              </Typography>
              <CommitNumberField
                value={lightNumberDraft.height}
                onFocus={() => onFieldFocus("height")}
                onChange={(value) => onFieldChange("height", value)}
                onCommit={() => onFieldCommit("height")}
                onNudge={onFieldNudge ? (delta) => onFieldNudge("height", delta) : undefined}
                compact
              />
            </Stack>
          </>
        ) : null}
      </Stack>
    </PropertyPanelSection>
  );
}
