import type {
  ExternalAssetFileOption,
  ExternalModelAssetDetail,
  ExternalModelFileOption,
  ExternalAssetSourceJSON,
  ExternalHdriAssetDetail,
  ExternalTextureAssetDetail,
  ExternalAssetTextureMap,
  SupportedExternalModelFormat,
  SupportedMaterialTextureField
} from "./types";

type TextureImportSelection = {
  materialField: SupportedMaterialTextureField;
  file: ExternalAssetFileOption;
};

const PREFERRED_HDRI_RESOLUTIONS = ["2k", "1k", "4k", "8k", "16k"];
const PREFERRED_TEXTURE_RESOLUTIONS = ["2k", "4k", "1k", "8k", "16k"];
const PREFERRED_MODEL_RESOLUTIONS = ["2k", "4k", "1k", "8k", "16k"];

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function selectFirstMatchingValue(values: string[], preferredValues: string[]) {
  const normalizedValues = values.map(normalizeValue);
  for (const preferredValue of preferredValues) {
    const index = normalizedValues.indexOf(normalizeValue(preferredValue));
    if (index >= 0) {
      return values[index];
    }
  }

  return values[0] ?? "";
}

function selectPreferredFormat(
  fileOptions: ExternalAssetFileOption[],
  preferredFormats: string[],
  resolution: string
) {
  const matchingResolution = fileOptions.filter(
    (file) => normalizeValue(file.resolution) === normalizeValue(resolution)
  );
  const targetOptions = matchingResolution.length > 0 ? matchingResolution : fileOptions;

  for (const preferredFormat of preferredFormats) {
    const match = targetOptions.find((file) => normalizeValue(file.format) === normalizeValue(preferredFormat));
    if (match) {
      return match;
    }
  }

  return targetOptions[0] ?? null;
}

export function getPreferredHdriResolution(fileOptions: ExternalAssetFileOption[]) {
  return selectFirstMatchingValue(
    Array.from(new Set(fileOptions.map((file) => file.resolution))),
    PREFERRED_HDRI_RESOLUTIONS
  );
}

export function getPreferredHdriFormat(fileOptions: ExternalAssetFileOption[], resolution: string) {
  const match = selectPreferredFormat(fileOptions, ["hdr", "exr"], resolution);
  return match?.format ?? "";
}

export function selectHdriFile(
  fileOptions: ExternalAssetFileOption[],
  resolution: string,
  format: string
) {
  const exactMatch = fileOptions.find(
    (file) =>
      normalizeValue(file.resolution) === normalizeValue(resolution) &&
      normalizeValue(file.format) === normalizeValue(format)
  );

  if (exactMatch) {
    return exactMatch;
  }

  return selectPreferredFormat(fileOptions, [format, "hdr", "exr"], resolution);
}

export function getPreferredTextureResolution(detail: ExternalTextureAssetDetail) {
  return selectFirstMatchingValue(detail.availableResolutions, PREFERRED_TEXTURE_RESOLUTIONS);
}

export function getPreferredModelResolution(detail: ExternalModelAssetDetail) {
  return selectFirstMatchingValue(detail.availableResolutions, PREFERRED_MODEL_RESOLUTIONS);
}

export function getPreferredModelFormat(
  fileOptions: ExternalModelFileOption[],
  resolution: string
): SupportedExternalModelFormat | "" {
  const match = selectPreferredFormat(fileOptions, ["gltf", "fbx"], resolution);
  return (match?.format as SupportedExternalModelFormat | undefined) ?? "";
}

export function selectModelFile(
  fileOptions: ExternalModelFileOption[],
  resolution: string,
  format: SupportedExternalModelFormat | string
) {
  const exactMatch = fileOptions.find(
    (file) =>
      normalizeValue(file.resolution) === normalizeValue(resolution) &&
      normalizeValue(file.format) === normalizeValue(format)
  );

  if (exactMatch) {
    return exactMatch;
  }

  return selectPreferredFormat(fileOptions, [format, "gltf", "fbx"], resolution) as ExternalModelFileOption | null;
}

function getPreferredTextureFormats(materialField: SupportedMaterialTextureField) {
  if (materialField === "diffuseMap" || materialField === "emissiveMap") {
    return ["jpg", "png", "webp", "exr"];
  }

  return ["png", "jpg", "webp", "exr"];
}

function selectTextureFile(textureMap: ExternalAssetTextureMap, resolution: string) {
  return selectPreferredFormat(
    textureMap.fileOptions,
    getPreferredTextureFormats(textureMap.materialField),
    resolution
  );
}

export function selectTextureImportFiles(
  detail: ExternalTextureAssetDetail,
  resolution: string
): TextureImportSelection[] {
  return detail.textureMaps
    .map((textureMap) => {
      const file = selectTextureFile(textureMap, resolution);
      return file
        ? {
            materialField: textureMap.materialField,
            file
          }
        : null;
    })
    .filter((item): item is TextureImportSelection => item !== null);
}

export function createExternalAssetSource(
  detail: ExternalHdriAssetDetail | ExternalTextureAssetDetail | ExternalModelAssetDetail,
  file: ExternalAssetFileOption | ExternalModelFileOption
): ExternalAssetSourceJSON {
  return {
    provider: detail.provider,
    assetId: detail.assetId,
    assetType: detail.assetType,
    displayName: detail.displayName,
    pageUrl: detail.pageUrl,
    licenseLabel: detail.licenseLabel,
    authorLabel: detail.authorLabel,
    selectedFile: {
      url: file.url,
      fileName: file.fileName,
      sizeBytes: file.sizeBytes,
      md5: file.md5
    },
    resolution: file.resolution,
    format: file.format
  };
}
