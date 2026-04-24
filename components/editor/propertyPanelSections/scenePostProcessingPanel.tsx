"use client";

import { Box, Checkbox, Stack, Typography } from "@mui/material";
import { getEditorThemeTokens } from "@/components/editor/theme";
import type { EditorPostProcessPassId, ResolvedEditorPostProcessingConfigJSON } from "@/render/editor";
import { EDITOR_POST_PROCESS_PASS_ORDER } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import { SelectField, SliderField, ToggleField } from "./sceneSettingsFields";

const postProcessLabelKeyMap: Record<EditorPostProcessPassId, string> = {
  pixelated: "editor.post.pixelated",
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

type ScenePostProcessingPanelProps = {
  config: ResolvedEditorPostProcessingConfigJSON;
  t: (key: string, values?: Record<string, string | number>) => string;
  onTogglePass: (passId: EditorPostProcessPassId, enabled: boolean) => void;
  onPatchPassParams: (passId: EditorPostProcessPassId, patch: Record<string, boolean | number>) => void;
};

function renderPostProcessingParams(
  passId: EditorPostProcessPassId,
  config: ResolvedEditorPostProcessingConfigJSON,
  onPatch: (passKey: EditorPostProcessPassId, patch: Record<string, boolean | number>) => void,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  switch (passId) {
    case "pixelated":
      return (
        <Stack spacing={0.8}>
          <SliderField
            label={t("editor.post.pixelSize")}
            min={1}
            max={16}
            step={1}
            value={config.passes.pixelated.params.pixelSize}
            onChange={(value) => onPatch("pixelated", { pixelSize: value })}
            formatter={(value) => value.toFixed(0)}
          />
          <SliderField
            label={t("editor.post.normalEdgeStrength")}
            min={0}
            max={2}
            step={0.01}
            value={config.passes.pixelated.params.normalEdgeStrength}
            onChange={(value) => onPatch("pixelated", { normalEdgeStrength: value })}
          />
          <SliderField
            label={t("editor.post.depthEdgeStrength")}
            min={0}
            max={2}
            step={0.01}
            value={config.passes.pixelated.params.depthEdgeStrength}
            onChange={(value) => onPatch("pixelated", { depthEdgeStrength: value })}
          />
        </Stack>
      );
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

export function ScenePostProcessingPanel({
  config,
  t,
  onTogglePass,
  onPatchPassParams
}: ScenePostProcessingPanelProps) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);
  const enabledPassIds = EDITOR_POST_PROCESS_PASS_ORDER.filter((passId) => config.passes[passId].enabled);

  return (
    <Box
      sx={{
        borderRadius: 1,
        border: theme.sectionBorder,
        background: theme.sectionBg,
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
              color: theme.mutedText
            }}
          >
            {t("editor.post.section")}
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
                background: config.passes[passId].enabled ? theme.itemSelectedBg : "transparent"
              }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Typography sx={{ fontSize: 12, color: theme.pillText }}>
                  {t(postProcessLabelKeyMap[passId])}
                </Typography>
                {performanceHeavyPasses.has(passId) ? (
                  <Typography sx={{ fontSize: 10, color: "rgba(255,188,120,0.9)" }}>
                    {t("editor.post.performance")}
                  </Typography>
                ) : null}
              </Stack>
              <Checkbox
                checked={config.passes[passId].enabled}
                onChange={(event) => onTogglePass(passId, event.target.checked)}
                sx={{ p: 0.25 }}
              />
            </Stack>
          ))}
        </Stack>

        {enabledPassIds.length === 0 ? (
          <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
            {t("editor.post.noEnabledPasses")}
          </Typography>
        ) : (
          <Stack spacing={0.9}>
            {enabledPassIds.map((passId) => (
              <Box
                key={passId}
                sx={{
                  borderRadius: 1,
                  border: theme.sectionBorder,
                  background: theme.panelBgMuted,
                  p: 1
                }}
              >
                <Stack spacing={0.85}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: theme.titleText }}>
                    {t(postProcessLabelKeyMap[passId])}
                  </Typography>
                  {renderPostProcessingParams(passId, config, onPatchPassParams, t)}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
