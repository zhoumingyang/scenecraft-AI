"use client";

import { Checkbox, FormControlLabel, MenuItem, Slider, Stack, TextField, Typography } from "@mui/material";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useEditorStore } from "@/stores/editorStore";

type SliderFieldProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  formatter?: (value: number) => string;
};

export function SliderField({
  label,
  min,
  max,
  step,
  value,
  onChange,
  formatter = (nextValue) => nextValue.toFixed(2)
}: SliderFieldProps) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  return (
    <Stack spacing={0.55}>
      <Typography sx={{ fontSize: 11, color: theme.text }}>{label}</Typography>
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
            color: theme.titleText
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

export function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  return (
    <FormControlLabel
      control={<Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} />}
      label={label}
      sx={{ m: 0, color: theme.text }}
    />
  );
}

type SelectFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  options: { value: number; label: string }[];
};

export function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
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
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
