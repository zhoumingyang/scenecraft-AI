import type {
  GetProjectResponse,
  SaveProjectResponse
} from "@/lib/api/contracts/projects";
import type { ProjectSaveStatus } from "@/stores/editorStore";

export type PersistedProject =
  | GetProjectResponse["project"]
  | SaveProjectResponse["project"];

export function createIdleSaveStatus(): ProjectSaveStatus {
  return {
    phase: "idle",
    message: null,
    updatedAt: Date.now()
  };
}
