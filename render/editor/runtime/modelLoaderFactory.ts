import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

import type { ModelFileFormat } from "../core/types";
import { buildModelAnimationId } from "../utils/modelAnimation";

type ParsedModelAsset = {
  object: THREE.Object3D;
  clips: THREE.AnimationClip[];
};

export type LoadedModelAsset = ParsedModelAsset & {
  animations: {
    id: string;
    name: string;
    duration: number;
  }[];
};

export class ModelLoaderFactory {
  private readonly gltfLoader: GLTFLoader;
  private readonly fbxLoader: FBXLoader;
  private readonly objLoader: OBJLoader;
  private readonly assetCache = new Map<string, Promise<ParsedModelAsset>>();

  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.fbxLoader = new FBXLoader();
    this.objLoader = new OBJLoader();
  }

  load(source: string, format: ModelFileFormat): Promise<LoadedModelAsset> {
    const cacheKey = `${format}:${source}`;
    const cached = this.assetCache.get(cacheKey);
    const parsedAssetPromise =
      cached ??
      this.loadParsedAsset(source, format).catch((error) => {
        this.assetCache.delete(cacheKey);
        throw error;
      });
    if (!cached) {
      this.assetCache.set(cacheKey, parsedAssetPromise);
    }

    return parsedAssetPromise.then((asset) => ({
      object: cloneSkeleton(asset.object),
      clips: asset.clips,
      animations: asset.clips.map((clip, index) => ({
        id: buildModelAnimationId(clip.name || `Animation ${index + 1}`, index),
        name: clip.name || `Animation ${index + 1}`,
        duration: clip.duration
      }))
    }));
  }

  release(source: string, format: ModelFileFormat) {
    this.assetCache.delete(`${format}:${source}`);
  }

  private loadParsedAsset(source: string, format: ModelFileFormat): Promise<ParsedModelAsset> {
    switch (format) {
      case "gltf":
      case "glb":
        return new Promise((resolve, reject) => {
          this.gltfLoader.load(
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
    return format === "gltf" || format === "glb" || format === "fbx" || format === "obj";
  }
}
