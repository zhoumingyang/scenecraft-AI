import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import type { LightPresetId } from "@/render/editor";
import type { DropdownConfig, LightPresetOption, SelectOption } from "./types";

const projectOptions: SelectOption[] = [
  { value: "new", labelKey: "editor.project.new" },
  { value: "select", labelKey: "editor.project.select" }
];

const importOptions: SelectOption[] = [
  { value: "model", labelKey: "editor.import.model" },
  { value: "pano", labelKey: "editor.import.pano" },
  { value: "libraryHdri", labelKey: "editor.import.libraryHdri" },
  { value: "libraryModel", labelKey: "editor.import.libraryModel" }
];

const cameraOptions: SelectOption[] = [
  { value: "bird", labelKey: "editor.camera.birdView" },
  { value: "firstPerson", labelKey: "editor.camera.firstPerson" }
];

export const lightOptions: SelectOption[] = [
  { value: "ambient", labelKey: "editor.light.ambient" },
  { value: "hemisphere", labelKey: "editor.light.hemisphere" },
  { value: "directional", labelKey: "editor.light.directional" },
  { value: "point", labelKey: "editor.light.point" },
  { value: "spot", labelKey: "editor.light.spot" },
  { value: "rectArea", labelKey: "editor.light.rectArea" }
];

export const lightPresetOptions: LightPresetOption[] = [
  { value: "softDayInterior", labelKey: "editor.lightPreset.softDayInterior" },
  { value: "warmHome", labelKey: "editor.lightPreset.warmHome" },
  { value: "studioThreePoint", labelKey: "editor.lightPreset.studioThreePoint" },
  { value: "productShowcase", labelKey: "editor.lightPreset.productShowcase" },
  { value: "nightStreet", labelKey: "editor.lightPreset.nightStreet" },
  { value: "moonlightExterior", labelKey: "editor.lightPreset.moonlightExterior" }
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

export const dropdownConfigs: DropdownConfig[] = [
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

export function isLightPresetOption(value: string): value is LightPresetId {
  return lightPresetOptions.some((option) => option.value === value);
}
