import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ViewQuiltRoundedIcon from "@mui/icons-material/ViewQuiltRounded";
import { IconButton, Tooltip } from "@mui/material";
import { SCENE_NODE_ID } from "@/render/editor";
import { STUDIO_RESETTABLE_ENTITY_ROLES } from "./constants";
import type { EditorThemeTokens, PropertyPanelContentProps, Translate } from "./types";

export function HeaderActionButton({
  icon,
  title,
  theme,
  t,
  onClick
}: {
  icon: React.ReactNode;
  title: Parameters<Translate>[0];
  theme: EditorThemeTokens;
  t: Translate;
  onClick: () => void;
}) {
  return (
    <Tooltip title={t(title)} arrow>
      <IconButton
        size="small"
        aria-label={t(title)}
        onClick={onClick}
        sx={{
          color: theme.mutedText,
          border: theme.sectionBorder,
          background: "transparent",
          "&:hover": {
            background: theme.iconButtonBg
          }
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}

export function StudioHeaderActions({
  app,
  selectedEntityId,
  studioEntityMetadata,
  studioScene,
  theme,
  t
}: Pick<
  PropertyPanelContentProps,
  "app" | "selectedEntityId" | "studioEntityMetadata" | "studioScene" | "theme" | "t"
>) {
  if (studioScene?.active && selectedEntityId === SCENE_NODE_ID) {
    return (
      <HeaderActionButton
        title="editor.studioScene.restorePost"
        onClick={() => app?.resetStudioScenePostProcessing()}
        icon={<RestartAltRoundedIcon sx={{ fontSize: 15 }} />}
        theme={theme}
        t={t}
      />
    );
  }

  if (studioScene?.active && studioEntityMetadata?.role === "root") {
    return (
      <>
        <HeaderActionButton
          title="editor.studioScene.restoreLayout"
          onClick={() => app?.resetStudioSceneGeneratedLayout()}
          icon={<ViewQuiltRoundedIcon sx={{ fontSize: 15 }} />}
          theme={theme}
          t={t}
        />
        <HeaderActionButton
          title="editor.studioScene.restoreLighting"
          onClick={() => app?.resetStudioSceneLighting()}
          icon={<LightbulbRoundedIcon sx={{ fontSize: 15 }} />}
          theme={theme}
          t={t}
        />
      </>
    );
  }

  if (
    studioScene?.active &&
    studioEntityMetadata?.hasDefaultSnapshot &&
    selectedEntityId &&
    STUDIO_RESETTABLE_ENTITY_ROLES.has(studioEntityMetadata.role)
  ) {
    return (
      <HeaderActionButton
        title="editor.studioScene.resetSelected"
        onClick={() => app?.resetStudioSceneEntity(selectedEntityId)}
        icon={<RestartAltRoundedIcon sx={{ fontSize: 15 }} />}
        theme={theme}
        t={t}
      />
    );
  }

  return null;
}
