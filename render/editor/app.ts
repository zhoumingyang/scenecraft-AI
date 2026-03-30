import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import {
  CameraModel,
  EditorProjectModel,
  LightEntityModel,
  MeshEntityModel,
  ModelEntityModel,
  type EntityModel
} from "./dataModel";
import {
  buildTransformSignature,
  createBuiltinGeometry,
  disposeObject3D,
  normalizeColor,
  normalizeNumber,
  normalizeString,
  setEntityId,
  toFloatArray2,
  toFloatArray3,
  toThreeVector2
} from "./util";
import type {
  EditorAppEvent,
  EditorCameraJSON,
  EditorLightJSON,
  EditorProjectJSON,
  EntityKind,
  SyncSource,
  TransformPatch
} from "./typings";
import { createEmptyEditorProjectJSON } from "./projectFactory";

type RenderBinding = {
  kind: EntityKind;
  model: EntityModel;
  object: THREE.Object3D;
  dispose: () => void;
  lastTransformSignature: string;
};

type EditorAppListener = (event: EditorAppEvent) => void;

function createCustomGeometry(model: MeshEntityModel): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  if (model.vertices.length > 0) {
    geometry.setAttribute("position", new THREE.BufferAttribute(toFloatArray3(model.vertices), 3));
  }
  if (model.normals.length > 0) {
    geometry.setAttribute("normal", new THREE.BufferAttribute(toFloatArray3(model.normals), 3));
  }
  if (model.uvs.length > 0) {
    geometry.setAttribute("uv", new THREE.BufferAttribute(toFloatArray2(model.uvs), 2));
  }
  if (model.indices.length > 0) {
    geometry.setIndex(model.indices);
  }
  if (model.normals.length === 0 && model.vertices.length > 0) {
    geometry.computeVertexNormals();
  }
  if (model.vertices.length === 0) {
    return new THREE.BoxGeometry(1, 1, 1);
  }
  return geometry;
}

function createMeshGeometry(model: MeshEntityModel): THREE.BufferGeometry {
  if (model.meshType === 2) {
    return createCustomGeometry(model);
  }
  return createBuiltinGeometry(model.geometryName || "Box");
}

function applyTexture(
  material: THREE.MeshStandardMaterial,
  textureUrl: string,
  loader: THREE.TextureLoader
) {
  if (!textureUrl) return;
  loader.load(textureUrl, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    material.map = texture;
    material.needsUpdate = true;
  });
}

function createModelBinding(
  scene: THREE.Scene,
  model: ModelEntityModel,
  gltfLoader: GLTFLoader
): RenderBinding {
  const group = new THREE.Group();
  group.name = `model:${model.id}`;
  model.applyTransformToObject(group);
  setEntityId(group, model.id);
  scene.add(group);

  let disposed = false;
  gltfLoader.load(
    model.source,
    (gltf) => {
      if (disposed) {
        disposeObject3D(gltf.scene);
        return;
      }
      group.clear();
      group.add(gltf.scene);
      setEntityId(group, model.id);
    },
    undefined,
    () => {
      // Keep empty group when model loading fails.
    }
  );

  return {
    kind: "model",
    model,
    object: group,
    lastTransformSignature: buildTransformSignature(group),
    dispose: () => {
      disposed = true;
      scene.remove(group);
      disposeObject3D(group);
      group.clear();
    }
  };
}

function createMeshBinding(
  scene: THREE.Scene,
  model: MeshEntityModel,
  textureLoader: THREE.TextureLoader
): RenderBinding {
  const geometry = createMeshGeometry(model);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(model.color),
    metalness: 0.15,
    roughness: 0.7
  });
  applyTexture(material, model.textureUrl, textureLoader);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `mesh:${model.id}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  model.applyTransformToObject(mesh);
  setEntityId(mesh, model.id);
  scene.add(mesh);

  return {
    kind: "mesh",
    model,
    object: mesh,
    lastTransformSignature: buildTransformSignature(mesh),
    dispose: () => {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    }
  };
}

function createLightBinding(scene: THREE.Scene, model: LightEntityModel): RenderBinding {
  let light: THREE.Object3D;

  if (model.lightType === 2) {
    const directional = new THREE.DirectionalLight(model.color, model.intensity);
    directional.target.position.set(0, 0, 0);
    scene.add(directional.target);
    light = directional;
  } else if (model.lightType === 3) {
    light = new THREE.PointLight(model.color, model.intensity, model.distance, model.decay);
  } else if (model.lightType === 4) {
    light = new THREE.SpotLight(
      model.color,
      model.intensity,
      model.distance,
      model.angle,
      model.penumbra,
      model.decay
    );
  } else if (model.lightType === 5) {
    light = new THREE.RectAreaLight(model.color, model.intensity, model.width, model.height);
  } else {
    light = new THREE.AmbientLight(model.color, model.intensity);
  }

  light.name = `light:${model.id}`;
  model.applyTransformToObject(light);
  setEntityId(light, model.id);
  scene.add(light);

  return {
    kind: "light",
    model,
    object: light,
    lastTransformSignature: buildTransformSignature(light),
    dispose: () => {
      scene.remove(light);
      if (light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight) {
        scene.remove(light.target);
      }
    }
  };
}

function updateLightObjectFromModel(model: LightEntityModel, object: THREE.Object3D) {
  model.applyTransformToObject(object);

  if (object instanceof THREE.AmbientLight) {
    object.color.set(model.color);
    object.intensity = model.intensity;
  } else if (object instanceof THREE.DirectionalLight) {
    object.color.set(model.color);
    object.intensity = model.intensity;
  } else if (object instanceof THREE.PointLight) {
    object.color.set(model.color);
    object.intensity = model.intensity;
    object.distance = model.distance;
    object.decay = model.decay;
  } else if (object instanceof THREE.SpotLight) {
    object.color.set(model.color);
    object.intensity = model.intensity;
    object.distance = model.distance;
    object.decay = model.decay;
    object.angle = model.angle;
    object.penumbra = model.penumbra;
  } else if (object instanceof THREE.RectAreaLight) {
    object.color.set(model.color);
    object.intensity = model.intensity;
    object.width = model.width;
    object.height = model.height;
  }
}

export class EditorApp {
  private host: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private raycaster: THREE.Raycaster;
  private listeners = new Set<EditorAppListener>();
  private bindingsById = new Map<string, RenderBinding>();
  private selectedEntityId: string | null = null;
  private rafId = 0;
  private disposed = false;
  private fallbackAmbientLight: THREE.AmbientLight;

  projectModel: EditorProjectModel | null = null;

  constructor(host: HTMLDivElement) {
    RectAreaLightUniformsLib.init();

    this.host = host;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#05070f");
    this.scene.fog = new THREE.Fog("#05070f", 20, 180);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.raycaster = new THREE.Raycaster();

    this.fallbackAmbientLight = new THREE.AmbientLight("#ffffff", 0.55);

    const grid = new THREE.GridHelper(80, 80, 0x335588, 0x22334f);
    grid.position.y = -0.0001;
    this.scene.add(grid);
  }

  start() {
    if (this.disposed) return;
    this.host.appendChild(this.renderer.domElement);
    this.resize();
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("resize", this.resize);
    this.animate();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    window.cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);

    this.clearProjectObjects();
    this.renderer.dispose();
    if (this.host.contains(this.renderer.domElement)) {
      this.host.removeChild(this.renderer.domElement);
    }
  }

  subscribe(listener: EditorAppListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async loadProject(projectJson: EditorProjectJSON) {
    this.clearProjectObjects();

    this.projectModel = EditorProjectModel.fromJSON(projectJson);
    this.applyCameraModelToRender(this.projectModel.camera);

    this.projectModel.models.forEach((model) => {
      const binding = createModelBinding(this.scene, model, this.gltfLoader);
      this.bindingsById.set(model.id, binding);
    });

    this.projectModel.meshes.forEach((mesh) => {
      const binding = createMeshBinding(this.scene, mesh, this.textureLoader);
      this.bindingsById.set(mesh.id, binding);
    });

    this.projectModel.lights.forEach((light) => {
      const binding = createLightBinding(this.scene, light);
      this.bindingsById.set(light.id, binding);
    });

    if (this.projectModel.lights.size === 0) {
      this.scene.add(this.fallbackAmbientLight);
    }

    this.emit({ type: "projectLoaded", projectId: this.projectModel.id });
  }

  async clearProject() {
    const projectId = this.projectModel?.id;
    await this.loadProject(createEmptyEditorProjectJSON(projectId));
  }

  getProjectJSON(): EditorProjectJSON | null {
    return this.projectModel?.toJSON() ?? null;
  }

  getSelectedEntityId(): string | null {
    return this.selectedEntityId;
  }

  getRenderObject(entityId: string): THREE.Object3D | null {
    return this.bindingsById.get(entityId)?.object ?? null;
  }

  updateEntityTransform(entityId: string, patch: TransformPatch, source: SyncSource = "ui") {
    const binding = this.bindingsById.get(entityId);
    if (!binding) return;

    binding.model.patchTransform(patch);
    binding.model.applyTransformToObject(binding.object);
    binding.lastTransformSignature = buildTransformSignature(binding.object);

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: binding.kind,
      source
    });
  }

  updateCamera(update: Partial<EditorCameraJSON>, source: SyncSource = "ui") {
    if (!this.projectModel) return;
    this.projectModel.camera.patch(update);
    this.applyCameraModelToRender(this.projectModel.camera);
    this.emit({ type: "cameraUpdated", source });
  }

  updateMeshMaterial(
    entityId: string,
    patch: { color?: string; textureUrl?: string },
    source: SyncSource = "ui"
  ) {
    const binding = this.bindingsById.get(entityId);
    if (!binding || binding.kind !== "mesh") return;

    const model = binding.model as MeshEntityModel;
    if (patch.color !== undefined) {
      model.color = normalizeColor(patch.color, model.color);
    }
    if (patch.textureUrl !== undefined) {
      model.textureUrl = normalizeString(patch.textureUrl, model.textureUrl);
    }

    const mesh = binding.object as THREE.Mesh;
    const material = mesh.material;
    if (material instanceof THREE.MeshStandardMaterial) {
      material.color.set(model.color);
      if (patch.textureUrl !== undefined) {
        material.map = null;
        applyTexture(material, model.textureUrl, this.textureLoader);
      }
      material.needsUpdate = true;
    }

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: "mesh",
      source
    });
  }

  updateLight(entityId: string, patch: Partial<EditorLightJSON>, source: SyncSource = "ui") {
    const binding = this.bindingsById.get(entityId);
    if (!binding || binding.kind !== "light") return;

    const model = binding.model as LightEntityModel;
    if (patch.color !== undefined) model.color = normalizeColor(patch.color, model.color);
    if (patch.intensity !== undefined) model.intensity = normalizeNumber(patch.intensity, model.intensity);
    if (patch.distance !== undefined) model.distance = normalizeNumber(patch.distance, model.distance);
    if (patch.decay !== undefined) model.decay = normalizeNumber(patch.decay, model.decay);
    if (patch.angle !== undefined) model.angle = normalizeNumber(patch.angle, model.angle);
    if (patch.penumbra !== undefined) {
      model.penumbra = THREE.MathUtils.clamp(normalizeNumber(patch.penumbra, model.penumbra), 0, 1);
    }
    if (patch.width !== undefined) model.width = normalizeNumber(patch.width, model.width);
    if (patch.height !== undefined) model.height = normalizeNumber(patch.height, model.height);

    model.patchTransform(patch);
    updateLightObjectFromModel(model, binding.object);
    binding.lastTransformSignature = buildTransformSignature(binding.object);

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: "light",
      source
    });
  }

  syncEntityModelFromRenderObject(entityId: string) {
    const binding = this.bindingsById.get(entityId);
    if (!binding) return;

    const nextSignature = buildTransformSignature(binding.object);
    if (nextSignature === binding.lastTransformSignature) return;

    binding.model.copyTransformFromObject(binding.object);
    binding.lastTransformSignature = nextSignature;

    this.emit({
      type: "entityUpdated",
      entityId,
      entityKind: binding.kind,
      source: "render"
    });
  }

  pick(clientX: number, clientY: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = toThreeVector2([
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    ]);

    this.raycaster.setFromCamera(pointer, this.camera);

    const pickTargets = Array.from(this.bindingsById.values())
      .filter((binding) => binding.kind === "mesh" || binding.kind === "model")
      .map((binding) => binding.object);

    const intersects = this.raycaster.intersectObjects(pickTargets, true);
    if (intersects.length === 0) return null;

    let current: THREE.Object3D | null = intersects[0].object;
    while (current) {
      const entityId = current.userData.editorEntityId;
      if (typeof entityId === "string") {
        return entityId;
      }
      current = current.parent;
    }
    return null;
  }

  setSelectedEntity(entityId: string | null, source: SyncSource = "ui") {
    if (this.selectedEntityId === entityId) return;
    this.selectedEntityId = entityId;
    this.emit({ type: "selectionChanged", selectedEntityId: entityId, source });
  }

  private emit(event: EditorAppEvent) {
    this.listeners.forEach((listener) => {
      listener(event);
    });
  }

  private clearProjectObjects() {
    this.bindingsById.forEach((binding) => binding.dispose());
    this.bindingsById.clear();
    this.scene.remove(this.fallbackAmbientLight);
    this.projectModel = null;
    this.setSelectedEntity(null, "load");
  }

  private applyCameraModelToRender(cameraModel: CameraModel) {
    this.camera.fov = cameraModel.fov;
    cameraModel.applyTransformToObject(this.camera);

    if (cameraModel.cameraType === 1) {
      this.camera.lookAt(0, 0, 0);
    }

    this.camera.updateProjectionMatrix();
  }

  private syncRenderChangesToModel() {
    this.bindingsById.forEach((binding, entityId) => {
      const signature = buildTransformSignature(binding.object);
      if (signature !== binding.lastTransformSignature) {
        binding.model.copyTransformFromObject(binding.object);
        binding.lastTransformSignature = signature;
        this.emit({
          type: "entityUpdated",
          entityId,
          entityKind: binding.kind,
          source: "render"
        });
      }
    });
  }

  private resize = () => {
    const width = this.host.clientWidth || window.innerWidth;
    const height = this.host.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const pickedEntityId = this.pick(event.clientX, event.clientY);
    this.setSelectedEntity(pickedEntityId, "render");
  };

  private animate = () => {
    this.rafId = window.requestAnimationFrame(this.animate);
    this.syncRenderChangesToModel();
    this.renderer.render(this.scene, this.camera);
  };
}

export function createEditorApp(host: HTMLDivElement): EditorApp {
  return new EditorApp(host);
}
