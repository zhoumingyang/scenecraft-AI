import * as THREE from "three";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

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

export class ModelLoaderFactory {
  private readonly dracoLoader: DRACOLoader;
  private readonly gltfLoader: GLTFLoader;
  private readonly fbxLoader: FBXLoader;
  private readonly objLoader: OBJLoader;
  private readonly assetCache = new Map<string, Promise<ParsedModelAsset>>();

  constructor() {
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath("/draco/gltf/");
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
    this.gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
    this.fbxLoader = new FBXLoader();
    this.objLoader = new OBJLoader();
  }

  load(source: string, format: ModelFileFormat): Promise<LoadedModelAsset> {
    const cacheKey = `${format}:${source}`;
    const shouldCache = format !== "vrm";
    const cached = shouldCache ? this.assetCache.get(cacheKey) : undefined;
    const parsedAssetPromise =
      cached ??
      this.loadParsedAsset(source, format).catch((error) => {
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
      case "vrm":
        return new Promise((resolve, reject) => {
          this.gltfLoader.load(
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
