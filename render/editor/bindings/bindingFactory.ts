import type {
  EntityModel,
  GroupEntityModel,
  LightEntityModel,
  MeshEntityModel,
  ModelEntityModel
} from "../models";
import type { BindingContext, RenderBinding } from "./types";
import { createGroupBinding } from "./groupBinding";
import { createLightBinding } from "./lightBinding";
import { createMeshBinding } from "./meshBinding";
import { createModelBinding } from "./modelBinding";

export function createBinding(context: BindingContext, model: EntityModel): RenderBinding {
  if ("children" in model) {
    return createGroupBinding(context, model as GroupEntityModel);
  }
  if ("source" in model) {
    return createModelBinding(context, model as ModelEntityModel);
  }
  if ("meshType" in model) {
    return createMeshBinding(context, model as MeshEntityModel);
  }
  return createLightBinding(context, model as LightEntityModel);
}
