"use client";

import { ChangeEvent, useEffect, useState } from "react";
import * as THREE from "three";
import { Slider, Stack, Typography } from "@mui/material";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import { ColorField, CommitNumberField } from "@/components/common/propertyFieldControls";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";
import { LightNumberField } from "./shared";
import { buildLightNumberDraft, formatDegrees, formatNumber } from "./util";

type LightSettingsSectionProps = {
  entityId: string;
  lightType: number;
  color: string;
  angle: number;
  penumbra: number;
  intensity: number;
  distance: number;
  decay: number;
  width: number;
  height: number;
};

export function LightSettingsSection({
  entityId,
  lightType,
  color,
  angle,
  penumbra,
  intensity,
  distance,
  decay,
  width,
  height
}: LightSettingsSectionProps) {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const [activeField, setActiveField] = useState<LightNumberField | null>(null);
  const [lightNumberDraft, setLightNumberDraft] = useState(() =>
    buildLightNumberDraft({ intensity, distance, decay, width, height })
  );
  const angleDegrees = THREE.MathUtils.radToDeg(angle);

  useEffect(() => {
    if (activeField) return;
    const nextDraft = buildLightNumberDraft({ intensity, distance, decay, width, height });
    setLightNumberDraft((prev) =>
      prev.intensity === nextDraft.intensity &&
      prev.distance === nextDraft.distance &&
      prev.decay === nextDraft.decay &&
      prev.width === nextDraft.width &&
      prev.height === nextDraft.height
        ? prev
        : nextDraft
    );
  }, [activeField, intensity, distance, decay, width, height]);

  const updateColor = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    app?.updateLight(entityId, { color: event.target.value });
  };

  const commitNumber = (field: LightNumberField) => {
    if (!app) return;

    const currentValues = { intensity, distance, decay, width, height };
    const parsed = Number.parseFloat(lightNumberDraft[field]);
    const currentValue = currentValues[field];
    const nextValue = Number.isFinite(parsed) ? parsed : currentValue;

    setActiveField(null);
    setLightNumberDraft((prev) => ({
      ...prev,
      [field]: formatNumber(nextValue, 3)
    }));
    app.updateLight(entityId, { [field]: nextValue });
  };

  const nudgeNumber = (field: LightNumberField, delta: number) => {
    if (!app) return;
    const currentValues = { intensity, distance, decay, width, height };
    const rawValue = Number.parseFloat(lightNumberDraft[field]);
    const currentValue = Number.isFinite(rawValue) ? rawValue : currentValues[field];
    const nextValue = Number((currentValue + delta).toFixed(3));
    setLightNumberDraft((prev) => ({
      ...prev,
      [field]: formatNumber(nextValue, 3)
    }));
    app.updateLight(entityId, { [field]: nextValue });
  };

  const updateSpotLight = (patch: { angle?: number; penumbra?: number }) => {
    app?.updateLight(entityId, patch);
  };

  return (
    <PropertyPanelSection title={t("editor.properties.light")}>
      <Stack spacing={0.8}>
        <Stack direction="row" spacing={0.8} alignItems="center">
          <Typography sx={{ width: 64, fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
            {t("editor.properties.intensity")}
          </Typography>
          <CommitNumberField
            value={lightNumberDraft.intensity}
            onFocus={() => setActiveField("intensity")}
            onChange={(value) => setLightNumberDraft((prev) => ({ ...prev, intensity: value }))}
            onCommit={() => commitNumber("intensity")}
            onNudge={(delta) => nudgeNumber("intensity", delta)}
            nudgeStep={0.02}
            compact
          />
        </Stack>

        <Stack direction="row" spacing={0.8} alignItems="center">
          <Typography sx={{ width: 64, fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
            {t("editor.properties.color")}
          </Typography>
          <ColorField value={color} onChange={updateColor} compact />
        </Stack>

        {lightType === 3 || lightType === 4 ? (
          <>
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Typography sx={{ width: 64, fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
                {t("editor.properties.distance")}
              </Typography>
              <CommitNumberField
                value={lightNumberDraft.distance}
                onFocus={() => setActiveField("distance")}
                onChange={(value) => setLightNumberDraft((prev) => ({ ...prev, distance: value }))}
                onCommit={() => commitNumber("distance")}
                onNudge={(delta) => nudgeNumber("distance", delta)}
                nudgeStep={0.02}
                compact
              />
            </Stack>
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Typography sx={{ width: 64, fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
                {t("editor.properties.decay")}
              </Typography>
              <CommitNumberField
                value={lightNumberDraft.decay}
                onFocus={() => setActiveField("decay")}
                onChange={(value) => setLightNumberDraft((prev) => ({ ...prev, decay: value }))}
                onCommit={() => commitNumber("decay")}
                onNudge={(delta) => nudgeNumber("decay", delta)}
                nudgeStep={0.02}
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
                  onChange={(_, value) =>
                    updateSpotLight({
                      angle: THREE.MathUtils.degToRad(value as number)
                    })
                  }
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
                  onChange={(_, value) => updateSpotLight({ penumbra: value as number })}
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
                onFocus={() => setActiveField("width")}
                onChange={(value) => setLightNumberDraft((prev) => ({ ...prev, width: value }))}
                onCommit={() => commitNumber("width")}
                onNudge={(delta) => nudgeNumber("width", delta)}
                nudgeStep={0.02}
                compact
              />
            </Stack>
            <Stack direction="row" spacing={0.8} alignItems="center">
              <Typography sx={{ width: 64, fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
                {t("editor.properties.height")}
              </Typography>
              <CommitNumberField
                value={lightNumberDraft.height}
                onFocus={() => setActiveField("height")}
                onChange={(value) => setLightNumberDraft((prev) => ({ ...prev, height: value }))}
                onCommit={() => commitNumber("height")}
                onNudge={(delta) => nudgeNumber("height", delta)}
                nudgeStep={0.02}
                compact
              />
            </Stack>
          </>
        ) : null}
      </Stack>
    </PropertyPanelSection>
  );
}
