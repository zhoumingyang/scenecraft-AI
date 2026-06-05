"use client";

import { Slider, Stack, Typography } from "@mui/material";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useEditorStore } from "@/stores/editorStore";
import { AXES, type Axis } from "./shared";

type AxisSliderGroupProps = {
  label?: string;
  values: [number, number, number];
  min: number;
  max: number;
  step: number;
  formatter: (value: number) => string;
  onChange: (axis: Axis, value: number) => void;
  onChangeStart?: (axis: Axis) => void;
  onChangeCommit?: (axis: Axis, value: number) => void;
};

export function AxisSliderGroup({
  label,
  values,
  min,
  max,
  step,
  formatter,
  onChange,
  onChangeStart,
  onChangeCommit
}: AxisSliderGroupProps) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  return (
    <Stack spacing={0.65}>
      {label ? <Typography sx={{ fontSize: 11, color: theme.text }}>{label}</Typography> : null}
      {AXES.map((axis, index) => (
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
            min={min}
            max={max}
            step={step}
            value={values[index]}
            onMouseDown={() => onChangeStart?.(axis)}
            onTouchStart={() => onChangeStart?.(axis)}
            onChange={(_, nextValue) => onChange(axis, nextValue as number)}
            onChangeCommitted={(_, nextValue) => onChangeCommit?.(axis, nextValue as number)}
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
            {formatter(values[index])}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
