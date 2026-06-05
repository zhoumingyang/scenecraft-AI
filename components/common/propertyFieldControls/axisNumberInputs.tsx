"use client";

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
