"use client";

import { ChangeEvent, ComponentType, useEffect, useRef, useState } from "react";
import { Button, Stack, SvgIconProps } from "@mui/material";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import DropdownMenu from "@/components/common/dropdownMenu";
import { useI18n, TranslationKey } from "@/lib/i18n";
import { createDefaultEditorProjectJSON, inferModelFileFormat } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";

type IconComponent = ComponentType<SvgIconProps>;

type SelectOption = {
  value: string;
  labelKey: TranslationKey;
};

const projectOptions: SelectOption[] = [
  { value: "new", labelKey: "editor.project.new" },
  { value: "select", labelKey: "editor.project.select" }
];

const cameraOptions: SelectOption[] = [
  { value: "bird", labelKey: "editor.camera.birdView" },
  { value: "firstPerson", labelKey: "editor.camera.firstPerson" }
];

const lightOptions: SelectOption[] = [
  { value: "ambient", labelKey: "editor.light.ambient" },
  { value: "directional", labelKey: "editor.light.directional" },
  { value: "point", labelKey: "editor.light.point" },
  { value: "spot", labelKey: "editor.light.spot" },
  { value: "rectArea", labelKey: "editor.light.rectArea" }
];

const meshOptions: SelectOption[] = [
  { value: "box", labelKey: "editor.mesh.box" },
  { value: "capsule", labelKey: "editor.mesh.capsule" },
  { value: "circle", labelKey: "editor.mesh.circle" },
  { value: "cylinder", labelKey: "editor.mesh.cylinder" }
];

type DropdownConfig = {
  id: "project" | "camera" | "light" | "mesh";
  labelKey: TranslationKey;
  icon: IconComponent;
  options: SelectOption[];
};

const dropdownConfigs: DropdownConfig[] = [
  {
    id: "project",
    labelKey: "editor.top.project",
    icon: FolderRoundedIcon,
    options: projectOptions
  },
  {
    id: "camera",
    labelKey: "editor.top.camera",
    icon: VideocamRoundedIcon,
    options: cameraOptions
  },
  {
    id: "light",
    labelKey: "editor.top.light",
    icon: LightModeRoundedIcon,
    options: lightOptions
  },
  {
    id: "mesh",
    labelKey: "editor.top.mesh",
    icon: GridViewRoundedIcon,
    options: meshOptions
  }
];

const defaultSelectedValues: Record<string, string> = {
  camera: "bird",
  light: "ambient",
  mesh: "box"
};

export default function TopBar() {
  const { t } = useI18n();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const app = useEditorStore((state) => state.app);
  const projectLoadVersion = useEditorStore((state) => state.projectLoadVersion);
  const [activeMenuId, setActiveMenuId] = useState<DropdownConfig["id"] | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(defaultSelectedValues);

  const activeConfig = dropdownConfigs.find((item) => item.id === activeMenuId) || null;

  useEffect(() => {
    setSelectedValues({ ...defaultSelectedValues });
    closeMenu();
  }, [projectLoadVersion]);

  useEffect(() => {
    if (!app) return;

    const cameraType = app.projectModel?.camera.cameraType;
    setSelectedValues((prev) => ({
      ...prev,
      camera: cameraType === 2 ? "firstPerson" : "bird"
    }));
  }, [app, projectLoadVersion]);

  const openMenu = (id: DropdownConfig["id"], anchor: HTMLElement) => {
    setActiveMenuId(id);
    setAnchorEl(anchor);
  };

  const closeMenu = () => {
    setActiveMenuId(null);
    setAnchorEl(null);
  };

  const onImportModel = () => {
    importInputRef.current?.click();
  };

  const onImportModelFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!app || !file) return;
    if (!inferModelFileFormat(file.name)) return;

    await app.dispatch({
      type: "model.import",
      file
    });
  };

  const onSaveScene = () => {
    // Placeholder: save scene action.
  };

  const onCreateProject = async () => {
    if (!app) return;
    await app.dispatch({
      type: "project.load",
      project: createDefaultEditorProjectJSON()
    });
  };

  const onClearProject = async () => {
    if (!app) return;
    await app.dispatch({ type: "project.clear" });
  };

  const activeItems =
    activeConfig?.options.map((option) => ({
      key: option.value,
      selected: selectedValues[activeConfig.id] === option.value,
      label: t(option.labelKey),
      onClick: async () => {
        if (activeConfig.id === "project" && option.value === "new") {
          await onCreateProject();
          closeMenu();
          return;
        }

        if (activeConfig.id !== "project") {
          setSelectedValues((prev) => ({ ...prev, [activeConfig.id]: option.value }));
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
          await app.dispatch({
            type: "light.create",
            lightType: option.value
          });
        }
        closeMenu();
      }
    })) || [];

  return (
    <>
      <input
        ref={importInputRef}
        type="file"
        accept=".gltf,.glb,.fbx,.obj"
        onChange={onImportModelFile}
        style={{ display: "none" }}
      />

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
          border: "1px solid rgba(180,205,255,0.3)",
          background: "rgba(8,12,24,0.72)",
          backdropFilter: "blur(10px)"
        }}
      >
        {dropdownConfigs
          .filter((config) => config.id === "project")
          .map((config) => (
            <Button
              key={config.id}
              size="small"
              color="inherit"
              startIcon={<config.icon />}
              endIcon={<KeyboardArrowDownRoundedIcon />}
              onClick={(event) => openMenu(config.id, event.currentTarget)}
            >
              {t(config.labelKey)}
            </Button>
          ))}

        <Button size="small" color="inherit" startIcon={<UploadFileRoundedIcon />} onClick={onImportModel}>
          {t("editor.top.import")}
        </Button>

        <Button size="small" color="inherit" startIcon={<SaveRoundedIcon />} onClick={onSaveScene}>
          {t("editor.top.save")}
        </Button>

        <Button size="small" color="inherit" startIcon={<DeleteSweepRoundedIcon />} onClick={onClearProject}>
          {t("editor.top.clear")}
        </Button>

        {dropdownConfigs
          .filter((config) => config.id !== "project")
          .map((config) => (
            <Button
              key={config.id}
              size="small"
              color="inherit"
              startIcon={<config.icon />}
              endIcon={<KeyboardArrowDownRoundedIcon />}
              onClick={(event) => openMenu(config.id, event.currentTarget)}
            >
              {t(config.labelKey)}
            </Button>
          ))}
      </Stack>

      <DropdownMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        items={activeItems}
      />
    </>
  );
}
