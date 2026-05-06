import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material";
import type { TranslationKey } from "@/lib/i18n";
import type { LightPresetId } from "@/render/editor";

export type TopBarTranslate = (key: TranslationKey, params?: Record<string, string | number>) => string;

export type IconComponent = ComponentType<SvgIconProps>;

export type SelectOption = {
  value: string;
  labelKey: TranslationKey;
};

export type LightPresetOption = {
  value: LightPresetId;
  labelKey: TranslationKey;
};

export type DropdownConfig = {
  id: "project" | "import" | "camera" | "light" | "mesh";
  labelKey: TranslationKey;
  icon: IconComponent;
  options: SelectOption[];
};
