import { create } from "zustand";
import type { EditorApp } from "@/render/editor";

type EditorStoreState = {
  app: EditorApp | null;
  selectedEntityId: string | null;
  projectVersion: number;
  projectLoadVersion: number;
  cameraVersion: number;
  viewStateVersion: number;
  setApp: (app: EditorApp | null) => void;
  setSelectedEntityId: (selectedEntityId: string | null) => void;
  bumpProjectVersion: () => void;
  bumpProjectLoadVersion: () => void;
  bumpCameraVersion: () => void;
  bumpViewStateVersion: () => void;
};

export const useEditorStore = create<EditorStoreState>((set) => ({
  app: null,
  selectedEntityId: null,
  projectVersion: 0,
  projectLoadVersion: 0,
  cameraVersion: 0,
  viewStateVersion: 0,
  setApp: (app) => set({ app }),
  setSelectedEntityId: (selectedEntityId) => set({ selectedEntityId }),
  bumpProjectVersion: () => set((state) => ({ projectVersion: state.projectVersion + 1 })),
  bumpProjectLoadVersion: () =>
    set((state) => ({
      projectLoadVersion: state.projectLoadVersion + 1
    })),
  bumpCameraVersion: () =>
    set((state) => ({
      cameraVersion: state.cameraVersion + 1
    })),
  bumpViewStateVersion: () =>
    set((state) => ({
      viewStateVersion: state.viewStateVersion + 1
    }))
}));
