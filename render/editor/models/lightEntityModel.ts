import type { EditorLightJSON } from "../core/types";
import {
  clampUnitInterval,
  normalizeColor,
  normalizeId,
  normalizeLightType,
  normalizeNumber
} from "../utils/normalize";
import { BaseEntityModel } from "./baseEntity";

export class LightEntityModel extends BaseEntityModel {
  lightType: number;
  color: string;
  groundColor: string;
  intensity: number;
  distance: number;
  decay: number;
  angle: number;
  penumbra: number;
  width: number;
  height: number;

  constructor(index: number, source: EditorLightJSON) {
    super(normalizeId("light", source.id, index), source);
    this.lightType = normalizeLightType(source.type);
    this.color = normalizeColor(source.color, "#ffffff");
    this.groundColor = normalizeColor(source.groundColor, "#2a3548");
    this.intensity = normalizeNumber(source.intensity, 1);
    this.distance = normalizeNumber(source.distance, 0);
    this.decay = normalizeNumber(source.decay, 2);
    this.angle = normalizeNumber(source.angle, Math.PI / 3);
    this.penumbra = clampUnitInterval(source.penumbra, 0);
    this.width = normalizeNumber(source.width, 1);
    this.height = normalizeNumber(source.height, 1);
  }

  patchLight(source: Partial<EditorLightJSON>) {
    if (source.color !== undefined) this.color = normalizeColor(source.color, this.color);
    if (source.groundColor !== undefined) {
      this.groundColor = normalizeColor(source.groundColor, this.groundColor);
    }
    if (source.intensity !== undefined) this.intensity = normalizeNumber(source.intensity, this.intensity);
    if (source.distance !== undefined) this.distance = normalizeNumber(source.distance, this.distance);
    if (source.decay !== undefined) this.decay = normalizeNumber(source.decay, this.decay);
    if (source.angle !== undefined) this.angle = normalizeNumber(source.angle, this.angle);
    if (source.penumbra !== undefined) this.penumbra = clampUnitInterval(source.penumbra, this.penumbra);
    if (source.width !== undefined) this.width = normalizeNumber(source.width, this.width);
    if (source.height !== undefined) this.height = normalizeNumber(source.height, this.height);
    this.patchTransform(source);
  }
}
