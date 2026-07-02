import { Button, IconButton, Stack, Tooltip } from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import CollectionsRoundedIcon from "@mui/icons-material/CollectionsRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import RedoRoundedIcon from "@mui/icons-material/RedoRounded";
import type { EditorThemeTokens } from "@/components/editor/theme";
import type { EditorHistoryState } from "@/render/editor";
import type { DropdownConfig, TopBarTranslate } from "./types";

type TopBarActionBarProps = {
  aiLibraryAssetCount: number;
  historyState: EditorHistoryState;
  disabled?: boolean;
  disabledMenuIds?: DropdownConfig["id"][];
  saveDisabled?: boolean;
  exportDisabled?: boolean;
  clearDisabled?: boolean;
  dropdownConfigs: DropdownConfig[];
  onClearProject: () => void | Promise<void>;
  onRedo: () => void | Promise<void>;
  onOpenAiLibrary: () => void;
  onOpenMenu: (id: DropdownConfig["id"], anchor: HTMLElement) => void;
  onExportRender: () => void;
  onSaveScene: () => void;
  onUndo: () => void | Promise<void>;
  t: TopBarTranslate;
  theme: EditorThemeTokens;
};

export default function TopBarActionBar({
  aiLibraryAssetCount,
  historyState,
  disabled = false,
  disabledMenuIds = [],
  saveDisabled = disabled,
  exportDisabled = disabled,
  clearDisabled = disabled,
  dropdownConfigs,
  onClearProject,
  onRedo,
  onOpenAiLibrary,
  onOpenMenu,
  onExportRender,
  onSaveScene,
  onUndo,
  t,
  theme
}: TopBarActionBarProps) {
  const projectConfig = dropdownConfigs.find((config) => config.id === "project") ?? null;
  const actionConfigs = dropdownConfigs.filter((config) => config.id !== "project");
  const disabledMenuIdSet = new Set(disabledMenuIds);
  const iconButtonSx = {
    width: 32,
    height: 32,
    color: theme.pillText,
    border: theme.sectionBorder,
    background: theme.iconButtonBg,
    "&:hover": {
      background: theme.itemHoverBg
    },
    "&.Mui-disabled": {
      color: theme.mutedText,
      opacity: 0.48
    }
  } as const;

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
          disabled={disabled || disabledMenuIdSet.has(projectConfig.id)}
          startIcon={<projectConfig.icon />}
          endIcon={<KeyboardArrowDownRoundedIcon />}
          onClick={(event) => onOpenMenu(projectConfig.id, event.currentTarget)}
        >
          {t(projectConfig.labelKey)}
        </Button>
      ) : null}

      <Stack direction="row" spacing={0.4} alignItems="center">
        <Tooltip title={`${t("editor.history.undo")} (⌘Z)`}>
          <span>
            <IconButton
              size="small"
              aria-label={t("editor.history.undo")}
              disabled={disabled || !historyState.canUndo}
              onClick={onUndo}
              sx={iconButtonSx}
            >
              <UndoRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={`${t("editor.history.redo")} (⇧⌘Z)`}>
          <span>
            <IconButton
              size="small"
              aria-label={t("editor.history.redo")}
              disabled={disabled || !historyState.canRedo}
              onClick={onRedo}
              sx={iconButtonSx}
            >
              <RedoRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Button
        size="small"
        color="inherit"
        disabled={saveDisabled}
        startIcon={<SaveRoundedIcon />}
        onClick={onSaveScene}
      >
        {t("editor.top.save")}
      </Button>

      <Button
        size="small"
        color="inherit"
        disabled={exportDisabled}
        startIcon={<DownloadRoundedIcon />}
        onClick={onExportRender}
      >
        {t("editor.top.exportRender")}
      </Button>

      <Button
        size="small"
        color="inherit"
        disabled={clearDisabled}
        startIcon={<DeleteSweepRoundedIcon />}
        onClick={onClearProject}
      >
        {t("editor.top.clear")}
      </Button>

      <Tooltip title={t("editor.project.aiLibraryTitle")}>
        <Button
          size="small"
          color="inherit"
          disabled={disabled}
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
          disabled={disabled || disabledMenuIdSet.has(config.id)}
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
