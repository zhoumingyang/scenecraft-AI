"use client";

import { ChangeEvent } from "react";
import {
  Box,
  IconButton,
  InputAdornment,
  Slider,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useEditorStore } from "@/stores/editorStore";

const AXES = ["x", "y", "z"] as const;

export type Axis = (typeof AXES)[number];
export type AxisTextValues = Record<Axis, string>;

function getInputSx(theme: ReturnType<typeof getEditorThemeTokens>) {
  return {
    "& .MuiOutlinedInput-root": {
      position: "relative",
      color: theme.pillText,
      background: theme.inputBg,
      minHeight: 30,
      fontSize: 12
    },
    "& .MuiOutlinedInput-input": {
      paddingTop: 6,
      paddingBottom: 6
    }
  } as const;
}

function getLabeledInputSx(theme: ReturnType<typeof getEditorThemeTokens>) {
  return {
    ...getInputSx(theme),
    "& .MuiInputLabel-root": {
      color: theme.text
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: theme.titleText
    }
  } as const;
}

function getCompactAxisInputSx(theme: ReturnType<typeof getEditorThemeTokens>) {
  return {
    ...getInputSx(theme),
    "&& .MuiOutlinedInput-root": {
      position: "relative",
      color: theme.pillText,
      background: theme.inputBg,
      minHeight: 30,
      height: 30,
      fontSize: 11
    },
    "&& .MuiOutlinedInput-input.MuiInputBase-inputSizeSmall": {
      paddingTop: 2,
      paddingBottom: 2,
      lineHeight: 1.2
    }
  } as const;
}

type AxisNumberInputsProps = {
  label: string;
  values: AxisTextValues;
  onChange: (axis: Axis, value: string) => void;
  onFocus: (axis: Axis) => void;
  onCommit: () => void;
  onNudge: (axis: Axis, delta: number) => void;
};

export function AxisNumberInputs({
  label,
  values,
  onChange,
  onFocus,
  onCommit,
  onNudge
}: AxisNumberInputsProps) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);
  const compactAxisInputSx = getCompactAxisInputSx(theme);

  return (
    <Stack spacing={0.75}>
      <Typography sx={{ fontSize: 11, color: theme.text }}>{label}</Typography>
      <Stack direction="row" spacing={0.75}>
        {AXES.map((axis) => (
          <TextField
            key={axis}
            size="small"
            value={values[axis]}
            onFocus={() => onFocus(axis)}
            onChange={(event) => onChange(axis, event.target.value)}
            onBlur={onCommit}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              onCommit();
              event.currentTarget.blur();
            }}
            slotProps={{
              htmlInput: {
                inputMode: "decimal",
                style: {
                  textTransform: "uppercase",
                  paddingLeft: 14,
                  paddingRight: 2
                }
              }
            }}
            sx={{
              flex: 1,
              ...compactAxisInputSx
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment
                  position="end"
                  sx={{
                    position: "absolute",
                    right: 3,
                    top: "50%",
                    transform: "translateY(-50%)",
                    m: 0,
                    height: "100%",
                    maxHeight: 16,
                    alignItems: "center"
                  }}
                >
                  <Stack spacing={0.05}>
                    <IconButton
                      size="small"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onNudge(axis, 0.1)}
                      sx={{ p: 0, color: theme.titleText }}
                    >
                      <AddRoundedIcon sx={{ fontSize: 10 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onNudge(axis, -0.1)}
                      sx={{ p: 0, color: theme.titleText }}
                    >
                      <RemoveRoundedIcon sx={{ fontSize: 10 }} />
                    </IconButton>
                  </Stack>
                </InputAdornment>
              ),
              startAdornment: (
                <InputAdornment
                  position="start"
                  sx={{
                    position: "absolute",
                    left: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    m: 0
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 10,
                      color: theme.titleText,
                      textTransform: "uppercase"
                    }}
                  >
                    {axis}
                  </Typography>
                </InputAdornment>
              )
            }}
          />
        ))}
      </Stack>
    </Stack>
  );
}

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

type CommitNumberFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onCommit: () => void;
  onNudge?: (delta: number) => void;
  nudgeStep?: number;
  compact?: boolean;
};

export function CommitNumberField({
  label,
  value,
  onChange,
  onFocus,
  onCommit,
  onNudge,
  nudgeStep = 1,
  compact = false
}: CommitNumberFieldProps) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);
  const compactAxisInputSx = getCompactAxisInputSx(theme);
  const labeledInputSx = getLabeledInputSx(theme);

  return (
    <TextField
      size="small"
      label={label}
      value={value}
      onFocus={onFocus}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        onCommit();
        event.currentTarget.blur();
      }}
      slotProps={{
        htmlInput: {
          inputMode: "decimal",
          style: onNudge ? { paddingRight: 26 } : undefined
        }
      }}
      InputProps={
        onNudge
          ? {
              endAdornment: (
                <InputAdornment
                  position="end"
                  sx={{
                    position: "absolute",
                    right: 3,
                    top: "50%",
                    transform: "translateY(-50%)",
                    m: 0,
                    height: "100%",
                    maxHeight: 22,
                    alignItems: "center"
                  }}
                >
                  <Stack spacing={0.05}>
                    <IconButton
                      size="small"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onNudge(nudgeStep)}
                      sx={{ p: 0.05, color: theme.titleText }}
                    >
                      <AddRoundedIcon sx={{ fontSize: 11 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onNudge(-nudgeStep)}
                      sx={{ p: 0.05, color: theme.titleText }}
                    >
                      <RemoveRoundedIcon sx={{ fontSize: 11 }} />
                    </IconButton>
                  </Stack>
                </InputAdornment>
              )
            }
          : undefined
      }
      sx={
        compact
          ? {
              flex: 1,
              ...compactAxisInputSx
            }
          : labeledInputSx
      }
    />
  );
}

type ColorFieldProps = {
  label?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  compact?: boolean;
};

export function ColorField({ label, value, onChange, compact = false }: ColorFieldProps) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);
  const compactAxisInputSx = getCompactAxisInputSx(theme);
  const labeledInputSx = getLabeledInputSx(theme);
  const inputSx = getInputSx(theme);

  return (
    <TextField
      size="small"
      label={label}
      value={value}
      onChange={onChange}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Box
                component="input"
                type="color"
                value={value}
                onChange={onChange}
                sx={{
                  width: 28,
                  height: 28,
                  border: 0,
                  background: "transparent",
                  p: 0,
                  cursor: "pointer"
                }}
              />
            </InputAdornment>
          )
        }
      }}
      sx={
        compact
          ? {
              flex: 1,
              ...compactAxisInputSx,
              "& .MuiOutlinedInput-input.MuiInputBase-inputSizeSmall": {
                paddingTop: 2,
                paddingBottom: 2,
                paddingLeft: 0
              },
              "&& .MuiOutlinedInput-notchedOutline": {
                border: "none"
              },
              "&&:hover .MuiOutlinedInput-notchedOutline": {
                border: "none"
              },
              "&& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                border: "none"
              }
            }
          : label
            ? labeledInputSx
            : inputSx
      }
    />
  );
}
