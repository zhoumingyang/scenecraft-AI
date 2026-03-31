import type { EditorCameraJSON } from "../core/types";
import { normalizeNumber } from "../utils/normalize";
import { BaseEntityModel } from "./baseEntity";

export class CameraModel extends BaseEntityModel {
  cameraType: number;
  fov: number;

  constructor(source?: EditorCameraJSON) {
    super("camera", source);
    this.cameraType = normalizeNumber(source?.type, 1);
    this.fov = normalizeNumber(source?.fov, 60);
  }

  patch(source: Partial<EditorCameraJSON>) {
    if (source.type !== undefined) {
      this.cameraType = normalizeNumber(source.type, this.cameraType);
    }
    if (source.fov !== undefined) {
      this.fov = normalizeNumber(source.fov, this.fov);
    }
    this.patchTransform(source);
  }
}
