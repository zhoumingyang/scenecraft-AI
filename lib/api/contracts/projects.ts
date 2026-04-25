import type { EditorProjectJSON, ProjectAiLibraryJSON } from "@/render/editor";
import type { UploadedProjectAsset } from "./assets";

export type ProjectSummary = {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  updatedAt: string;
  version: number;
};

export type ListProjectsResponse = {
  projects: ProjectSummary[];
};

export type GetProjectResponse = {
  project: {
    id: string;
    version: number;
    updatedAt: string;
    snapshot: EditorProjectJSON;
    aiSnapshot: ProjectAiLibraryJSON;
  };
};

export type SaveProjectRequest = {
  snapshot: EditorProjectJSON;
  aiSnapshot: ProjectAiLibraryJSON;
  uploadedAssets?: UploadedProjectAsset[];
};

export type SaveProjectResponse = {
  project: {
    id: string;
    version: number;
    updatedAt: string;
    snapshot: EditorProjectJSON;
    aiSnapshot: ProjectAiLibraryJSON;
  };
};
