import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

import type { ModelFileFormat } from "../core/types";

export class ModelLoaderFactory {
  private readonly gltfLoader: GLTFLoader;
  private readonly fbxLoader: FBXLoader;
  private readonly objLoader: OBJLoader;

  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.fbxLoader = new FBXLoader();
    this.objLoader = new OBJLoader();
  }

  load(source: string, format: ModelFileFormat): Promise<THREE.Object3D> {
    switch (format) {
      case "gltf":
      case "glb":
        return new Promise((resolve, reject) => {
          this.gltfLoader.load(
            source,
            (gltf) => resolve(gltf.scene),
            undefined,
            (error) => reject(error)
          );
        });
      case "fbx":
        return new Promise((resolve, reject) => {
          this.fbxLoader.load(
            source,
            (object) => resolve(object),
            undefined,
            (error) => reject(error)
          );
        });
      case "obj":
        return new Promise((resolve, reject) => {
          this.objLoader.load(
            source,
            (object) => resolve(object),
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
