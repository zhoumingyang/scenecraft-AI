import { Button, Stack, Tooltip } from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import CollectionsRoundedIcon from "@mui/icons-material/CollectionsRounded";
import type { EditorThemeTokens } from "@/components/editor/theme";
import type { DropdownConfig, TopBarTranslate } from "./types";

type TopBarActionBarProps = {
  aiLibraryAssetCount: number;
  dropdownConfigs: DropdownConfig[];
  onClearProject: () => void;
  onOpenAiLibrary: () => void;
  onOpenMenu: (id: DropdownConfig["id"], anchor: HTMLElement) => void;
  onSaveScene: () => void;
  t: TopBarTranslate;
  theme: EditorThemeTokens;
};

export default function TopBarActionBar({
  aiLibraryAssetCount,
  dropdownConfigs,
  onClearProject,
  onOpenAiLibrary,
  onOpenMenu,
  onSaveScene,
  t,
  theme
}: TopBarActionBarProps) {
  const projectConfig = dropdownConfigs.find((config) => config.id === "project") ?? null;
  const actionConfigs = dropdownConfigs.filter((config) => config.id !== "project");

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        position: "absolute",
        left: "50%",
        top: 16,
        transform: "translateX(-50%)",
        zIndex: 20,
        px: 1.2,
        py: 1,
        borderRadius: 2,
        border: theme.pillBorder,
        background: theme.pillBg,
        backdropFilter: "blur(10px)",
        boxShadow: theme.pillShadow,
        color: theme.pillText
      }}
    >
      {projectConfig ? (
        <Button
          size="small"
          color="inherit"
          startIcon={<projectConfig.icon />}
          endIcon={<KeyboardArrowDownRoundedIcon />}
          onClick={(event) => onOpenMenu(projectConfig.id, event.currentTarget)}
        >
          {t(projectConfig.labelKey)}
        </Button>
      ) : null}

      <Button size="small" color="inherit" startIcon={<SaveRoundedIcon />} onClick={onSaveScene}>
        {t("editor.top.save")}
      </Button>

      <Button size="small" color="inherit" startIcon={<DeleteSweepRoundedIcon />} onClick={onClearProject}>
        {t("editor.top.clear")}
      </Button>

      <Tooltip title={t("editor.project.aiLibraryTitle")}>
        <Button
          size="small"
          color="inherit"
          startIcon={<CollectionsRoundedIcon />}
          onClick={onOpenAiLibrary}
          sx={{
            minWidth: "auto"
          }}
        >
          {t("editor.project.aiLibraryTitle")}
          {aiLibraryAssetCount > 0 ? (
            <Stack
              component="span"
              sx={{
                ml: 0.55,
                minWidth: 18,
                height: 18,
                px: 0.45,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                background: theme.itemSelectedBg,
                color: theme.titleText,
                fontSize: 10,
                fontWeight: 700,
                lineHeight: 1
              }}
            >
              {aiLibraryAssetCount}
            </Stack>
          ) : null}
        </Button>
      </Tooltip>

      {actionConfigs.map((config) => (
        <Button
          key={config.id}
          size="small"
          color="inherit"
          startIcon={<config.icon />}
          endIcon={<KeyboardArrowDownRoundedIcon />}
          onClick={(event) => onOpenMenu(config.id, event.currentTarget)}
        >
          {t(config.labelKey)}
        </Button>
      ))}
    </Stack>
  );
}
