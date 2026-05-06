import { useEffect, useMemo, useState } from "react";
import type { DropdownMenuItem } from "@/components/common/dropdownMenu";
import type { EditorApp, LightPresetId } from "@/render/editor";
import { dropdownConfigs, lightOptions, lightPresetOptions } from "./constants";
import type { DropdownConfig, LightPresetOption, SelectOption, TopBarTranslate } from "./types";

type UseTopBarMenuOptions = {
  app: EditorApp | null;
  isPolyhavenEnabled: boolean;
  onCreateProject: () => Promise<void>;
  onImportLibraryHdri: () => void;
  onImportLibraryModel: () => void;
  onImportModel: () => void;
  onImportPano: () => void;
  onOpenProjectSelectDialog: () => Promise<void>;
  projectLoadVersion: number;
  t: TopBarTranslate;
};

type MenuOption = SelectOption | LightPresetOption;

export function useTopBarMenu({
  app,
  isPolyhavenEnabled,
  onCreateProject,
  onImportLibraryHdri,
  onImportLibraryModel,
  onImportModel,
  onImportPano,
  onOpenProjectSelectDialog,
  projectLoadVersion,
  t
}: UseTopBarMenuOptions) {
  const [activeMenuId, setActiveMenuId] = useState<DropdownConfig["id"] | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const activeConfig = dropdownConfigs.find((item) => item.id === activeMenuId) ?? null;

  const closeMenu = () => {
    setActiveMenuId(null);
    setAnchorEl(null);
  };

  const openMenu = (id: DropdownConfig["id"], anchor: HTMLElement) => {
    setActiveMenuId(id);
    setAnchorEl(anchor);
  };

  useEffect(() => {
    closeMenu();
  }, [projectLoadVersion]);

  const createMenuItem = (
    option: MenuOption,
    kind: "default" | "lightPreset" = "default",
    options?: {
      disabled?: boolean;
    }
  ): DropdownMenuItem => ({
    key: `${kind}:${option.value}`,
    label: t(option.labelKey),
    disabled: options?.disabled,
    onClick: async () => {
      if (!activeConfig) return;

      if (activeConfig.id === "project" && option.value === "new") {
        closeMenu();
        await onCreateProject();
        return;
      }

      if (activeConfig.id === "project" && option.value === "select") {
        closeMenu();
        await onOpenProjectSelectDialog();
        return;
      }

      if (activeConfig.id === "import") {
        if (option.value === "model") {
          onImportModel();
        } else if (option.value === "pano") {
          onImportPano();
        } else if (option.value === "libraryHdri") {
          onImportLibraryHdri();
        } else if (option.value === "libraryModel") {
          onImportLibraryModel();
        }
        closeMenu();
        return;
      }

      if (activeConfig.id === "camera" && app) {
        await app.dispatch({
          type: "camera.patch",
          patch: {
            type: option.value === "firstPerson" ? 2 : 1
          }
        });
      }

      if (activeConfig.id === "light" && app) {
        if (kind === "lightPreset") {
          await app.dispatch({
            type: "lightPreset.create",
            presetId: option.value as LightPresetId
          });
        } else {
          await app.dispatch({
            type: "light.create",
            lightType: option.value
          });
        }
      }

      if (activeConfig.id === "mesh" && app) {
        await app.dispatch({
          type: "mesh.create",
          geometryName: option.value
        });
      }

      closeMenu();
    }
  });

  const activeItems: DropdownMenuItem[] = useMemo(() => {
    if (!activeConfig) {
      return [];
    }

    if (activeConfig.id === "light") {
      return [
        {
          type: "section",
          key: "light-section",
          label: t("editor.light.section")
        },
        ...lightOptions.map((option) => createMenuItem(option)),
        {
          type: "divider",
          key: "light-divider"
        },
        {
          type: "section",
          key: "light-preset-section",
          label: t("editor.lightPreset.section")
        },
        ...lightPresetOptions.map((option) => createMenuItem(option, "lightPreset"))
      ];
    }

    return activeConfig.options.map((option) =>
      createMenuItem(option, "default", {
        disabled:
          (option.value === "libraryHdri" || option.value === "libraryModel") && !isPolyhavenEnabled
      })
    );
  }, [activeConfig, app, isPolyhavenEnabled, t]);

  return {
    activeItems,
    anchorEl,
    closeMenu,
    openMenu
  };
}
