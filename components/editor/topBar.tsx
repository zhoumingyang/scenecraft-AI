"use client";

import { ComponentType, useRef, useState } from "react";
import {
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  Stack,
  SvgIconProps
} from "@mui/material";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { useI18n, TranslationKey } from "@/lib/i18n";

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

const gridOptions: SelectOption[] = [
  { value: "box", labelKey: "editor.grid.box" },
  { value: "capsule", labelKey: "editor.grid.capsule" },
  { value: "circle", labelKey: "editor.grid.circle" },
  { value: "cylinder", labelKey: "editor.grid.cylinder" }
];

type DropdownConfig = {
  id: "project" | "camera" | "light" | "grid";
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
    id: "grid",
    labelKey: "editor.top.grid",
    icon: GridViewRoundedIcon,
    options: gridOptions
  }
];

export default function TopBar() {
  const { t } = useI18n();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<DropdownConfig["id"] | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({
    camera: "bird",
    light: "ambient",
    grid: "box"
  });

  const activeConfig = dropdownConfigs.find((item) => item.id === activeMenuId) || null;

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

  const onSaveScene = () => {
    // Placeholder: save scene action.
  };

  const onClearScene = () => {
    // Placeholder: clear scene/reset action.
  };

  return (
    <>
      <input
        ref={importInputRef}
        type="file"
        accept=".gltf,.glb,.obj,.fbx,.stl,.ply,.dae,.3ds"
        onChange={() => {
          // Placeholder: capture selected model file.
        }}
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

        <ButtonGroup size="small" color="inherit" variant="outlined">
          <Button startIcon={<SaveRoundedIcon />} onClick={onSaveScene}>
            {t("editor.top.save")}
          </Button>
          <Button startIcon={<DeleteSweepRoundedIcon />} onClick={onClearScene}>
            {t("editor.top.clear")}
          </Button>
        </ButtonGroup>

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

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
        {activeConfig?.options.map((option) => (
          <MenuItem
            key={option.value}
            selected={selectedValues[activeConfig.id] === option.value}
            onClick={() => {
              if (activeConfig.id !== "project") {
                setSelectedValues((prev) => ({ ...prev, [activeConfig.id]: option.value }));
              }
              closeMenu();
            }}
          >
            {t(option.labelKey)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
