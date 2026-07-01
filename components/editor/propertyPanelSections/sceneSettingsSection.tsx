"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Box, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { getEditorThemeTokens } from "@/components/editor/theme";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import { useI18n } from "@/lib/i18n";
import type { EditorPathTraceConfigJSON, EditorPostProcessPassId, ResolvedEditorEnvConfigJSON } from "@/render/editor";
import { isHighDynamicRangeEnvironmentAssetName, PATH_TRACE_SETTINGS_LIMITS } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import { ScenePostProcessingPanel } from "./scenePostProcessingPanel";
import { SliderField } from "./sceneSettingsFields";

const toneMappingOptions = [
  { label: "NoToneMapping", value: THREE.NoToneMapping },
  { label: "LinearToneMapping", value: THREE.LinearToneMapping },
  { label: "ReinhardToneMapping", value: THREE.ReinhardToneMapping },
  { label: "CineonToneMapping", value: THREE.CineonToneMapping },
  { label: "ACESFilmicToneMapping", value: THREE.ACESFilmicToneMapping },
  { label: "CustomToneMapping", value: THREE.CustomToneMapping },
  { label: "AgXToneMapping", value: THREE.AgXToneMapping },
  { label: "NeutralToneMapping", value: THREE.NeutralToneMapping }
];

type SceneSettingsSectionProps = {
  envConfig: ResolvedEditorEnvConfigJSON;
  onPanoramaPreviewClick?: () => void;
};

export function SceneSettingsSection({
  envConfig,
  onPanoramaPreviewClick
}: SceneSettingsSectionProps) {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);
  const [panoPreviewFailed, setPanoPreviewFailed] = useState(false);
  const panoAssetDisplayName = envConfig.panoAssetName || envConfig.panoUrl;
  const isHdrPanorama = isHighDynamicRangeEnvironmentAssetName(panoAssetDisplayName);

  useEffect(() => {
    setPanoPreviewFailed(false);
  }, [envConfig.panoUrl]);

  const panoPreviewUrl = useMemo(() => {
    if (!envConfig.panoUrl) return "";
    return isHdrPanorama || panoPreviewFailed ? "" : envConfig.panoUrl;
  }, [envConfig.panoUrl, isHdrPanorama, panoPreviewFailed]);

  const patchPassParams = (passId: EditorPostProcessPassId, patch: Record<string, boolean | number>) => {
    app?.updateScenePostProcessParams(
      passId,
      patch as never
    );
  };

  const patchPathTraceSettings = (patch: EditorPathTraceConfigJSON) => {
    app?.updateSceneEnvConfig({
      pathTrace: patch
    });
  };

  const getToneMappingLabel = (label: string, value: number) => {
    if (value === THREE.CustomToneMapping) {
      return `${label} • ${t("editor.properties.experimental")}`;
    }

    return label;
  };

  return (
    <PropertyPanelSection title={t("editor.properties.scene")}>
      <Stack spacing={1.1}>
        {envConfig.panoUrl ? (
          <Stack spacing={0.65}>
            <Typography sx={{ fontSize: 11, color: theme.text }}>
              {t("editor.properties.panoUrl")}
            </Typography>
            {panoPreviewUrl ? (
              <Box
                component="button"
                type="button"
                onClick={onPanoramaPreviewClick}
                sx={{
                  width: "100%",
                  p: 0,
                  border: theme.sectionBorder,
                  height: 92,
                  borderRadius: 1,
                  overflow: "hidden",
                  background: theme.inputBg,
                  cursor: onPanoramaPreviewClick ? "pointer" : "default",
                  "&:hover, &:focus-visible": onPanoramaPreviewClick
                    ? {
                        outline: "none",
                        border: theme.itemSelectedBorder
                      }
                    : undefined
                }}
              >
                <Box
                  component="img"
                  src={panoPreviewUrl}
                  alt="scene pano"
                  onError={() => setPanoPreviewFailed(true)}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block"
                  }}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  px: 1,
                  py: 1.2,
                  borderRadius: 1,
                  border: theme.sectionBorder,
                  background: theme.panelBgMuted
                }}
              >
                <Typography sx={{ fontSize: 11, color: theme.text }}>
                  {panoAssetDisplayName}
                </Typography>
              </Box>
            )}
            {envConfig.externalSource ? (
              <Stack spacing={0.35}>
                <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
                  {t("editor.assets.sourceLine", {
                    provider: "Poly Haven",
                    license: envConfig.externalSource.licenseLabel
                  })}
                </Typography>
                <Box
                  component="a"
                  href={envConfig.externalSource.pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    fontSize: 11,
                    color: theme.titleText,
                    textDecoration: "underline"
                  }}
                >
                  {t("editor.assets.viewSource")}
                </Box>
              </Stack>
            ) : null}
          </Stack>
        ) : null}

        <FormControlLabel
          control={
            <Checkbox
              checked={envConfig.environment === 1}
              onChange={(event) =>
                app?.updateSceneEnvConfig({
                  environment: event.target.checked ? 1 : 0
                })
              }
            />
          }
          label={t("editor.properties.environment")}
          sx={{ m: 0, color: theme.text }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={envConfig.backgroundShow === 1}
              onChange={(event) =>
                app?.updateSceneEnvConfig({
                  backgroundShow: event.target.checked ? 1 : 0
                })
              }
            />
          }
          label={t("editor.properties.backgroundShow")}
          sx={{ m: 0, color: theme.text }}
        />

        <TextField
          select
          size="small"
          label={t("editor.properties.toneMapping")}
          value={envConfig.toneMapping}
          onChange={(event) =>
            app?.updateSceneEnvConfig({
              toneMapping: Number(event.target.value)
            })
          }
          sx={{
            "& .MuiOutlinedInput-root": {
              color: theme.pillText,
              background: theme.inputBg,
              minHeight: 30,
              fontSize: 12
            },
            "& .MuiInputLabel-root": {
              color: theme.text
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: theme.titleText
            }
          }}
        >
          {toneMappingOptions.map((option) => (
            <MenuItem key={option.label} value={option.value}>
              {getToneMappingLabel(option.label, option.value)}
            </MenuItem>
          ))}
        </TextField>

        <SliderField
          label={t("editor.properties.environmentIntensity")}
          min={0}
          max={5}
          step={0.01}
          value={envConfig.environmentIntensity}
          onChange={(value) =>
            app?.updateSceneEnvConfig({
              environmentIntensity: value
            })
          }
          formatter={(value) => value.toFixed(2)
          }
        />

        <SliderField
          label={t("editor.properties.backgroundIntensity")}
          min={0}
          max={5}
          step={0.01}
          value={envConfig.backgroundIntensity}
          onChange={(value) =>
            app?.updateSceneEnvConfig({
              backgroundIntensity: value
            })
          }
          formatter={(value) => value.toFixed(2)
          }
        />

        <SliderField
          label={t("editor.properties.backgroundBlurriness")}
          min={0}
          max={1}
          step={0.01}
          value={envConfig.backgroundBlurriness}
          onChange={(value) =>
            app?.updateSceneEnvConfig({
              backgroundBlurriness: value
            })
          }
          formatter={(value) => value.toFixed(2)
          }
        />

        <SliderField
          label={t("editor.properties.toneMappingExposure")}
          min={0}
          max={5}
          step={0.01}
          value={envConfig.toneMappingExposure}
          onChange={(value) =>
            app?.updateSceneEnvConfig({
              toneMappingExposure: value
            })
          }
        />

        <SliderField
          label={t("editor.properties.environmentRotation")}
          min={-180}
          max={180}
          step={1}
          value={THREE.MathUtils.radToDeg(envConfig.environmentRotationY)}
          onChange={(value) =>
            app?.updateSceneEnvConfig({
              environmentRotationY: THREE.MathUtils.degToRad(value)
            })
          }
          formatter={(value) => `${Math.round(value)}°`
          }
        />

        <Stack spacing={0.8}>
          <Typography sx={{ fontSize: 11, color: theme.titleText, fontWeight: 700 }}>
            {t("editor.properties.pathTrace")}
          </Typography>

          <SliderField
            label={t("editor.properties.pathTraceBounces")}
            min={PATH_TRACE_SETTINGS_LIMITS.bounces.min}
            max={PATH_TRACE_SETTINGS_LIMITS.bounces.max}
            step={1}
            value={envConfig.pathTrace.bounces}
            onChange={(value) => patchPathTraceSettings({ bounces: Math.round(value) })}
            formatter={(value) => `${Math.round(value)}`}
          />

          <SliderField
            label={t("editor.properties.pathTraceFilterGlossyFactor")}
            min={PATH_TRACE_SETTINGS_LIMITS.filterGlossyFactor.min}
            max={PATH_TRACE_SETTINGS_LIMITS.filterGlossyFactor.max}
            step={0.01}
            value={envConfig.pathTrace.filterGlossyFactor}
            onChange={(value) => patchPathTraceSettings({ filterGlossyFactor: value })}
            formatter={(value) => value.toFixed(2)}
          />

          <SliderField
            label={t("editor.properties.pathTraceRealtimeSamples")}
            min={PATH_TRACE_SETTINGS_LIMITS.realtimeSamples.min}
            max={PATH_TRACE_SETTINGS_LIMITS.realtimeSamples.max}
            step={16}
            value={envConfig.pathTrace.realtimeSamples}
            onChange={(value) => patchPathTraceSettings({ realtimeSamples: Math.round(value) })}
            formatter={(value) => `${Math.round(value)}`}
          />

          <SliderField
            label={t("editor.properties.pathTraceExportSamples")}
            min={PATH_TRACE_SETTINGS_LIMITS.exportSamples.min}
            max={PATH_TRACE_SETTINGS_LIMITS.exportSamples.max}
            step={128}
            value={envConfig.pathTrace.exportSamples}
            onChange={(value) => patchPathTraceSettings({ exportSamples: Math.round(value) })}
            formatter={(value) => `${Math.round(value)}`}
          />
        </Stack>

        <ScenePostProcessingPanel
          config={envConfig.postProcessing}
          t={t}
          onTogglePass={(passId, enabled) => app?.updateScenePostProcessEnabled(passId, enabled)}
          onPatchPassParams={patchPassParams}
        />
      </Stack>
    </PropertyPanelSection>
  );
}
