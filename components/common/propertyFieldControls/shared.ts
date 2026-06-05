import { getEditorThemeTokens } from "@/components/editor/theme";

export const AXES = ["x", "y", "z"] as const;

export type Axis = (typeof AXES)[number];
export type AxisTextValues = Record<Axis, string>;
export type PropertyFieldTheme = ReturnType<typeof getEditorThemeTokens>;

export function getInputSx(theme: PropertyFieldTheme) {
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

export function getLabeledInputSx(theme: PropertyFieldTheme) {
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

export function getCompactAxisInputSx(theme: PropertyFieldTheme) {
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
