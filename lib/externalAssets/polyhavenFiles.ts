import type {
  ExternalAssetFileOption,
  ExternalAssetIncludedFile,
  ExternalAssetTextureMap,
  ExternalModelFileOption,
  SupportedExternalModelFormat,
  SupportedMaterialTextureField
} from "./types";
import type {
  PolyhavenFileLeaf,
  PolyhavenModelFilesResponse,
  PolyhavenTextureFilesResponse
} from "./polyhavenShared";
import {
  compareFileOptions,
  humanizeIdentifier,
  normalizeResolutionRank
} from "./polyhavenShared";

const TEXTURE_MAP_PRIORITY: Array<{
  materialField: SupportedMaterialTextureField;
  candidates: string[];
}> = [
  {
    materialField: "diffuseMap",
    candidates: ["basecolor", "albedo", "diffuse", "color", "col"]
  },
  {
    materialField: "roughnessMap",
    candidates: ["roughness", "rough"]
  },
  {
    materialField: "metalnessMap",
    candidates: ["metalness", "metallic", "metal"]
  },
  {
    materialField: "normalMap",
    candidates: ["nor_gl", "normal_gl", "normalgl", "normal", "nor_dx", "normal_dx"]
  },
  {
    materialField: "aoMap",
    candidates: ["ao", "ambientocclusion", "ambient_occlusion"]
  },
  {
    materialField: "emissiveMap",
    candidates: ["emissive", "emission", "emit"]
  }
];

function toFileOption(
  url: string,
  resolution: string,
  format: string,
  value: PolyhavenFileLeaf
): ExternalAssetFileOption {
  const fileName = decodeURIComponent(url.split("/").pop() ?? url);
  return {
    url,
    fileName,
    resolution,
    format,
    sizeBytes: typeof value.size === "number" ? value.size : null,
    md5: typeof value.md5 === "string" ? value.md5 : null,
    label: `${resolution.toUpperCase()} ${format.toUpperCase()}`
  };
}

export function extractFileOptions(tree: Record<string, Record<string, PolyhavenFileLeaf>> | undefined) {
  const options: ExternalAssetFileOption[] = [];

  if (!tree || typeof tree !== "object") {
    return options;
  }

  Object.entries(tree).forEach(([resolution, formats]) => {
    if (!formats || typeof formats !== "object") {
      return;
    }

    Object.entries(formats).forEach(([format, file]) => {
      if (!file || typeof file.url !== "string" || !file.url.trim()) {
        return;
      }

      options.push(toFileOption(file.url, resolution, format, file));
    });
  });

  return options.sort(compareFileOptions);
}

function toIncludedFile(path: string, value: PolyhavenFileLeaf): ExternalAssetIncludedFile | null {
  if (typeof value.url !== "string" || !value.url.trim()) {
    return null;
  }

  return {
    path,
    url: value.url,
    sizeBytes: typeof value.size === "number" ? value.size : null,
    md5: typeof value.md5 === "string" ? value.md5 : null
  };
}

function normalizeModelFormat(value: string): SupportedExternalModelFormat | null {
  if (value === "gltf" || value === "fbx") {
    return value;
  }

  return null;
}

export function extractModelFileOptions(files: PolyhavenModelFilesResponse): ExternalModelFileOption[] {
  const options: ExternalModelFileOption[] = [];

  Object.entries(files).forEach(([rawFormat, tree]) => {
    const format = normalizeModelFormat(rawFormat);
    if (!format || !tree || typeof tree !== "object") {
      return;
    }

    Object.entries(tree).forEach(([resolution, formats]) => {
      if (!formats || typeof formats !== "object") {
        return;
      }

      Object.values(formats).forEach((file) => {
        if (!file || typeof file.url !== "string" || !file.url.trim()) {
          return;
        }

        const includes = file.include && typeof file.include === "object"
          ? Object.entries(file.include)
              .map(([path, dependency]) => toIncludedFile(path, dependency))
              .filter((dependency): dependency is ExternalAssetIncludedFile => dependency !== null)
          : [];

        options.push({
          ...toFileOption(file.url, resolution, format, file),
          format,
          includes
        });
      });
    });
  });

  return options.sort(compareFileOptions);
}

function normalizeTextureMapKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function resolveTextureMaterialField(mapKey: string) {
  const normalizedMapKey = normalizeTextureMapKey(mapKey);

  for (const entry of TEXTURE_MAP_PRIORITY) {
    if (entry.candidates.includes(normalizedMapKey)) {
      return entry.materialField;
    }
  }

  return null;
}

export function buildTextureMaps(files: PolyhavenTextureFilesResponse): ExternalAssetTextureMap[] {
  const winners = new Map<SupportedMaterialTextureField, ExternalAssetTextureMap>();

  Object.entries(files).forEach(([rawMapKey, value]) => {
    if (!value || typeof value !== "object") {
      return;
    }

    const materialField = resolveTextureMaterialField(rawMapKey);
    if (!materialField) {
      return;
    }

    const fileOptions = extractFileOptions(
      value as Record<string, Record<string, PolyhavenFileLeaf>>
    );

    if (fileOptions.length === 0) {
      return;
    }

    const nextMap: ExternalAssetTextureMap = {
      mapKey: normalizeTextureMapKey(rawMapKey),
      displayName: humanizeIdentifier(rawMapKey),
      materialField,
      fileOptions
    };

    const current = winners.get(materialField);
    if (!current) {
      winners.set(materialField, nextMap);
      return;
    }

    const currentPriority = TEXTURE_MAP_PRIORITY.find((entry) => entry.materialField === materialField);
    const currentIndex = currentPriority?.candidates.indexOf(current.mapKey) ?? Number.MAX_SAFE_INTEGER;
    const nextIndex = currentPriority?.candidates.indexOf(nextMap.mapKey) ?? Number.MAX_SAFE_INTEGER;

    if (nextIndex < currentIndex) {
      winners.set(materialField, nextMap);
    }
  });

  return Array.from(winners.values()).sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export function listTextureResolutions(textureMaps: ExternalAssetTextureMap[]) {
  const resolutions = new Set<string>();
  textureMaps.forEach((textureMap) => {
    textureMap.fileOptions.forEach((file) => {
      resolutions.add(file.resolution);
    });
  });

  return Array.from(resolutions).sort(
    (left, right) => normalizeResolutionRank(left) - normalizeResolutionRank(right)
  );
}

export function listTextureFormats(textureMaps: ExternalAssetTextureMap[]) {
  const formats = new Set<string>();
  textureMaps.forEach((textureMap) => {
    textureMap.fileOptions.forEach((file) => {
      formats.add(file.format);
    });
  });

  return Array.from(formats).sort((left, right) => left.localeCompare(right));
}

export function listModelResolutions(modelFiles: ExternalModelFileOption[]) {
  return Array.from(new Set(modelFiles.map((file) => file.resolution))).sort(
    (left, right) => normalizeResolutionRank(left) - normalizeResolutionRank(right)
  );
}

export function listModelFormats(modelFiles: ExternalModelFileOption[]): SupportedExternalModelFormat[] {
  const winners = new Set<SupportedExternalModelFormat>();
  modelFiles.forEach((file) => {
    winners.add(file.format);
  });

  return Array.from(winners.values()).sort((left, right) => {
    if (left === right) {
      return 0;
    }

    if (left === "gltf") {
      return -1;
    }

    return 1;
  });
}
