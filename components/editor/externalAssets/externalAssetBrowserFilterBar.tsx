"use client";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Button, MenuItem, Stack, TextField } from "@mui/material";
import type { EditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";

type ExternalAssetCategoryOption = {
  value: string;
  label: string;
  assetCount: number;
};

type ExternalAssetBrowserFilterBarProps = {
  theme: EditorThemeTokens;
  isApplying: boolean;
  queryInput: string;
  category: string;
  categories: ExternalAssetCategoryOption[];
  onQueryInputChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSearch: () => void;
};

export function ExternalAssetBrowserFilterBar({
  theme,
  isApplying,
  queryInput,
  category,
  categories,
  onQueryInputChange,
  onCategoryChange,
  onSearch
}: ExternalAssetBrowserFilterBarProps) {
  const { t } = useI18n();

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
      <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
        <TextField
          fullWidth
          size="small"
          value={queryInput}
          onChange={(event) => onQueryInputChange(event.target.value)}
          placeholder={t("editor.assets.searchPlaceholder")}
          disabled={isApplying}
          sx={{
            "& .MuiOutlinedInput-root": {
              color: theme.pillText,
              background: theme.inputBg
            }
          }}
        />
        <Button
          color="inherit"
          onClick={onSearch}
          disabled={isApplying}
          startIcon={<SearchRoundedIcon sx={{ fontSize: 18 }} />}
          sx={{
            minWidth: 110,
            borderRadius: 1,
            border: theme.sectionBorder,
            background: theme.iconButtonBg,
            color: theme.pillText,
            textTransform: "none"
          }}
        >
          {t("editor.assets.searchAction")}
        </Button>
      </Stack>

      <TextField
        select
        size="small"
        value={category}
        onChange={(event) => onCategoryChange(event.target.value)}
        disabled={isApplying}
        sx={{
          minWidth: { xs: "100%", md: 220 },
          "& .MuiOutlinedInput-root": {
            color: theme.pillText,
            background: theme.inputBg
          }
        }}
      >
        <MenuItem value="">{t("editor.assets.categoryAll")}</MenuItem>
        {categories.map((item) => (
          <MenuItem key={item.value} value={item.value}>
            {item.label} ({item.assetCount})
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
