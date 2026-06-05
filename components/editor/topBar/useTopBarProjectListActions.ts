import { useState } from "react";
import type { ProjectSummary } from "@/lib/api/contracts/projects";
import type { EditorApp, EditorProjectJSON } from "@/render/editor";
import type { EditorStoreState } from "@/stores/editorStore";
import { deleteProject, getProject, listProjects } from "@/frontend/api/projects";
import type { TopBarTranslate } from "./types";
import { createIdleSaveStatus, type PersistedProject } from "./topBarProjectActionUtils";

type UseTopBarProjectListActionsOptions = {
  app: EditorApp | null;
  applyPersistedProjectState: (project: PersistedProject) => void;
  currentProjectId: string | null;
  hasUnsavedChanges: boolean;
  loadDefaultProject: () => Promise<void>;
  prepareProjectForLoad: (project: PersistedProject) => EditorProjectJSON;
  runWithSceneLoading: <T>(task: () => Promise<T>) => Promise<T>;
  setProjectListDialogOpen: EditorStoreState["setProjectListDialogOpen"];
  setSaveStatus: EditorStoreState["setSaveStatus"];
  t: TopBarTranslate;
};

export function useTopBarProjectListActions({
  app,
  applyPersistedProjectState,
  currentProjectId,
  hasUnsavedChanges,
  loadDefaultProject,
  prepareProjectForLoad,
  runWithSceneLoading,
  setProjectListDialogOpen,
  setSaveStatus,
  t
}: UseTopBarProjectListActionsOptions) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isProjectListLoading, setIsProjectListLoading] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [projectListError, setProjectListError] = useState<string | null>(null);

  const loadProjectsForDialog = async () => {
    setProjectListError(null);
    setIsProjectListLoading(true);

    try {
      const response = await listProjects();
      setProjects(response.projects);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("editor.project.loadListFailed");
      setProjectListError(message);
    } finally {
      setIsProjectListLoading(false);
    }
  };

  const openProjectSelectDialog = async () => {
    setProjectListDialogOpen(true);
    await loadProjectsForDialog();
  };

  const onSelectProject = async (projectId: string) => {
    if (!app) {
      return;
    }

    if (hasUnsavedChanges && !window.confirm(t("editor.project.confirmDiscardChanges"))) {
      return;
    }

    setProjectListError(null);
    setProjectListDialogOpen(false);

    try {
      const response = await runWithSceneLoading(async () => {
        const projectResponse = await getProject(projectId);
        await app.dispatch({
          type: "project.load",
          project: prepareProjectForLoad(projectResponse.project)
        });
        return projectResponse;
      });

      applyPersistedProjectState(response.project);
      setSaveStatus(createIdleSaveStatus());
    } catch (error) {
      const message = error instanceof Error ? error.message : t("editor.project.loadFailed");
      setProjectListDialogOpen(true);
      setProjectListError(message);
    }
  };

  const onDeleteProject = async (projectId: string) => {
    const project = projects.find((item) => item.id === projectId) ?? null;
    const projectTitle = project?.title ?? t("editor.project.untitled");

    if (currentProjectId === projectId && hasUnsavedChanges) {
      if (!window.confirm(t("editor.project.confirmDiscardChanges"))) {
        return;
      }
    }

    if (!window.confirm(t("editor.project.deleteConfirm", { title: projectTitle }))) {
      return;
    }

    setProjectListError(null);
    setDeletingProjectId(projectId);

    try {
      await deleteProject(projectId);
      setProjects((current) => current.filter((item) => item.id !== projectId));

      if (currentProjectId === projectId) {
        await loadDefaultProject();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("editor.project.deleteFailed");
      setProjectListError(message);
    } finally {
      setDeletingProjectId(null);
    }
  };

  return {
    deletingProjectId,
    isProjectListLoading,
    onDeleteProject,
    onSelectProject,
    openProjectSelectDialog,
    projectListError,
    projects
  };
}
