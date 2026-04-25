"use client";

import { ChangeEvent, ComponentType, useEffect, useMemo, useRef, useState } from "react";
import { Button, SvgIconProps, Stack } from "@mui/material";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import DeleteSweepRoundedIcon from "@mui/icons-material/DeleteSweepRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import DropdownMenu, { DropdownMenuItem } from "@/components/common/dropdownMenu";
import ProjectSaveDialog from "@/components/editor/projectSaveDialog";
import ProjectSaveProgressToast from "@/components/editor/projectSaveProgressToast";
import ProjectSelectDialog from "@/components/editor/projectSelectDialog";
import {
  applyUploadedAssetToProjectSnapshot,
  createClientUuid,
  dataUrlToFile,
  projectSnapshotUsesSourceUrl,
  readImageDimensions,
  syncEditorProjectSearchParam
} from "@/components/editor/projectPersistence";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { uploadPreparedAsset } from "@/frontend/api/assets";
import { createProject, getProject, listProjects, updateProject } from "@/frontend/api/projects";
import { createEmptyProjectAiLibrary } from "@/lib/project/schema";
import { useI18n, TranslationKey } from "@/lib/i18n";
import type {
  PrepareAssetUploadRequest,
  UploadedProjectAsset
} from "@/lib/api/contracts/assets";
import type { ProjectSummary } from "@/lib/api/contracts/projects";
import type {
  EditorProjectJSON,
  EditorProjectMetaJSON,
  LightPresetId,
  ProjectAiImageGenerationJSON,
  ProjectAiLibraryJSON
} from "@/render/editor";
import { createDefaultEditorProjectJSON, inferModelFileFormat } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";

type IconComponent = ComponentType<SvgIconProps>;

type SelectOption = {
  value: string;
  labelKey: TranslationKey;
};

const projectOptions: SelectOption[] = [
  { value: "new", labelKey: "editor.project.new" },
  { value: "select", labelKey: "editor.project.select" }
];

const importOptions: SelectOption[] = [
  { value: "model", labelKey: "editor.import.model" },
  { value: "pano", labelKey: "editor.import.pano" }
];

const cameraOptions: SelectOption[] = [
  { value: "bird", labelKey: "editor.camera.birdView" },
  { value: "firstPerson", labelKey: "editor.camera.firstPerson" }
];

const lightOptions: SelectOption[] = [
  { value: "ambient", labelKey: "editor.light.ambient" },
  { value: "hemisphere", labelKey: "editor.light.hemisphere" },
  { value: "directional", labelKey: "editor.light.directional" },
  { value: "point", labelKey: "editor.light.point" },
  { value: "spot", labelKey: "editor.light.spot" },
  { value: "rectArea", labelKey: "editor.light.rectArea" }
];

const lightPresetOptions: Array<{ value: LightPresetId; labelKey: TranslationKey }> = [
  { value: "softDayInterior", labelKey: "editor.lightPreset.softDayInterior" },
  { value: "warmHome", labelKey: "editor.lightPreset.warmHome" },
  { value: "studioThreePoint", labelKey: "editor.lightPreset.studioThreePoint" },
  { value: "productShowcase", labelKey: "editor.lightPreset.productShowcase" },
  { value: "nightStreet", labelKey: "editor.lightPreset.nightStreet" },
  { value: "moonlightExterior", labelKey: "editor.lightPreset.moonlightExterior" }
];

const meshOptions: SelectOption[] = [
  { value: "box", labelKey: "editor.mesh.box" },
  { value: "plane", labelKey: "editor.mesh.plane" },
  { value: "capsule", labelKey: "editor.mesh.capsule" },
  { value: "cone", labelKey: "editor.mesh.cone" },
  { value: "circle", labelKey: "editor.mesh.circle" },
  { value: "cylinder", labelKey: "editor.mesh.cylinder" },
  { value: "dodecahedron", labelKey: "editor.mesh.dodecahedron" },
  { value: "icosahedron", labelKey: "editor.mesh.icosahedron" },
  { value: "lathe", labelKey: "editor.mesh.lathe" },
  { value: "octahedron", labelKey: "editor.mesh.octahedron" },
  { value: "ring", labelKey: "editor.mesh.ring" },
  { value: "sphere", labelKey: "editor.mesh.sphere" },
  { value: "tetrahedron", labelKey: "editor.mesh.tetrahedron" },
  { value: "torus", labelKey: "editor.mesh.torus" },
  { value: "torusKnot", labelKey: "editor.mesh.torusKnot" },
  { value: "tube", labelKey: "editor.mesh.tube" }
];

type DropdownConfig = {
  id: "project" | "import" | "camera" | "light" | "mesh";
  labelKey: TranslationKey;
  icon: IconComponent;
  options: SelectOption[];
};

const dropdownConfigs: DropdownConfig[] = [
  {
    id: "project",
    labelKey: "editor.top.project",
    icon: FolderRoundedIcon,
    options: projectOptions
  },
  {
    id: "import",
    labelKey: "editor.top.import",
    icon: UploadFileRoundedIcon,
    options: importOptions
  },
  {
    id: "camera",
    labelKey: "editor.top.camera",
    icon: VideocamRoundedIcon,
    options: cameraOptions
  },
  {
    id: "light",
    labelKey: "editor.top.light",
    icon: LightModeRoundedIcon,
    options: lightOptions
  },
  {
    id: "mesh",
    labelKey: "editor.top.mesh",
    icon: GridViewRoundedIcon,
    options: meshOptions
  }
];

function cloneProjectSnapshot(snapshot: EditorProjectJSON) {
  if (typeof structuredClone === "function") {
    return structuredClone(snapshot);
  }

  return JSON.parse(JSON.stringify(snapshot)) as EditorProjectJSON;
}

async function sourceUrlToFile(sourceUrl: string, fileName: string, fallbackMimeType: string) {
  const response = await fetch(sourceUrl);
  const blob = await response.blob();
  return new File([blob], fileName, {
    type: blob.type || fallbackMimeType
  });
}

export default function TopBar() {
  const { t } = useI18n();
  const modelImportInputRef = useRef<HTMLInputElement | null>(null);
  const panoImportInputRef = useRef<HTMLInputElement | null>(null);
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const projectLoadVersion = useEditorStore((state) => state.projectLoadVersion);
  const currentProjectId = useEditorStore((state) => state.currentProjectId);
  const currentProjectMeta = useEditorStore((state) => state.currentProjectMeta);
  const loadedAiLibrary = useEditorStore((state) => state.loadedAiLibrary);
  const pendingAiImageGenerations = useEditorStore((state) => state.pendingAiImageGenerations);
  const localProjectAssets = useEditorStore((state) => state.localProjectAssets);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const hasUnsavedChanges = useEditorStore((state) => state.hasUnsavedChanges);
  const projectListDialogOpen = useEditorStore((state) => state.projectListDialogOpen);
  const projectSaveDialogOpen = useEditorStore((state) => state.projectSaveDialogOpen);
  const registerLocalProjectAsset = useEditorStore((state) => state.registerLocalProjectAsset);
  const clearLocalProjectAssets = useEditorStore((state) => state.clearLocalProjectAssets);
  const clearPendingAiGenerations = useEditorStore((state) => state.clearPendingAiGenerations);
  const setCurrentProject = useEditorStore((state) => state.setCurrentProject);
  const setProjectMeta = useEditorStore((state) => state.setProjectMeta);
  const setLoadedAiLibrary = useEditorStore((state) => state.setLoadedAiLibrary);
  const markUnsavedChanges = useEditorStore((state) => state.markUnsavedChanges);
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
  const setProjectListDialogOpen = useEditorStore((state) => state.setProjectListDialogOpen);
  const setProjectSaveDialogOpen = useEditorStore((state) => state.setProjectSaveDialogOpen);
  const [activeMenuId, setActiveMenuId] = useState<DropdownConfig["id"] | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isProjectListLoading, setIsProjectListLoading] = useState(false);
  const [projectListError, setProjectListError] = useState<string | null>(null);
  const theme = getEditorThemeTokens(editorThemeMode);

  const activeConfig = dropdownConfigs.find((item) => item.id === activeMenuId) || null;
  const isSaving = saveStatus.phase === "saving";

  useEffect(() => {
    closeMenu();
  }, [projectLoadVersion]);

  const openMenu = (id: DropdownConfig["id"], anchor: HTMLElement) => {
    setActiveMenuId(id);
    setAnchorEl(anchor);
  };

  const closeMenu = () => {
    setActiveMenuId(null);
    setAnchorEl(null);
  };

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

  const onImportModel = () => {
    modelImportInputRef.current?.click();
  };

  const onImportPano = () => {
    panoImportInputRef.current?.click();
  };

  const onImportModelFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!app || !file) return;
    if (!inferModelFileFormat(file.name)) return;

    const imported = await app.importModel(file);
    if (!imported) {
      return;
    }

    registerLocalProjectAsset({
      sourceUrl: imported.sourceUrl,
      file,
      kind: "model_source",
      targetPath: `model:${imported.entityId}`,
      entityId: imported.entityId
    });
  };

  const onImportPanoFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!app || !file) return;

    if (file.name.toLowerCase().endsWith(".hdr")) {
      try {
        const imported = await app.importPanorama(file);
        if (imported?.sourceUrl) {
          registerLocalProjectAsset({
            sourceUrl: imported.sourceUrl,
            file,
            kind: "environment_image",
            targetPath: "env:pano"
          });
        }
      } catch {
        window.alert(t("editor.import.panoLoadError"));
      }
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    try {
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
          URL.revokeObjectURL(imageUrl);
        };
        image.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error("invalid image"));
        };
        image.src = imageUrl;
      });

      if (dimensions.width !== dimensions.height * 2) {
        window.alert(t("editor.import.panoRatioError"));
        return;
      }

      const imported = await app.importPanorama(file);
      if (imported?.sourceUrl) {
        registerLocalProjectAsset({
          sourceUrl: imported.sourceUrl,
          file,
          kind: "environment_image",
          targetPath: "env:pano"
        });
      }
    } catch {
      window.alert(t("editor.import.panoLoadError"));
    }
  };

  const uploadSceneLocalAssets = async (
    snapshot: EditorProjectJSON,
    projectId: string
  ): Promise<UploadedProjectAsset[]> => {
    const usedAssets = localProjectAssets.filter((asset) =>
      projectSnapshotUsesSourceUrl(snapshot, asset.sourceUrl)
    );

    const uploadedAssets = await Promise.all(
      usedAssets.map(async (asset) => {
        const request: PrepareAssetUploadRequest = {
          assetId: createClientUuid("asset"),
          projectId,
          kind: asset.kind,
          fileName: asset.file.name,
          contentType: asset.file.type || "application/octet-stream",
          sizeBytes: asset.file.size,
          metadata: {
            targetPath: asset.targetPath,
            entityId: asset.entityId ?? null
          }
        };
        const uploaded = await uploadPreparedAsset(request, asset.file);
        applyUploadedAssetToProjectSnapshot(snapshot, asset.sourceUrl, uploaded);
        return uploaded;
      })
    );

    return uploadedAssets;
  };

  const uploadPendingAiGenerations = async (
    snapshot: EditorProjectJSON,
    projectId: string
  ): Promise<{ aiSnapshot: ProjectAiLibraryJSON; uploadedAssets: UploadedProjectAsset[] }> => {
    if (pendingAiImageGenerations.length === 0) {
      return {
        aiSnapshot: loadedAiLibrary,
        uploadedAssets: []
      };
    }

    const uploadedAssets: UploadedProjectAsset[] = [];
    const savedGenerations: ProjectAiImageGenerationJSON[] = [];

    for (const generation of pendingAiImageGenerations) {
      const uploadedReferenceImages = [];
      for (let index = 0; index < generation.referenceImages.length; index += 1) {
        const image = generation.referenceImages[index];
        const file = await dataUrlToFile(image.dataUrl, image.fileName, image.mimeType);
        const uploaded = await uploadPreparedAsset(
          {
            assetId: createClientUuid("asset"),
            projectId,
            kind: "ai_reference_image",
            fileName: file.name,
            contentType: file.type || image.mimeType,
            sizeBytes: file.size,
            metadata: {
              generationId: generation.id,
              slot: index
            }
          },
          file
        );
        uploadedAssets.push(uploaded);
        uploadedReferenceImages.push({
          assetId: uploaded.assetId,
          url: uploaded.url,
          mimeType: uploaded.mimeType,
          originalName: uploaded.originalName,
          sizeBytes: uploaded.sizeBytes
        });
      }

      const uploadedResults = [];
      for (let index = 0; index < generation.results.length; index += 1) {
        const result = generation.results[index];
        const file = await sourceUrlToFile(result.sourceUrl, result.fileName, result.mimeType);
        const uploaded = await uploadPreparedAsset(
          {
            assetId: createClientUuid("asset"),
            projectId,
            kind: "ai_generated_image",
            fileName: file.name,
            contentType: file.type || result.mimeType,
            sizeBytes: file.size,
            metadata: {
              generationId: generation.id,
              resultId: result.id,
              index
            }
          },
          file
        );
        uploadedAssets.push(uploaded);
        applyUploadedAssetToProjectSnapshot(snapshot, result.sourceUrl, uploaded);
        uploadedResults.push({
          id: result.id,
          assetId: uploaded.assetId,
          url: uploaded.url,
          mimeType: uploaded.mimeType,
          originalName: uploaded.originalName,
          sizeBytes: uploaded.sizeBytes,
          appliedMeshIds: result.appliedMeshIds
        });
      }

      savedGenerations.push({
        id: generation.id,
        createdAt: generation.createdAt,
        prompt: generation.prompt,
        model: generation.model,
        seed: generation.seed,
        imageSize: generation.imageSize,
        cfg: generation.cfg,
        inferenceSteps: generation.inferenceSteps,
        traceId: generation.traceId,
        referenceImages: uploadedReferenceImages,
        results: uploadedResults
      });
    }

    return {
      aiSnapshot: {
        version: 1,
        imageGenerations: [...loadedAiLibrary.imageGenerations, ...savedGenerations]
      },
      uploadedAssets
    };
  };

  const uploadProjectThumbnail = async (
    snapshot: EditorProjectJSON,
    projectId: string
  ): Promise<UploadedProjectAsset> => {
    if (!app) {
      throw new Error("Editor is not ready.");
    }

    const thumbnailDataUrl = app.captureViewportImage();
    const dimensions = await readImageDimensions(thumbnailDataUrl);
    const file = await dataUrlToFile(thumbnailDataUrl, `thumbnail-${projectId}.png`);
    const uploaded = await uploadPreparedAsset(
      {
        assetId: createClientUuid("asset"),
        projectId,
        kind: "project_thumbnail",
        fileName: file.name,
        contentType: file.type || "image/png",
        sizeBytes: file.size,
        metadata: {
          width: dimensions.width,
          height: dimensions.height
        }
      },
      file
    );

    snapshot.thumbnail = {
      assetId: uploaded.assetId,
      url: uploaded.url,
      mimeType: uploaded.mimeType,
      originalName: uploaded.originalName,
      sizeBytes: uploaded.sizeBytes,
      width: dimensions.width,
      height: dimensions.height,
      capturedAt: new Date().toISOString(),
      camera: snapshot.camera ?? {}
    };

    return uploaded;
  };

  const executeSave = async (meta: EditorProjectMetaJSON) => {
    if (!app) {
      return;
    }

    const currentSnapshot = app.getProjectJSON();
    if (!currentSnapshot) {
      return;
    }

    const snapshot = cloneProjectSnapshot(currentSnapshot);
    const projectId = snapshot.id;
    snapshot.meta = meta;
    setSaveStatus({
      phase: "saving",
      message: t("editor.project.saving"),
      updatedAt: Date.now()
    });
    setProjectSaveDialogOpen(false);

    try {
      const uploadedSceneAssets = await uploadSceneLocalAssets(snapshot, projectId);
      const thumbnailAsset = await uploadProjectThumbnail(snapshot, projectId);
      const uploadedAi = await uploadPendingAiGenerations(snapshot, projectId);
      const uploadedAssets = [...uploadedSceneAssets, thumbnailAsset, ...uploadedAi.uploadedAssets];
      const payload = {
        snapshot,
        aiSnapshot: uploadedAi.aiSnapshot,
        uploadedAssets
      };

      const response = currentProjectId
        ? await updateProject(currentProjectId, payload)
        : await createProject(payload);

      await app.dispatch({
        type: "project.load",
        project: response.project.snapshot
      });
      setCurrentProject(response.project.id);
      setProjectMeta(response.project.snapshot.meta ?? meta);
      setLoadedAiLibrary(response.project.aiSnapshot);
      clearPendingAiGenerations();
      clearLocalProjectAssets();
      markUnsavedChanges(false);
      setSaveStatus({
        phase: "success",
        message: t("editor.project.saveSuccess"),
        updatedAt: Date.now()
      });
      syncEditorProjectSearchParam(response.project.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("editor.project.saveFailed");
      setSaveStatus({
        phase: "error",
        message,
        updatedAt: Date.now()
      });
    }
  };

  const onSaveScene = () => {
    if (isSaving) {
      return;
    }

    if (!currentProjectId) {
      setProjectSaveDialogOpen(true);
      return;
    }

    void executeSave(
      currentProjectMeta ?? {
        title: t("editor.project.untitled")
      }
    );
  };

  const onCreateProject = async () => {
    if (!app) return;
    const project = createDefaultEditorProjectJSON();
    await app.dispatch({
      type: "project.load",
      project
    });
    setCurrentProject(null);
    setProjectMeta(project.meta ?? null);
    setLoadedAiLibrary(createEmptyProjectAiLibrary());
    clearPendingAiGenerations();
    clearLocalProjectAssets();
    syncEditorProjectSearchParam(null);
    setSaveStatus({
      phase: "idle",
      message: null,
      updatedAt: Date.now()
    });
  };

  const onClearProject = async () => {
    if (!app) return;
    await app.dispatch({ type: "project.clear" });
    markUnsavedChanges(true);
  };

  const openProjectSelectDialog = async () => {
    closeMenu();
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

    try {
      const response = await getProject(projectId);
      await app.dispatch({
        type: "project.load",
        project: response.project.snapshot
      });
      setCurrentProject(response.project.id);
      setProjectMeta(response.project.snapshot.meta ?? null);
      setLoadedAiLibrary(response.project.aiSnapshot);
      clearPendingAiGenerations();
      clearLocalProjectAssets();
      markUnsavedChanges(false);
      syncEditorProjectSearchParam(response.project.id);
      setProjectListDialogOpen(false);
      setSaveStatus({
        phase: "idle",
        message: null,
        updatedAt: Date.now()
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("editor.project.loadFailed");
      setProjectListError(message);
    }
  };

  const createMenuItem = (
    option: SelectOption | { value: LightPresetId; labelKey: TranslationKey },
    kind: "default" | "lightPreset" = "default"
  ): DropdownMenuItem => ({
    key: `${kind}:${option.value}`,
    label: t(option.labelKey),
    onClick: async () => {
      if (!activeConfig) return;

      if (activeConfig.id === "project" && option.value === "new") {
        await onCreateProject();
        closeMenu();
        return;
      }

      if (activeConfig.id === "project" && option.value === "select") {
        await openProjectSelectDialog();
        return;
      }

      if (activeConfig.id === "import") {
        if (option.value === "model") onImportModel();
        if (option.value === "pano") onImportPano();
        closeMenu();
        return;
      }

      if (activeConfig.id === "camera" && app) {
        await app.dispatch({
          type: "camera.patch",
          patch: {
            type: option.value === "firstPerson" ? 2 : 1
          }
        });
      }

      if (activeConfig.id === "light" && app) {
        if (kind === "lightPreset") {
          await app.dispatch({
            type: "lightPreset.create",
            presetId: option.value as LightPresetId
          });
        } else {
          await app.dispatch({
            type: "light.create",
            lightType: option.value
          });
        }
      }

      if (activeConfig.id === "mesh" && app) {
        await app.dispatch({
          type: "mesh.create",
          geometryName: option.value
        });
      }

      closeMenu();
    }
  });

  const activeItems: DropdownMenuItem[] = useMemo(
    () =>
      !activeConfig
        ? []
        : activeConfig.id === "light"
          ? [
              {
                type: "section",
                key: "light-section",
                label: t("editor.light.section")
              },
              ...lightOptions.map((option) => createMenuItem(option)),
              {
                type: "divider",
                key: "light-divider"
              },
              {
                type: "section",
                key: "light-preset-section",
                label: t("editor.lightPreset.section")
              },
              ...lightPresetOptions.map((option) => createMenuItem(option, "lightPreset"))
            ]
          : activeConfig.options.map((option) => createMenuItem(option)),
    [activeConfig, app, t]
  );

  return (
    <>
      <input
        ref={modelImportInputRef}
        type="file"
        accept=".gltf,.glb,.fbx,.obj,.vrm"
        onChange={onImportModelFile}
        style={{ display: "none" }}
      />
      <input
        ref={panoImportInputRef}
        type="file"
        accept="image/*,.hdr"
        onChange={onImportPanoFile}
        style={{ display: "none" }}
      />

      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: "absolute",
          left: "50%",
          top: 16,
          transform: "translateX(-50%)",
          zIndex: 20,
          px: 1.2,
          py: 1,
          borderRadius: 2,
          border: theme.pillBorder,
          background: theme.pillBg,
          backdropFilter: "blur(10px)",
          boxShadow: theme.pillShadow,
          color: theme.pillText
        }}
      >
        {dropdownConfigs
          .filter((config) => config.id === "project")
          .map((config) => (
            <Button
              key={config.id}
              size="small"
              color="inherit"
              startIcon={<config.icon />}
              endIcon={<KeyboardArrowDownRoundedIcon />}
              onClick={(event) => openMenu(config.id, event.currentTarget)}
            >
              {t(config.labelKey)}
            </Button>
          ))}

        <Button size="small" color="inherit" startIcon={<SaveRoundedIcon />} onClick={onSaveScene}>
          {t("editor.top.save")}
        </Button>

        <Button size="small" color="inherit" startIcon={<DeleteSweepRoundedIcon />} onClick={onClearProject}>
          {t("editor.top.clear")}
        </Button>

        {dropdownConfigs
          .filter((config) => config.id !== "project")
          .map((config) => (
            <Button
              key={config.id}
              size="small"
              color="inherit"
              startIcon={<config.icon />}
              endIcon={<KeyboardArrowDownRoundedIcon />}
              onClick={(event) => openMenu(config.id, event.currentTarget)}
            >
              {t(config.labelKey)}
            </Button>
          ))}
      </Stack>

      <DropdownMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        items={activeItems}
        themeMode={editorThemeMode}
      />

      <ProjectSaveDialog
        open={projectSaveDialogOpen}
        initialMeta={currentProjectMeta}
        theme={theme}
        isSaving={isSaving}
        onClose={() => setProjectSaveDialogOpen(false)}
        onConfirm={(meta) => {
          void executeSave(meta);
        }}
      />

      <ProjectSelectDialog
        open={projectListDialogOpen}
        projects={projects}
        isLoading={isProjectListLoading}
        errorMessage={projectListError}
        theme={theme}
        onClose={() => setProjectListDialogOpen(false)}
        onSelectProject={(projectId) => {
          void onSelectProject(projectId);
        }}
      />

      <ProjectSaveProgressToast
        status={saveStatus}
        onClose={() =>
          setSaveStatus({
            phase: "idle",
            message: null,
            updatedAt: Date.now()
          })
        }
      />
    </>
  );
}
