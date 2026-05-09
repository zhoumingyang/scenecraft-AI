export const EXTERNAL_ASSET_PROVIDER_IDS = ["polyhaven"] as const;
export const EXTERNAL_ASSET_TYPES = ["hdri", "texture", "model"] as const;

export type ExternalAssetProviderId = (typeof EXTERNAL_ASSET_PROVIDER_IDS)[number];
export type ExternalAssetType = (typeof EXTERNAL_ASSET_TYPES)[number];
export type SupportedMaterialTextureField =
  | "diffuseMap"
  | "metalnessMap"
  | "roughnessMap"
  | "normalMap"
  | "aoMap"
  | "emissiveMap";

export type ExternalAssetFileOption = {
  url: string;
  fileName: string;
  resolution: string;
  format: string;
  sizeBytes: number | null;
  md5: string | null;
  label: string;
};

export type ExternalAssetIncludedFile = {
  path: string;
  url: string;
  sizeBytes?: number | null;
  md5?: string | null;
};

export type SupportedExternalModelFormat = "gltf" | "fbx";

export type ExternalModelFileOption = ExternalAssetFileOption & {
  format: SupportedExternalModelFormat;
  includes: ExternalAssetIncludedFile[];
};

export type ExternalAssetSourceJSON = {
  provider: ExternalAssetProviderId;
  assetId: string;
  assetType: ExternalAssetType;
  displayName: string;
  pageUrl: string;
  licenseLabel: string;
  authorLabel: string;
  selectedFile: {
    url: string;
    fileName: string;
    sizeBytes?: number | null;
    md5?: string | null;
    includes?: ExternalAssetIncludedFile[];
  };
  resolution: string;
  format: string;
};

export type ExternalAssetListItem = {
  provider: ExternalAssetProviderId;
  assetId: string;
  assetType: ExternalAssetType;
  displayName: string;
  thumbnailUrl: string;
  categories: string[];
  tags: string[];
  authorLabel: string;
  licenseLabel: string;
  pageUrl: string;
  downloadCount: number;
  maxResolutionLabel: string;
};

export type ExternalAssetCategoryOption = {
  value: string;
  label: string;
  assetCount: number;
};

export type ExternalAssetTextureMap = {
  mapKey: string;
  displayName: string;
  materialField: SupportedMaterialTextureField;
  fileOptions: ExternalAssetFileOption[];
};

export type ExternalHdriAssetDetail = ExternalAssetListItem & {
  assetType: "hdri";
  tonemappedUrl: string | null;
  fileOptions: ExternalAssetFileOption[];
};

export type ExternalTextureAssetDetail = ExternalAssetListItem & {
  assetType: "texture";
  textureMaps: ExternalAssetTextureMap[];
  availableResolutions: string[];
  availableFormats: string[];
};

export type ExternalModelAssetDetail = ExternalAssetListItem & {
  assetType: "model";
  lods?: number[];
  modelFiles: ExternalModelFileOption[];
  availableResolutions: string[];
  availableFormats: SupportedExternalModelFormat[];
};

export type ExternalAssetDetail =
  | ExternalHdriAssetDetail
  | ExternalTextureAssetDetail
  | ExternalModelAssetDetail;

export type ExternalAssetListResult = {
  provider: ExternalAssetProviderId;
  assetType: ExternalAssetType;
  page: number;
  pageSize: number;
  total: number;
  items: ExternalAssetListItem[];
};

export type ExternalAssetProvider = {
  listAssets(input: {
    assetType: ExternalAssetType;
    category?: string | null;
    query?: string | null;
    page?: number;
    pageSize?: number;
  }): Promise<ExternalAssetListResult>;
  listCategories(assetType: ExternalAssetType): Promise<ExternalAssetCategoryOption[]>;
  getAssetDetail(input: {
    assetId: string;
    assetType: ExternalAssetType;
  }): Promise<ExternalAssetDetail>;
};

export function isSupportedMaterialTextureField(
  value: string
): value is SupportedMaterialTextureField {
  return (
    value === "diffuseMap" ||
    value === "metalnessMap" ||
    value === "roughnessMap" ||
    value === "normalMap" ||
    value === "aoMap" ||
    value === "emissiveMap"
  );
}
