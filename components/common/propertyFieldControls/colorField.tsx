"use client";

import type { ChangeEvent } from "react";
import { Box, InputAdornment, TextField } from "@mui/material";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useEditorStore } from "@/stores/editorStore";
import { getCompactAxisInputSx, getInputSx, getLabeledInputSx } from "./shared";

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
