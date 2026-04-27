import * as THREE from "three";

export const DEFAULT_EDITOR_TONE_MAPPING = THREE.ACESFilmicToneMapping;
export const DEFAULT_EDITOR_TONE_MAPPING_EXPOSURE = 1;

export type EditorTextureRole =
  | "color"
  | "emissive"
  | "normal"
  | "roughness"
  | "metalness"
  | "ao"
  | "environmentLdr"
  | "environmentHdr";

type TextureCarrier = Partial<
  Record<
    "map" | "emissiveMap" | "normalMap" | "roughnessMap" | "metalnessMap" | "aoMap",
    THREE.Texture | null
  >
>;

const SRGB_TEXTURE_ROLES = new Set<EditorTextureRole>(["color", "emissive", "environmentLdr"]);

export function configureRendererColorManagement(renderer: THREE.WebGLRenderer) {
  THREE.ColorManagement.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = DEFAULT_EDITOR_TONE_MAPPING;
  renderer.toneMappingExposure = DEFAULT_EDITOR_TONE_MAPPING_EXPOSURE;
}

export function applyTextureColorSpace(texture: THREE.Texture | null | undefined, role: EditorTextureRole) {
  if (!texture) return;

  if (role === "environmentHdr") {
    texture.colorSpace = THREE.LinearSRGBColorSpace;
  } else if (SRGB_TEXTURE_ROLES.has(role)) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else {
    texture.colorSpace = THREE.NoColorSpace;
  }

  texture.needsUpdate = true;
}

export function ensureSecondaryUvAttribute(geometry: THREE.BufferGeometry) {
  if (geometry.getAttribute("uv2")) return;
  const uv = geometry.getAttribute("uv");
  if (!uv) return;
  geometry.setAttribute("uv2", uv.clone());
}

export function normalizeMaterialColorSpaces(material: THREE.Material) {
  const textureCarrier = material as TextureCarrier;
  applyTextureColorSpace(textureCarrier.map, "color");
  applyTextureColorSpace(textureCarrier.emissiveMap, "emissive");
  applyTextureColorSpace(textureCarrier.normalMap, "normal");
  applyTextureColorSpace(textureCarrier.roughnessMap, "roughness");
  applyTextureColorSpace(textureCarrier.metalnessMap, "metalness");
  applyTextureColorSpace(textureCarrier.aoMap, "ao");

  if ("opacity" in material && typeof material.opacity === "number" && material.opacity < 1) {
    material.transparent = true;
  }

  material.needsUpdate = true;
}

export function normalizeObject3DMaterials(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    ensureSecondaryUvAttribute(object.geometry);

    if (Array.isArray(object.material)) {
      object.material.forEach((material) => normalizeMaterialColorSpaces(material));
      return;
    }

    if (object.material) {
      normalizeMaterialColorSpaces(object.material);
    }
  });
}
