"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Box, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { getEditorThemeTokens } from "@/components/editor/theme";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import { useI18n } from "@/lib/i18n";
import type { EditorPostProcessPassId, ResolvedEditorEnvConfigJSON } from "@/render/editor";
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
};

export function SceneSettingsSection({ envConfig }: SceneSettingsSectionProps) {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  const panoPreviewUrl = useMemo(() => {
    if (!envConfig.panoUrl) return "";
    const lowerUrl = envConfig.panoUrl.toLowerCase();
    return lowerUrl.endsWith(".hdr") ? "" : envConfig.panoUrl;
  }, [envConfig.panoUrl]);

  const patchPassParams = (passId: EditorPostProcessPassId, patch: Record<string, boolean | number>) => {
    app?.updateScenePostProcessParams(
      passId,
      patch as never
    );
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
                component="img"
                src={panoPreviewUrl}
                alt="scene pano"
                sx={{
                  width: "100%",
                  height: 92,
                  borderRadius: 1,
                  border: theme.sectionBorder,
                  objectFit: "cover",
                  background: theme.inputBg
                }}
              />
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
                  {envConfig.panoUrl}
                </Typography>
              </Box>
            )}
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
              {option.label}
            </MenuItem>
          ))}
        </TextField>

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

        <ScenePostProcessingPanel
          app={app}
          config={envConfig.postProcessing}
          t={t}
          onTogglePass={(passId, enabled) => app?.updateScenePostProcessEnabled(passId, enabled)}
          onPatchPassParams={patchPassParams}
          onToggleMaskEnabled={(enabled) => app?.updateScenePostProcessMaskEnabled(enabled)}
          onUpdateMaskTargets={(targetEntityIds) => app?.updateScenePostProcessMaskTargets(targetEntityIds)}
          onToggleMaskPassEnabled={(passId, enabled) =>
            app?.updateScenePostProcessMaskPassEnabled(passId, enabled)
          }
        />
      </Stack>
    </PropertyPanelSection>
  );
}
