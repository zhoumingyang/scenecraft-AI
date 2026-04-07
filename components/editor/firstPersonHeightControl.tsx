"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { IconButton, InputAdornment, Stack, TextField } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import HeightRoundedIcon from "@mui/icons-material/HeightRounded";
import type { EditorApp } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { getViewportPillSx } from "./viewportControlStyles";

type FirstPersonHeightControlProps = {
  app: EditorApp | null;
  isFirstPerson: boolean;
};

const FIRST_PERSON_HEIGHT_STEP = 0.1;

function formatHeight(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "1.80";
}

export default function FirstPersonHeightControl({
  app,
  isFirstPerson
}: FirstPersonHeightControlProps) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const [heightInput, setHeightInput] = useState("1.80");
  const isEditingHeightRef = useRef(false);
  const firstPersonHeight = app?.getFirstPersonHeight() ?? 1.8;
  const theme = getEditorThemeTokens(editorThemeMode);

  useEffect(() => {
    if (!isFirstPerson) {
      isEditingHeightRef.current = false;
      return;
    }
    if (isEditingHeightRef.current) return;
    setHeightInput(formatHeight(firstPersonHeight));
  }, [firstPersonHeight, isFirstPerson]);

  if (!isFirstPerson) return null;

  const applyHeight = (value: number) => {
    if (!app) return;
    const nextValue = Math.max(0, Number(value.toFixed(2)));
    app.setFirstPersonHeight(nextValue);
    setHeightInput(formatHeight(nextValue));
  };

  const onHeightChange = (event: ChangeEvent<HTMLInputElement>) => {
    isEditingHeightRef.current = true;
    setHeightInput(event.target.value);
  };

  const onHeightBlur = () => {
    isEditingHeightRef.current = false;
    const parsed = Number(heightInput);
    applyHeight(Number.isFinite(parsed) ? parsed : firstPersonHeight);
  };

  const adjustHeight = (delta: number) => {
    isEditingHeightRef.current = false;
    applyHeight(firstPersonHeight + delta);
  };

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{
        ...getViewportPillSx(editorThemeMode),
        px: 0.5
      }}
    >
      <IconButton size="small" color="inherit" sx={{ width: 26, height: 26 }}>
        <HeightRoundedIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        color="inherit"
        onClick={() => adjustHeight(-FIRST_PERSON_HEIGHT_STEP)}
        sx={{ width: 26, height: 26 }}
      >
        <RemoveRoundedIcon fontSize="small" />
      </IconButton>
      <TextField
        size="small"
        value={heightInput}
        onChange={onHeightChange}
        onFocus={() => {
          isEditingHeightRef.current = true;
        }}
        onBlur={onHeightBlur}
        sx={{
          width: 96,
          "& .MuiOutlinedInput-root": {
            height: 24.5,
            borderRadius: 99,
            color: theme.pillText,
            background: theme.inputBg
          }
        }}
        slotProps={{
          htmlInput: {
            inputMode: "decimal"
          },
          input: {
            endAdornment: <InputAdornment position="end">m</InputAdornment>
          }
        }}
      />
      <IconButton
        size="small"
        color="inherit"
        onClick={() => adjustHeight(FIRST_PERSON_HEIGHT_STEP)}
        sx={{ width: 26, height: 26 }}
      >
        <AddRoundedIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
