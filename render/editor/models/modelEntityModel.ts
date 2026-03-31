import type { AssetUnit, EditorModelJSON, ModelFileFormat } from "../core/types";
import {
  assetUnitToMeters,
  normalizeAssetUnit,
  normalizeId,
  normalizeModelFormat,
  normalizePositiveNumber,
  normalizeString
} from "../utils/normalize";
import { BaseEntityModel } from "./baseEntity";

export class ModelEntityModel extends BaseEntityModel {
  source: string;
  format: ModelFileFormat;
  assetUnit: AssetUnit;
  assetImportScale: number;

  constructor(index: number, source: EditorModelJSON) {
    super(normalizeId("model", source.id, index), source);
    this.source = normalizeString(source.source);
    this.format = normalizeModelFormat(source.format, "glb");
    this.assetUnit = normalizeAssetUnit(source.assetUnit, "unknown");
    this.assetImportScale = normalizePositiveNumber(source.assetImportScale, 1);
  }

  getAssetScaleInMeters(): number {
    return assetUnitToMeters(this.assetUnit) * this.assetImportScale;
  }
}
