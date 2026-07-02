import { getExternalAssetIncludedFiles } from "@/lib/externalAssets/source";
import type { ExternalAssetSourceJSON } from "@/lib/externalAssets/types";
import type { BindingRegistry } from "../bindings/bindingRegistry";
import type { EditorAppEvent } from "../core/events";
import type { EditorProjectJSON, ModelFileFormat, SyncSource } from "../core/types";
import type { EditorProjectModel } from "../models";
import type { EditorRuntime } from "../runtime/editorRuntime";
import { inferModelFileFormat } from "../utils/modelFile";
import { createDefaultModelLabel, createEntityId, getFileBaseName } from "./entityFactories";

type Emit = (event: EditorAppEvent) => void;

export class ModelImportSessionController {
  private readonly runtime: EditorRuntime;
  private readonly registry: BindingRegistry;
  private readonly emit: Emit;
  private readonly getProjectModel: () => EditorProjectModel | null;
  private readonly ensureProject: () => Promise<void>;
  private readonly setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
  private readonly isModelUrlRetained: (url: string) => boolean;
  private readonly ownedModelUrls = new Set<string>();

  constructor(options: {
    runtime: EditorRuntime;
    registry: BindingRegistry;
    emit: Emit;
    getProjectModel: () => EditorProjectModel | null;
    ensureProject: () => Promise<void>;
    setSelectedEntity: (entityId: string | null, source: SyncSource) => void;
    isModelUrlRetained?: (url: string) => boolean;
  }) {
    this.runtime = options.runtime;
    this.registry = options.registry;
    this.emit = options.emit;
    this.getProjectModel = options.getProjectModel;
    this.ensureProject = options.ensureProject;
    this.setSelectedEntity = options.setSelectedEntity;
    this.isModelUrlRetained = options.isModelUrlRetained ?? (() => false);
  }

  async importFile(file: File, source: SyncSource = "ui") {
    const format = inferModelFileFormat(file.name);
    if (!format) return null;

    await this.ensureProject();
    const projectModel = this.getProjectModel();
    if (!projectModel) return null;

    const objectUrl = URL.createObjectURL(file);
    this.ownedModelUrls.add(objectUrl);
    let asset;
    try {
      asset = await this.runtime.modelLoaderFactory.load(objectUrl, format);
    } catch (error) {
      this.runtime.modelLoaderFactory.release(objectUrl, format);
      URL.revokeObjectURL(objectUrl);
      this.ownedModelUrls.delete(objectUrl);
      throw error;
    }

    const model = projectModel.addModel({
      id: createEntityId("model"),
      label: getFileBaseName(file.name) || createDefaultModelLabel(projectModel.models.size),
      source: objectUrl,
      format,
      externalSource: null,
      assetUnit: "m",
      assetImportScale: 1,
      animations: asset.animations,
      activeAnimationId: asset.animations[0]?.id ?? null,
      animationTimeScale: 1,
      animationPlaybackState: asset.animations.length > 0 ? "playing" : "stopped"
    });

    this.registry.create(model);
    this.emit({
      type: "entityUpdated",
      entityId: model.id,
      entityKind: "model",
      source
    });
    this.setSelectedEntity(model.id, source);
    return {
      entityId: model.id,
      sourceUrl: objectUrl
    };
  }

  async importFromSource(
    input: {
      sourceUrl: string;
      format: ModelFileFormat;
      label: string;
      externalSource: ExternalAssetSourceJSON;
    },
    source: SyncSource = "ui"
  ) {
    await this.ensureProject();
    const projectModel = this.getProjectModel();
    if (!projectModel) return null;

    const asset = await this.runtime.modelLoaderFactory.load(input.sourceUrl, input.format, {
      includedFiles: getExternalAssetIncludedFiles(input.externalSource)
    });
    const model = projectModel.addModel({
      id: createEntityId("model"),
      label: input.label.trim() || createDefaultModelLabel(projectModel.models.size),
      source: input.sourceUrl,
      sourceAssetId: "",
      externalSource: input.externalSource,
      format: input.format,
      assetUnit: "m",
      assetImportScale: 1,
      animations: asset.animations,
      activeAnimationId: asset.animations[0]?.id ?? null,
      animationTimeScale: 1,
      animationPlaybackState: asset.animations.length > 0 ? "playing" : "stopped"
    });

    this.registry.create(model);
    this.emit({
      type: "entityUpdated",
      entityId: model.id,
      entityKind: "model",
      source
    });
    this.setSelectedEntity(model.id, source);
    return {
      entityId: model.id,
      sourceUrl: input.sourceUrl
    };
  }

  releaseUnusedOwnedModelUrls(projectJson: EditorProjectJSON) {
    const nextSources = new Set((projectJson.model || []).map((item) => item.source));
    Array.from(this.ownedModelUrls).forEach((url) => {
      if (nextSources.has(url)) return;
      if (this.isModelUrlRetained(url)) return;
      const model = this.getProjectModel()
        ? Array.from(this.getProjectModel()!.models.values()).find((item) => item.source === url)
        : null;
      if (model) {
        this.runtime.modelLoaderFactory.release(url, model.format);
      }
      URL.revokeObjectURL(url);
      this.ownedModelUrls.delete(url);
    });
  }

  revokeOwnedModelUrls() {
    Array.from(this.ownedModelUrls).forEach((url) => {
      const model = this.getProjectModel()
        ? Array.from(this.getProjectModel()!.models.values()).find((item) => item.source === url)
        : null;
      if (model) {
        this.runtime.modelLoaderFactory.release(url, model.format);
      }
      URL.revokeObjectURL(url);
      this.ownedModelUrls.delete(url);
    });
  }
}
