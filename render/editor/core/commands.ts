import type {
  EditorCameraJSON,
  EditorLightJSON,
  EditorProjectJSON,
  SyncSource,
  TransformPatch
} from "./types";

export type MeshMaterialPatch = {
  color?: string;
  textureUrl?: string;
};

export type EditorCommand =
  | {
      type: "project.load";
      project: EditorProjectJSON;
    }
  | {
      type: "project.clear";
    }
  | {
      type: "model.import";
      file: File;
      source?: SyncSource;
    }
  | {
      type: "selection.set";
      entityId: string | null;
      source?: SyncSource;
    }
  | {
      type: "entity.remove";
      entityId: string;
      source?: SyncSource;
    }
  | {
      type: "entity.duplicate";
      entityId: string;
      source?: SyncSource;
    }
  | {
      type: "entity.lock";
      entityId: string;
      locked: boolean;
      source?: SyncSource;
    }
  | {
      type: "entity.visible";
      entityId: string;
      visible: boolean;
      source?: SyncSource;
    }
  | {
      type: "entity.transform";
      entityId: string;
      patch: TransformPatch;
      source?: SyncSource;
    }
  | {
      type: "camera.patch";
      patch: Partial<EditorCameraJSON>;
      source?: SyncSource;
    }
  | {
      type: "mesh.material";
      entityId: string;
      patch: MeshMaterialPatch;
      source?: SyncSource;
    }
  | {
      type: "mesh.create";
      geometryName: string;
      source?: SyncSource;
    }
  | {
      type: "light.patch";
      entityId: string;
      patch: Partial<EditorLightJSON>;
      source?: SyncSource;
    }
  | {
      type: "light.create";
      lightType: EditorLightJSON["type"];
      source?: SyncSource;
    };
