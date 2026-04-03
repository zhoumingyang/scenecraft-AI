"use client";

import { useMemo } from "react";
import * as THREE from "three";
import {
  Box,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import { useI18n } from "@/lib/i18n";
import type { EditorEnvConfigJSON } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";

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
  envConfig: Required<EditorEnvConfigJSON>;
};

export function SceneSettingsSection({ envConfig }: SceneSettingsSectionProps) {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);

  const panoPreviewUrl = useMemo(() => {
    if (!envConfig.panoUrl) return "";
    const lowerUrl = envConfig.panoUrl.toLowerCase();
    return lowerUrl.endsWith(".hdr") ? "" : envConfig.panoUrl;
  }, [envConfig.panoUrl]);

  return (
    <PropertyPanelSection title={t("editor.properties.scene")}>
      <Stack spacing={1.1}>
        {envConfig.panoUrl ? (
          <Stack spacing={0.65}>
            <Typography sx={{ fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
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
                  border: "1px solid rgba(160,190,255,0.14)",
                  objectFit: "cover",
                  background: "rgba(255,255,255,0.04)"
                }}
              />
            ) : (
              <Box
                sx={{
                  px: 1,
                  py: 1.2,
                  borderRadius: 1,
                  border: "1px solid rgba(160,190,255,0.14)",
                  background: "rgba(255,255,255,0.03)"
                }}
              >
                <Typography sx={{ fontSize: 11, color: "rgba(219,230,255,0.84)" }}>
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
          sx={{ m: 0, color: "rgba(219,230,255,0.84)" }}
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
          sx={{ m: 0, color: "rgba(219,230,255,0.84)" }}
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
              color: "#eef5ff",
              background: "rgba(10,18,38,0.55)",
              minHeight: 30,
              fontSize: 12
            },
            "& .MuiInputLabel-root": {
              color: "rgba(176,197,238,0.78)"
            }
          }}
        >
          {toneMappingOptions.map((option) => (
            <MenuItem key={option.label} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <Stack spacing={0.55}>
          <Typography sx={{ fontSize: 11, color: "rgba(205,220,255,0.78)" }}>
            {t("editor.properties.toneMappingExposure")}
          </Typography>
          <Stack direction="row" spacing={0.9} alignItems="center">
            <Slider
              size="small"
              min={0}
              max={5}
              step={0.01}
              value={envConfig.toneMappingExposure}
              onChange={(_, value) =>
                app?.updateSceneEnvConfig({
                  toneMappingExposure: value as number
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
              {envConfig.toneMappingExposure.toFixed(2)}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </PropertyPanelSection>
  );
}
