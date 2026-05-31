import * as THREE from "three";

import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { ResolvedMeshMaterialJSON } from "../core/types";
import type { EditorProjectModel } from "../models";
import type {
  StudioProductMaterial,
  StudioProductProfile,
  StudioProductType
} from "./types";

type MaterialSample = {
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  emissiveIntensity: number;
  hasTexture: boolean;
};

const PRODUCT_TYPE_KEYWORDS: Array<{
  type: StudioProductType;
  keywords: string[];
}> = [
  { type: "tech", keywords: ["phone", "camera", "headphone", "speaker", "laptop", "watch", "device", "gadget", "tech", "电子", "手机", "相机", "耳机", "音箱"] },
  { type: "beauty", keywords: ["beauty", "cosmetic", "skincare", "serum", "cream", "lipstick", "perfume", "makeup", "美妆", "护肤", "口红", "香水"] },
  { type: "jewelry", keywords: ["jewelry", "ring", "necklace", "bracelet", "earring", "gold", "diamond", "珠宝", "戒指", "项链", "手链", "耳环"] },
  { type: "fashion", keywords: ["bag", "clothing", "shirt", "dress", "jacket", "fashion", "apparel", "服装", "衣服", "包", "裙", "外套"] },
  { type: "footwear", keywords: ["shoe", "sneaker", "boot", "heel", "footwear", "鞋", "靴"] },
  { type: "food", keywords: ["food", "drink", "coffee", "tea", "snack", "cake", "bottle", "食品", "饮料", "咖啡", "茶", "蛋糕"] },
  { type: "home", keywords: ["vase", "lamp", "decor", "home", "kitchen", "家居", "花瓶", "灯", "装饰", "厨房"] },
  { type: "furniture", keywords: ["chair", "table", "sofa", "cabinet", "shelf", "furniture", "椅", "桌", "沙发", "柜", "家具"] },
  { type: "toy", keywords: ["toy", "figure", "plush", "game", "玩具", "手办", "公仔"] }
];

const MATERIAL_KEYWORDS: Array<{
  material: StudioProductMaterial;
  keywords: string[];
}> = [
  { material: "metallic", keywords: ["metal", "steel", "aluminum", "gold", "silver", "chrome", "金属", "钢", "铝", "金", "银"] },
  { material: "glass", keywords: ["glass", "crystal", "transparent", "bottle", "玻璃", "水晶", "透明"] },
  { material: "fabric", keywords: ["fabric", "cloth", "cotton", "wool", "textile", "布", "棉", "毛", "纺织"] },
  { material: "leather", keywords: ["leather", "皮革", "真皮"] },
  { material: "wood", keywords: ["wood", "wooden", "oak", "walnut", "木", "橡木", "胡桃木"] },
  { material: "ceramic", keywords: ["ceramic", "porcelain", "stoneware", "陶瓷", "瓷"] },
  { material: "plastic", keywords: ["plastic", "rubber", "resin", "塑料", "橡胶", "树脂"] }
];

function normalizeSearchText(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function hasKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function inferProductTypeFromText(text: string): StudioProductType {
  return (
    PRODUCT_TYPE_KEYWORDS.find((entry) => hasKeyword(text, entry.keywords))?.type ??
    "generic"
  );
}

function inferMaterialFromText(text: string): StudioProductMaterial | null {
  return (
    MATERIAL_KEYWORDS.find((entry) => hasKeyword(text, entry.keywords))?.material ??
    null
  );
}

function sampleFromResolvedMaterial(
  material: ResolvedMeshMaterialJSON
): MaterialSample {
  return {
    color: material.color,
    roughness: material.roughness,
    metalness: material.metalness,
    opacity: material.opacity,
    emissiveIntensity: material.emissiveIntensity,
    hasTexture: Boolean(
      material.diffuseMap.url ||
        material.metalnessMap.url ||
        material.roughnessMap.url ||
        material.normalMap.url ||
        material.aoMap.url ||
        material.emissiveMap.url
    )
  };
}

function sampleFromThreeMaterial(material: THREE.Material): MaterialSample | null {
  const source = material as THREE.MeshStandardMaterial & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    map?: THREE.Texture | null;
  };
  if (!source.color) return null;

  return {
    color: `#${source.color.getHexString()}`,
    roughness: typeof source.roughness === "number" ? source.roughness : 0.8,
    metalness: typeof source.metalness === "number" ? source.metalness : 0,
    opacity: typeof source.opacity === "number" ? source.opacity : 1,
    emissiveIntensity:
      typeof source.emissiveIntensity === "number" ? source.emissiveIntensity : 0,
    hasTexture: Boolean(
      source.map ||
        source.metalnessMap ||
        source.roughnessMap ||
        source.normalMap ||
        source.aoMap ||
        source.emissiveMap
    )
  };
}

function collectThreeMaterialSamples(
  object: THREE.Object3D | null,
  samples: MaterialSample[]
) {
  object?.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const material = child.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => {
        const sample = sampleFromThreeMaterial(entry);
        if (sample) samples.push(sample);
      });
      return;
    }
    const sample = sampleFromThreeMaterial(material);
    if (sample) samples.push(sample);
  });
}

function collectEntityProfileInput(
  projectModel: EditorProjectModel,
  registry: BindingRegistry,
  entityId: string,
  output: {
    textParts: string[];
    samples: MaterialSample[];
  }
) {
  const record = projectModel.getEntityById(entityId);
  if (!record) return;

  output.textParts.push(record.item.label);
  const binding = registry.get(entityId);

  if (record.kind === "mesh") {
    output.textParts.push(record.item.geometryName);
    output.samples.push(sampleFromResolvedMaterial(record.item.material));
    collectThreeMaterialSamples(binding?.object ?? null, output.samples);
    return;
  }

  if (record.kind === "model") {
    output.textParts.push(record.item.source);
    collectThreeMaterialSamples(binding?.object ?? null, output.samples);
    return;
  }

  if (record.kind === "group") {
    collectThreeMaterialSamples(binding?.object ?? null, output.samples);
    projectModel.listDirectChildren(entityId).forEach((childId) => {
      collectEntityProfileInput(projectModel, registry, childId, output);
    });
  }
}

function inferMaterialFromSamples(
  samples: MaterialSample[]
): StudioProductMaterial {
  if (samples.length === 0) return "unknown";

  const avg = samples.reduce(
    (acc, sample) => {
      acc.roughness += sample.roughness;
      acc.metalness += sample.metalness;
      acc.opacity += sample.opacity;
      acc.emissiveIntensity += sample.emissiveIntensity;
      return acc;
    },
    { roughness: 0, metalness: 0, opacity: 0, emissiveIntensity: 0 }
  );
  avg.roughness /= samples.length;
  avg.metalness /= samples.length;
  avg.opacity /= samples.length;
  avg.emissiveIntensity /= samples.length;

  if (avg.opacity < 0.82) return "glass";
  if (avg.metalness > 0.45) return "metallic";
  if (avg.roughness < 0.36) return "glossy";
  if (avg.roughness > 0.72) return "matte";
  if (samples.some((sample) => sample.hasTexture)) return "mixed";
  return "plastic";
}

function isNeutralColor(hexColor: string) {
  const color = new THREE.Color(hexColor);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return hsl.s < 0.16 || hsl.l < 0.12 || hsl.l > 0.9;
}

function inferBrandColor(samples: MaterialSample[]) {
  const color = samples.find((sample) => !isNeutralColor(sample.color))?.color ?? null;
  return color ? `#${new THREE.Color(color).getHexString()}` : null;
}

export function suggestStudioProductProfile(
  projectModel: EditorProjectModel,
  registry: BindingRegistry,
  targetEntityId: string
): StudioProductProfile {
  const input = {
    textParts: [] as string[],
    samples: [] as MaterialSample[]
  };
  collectEntityProfileInput(projectModel, registry, targetEntityId, input);

  const text = normalizeSearchText(input.textParts);
  return {
    productType: inferProductTypeFromText(text),
    material: inferMaterialFromText(text) ?? inferMaterialFromSamples(input.samples),
    brandColor: inferBrandColor(input.samples)
  };
}

export const inferStudioProductProfile = suggestStudioProductProfile;
