"use client";

import { Slider, Stack, Typography } from "@mui/material";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import type { Vec3Tuple } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import { formatNumber } from "./util";

type GroundScaleSectionProps = {
  scale: Vec3Tuple;
};

export function GroundScaleSection({ scale }: GroundScaleSectionProps) {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  const updateScale = (axisIndex: 0 | 2, value: number) => {
    const nextScale = [...scale] as Vec3Tuple;
    nextScale[axisIndex] = value;
    nextScale[1] = 1;
    app?.updateGroundConfig({ scale: nextScale });
  };

  return (
    <PropertyPanelSection title={t("editor.properties.scale")}>
      <Stack spacing={0.65}>
        {(["x", "z"] as const).map((axis) => {
          const axisIndex = axis === "x" ? 0 : 2;

          return (
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
                min={0.1}
                max={10}
                step={0.1}
                value={scale[axisIndex]}
                onChange={(_, nextValue) => updateScale(axisIndex, nextValue as number)}
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
                {formatNumber(scale[axisIndex], 1)}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </PropertyPanelSection>
  );
}
