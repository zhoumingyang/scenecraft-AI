import type { EditorEnvConfigJSON, EditorProjectJSON } from "../core/types";
import { SCENE_NODE_ID as SCENE_SELECTION_ID } from "../constants/scene";
import type { EditorProjectModel } from "../models";
import type { EditorSession } from "../session/editorSession";

export class EditorAppEnvironmentAssets {
  private readonly session: EditorSession;
  private readonly getProjectModel: () => EditorProjectModel | null;
  private readonly ownedEnvironmentUrls = new Set<string>();

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
    this.releaseUnusedEnvironmentUrls(projectJson.envConfig?.panoUrl ?? "");
  }

  beforeClearProject() {
    this.releaseUnusedEnvironmentUrls("");
  }

  beforeSceneEnvConfigPatch(patch: Partial<EditorEnvConfigJSON>) {
    if (patch.panoUrl !== undefined) {
      this.releaseUnusedEnvironmentUrls(patch.panoUrl);
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
      this.ownedEnvironmentUrls.add(nextUrl);
      this.releaseUnusedEnvironmentUrls(nextUrl);
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
    this.ownedEnvironmentUrls.forEach((url) => URL.revokeObjectURL(url));
    this.ownedEnvironmentUrls.clear();
  }

  private releaseUnusedEnvironmentUrls(activeUrl: string) {
    Array.from(this.ownedEnvironmentUrls).forEach((url) => {
      if (url === activeUrl || this.session.hasReferencedHistoryAssetUrl(url)) return;
      URL.revokeObjectURL(url);
      this.ownedEnvironmentUrls.delete(url);
    });
  }
}
