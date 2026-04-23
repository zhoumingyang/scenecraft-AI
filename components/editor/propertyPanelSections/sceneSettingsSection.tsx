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
import type {
  EditorPostProcessPassId,
  ResolvedEditorEnvConfigJSON,
  ResolvedEditorPostProcessingConfigJSON
} from "@/render/editor";
import { EDITOR_POST_PROCESS_PASS_ORDER } from "@/render/editor";
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

const postProcessLabelKeyMap: Record<EditorPostProcessPassId, string> = {
  afterimage: "editor.post.afterimage",
  bokeh: "editor.post.bokeh",
  film: "editor.post.film",
  dotScreen: "editor.post.dotScreen",
  gtao: "editor.post.gtao",
  glitch: "editor.post.glitch",
  halftone: "editor.post.halftone",
  ssr: "editor.post.ssr",
  unrealBloom: "editor.post.unrealBloom"
};

const halftoneShapeOptions = [
  { value: 1, key: "editor.post.halftone.shape.dot" },
  { value: 2, key: "editor.post.halftone.shape.ellipse" },
  { value: 3, key: "editor.post.halftone.shape.line" },
  { value: 4, key: "editor.post.halftone.shape.square" }
];

const halftoneBlendModeOptions = [
  { value: 1, key: "editor.post.halftone.blendMode.linear" },
  { value: 2, key: "editor.post.halftone.blendMode.multiply" },
  { value: 3, key: "editor.post.halftone.blendMode.add" },
  { value: 4, key: "editor.post.halftone.blendMode.lighter" },
  { value: 5, key: "editor.post.halftone.blendMode.darker" }
];

const performanceHeavyPasses = new Set<EditorPostProcessPassId>(["gtao", "ssr", "bokeh", "unrealBloom"]);

type SceneSettingsSectionProps = {
  envConfig: ResolvedEditorEnvConfigJSON;
};

type SliderFieldProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  formatter?: (value: number) => string;
};

function SliderField({
  label,
  min,
  max,
  step,
  value,
  onChange,
  formatter = (nextValue) => nextValue.toFixed(2)
}: SliderFieldProps) {
  return (
    <Stack spacing={0.55}>
      <Typography sx={{ fontSize: 11, color: "rgba(205,220,255,0.78)" }}>{label}</Typography>
      <Stack direction="row" spacing={0.9} alignItems="center">
        <Slider
          size="small"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(_, nextValue) => onChange(nextValue as number)}
          sx={{ flex: 1 }}
        />
        <Typography
          sx={{
            minWidth: 42,
            textAlign: "right",
            fontSize: 11,
            color: "rgba(227,236,255,0.92)"
          }}
        >
          {formatter(value)}
        </Typography>
      </Stack>
    </Stack>
  );
}

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  return (
    <FormControlLabel
      control={<Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} />}
      label={label}
      sx={{ m: 0, color: "rgba(219,230,255,0.84)" }}
    />
  );
}

type SelectFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: { value: number; label: string }[];
};

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
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
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

function renderPostProcessingParams(
  passId: EditorPostProcessPassId,
  config: ResolvedEditorPostProcessingConfigJSON,
  onPatch: (passKey: EditorPostProcessPassId, patch: Record<string, boolean | number>) => void,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  switch (passId) {
    case "afterimage":
      return (
        <SliderField
          label={t("editor.post.damp")}
          min={0}
          max={0.99}
          step={0.01}
          value={config.passes.afterimage.params.damp}
          onChange={(value) => onPatch("afterimage", { damp: value })}
        />
      );
    case "bokeh":
      return (
        <Stack spacing={0.8}>
          <SliderField
            label={t("editor.post.focus")}
            min={0.1}
            max={200}
            step={0.1}
            value={config.passes.bokeh.params.focus}
            onChange={(value) => onPatch("bokeh", { focus: value })}
            formatter={(value) => value.toFixed(1)}
          />
          <SliderField
            label={t("editor.post.aperture")}
            min={0}
            max={0.1}
            step={0.001}
            value={config.passes.bokeh.params.aperture}
            onChange={(value) => onPatch("bokeh", { aperture: value })}
            formatter={(value) => value.toFixed(3)}
          />
          <SliderField
            label={t("editor.post.maxblur")}
            min={0}
            max={0.05}
            step={0.001}
            value={config.passes.bokeh.params.maxblur}
            onChange={(value) => onPatch("bokeh", { maxblur: value })}
            formatter={(value) => value.toFixed(3)}
          />
        </Stack>
      );
    case "film":
      return (
        <Stack spacing={0.8}>
          <SliderField
            label={t("editor.post.intensity")}
            min={0}
            max={1}
            step={0.01}
            value={config.passes.film.params.intensity}
            onChange={(value) => onPatch("film", { intensity: value })}
          />
          <ToggleField
            label={t("editor.post.grayscale")}
            checked={config.passes.film.params.grayscale}
            onChange={(checked) => onPatch("film", { grayscale: checked })}
          />
        </Stack>
      );
    case "dotScreen":
      return (
        <Stack spacing={0.8}>
          <SliderField
            label={t("editor.post.angle")}
            min={0}
            max={Math.PI}
            step={0.01}
            value={config.passes.dotScreen.params.angle}
            onChange={(value) => onPatch("dotScreen", { angle: value })}
          />
          <SliderField
            label={t("editor.post.scale")}
            min={0.2}
            max={3}
            step={0.05}
            value={config.passes.dotScreen.params.scale}
            onChange={(value) => onPatch("dotScreen", { scale: value })}
          />
        </Stack>
      );
    case "gtao":
      return (
        <Stack spacing={0.8}>
          <SliderField
            label={t("editor.post.blendIntensity")}
            min={0}
            max={3}
            step={0.05}
            value={config.passes.gtao.params.blendIntensity}
            onChange={(value) => onPatch("gtao", { blendIntensity: value })}
          />
          <SliderField
            label={t("editor.post.radius")}
            min={0}
            max={5}
            step={0.05}
            value={config.passes.gtao.params.radius}
            onChange={(value) => onPatch("gtao", { radius: value })}
          />
          <SliderField
            label={t("editor.post.distanceFallOff")}
            min={0}
            max={5}
            step={0.05}
            value={config.passes.gtao.params.distanceFallOff}
            onChange={(value) => onPatch("gtao", { distanceFallOff: value })}
          />
          <SliderField
            label={t("editor.post.thickness")}
            min={0}
            max={5}
            step={0.05}
            value={config.passes.gtao.params.thickness}
            onChange={(value) => onPatch("gtao", { thickness: value })}
          />
        </Stack>
      );
    case "glitch":
      return (
        <ToggleField
          label={t("editor.post.goWild")}
          checked={config.passes.glitch.params.goWild}
          onChange={(checked) => onPatch("glitch", { goWild: checked })}
        />
      );
    case "halftone":
      return (
        <Stack spacing={0.8}>
          <SelectField
            label={t("editor.post.shape")}
            value={config.passes.halftone.params.shape}
            onChange={(value) => onPatch("halftone", { shape: value })}
            options={halftoneShapeOptions.map((option) => ({
              value: option.value,
              label: t(option.key)
            }))}
          />
          <SliderField
            label={t("editor.post.radius")}
            min={1}
            max={12}
            step={0.1}
            value={config.passes.halftone.params.radius}
            onChange={(value) => onPatch("halftone", { radius: value })}
          />
          <SliderField
            label={t("editor.post.scatter")}
            min={0}
            max={1}
            step={0.01}
            value={config.passes.halftone.params.scatter}
            onChange={(value) => onPatch("halftone", { scatter: value })}
          />
          <SliderField
            label={t("editor.post.blending")}
            min={0}
            max={1}
            step={0.01}
            value={config.passes.halftone.params.blending}
            onChange={(value) => onPatch("halftone", { blending: value })}
          />
          <SelectField
            label={t("editor.post.blendingMode")}
            value={config.passes.halftone.params.blendingMode}
            onChange={(value) => onPatch("halftone", { blendingMode: value })}
            options={halftoneBlendModeOptions.map((option) => ({
              value: option.value,
              label: t(option.key)
            }))}
          />
          <ToggleField
            label={t("editor.post.greyscale")}
            checked={config.passes.halftone.params.greyscale}
            onChange={(checked) => onPatch("halftone", { greyscale: checked })}
          />
        </Stack>
      );
    case "ssr":
      return (
        <Stack spacing={0.8}>
          <SliderField
            label={t("editor.post.opacity")}
            min={0}
            max={1}
            step={0.01}
            value={config.passes.ssr.params.opacity}
            onChange={(value) => onPatch("ssr", { opacity: value })}
          />
          <SliderField
            label={t("editor.post.maxDistance")}
            min={0}
            max={500}
            step={1}
            value={config.passes.ssr.params.maxDistance}
            onChange={(value) => onPatch("ssr", { maxDistance: value })}
            formatter={(value) => value.toFixed(0)}
          />
          <SliderField
            label={t("editor.post.thickness")}
            min={0}
            max={1}
            step={0.001}
            value={config.passes.ssr.params.thickness}
            onChange={(value) => onPatch("ssr", { thickness: value })}
            formatter={(value) => value.toFixed(3)}
          />
          <ToggleField
            label={t("editor.post.blur")}
            checked={config.passes.ssr.params.blur}
            onChange={(checked) => onPatch("ssr", { blur: checked })}
          />
          <ToggleField
            label={t("editor.post.distanceAttenuation")}
            checked={config.passes.ssr.params.distanceAttenuation}
            onChange={(checked) => onPatch("ssr", { distanceAttenuation: checked })}
          />
          <ToggleField
            label={t("editor.post.fresnel")}
            checked={config.passes.ssr.params.fresnel}
            onChange={(checked) => onPatch("ssr", { fresnel: checked })}
          />
          <ToggleField
            label={t("editor.post.infiniteThick")}
            checked={config.passes.ssr.params.infiniteThick}
            onChange={(checked) => onPatch("ssr", { infiniteThick: checked })}
          />
        </Stack>
      );
    case "unrealBloom":
      return (
        <Stack spacing={0.8}>
          <SliderField
            label={t("editor.post.strength")}
            min={0}
            max={3}
            step={0.01}
            value={config.passes.unrealBloom.params.strength}
            onChange={(value) => onPatch("unrealBloom", { strength: value })}
          />
          <SliderField
            label={t("editor.post.radius")}
            min={0}
            max={1}
            step={0.01}
            value={config.passes.unrealBloom.params.radius}
            onChange={(value) => onPatch("unrealBloom", { radius: value })}
          />
          <SliderField
            label={t("editor.post.threshold")}
            min={0}
            max={2}
            step={0.01}
            value={config.passes.unrealBloom.params.threshold}
            onChange={(value) => onPatch("unrealBloom", { threshold: value })}
          />
        </Stack>
      );
  }
}

export function SceneSettingsSection({ envConfig }: SceneSettingsSectionProps) {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);

  const panoPreviewUrl = useMemo(() => {
    if (!envConfig.panoUrl) return "";
    const lowerUrl = envConfig.panoUrl.toLowerCase();
    return lowerUrl.endsWith(".hdr") ? "" : envConfig.panoUrl;
  }, [envConfig.panoUrl]);

  const enabledPassIds = useMemo(
    () =>
      EDITOR_POST_PROCESS_PASS_ORDER.filter((passId) => envConfig.postProcessing.passes[passId].enabled),
    [envConfig.postProcessing]
  );

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

        <Box
          sx={{
            borderRadius: 1,
            border: "1px solid rgba(160,190,255,0.14)",
            background: "rgba(255,255,255,0.03)",
            p: 1.1
          }}
        >
          <Stack spacing={1}>
            <Stack spacing={0.3}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(205,220,255,0.78)"
                }}
              >
                {t("editor.post.section")}
              </Typography>
              <Typography sx={{ fontSize: 11, color: "rgba(219,230,255,0.68)" }}>
                {t("editor.post.smaaAlwaysOn")}
              </Typography>
            </Stack>

            <Stack spacing={0.3}>
              {EDITOR_POST_PROCESS_PASS_ORDER.map((passId) => (
                <Stack
                  key={passId}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    px: 0.2,
                    py: 0.2,
                    borderRadius: 0.75,
                    background: envConfig.postProcessing.passes[passId].enabled
                      ? "rgba(123,196,255,0.08)"
                      : "transparent"
                  }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography sx={{ fontSize: 12, color: "rgba(232,240,255,0.9)" }}>
                      {t(postProcessLabelKeyMap[passId])}
                    </Typography>
                    {performanceHeavyPasses.has(passId) ? (
                      <Typography sx={{ fontSize: 10, color: "rgba(255,188,120,0.9)" }}>
                        {t("editor.post.performance")}
                      </Typography>
                    ) : null}
                  </Stack>
                  <Checkbox
                    checked={envConfig.postProcessing.passes[passId].enabled}
                    onChange={(event) => app?.updateScenePostProcessEnabled(passId, event.target.checked)}
                    sx={{ p: 0.25 }}
                  />
                </Stack>
              ))}
            </Stack>

            {enabledPassIds.length === 0 ? (
              <Typography sx={{ fontSize: 11, color: "rgba(219,230,255,0.6)" }}>
                {t("editor.post.noEnabledPasses")}
              </Typography>
            ) : (
              <Stack spacing={0.9}>
                {enabledPassIds.map((passId) => (
                  <Box
                    key={passId}
                    sx={{
                      borderRadius: 1,
                      border: "1px solid rgba(160,190,255,0.14)",
                      background: "rgba(10,18,38,0.38)",
                      p: 1
                    }}
                  >
                    <Stack spacing={0.85}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#eef5ff" }}>
                        {t(postProcessLabelKeyMap[passId])}
                      </Typography>
                      {renderPostProcessingParams(passId, envConfig.postProcessing, patchPassParams, t)}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </Box>
      </Stack>
    </PropertyPanelSection>
  );
}
