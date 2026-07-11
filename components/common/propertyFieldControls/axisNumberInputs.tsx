"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { IconButton, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useEditorStore } from "@/stores/editorStore";
import { AXES, getCompactAxisInputSx, type Axis, type AxisTextValues } from "./shared";

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
  const compactAxisInputSx = useMemo(() => getCompactAxisInputSx(theme), [theme]);
  const callbacksRef = useRef({ onChange, onFocus, onCommit, onNudge });
  callbacksRef.current = { onChange, onFocus, onCommit, onNudge };
  const adornments = useMemo(
    () =>
      AXES.reduce(
        (acc, axis) => {
          acc[axis] = {
            end: (
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
                    onClick={() => callbacksRef.current.onNudge(axis, 0.1)}
                    sx={{ p: 0, color: theme.titleText }}
                  >
                    <AddRoundedIcon sx={{ fontSize: 10 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => callbacksRef.current.onNudge(axis, -0.1)}
                    sx={{ p: 0, color: theme.titleText }}
                  >
                    <RemoveRoundedIcon sx={{ fontSize: 10 }} />
                  </IconButton>
                </Stack>
              </InputAdornment>
            ),
            start: (
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
          };
          return acc;
        },
        {} as Record<Axis, { end: ReactNode; start: ReactNode }>
      ),
    [theme.titleText]
  );

  return (
    <Stack spacing={0.75}>
      <Typography sx={{ fontSize: 11, color: theme.text }}>{label}</Typography>
      <Stack direction="row" spacing={0.75}>
        {AXES.map((axis) => (
          <TextField
            key={axis}
            size="small"
            value={values[axis]}
            onFocus={() => callbacksRef.current.onFocus(axis)}
            onChange={(event) => callbacksRef.current.onChange(axis, event.target.value)}
            onBlur={() => callbacksRef.current.onCommit()}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              callbacksRef.current.onCommit();
              event.currentTarget.blur();
            }}
            slotProps={{
              input: {
                endAdornment: adornments[axis].end,
                startAdornment: adornments[axis].start
              },
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
          />
        ))}
      </Stack>
    </Stack>
  );
}
