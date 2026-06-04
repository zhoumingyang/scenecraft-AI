import * as THREE from "three";

import { disposeStudioObject } from "./geometry";
import type { RuntimeAssetRecord } from "./types";

export class StudioSceneObjectRegistry {
  private readonly root: THREE.Group;
  private runtimeAssets: RuntimeAssetRecord[] = [];

  constructor(root: THREE.Group) {
    this.root = root;
  }

  replaceObjects(objects: THREE.Object3D[]) {
    this.disposeAll();
    objects.forEach((object) => this.add(object));
  }

  disposeAll() {
    this.runtimeAssets.forEach((asset) => {
      this.root.remove(asset.object);
      asset.dispose();
    });
    this.runtimeAssets = [];
  }

  private add(object: THREE.Object3D) {
    object.userData.studioScene = true;
    this.root.add(object);
    this.runtimeAssets.push({
      object,
      dispose: () => disposeStudioObject(object)
    });
  }
}
