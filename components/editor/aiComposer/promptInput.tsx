"use client";

import { KeyboardEvent } from "react";
import { TextField } from "@mui/material";
import type { EditorThemeTokens } from "@/components/editor/theme";

type Props = {
  value: string;
  placeholder: string;
  theme: EditorThemeTokens;
  onFocus: () => void;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export default function PromptInput({ value, placeholder, theme, onFocus, onChange, onKeyDown }: Props) {
  return (
    <TextField
      multiline
      minRows={2}
      maxRows={5}
      value={value}
      onFocus={onFocus}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      sx={{
        "& .MuiOutlinedInput-root": {
          alignItems: "flex-start",
          borderRadius: "12px",
          color: theme.pillText,
          background: "transparent",
          fontSize: 14
        },
        "& .MuiInputBase-input::placeholder": {
          color: theme.mutedText,
          opacity: 1
        },
        "& .MuiOutlinedInput-input": {
          px: 0.2
        },
        "& .MuiOutlinedInput-notchedOutline": {
          border: "none"
        }
      }}
    />
  );
}
