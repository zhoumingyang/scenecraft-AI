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

const importOptions: SelectOption[] = [
  { value: "model", labelKey: "editor.import.model" },
  { value: "pano", labelKey: "editor.import.pano" }
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
  { value: "plane", labelKey: "editor.mesh.plane" },
  { value: "capsule", labelKey: "editor.mesh.capsule" },
  { value: "cone", labelKey: "editor.mesh.cone" },
  { value: "circle", labelKey: "editor.mesh.circle" },
  { value: "cylinder", labelKey: "editor.mesh.cylinder" },
  { value: "dodecahedron", labelKey: "editor.mesh.dodecahedron" },
  { value: "icosahedron", labelKey: "editor.mesh.icosahedron" },
  { value: "lathe", labelKey: "editor.mesh.lathe" },
  { value: "octahedron", labelKey: "editor.mesh.octahedron" },
  { value: "ring", labelKey: "editor.mesh.ring" },
  { value: "sphere", labelKey: "editor.mesh.sphere" },
  { value: "tetrahedron", labelKey: "editor.mesh.tetrahedron" },
  { value: "torus", labelKey: "editor.mesh.torus" },
  { value: "torusKnot", labelKey: "editor.mesh.torusKnot" },
  { value: "tube", labelKey: "editor.mesh.tube" }
];

type DropdownConfig = {
  id: "project" | "import" | "camera" | "light" | "mesh";
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
    id: "import",
    labelKey: "editor.top.import",
    icon: UploadFileRoundedIcon,
    options: importOptions
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
  const modelImportInputRef = useRef<HTMLInputElement | null>(null);
  const panoImportInputRef = useRef<HTMLInputElement | null>(null);
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
    modelImportInputRef.current?.click();
  };

  const onImportPano = () => {
    panoImportInputRef.current?.click();
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

  const onImportPanoFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!app || !file) return;

    if (file.name.toLowerCase().endsWith(".hdr")) {
      try {
        await app.importPanorama(file);
      } catch {
        window.alert(t("editor.import.panoLoadError"));
      }
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    try {
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
          URL.revokeObjectURL(imageUrl);
        };
        image.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error("invalid image"));
        };
        image.src = imageUrl;
      });

      if (dimensions.width !== dimensions.height * 2) {
        window.alert(t("editor.import.panoRatioError"));
        return;
      }

      await app.importPanorama(file);
    } catch {
      window.alert(t("editor.import.panoLoadError"));
    }
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

        if (activeConfig.id === "import") {
          if (option.value === "model") onImportModel();
          if (option.value === "pano") onImportPano();
          closeMenu();
          return;
        }

        if (
          activeConfig.id === "camera" ||
          activeConfig.id === "light" ||
          activeConfig.id === "mesh"
        ) {
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
        if (activeConfig.id === "mesh" && app) {
          await app.dispatch({
            type: "mesh.create",
            geometryName: option.value
          });
        }
        closeMenu();
      }
    })) || [];

  return (
    <>
      <input
        ref={modelImportInputRef}
        type="file"
        accept=".gltf,.glb,.fbx,.obj"
        onChange={onImportModelFile}
        style={{ display: "none" }}
      />
      <input
        ref={panoImportInputRef}
        type="file"
        accept="image/*,.hdr"
        onChange={onImportPanoFile}
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
