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

const AXES = ["x", "y", "z"] as const;

export type Axis = (typeof AXES)[number];
export type AxisTextValues = Record<Axis, string>;

const inputSx = {
  "& .MuiOutlinedInput-root": {
    position: "relative",
    color: "#eef5ff",
    background: "rgba(10,18,38,0.55)",
    minHeight: 30,
    fontSize: 12
  },
  "& .MuiOutlinedInput-input": {
    paddingTop: 6,
    paddingBottom: 6
  }
};

const labeledInputSx = {
  ...inputSx,
  "& .MuiInputLabel-root": {
    color: "rgba(176,197,238,0.78)"
  }
};

const compactAxisInputSx = {
  ...inputSx,
  "&& .MuiOutlinedInput-root": {
    position: "relative",
    color: "#eef5ff",
    background: "rgba(10,18,38,0.55)",
    minHeight: 30,
    height: 30,
    fontSize: 11
  },
  "&& .MuiOutlinedInput-input.MuiInputBase-inputSizeSmall": {
    paddingTop: 2,
    paddingBottom: 2,
    lineHeight: 1.2
  }
};

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
  return (
    <Stack spacing={0.75}>
      <Typography sx={{ fontSize: 11, color: "rgba(205,220,255,0.78)" }}>{label}</Typography>
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
                      sx={{ p: 0, color: "rgba(214,228,255,0.9)" }}
                    >
                      <AddRoundedIcon sx={{ fontSize: 10 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onNudge(axis, -0.1)}
                      sx={{ p: 0, color: "rgba(214,228,255,0.9)" }}
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
                      color: "rgba(150,182,255,0.86)",
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
  label: string;
  values: [number, number, number];
  min: number;
  max: number;
  step: number;
  formatter: (value: number) => string;
  onChange: (axis: Axis, value: number) => void;
};

export function AxisSliderGroup({
  label,
  values,
  min,
  max,
  step,
  formatter,
  onChange
}: AxisSliderGroupProps) {
  return (
    <Stack spacing={0.65}>
      <Typography sx={{ fontSize: 11, color: "rgba(205,220,255,0.78)" }}>{label}</Typography>
      {AXES.map((axis, index) => (
        <Stack key={axis} direction="row" spacing={0.9} alignItems="center">
          <Typography
            sx={{
              width: 14,
              fontSize: 11,
              color: "rgba(150,182,255,0.86)",
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
            onChange={(_, nextValue) => onChange(axis, nextValue as number)}
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
  compact?: boolean;
};

export function CommitNumberField({
  label,
  value,
  onChange,
  onFocus,
  onCommit,
  onNudge,
  compact = false
}: CommitNumberFieldProps) {
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
                      onClick={() => onNudge(1)}
                      sx={{ p: 0.05, color: "rgba(214,228,255,0.9)" }}
                    >
                      <AddRoundedIcon sx={{ fontSize: 11 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onNudge(-1)}
                      sx={{ p: 0.05, color: "rgba(214,228,255,0.9)" }}
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
