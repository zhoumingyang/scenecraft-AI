import type { EditorEnvConfigJSON, EditorProjectJSON } from "../core/types";
import { SCENE_NODE_ID as SCENE_SELECTION_ID } from "../constants/scene";
import type { EditorProjectModel } from "../models";
import type { EditorSession } from "../session/editorSession";

export class EditorAppEnvironmentAssets {
  private readonly session: EditorSession;
  private readonly getProjectModel: () => EditorProjectModel | null;
  private environmentUrl: string | null = null;

  constructor({
    session,
    getProjectModel
  }: {
    session: EditorSession;
    getProjectModel: () => EditorProjectModel | null;
  }) {
    this.session = session;
    this.getProjectModel = getProjectModel;
  }

  beforeLoadProject(projectJson: EditorProjectJSON) {
    this.revokeEnvironmentUrlIfChanged(projectJson.envConfig?.panoUrl ?? "");
  }

  beforeClearProject() {
    this.revokeEnvironmentUrl();
  }

  beforeSceneEnvConfigPatch(patch: Partial<EditorEnvConfigJSON>) {
    if (patch.panoUrl !== undefined) {
      this.revokeEnvironmentUrlIfChanged(patch.panoUrl);
    }
  }

  async importPanorama(file: File) {
    if (!this.getProjectModel()) return;
    const nextUrl = URL.createObjectURL(file);
    try {
      await this.session.updateSceneEnvConfig(
        {
          panoAssetId: "",
          panoAssetName: file.name,
          panoUrl: nextUrl,
          externalSource: null
        },
        "ui",
        { panoAssetName: file.name }
      );
      this.revokeEnvironmentUrl();
      this.environmentUrl = nextUrl;
      this.session.setSelectedEntity(SCENE_SELECTION_ID, "ui");
      return {
        sourceUrl: nextUrl
      };
    } catch (error) {
      URL.revokeObjectURL(nextUrl);
      throw error;
    }
  }

  dispose() {
    this.revokeEnvironmentUrl();
  }

  private revokeEnvironmentUrl() {
    if (!this.environmentUrl) return;
    if (this.environmentUrl.startsWith("blob:")) {
      URL.revokeObjectURL(this.environmentUrl);
    }
    this.environmentUrl = null;
  }

  private revokeEnvironmentUrlIfChanged(nextUrl: string) {
    if (!this.environmentUrl || this.environmentUrl === nextUrl) {
      return;
    }

    this.revokeEnvironmentUrl();
  }
}
