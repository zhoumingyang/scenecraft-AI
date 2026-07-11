"use client";

import { useMemo, useRef } from "react";
import { IconButton, InputAdornment, Stack, TextField } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useEditorStore } from "@/stores/editorStore";
import { getCompactAxisInputSx, getLabeledInputSx } from "./shared";

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
  const compactAxisInputSx = useMemo(() => getCompactAxisInputSx(theme), [theme]);
  const labeledInputSx = useMemo(() => getLabeledInputSx(theme), [theme]);
  const callbacksRef = useRef({ onNudge, nudgeStep });
  callbacksRef.current = { onNudge, nudgeStep };
  const endAdornment = useMemo(
    () =>
      onNudge ? (
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
              onClick={() => callbacksRef.current.onNudge?.(callbacksRef.current.nudgeStep)}
              sx={{ p: 0.05, color: theme.titleText }}
            >
              <AddRoundedIcon sx={{ fontSize: 11 }} />
            </IconButton>
            <IconButton
              size="small"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => callbacksRef.current.onNudge?.(-callbacksRef.current.nudgeStep)}
              sx={{ p: 0.05, color: theme.titleText }}
            >
              <RemoveRoundedIcon sx={{ fontSize: 11 }} />
            </IconButton>
          </Stack>
        </InputAdornment>
      ) : null,
    [Boolean(onNudge), theme.titleText]
  );

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
        input: endAdornment
          ? {
              endAdornment
            }
          : undefined,
        htmlInput: {
          inputMode: "decimal",
          style: onNudge ? { paddingRight: 26 } : undefined
        }
      }}
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
