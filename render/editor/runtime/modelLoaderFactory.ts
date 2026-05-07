import * as THREE from "three";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { ExternalAssetIncludedFile } from "@/lib/externalAssets/types";

import type { ModelFileFormat } from "../core/types";
import { buildModelAnimationId } from "../utils/modelAnimation";

type ParsedModelAsset = {
  object: THREE.Object3D;
  clips: THREE.AnimationClip[];
  update?: (deltaSeconds: number) => void;
  dispose?: (object: THREE.Object3D) => void;
  canClone?: boolean;
};

export type LoadedModelAsset = ParsedModelAsset & {
  animations: {
    id: string;
    name: string;
    duration: number;
  }[];
};

type ModelLoadOptions = {
  includedFiles?: ExternalAssetIncludedFile[];
};

function normalizeIncludedFileKey(value: string) {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^[.]\//, "")
    .replace(/[?#].*$/, "");
}

function safelyDecodeUri(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function buildIncludedFileResolver(source: string, includedFiles?: ExternalAssetIncludedFile[]) {
  if (!includedFiles || includedFiles.length === 0) {
    return null;
  }

  const resolvedUrls = new Map<string, string>();

  const addKey = (key: string, targetUrl: string) => {
    const normalizedKey = normalizeIncludedFileKey(key);
    if (!normalizedKey) {
      return;
    }

    resolvedUrls.set(normalizedKey, targetUrl);

    const decodedKey = normalizeIncludedFileKey(safelyDecodeUri(normalizedKey));
    if (decodedKey && decodedKey !== normalizedKey) {
      resolvedUrls.set(decodedKey, targetUrl);
    }
  };

  includedFiles.forEach((includedFile) => {
    if (!includedFile.path.trim() || !includedFile.url.trim()) {
      return;
    }

    addKey(includedFile.path, includedFile.url);

    try {
      addKey(new URL(includedFile.path, source).href, includedFile.url);
    } catch {
      // Ignore invalid URL combinations and fall back to the raw include path.
    }
  });

  return (requestUrl: string) => {
    const directMatch = resolvedUrls.get(normalizeIncludedFileKey(requestUrl));
    if (directMatch) {
      return directMatch;
    }

    try {
      const resolvedRequestUrl = new URL(requestUrl, source).href;
      const resolvedMatch = resolvedUrls.get(normalizeIncludedFileKey(resolvedRequestUrl));
      if (resolvedMatch) {
        return resolvedMatch;
      }
    } catch {
      // Ignore invalid URL combinations and fall back to the original request URL.
    }

    return requestUrl;
  };
}

export class ModelLoaderFactory {
  private readonly dracoLoader: DRACOLoader;
  private readonly fbxLoader: FBXLoader;
  private readonly objLoader: OBJLoader;
  private readonly assetCache = new Map<string, Promise<ParsedModelAsset>>();

  constructor() {
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath("/draco/gltf/");
    this.fbxLoader = new FBXLoader();
    this.objLoader = new OBJLoader();
  }

  load(source: string, format: ModelFileFormat, options?: ModelLoadOptions): Promise<LoadedModelAsset> {
    const cacheKey = this.buildCacheKey(source, format, options);
    const shouldCache = format !== "vrm";
    const cached = shouldCache ? this.assetCache.get(cacheKey) : undefined;
    const parsedAssetPromise =
      cached ??
      this.loadParsedAsset(source, format, options).catch((error) => {
        if (shouldCache) {
          this.assetCache.delete(cacheKey);
        }
        throw error;
      });
    if (!cached && shouldCache) {
      this.assetCache.set(cacheKey, parsedAssetPromise);
    }

    return parsedAssetPromise.then((asset) => ({
      object: asset.canClone === false ? asset.object : cloneSkeleton(asset.object),
      clips: asset.clips,
      update: asset.update,
      dispose: asset.dispose,
      animations: asset.clips.map((clip, index) => ({
        id: buildModelAnimationId(clip.name || `Animation ${index + 1}`, index),
        name: clip.name || `Animation ${index + 1}`,
        duration: clip.duration
      }))
    }));
  }

  release(source: string, format: ModelFileFormat, options?: ModelLoadOptions) {
    this.assetCache.delete(this.buildCacheKey(source, format, options));
  }

  private buildCacheKey(source: string, format: ModelFileFormat, options?: ModelLoadOptions) {
    const includesKey = (options?.includedFiles ?? [])
      .map((includedFile) => `${includedFile.path}:${includedFile.url}`)
      .sort()
      .join("|");

    return includesKey ? `${format}:${source}:${includesKey}` : `${format}:${source}`;
  }

  private createGltfLoader(source: string, includedFiles?: ExternalAssetIncludedFile[]) {
    const manager = new THREE.LoadingManager();
    const resolveIncludedFile = buildIncludedFileResolver(source, includedFiles);

    if (resolveIncludedFile) {
      manager.setURLModifier((requestUrl) => resolveIncludedFile(requestUrl));
    }

    const loader = new GLTFLoader(manager);
    loader.setDRACOLoader(this.dracoLoader);
    loader.register((parser) => new VRMLoaderPlugin(parser));
    return loader;
  }

  private loadParsedAsset(
    source: string,
    format: ModelFileFormat,
    options?: ModelLoadOptions
  ): Promise<ParsedModelAsset> {
    switch (format) {
      case "gltf":
      case "glb":
        return new Promise((resolve, reject) => {
          this.createGltfLoader(source, options?.includedFiles).load(
            source,
            (gltf) =>
              resolve({
                object: gltf.scene,
                clips: gltf.animations ?? []
              }),
            undefined,
            (error) => reject(error)
          );
        });
      case "vrm":
        return new Promise((resolve, reject) => {
          this.createGltfLoader(source, options?.includedFiles).load(
            source,
            (gltf) => {
              const vrm = gltf.userData.vrm as VRM | undefined;
              if (!vrm) {
                reject(new Error("Failed to parse VRM asset"));
                return;
              }

              VRMUtils.rotateVRM0(vrm);

              resolve({
                object: vrm.scene,
                clips: gltf.animations ?? [],
                update: (deltaSeconds) => {
                  vrm.update(deltaSeconds);
                },
                dispose: (object) => {
                  VRMUtils.deepDispose(object);
                },
                canClone: false
              });
            },
            undefined,
            (error) => reject(error)
          );
        });
      case "fbx":
        return new Promise((resolve, reject) => {
          this.fbxLoader.load(
            source,
            (object) =>
              resolve({
                object,
                clips: object.animations ?? []
              }),
            undefined,
            (error) => reject(error)
          );
        });
      case "obj":
        return new Promise((resolve, reject) => {
          this.objLoader.load(
            source,
            (object) =>
              resolve({
                object,
                clips: []
              }),
            undefined,
            (error) => reject(error)
          );
        });
    }
  }

  isSupportedFormat(format: string): format is ModelFileFormat {
    return (
      format === "gltf" ||
      format === "glb" ||
      format === "fbx" ||
      format === "obj" ||
      format === "vrm"
    );
  }
}
