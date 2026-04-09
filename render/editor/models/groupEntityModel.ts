import type { EditorGroupJSON } from "../core/types";
import { normalizeBoolean, normalizeId, normalizeString } from "../utils/normalize";
import { BaseEntityModel } from "./baseEntity";

export class GroupEntityModel extends BaseEntityModel {
  children: string[];
  visible: boolean;

  constructor(index: number, source: EditorGroupJSON) {
    super(normalizeId("group", source.id, index), source);
    this.children = Array.isArray(source.children)
      ? source.children
          .map((item) => normalizeString(item))
          .filter((item, itemIndex, list) => Boolean(item) && list.indexOf(item) === itemIndex)
      : [];
    this.visible = normalizeBoolean(source.visible, true);
  }
}
