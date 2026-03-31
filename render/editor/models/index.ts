export { BaseEntityModel } from "./baseEntity";
export { CameraModel } from "./cameraModel";
export { LightEntityModel } from "./lightEntityModel";
export { MeshEntityModel } from "./meshEntityModel";
export { ModelEntityModel } from "./modelEntityModel";
export { EditorProjectModel } from "./projectModel";

import type { LightEntityModel } from "./lightEntityModel";
import type { MeshEntityModel } from "./meshEntityModel";
import type { ModelEntityModel } from "./modelEntityModel";

export type EntityModel = ModelEntityModel | MeshEntityModel | LightEntityModel;
