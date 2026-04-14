"use client";

import { useState } from "react";
import { Button, Collapse, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import type { EditorThemeTokens } from "@/components/editor/theme";
import type {
  Ai3DIntentInput,
  Ai3DIntentSubjectType
} from "@/lib/ai/ai3d/intent";

type Props = {
  theme: EditorThemeTokens;
  value: Partial<Ai3DIntentInput>;
  onChange: (payload: Partial<Ai3DIntentInput>) => void;
  t: (key: any, params?: Record<string, string | number>) => string;
};

type ResolvedSubjectTypeWithAuto = Ai3DIntentSubjectType | "auto";

const SUBJECT_OPTIONS: ResolvedSubjectTypeWithAuto[] = [
  "auto",
  "character",
  "animal",
  "prop",
  "icon",
  "abstract"
];
const DETAIL_OPTIONS: NonNullable<Ai3DIntentInput["detailLevel"]>[] = ["low", "medium", "high"];
const POSE_OPTIONS: NonNullable<Ai3DIntentInput["pose"]>[] = [
  "auto",
  "standing",
  "sitting",
  "flying",
  "coiled",
  "static"
];
const SYMMETRY_OPTIONS: NonNullable<Ai3DIntentInput["symmetry"]>[] = [
  "auto",
  "symmetric",
  "asymmetric"
];
const STYLE_OPTIONS: NonNullable<Ai3DIntentInput["styleBias"]>[] = [
  "stylized",
  "cute",
  "clean",
  "chunky"
];

function parseCommaSeparatedList(value: string) {
  const items = value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? Array.from(new Set(items)) : undefined;
}

function getFieldSx(theme: EditorThemeTokens) {
  return {
    "& .MuiOutlinedInput-root": {
      color: theme.pillText,
      background: theme.itemBg,
      borderRadius: "10px",
      "& fieldset": {
        borderColor: "rgba(148, 163, 184, 0.18)"
      },
      "&:hover fieldset": {
        borderColor: "rgba(148, 163, 184, 0.28)"
      },
      "&.Mui-focused fieldset": {
        borderColor: "rgba(99, 164, 255, 0.72)"
      }
    },
    "& .MuiInputLabel-root": {
      color: theme.mutedText
    },
    "& .MuiSvgIcon-root": {
      color: theme.mutedText
    },
    "& .MuiInputBase-input::placeholder": {
      color: theme.mutedText,
      opacity: 1
    }
  } as const;
}

export default function Ai3dIntentControls({ theme, value, onChange, t }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fieldSx = getFieldSx(theme);

  return (
    <Stack
      spacing={1}
      sx={{
        px: 0.2,
        py: 0.6
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ fontSize: 12, color: theme.mutedText }}>
          {t("editor.ai3d.intentHint")}
        </Typography>
        <Button
          size="small"
          onClick={() => setShowAdvanced((current) => !current)}
          sx={{
            minWidth: 0,
            px: 1,
            color: theme.pillText,
            border: theme.sectionBorder,
            background: theme.itemBg,
            textTransform: "none",
            fontSize: 12
          }}
        >
          {showAdvanced ? t("editor.ai3d.hideAdvanced") : t("editor.ai3d.showAdvanced")}
        </Button>
      </Stack>

      <Grid container spacing={1}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            select
            fullWidth
            size="small"
            label={t("editor.ai3d.subjectType")}
            value={value.subjectType ?? "auto"}
            onChange={(event) =>
              onChange({
                subjectType: event.target.value as Ai3DIntentInput["subjectType"]
              })
            }
            sx={fieldSx}
          >
            {SUBJECT_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {t(`editor.ai3d.subjectType.${option}` as any)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            select
            fullWidth
            size="small"
            label={t("editor.ai3d.detailLevel")}
            value={value.detailLevel ?? "medium"}
            onChange={(event) =>
              onChange({
                detailLevel: event.target.value as Ai3DIntentInput["detailLevel"]
              })
            }
            sx={fieldSx}
          >
            {DETAIL_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {t(`editor.ai3d.detailLevel.${option}` as any)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            select
            fullWidth
            size="small"
            label={t("editor.ai3d.styleBias")}
            value={value.styleBias ?? "stylized"}
            onChange={(event) =>
              onChange({
                styleBias: event.target.value as Ai3DIntentInput["styleBias"]
              })
            }
            sx={fieldSx}
          >
            {STYLE_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {t(`editor.ai3d.styleBias.${option}` as any)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <Collapse in={showAdvanced}>
        <Stack spacing={1} sx={{ pt: 1 }}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label={t("editor.ai3d.pose")}
                value={value.pose ?? "auto"}
                onChange={(event) =>
                  onChange({
                    pose: event.target.value as Ai3DIntentInput["pose"]
                  })
                }
                sx={fieldSx}
              >
                {POSE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {t(`editor.ai3d.pose.${option}` as any)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label={t("editor.ai3d.symmetry")}
                value={value.symmetry ?? "auto"}
                onChange={(event) =>
                  onChange({
                    symmetry: event.target.value as Ai3DIntentInput["symmetry"]
                  })
                }
                sx={fieldSx}
              >
                {SYMMETRY_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {t(`editor.ai3d.symmetry.${option}` as any)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <TextField
            fullWidth
            size="small"
            label={t("editor.ai3d.mustHaveParts")}
            placeholder={t("editor.ai3d.listPlaceholder")}
            value={(value.mustHaveParts ?? []).join(", ")}
            onChange={(event) =>
              onChange({
                mustHaveParts: parseCommaSeparatedList(event.target.value)
              })
            }
            sx={fieldSx}
          />
          <TextField
            fullWidth
            size="small"
            label={t("editor.ai3d.avoidParts")}
            placeholder={t("editor.ai3d.listPlaceholder")}
            value={(value.avoidParts ?? []).join(", ")}
            onChange={(event) =>
              onChange({
                avoidParts: parseCommaSeparatedList(event.target.value)
              })
            }
            sx={fieldSx}
          />
        </Stack>
      </Collapse>
    </Stack>
  );
}
