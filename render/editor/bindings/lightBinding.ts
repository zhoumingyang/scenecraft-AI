import * as THREE from "three";
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper.js";

import type { EditorLightJSON } from "../core/types";
import type { LightEntityModel } from "../models";
import { buildTransformSignature, setEntityId } from "../utils/object3d";
import type { BindingContext, RenderBinding } from "./types";

const SOFT_SHADOW_MAP_SIZE = 1024;
const SHADOW_CAMERA_NEAR = 0.5;
const SHADOW_CAMERA_FAR_FALLBACK = 80;
const SHADOW_BIAS = -0.0002;
const SHADOW_NORMAL_BIAS = 0.015;

type SupportedLight =
  | THREE.AmbientLight
  | THREE.HemisphereLight
  | THREE.DirectionalLight
  | THREE.PointLight
  | THREE.SpotLight
  | THREE.RectAreaLight;

type LightBindingParts = {
  root: THREE.Group;
  light: SupportedLight;
  helper: THREE.Object3D;
};

type LightBindingUpdateParts = {
  root: THREE.Group;
  light: SupportedLight;
  helper?: THREE.Object3D;
};

function createAmbientHelper(color: string) {
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
    depthTest: false
  });
  const points = [
    new THREE.Vector3(-0.45, 0, 0),
    new THREE.Vector3(0.45, 0, 0),
    new THREE.Vector3(0, -0.45, 0),
    new THREE.Vector3(0, 0.45, 0),
    new THREE.Vector3(0, 0, -0.45),
    new THREE.Vector3(0, 0, 0.45)
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineSegments(geometry, material);
}

function markAsEditorLightHelper(helper: THREE.Object3D) {
  helper.userData.editorLightHelper = true;
}

function getShadowCameraFar(distance: number) {
  return Math.max(distance || 0, SHADOW_CAMERA_FAR_FALLBACK);
}

function applySoftShadow(shadow: THREE.LightShadow, cameraFar = SHADOW_CAMERA_FAR_FALLBACK) {
  const shadowCamera = shadow.camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
  shadow.mapSize.set(SOFT_SHADOW_MAP_SIZE, SOFT_SHADOW_MAP_SIZE);
  shadowCamera.near = SHADOW_CAMERA_NEAR;
  shadowCamera.far = cameraFar;
  shadowCamera.updateProjectionMatrix();
  shadow.bias = SHADOW_BIAS;
  shadow.normalBias = SHADOW_NORMAL_BIAS;
}

function createLightParts(model: LightEntityModel): LightBindingParts {
  const root = new THREE.Group();
  root.name = `light:${model.id}`;

  if (model.lightType === 2) {
    const light = new THREE.DirectionalLight(model.color, model.intensity);
    light.castShadow = true;
    applySoftShadow(light.shadow);
    light.shadow.camera.left = -20;
    light.shadow.camera.right = 20;
    light.shadow.camera.top = 20;
    light.shadow.camera.bottom = -20;
    light.shadow.camera.updateProjectionMatrix();
    const target = new THREE.Object3D();
    target.position.set(0, 0, 10);
    light.target = target;
    root.add(light, target);
    const helper = new THREE.DirectionalLightHelper(light, 1.25, model.color);
    return { root, light, helper };
  }

  if (model.lightType === 3) {
    const light = new THREE.PointLight(model.color, model.intensity, model.distance, model.decay);
    light.castShadow = true;
    applySoftShadow(light.shadow, getShadowCameraFar(model.distance));
    root.add(light);
    const helper = new THREE.PointLightHelper(light, 0.5, model.color);
    root.add(helper);
    return { root, light, helper };
  }

  if (model.lightType === 4) {
    const light = new THREE.SpotLight(
      model.color,
      model.intensity,
      model.distance,
      model.angle,
      model.penumbra,
      model.decay
    );
    light.castShadow = true;
    applySoftShadow(light.shadow, getShadowCameraFar(model.distance));
    const target = new THREE.Object3D();
    target.position.set(0, 0, 10);
    light.target = target;
    root.add(light, target);
    const helper = new THREE.SpotLightHelper(light);
    return { root, light, helper };
  }

  if (model.lightType === 5) {
    const light = new THREE.RectAreaLight(model.color, model.intensity, model.width, model.height);
    const helper = new RectAreaLightHelper(light);
    light.add(helper);
    root.add(light);
    return { root, light, helper };
  }

  if (model.lightType === 6) {
    const light = new THREE.HemisphereLight(model.color, model.groundColor, model.intensity);
    root.add(light);
    const helper = new THREE.HemisphereLightHelper(light, 0.8);
    root.add(helper);
    return { root, light, helper };
  }

  const light = new THREE.AmbientLight(model.color, model.intensity);
  root.add(light);
  const helper = createAmbientHelper(model.color);
  root.add(helper);
  return { root, light, helper };
}

function applyLightModelToObject(model: LightEntityModel, parts: LightBindingUpdateParts) {
  model.applyTransformToObject(parts.root);
  parts.root.updateMatrixWorld(true);

  if (parts.light instanceof THREE.HemisphereLight) {
    parts.light.color.set(model.color);
    parts.light.groundColor.set(model.groundColor);
    parts.light.intensity = model.intensity;
  } else if (parts.light instanceof THREE.AmbientLight) {
    parts.light.color.set(model.color);
    parts.light.intensity = model.intensity;
  } else if (parts.light instanceof THREE.DirectionalLight) {
    parts.light.color.set(model.color);
    parts.light.intensity = model.intensity;
  } else if (parts.light instanceof THREE.PointLight) {
    parts.light.color.set(model.color);
    parts.light.intensity = model.intensity;
    parts.light.distance = model.distance;
    parts.light.decay = model.decay;
    parts.light.shadow.camera.far = getShadowCameraFar(model.distance);
    parts.light.shadow.camera.updateProjectionMatrix();
    parts.light.shadow.needsUpdate = true;
  } else if (parts.light instanceof THREE.SpotLight) {
    parts.light.color.set(model.color);
    parts.light.intensity = model.intensity;
    parts.light.distance = model.distance;
    parts.light.decay = model.decay;
    parts.light.angle = model.angle;
    parts.light.penumbra = model.penumbra;
    parts.light.shadow.camera.far = getShadowCameraFar(model.distance);
    parts.light.shadow.camera.updateProjectionMatrix();
    parts.light.shadow.needsUpdate = true;
  } else if (parts.light instanceof THREE.RectAreaLight) {
    parts.light.color.set(model.color);
    parts.light.intensity = model.intensity;
    parts.light.width = model.width;
    parts.light.height = model.height;
  }

  if (parts.light instanceof THREE.DirectionalLight || parts.light instanceof THREE.SpotLight) {
    parts.light.target.updateMatrixWorld();
  }

  if (parts.helper instanceof THREE.PointLightHelper) {
    parts.helper.color = new THREE.Color(model.color);
  }

  if (parts.helper instanceof THREE.DirectionalLightHelper) {
    parts.helper.update();
  } else if (parts.helper instanceof THREE.HemisphereLightHelper) {
    parts.helper.update();
  } else if (parts.helper instanceof THREE.SpotLightHelper) {
    parts.helper.update();
  } else if (parts.helper instanceof RectAreaLightHelper) {
    parts.helper.updateMatrixWorld();
  } else if (parts.helper instanceof THREE.LineSegments) {
    const material = parts.helper.material;
    if (material instanceof THREE.LineBasicMaterial) {
      material.color.set(model.color);
    }
  }
}

function disposeAmbientHelper(helper: THREE.Object3D) {
  if (!(helper instanceof THREE.LineSegments)) return;
  helper.geometry.dispose();
  const material = helper.material;
  if (material instanceof THREE.Material) {
    material.dispose();
  }
}

export function createLightBinding(context: BindingContext, model: LightEntityModel): RenderBinding {
  const { scene } = context;
  const parts = createLightParts(model);
  applyLightModelToObject(model, parts);
  setEntityId(parts.root, model.id);
  setEntityId(parts.helper, model.id);
  markAsEditorLightHelper(parts.helper);
  scene.add(parts.root);
  if (!(parts.helper instanceof RectAreaLightHelper)) {
    scene.add(parts.helper);
  }

  return {
    kind: "light",
    model,
    object: parts.root,
    pickTargets: [parts.root, parts.helper],
    lastTransformSignature: buildTransformSignature(parts.root),
    refresh: () => {
      if (parts.helper instanceof THREE.DirectionalLightHelper) {
        parts.helper.update();
      } else if (parts.helper instanceof THREE.HemisphereLightHelper) {
        parts.helper.update();
      } else if (parts.helper instanceof THREE.SpotLightHelper) {
        parts.helper.update();
      } else if (parts.helper instanceof THREE.PointLightHelper) {
        parts.helper.update();
      } else if (parts.helper instanceof RectAreaLightHelper) {
        parts.helper.updateMatrixWorld();
      }
    },
    dispose: () => {
      scene.remove(parts.root);
      if (!(parts.helper instanceof RectAreaLightHelper)) {
        scene.remove(parts.helper);
      }
      disposeAmbientHelper(parts.helper);
      if (
        parts.helper instanceof THREE.DirectionalLightHelper ||
        parts.helper instanceof THREE.HemisphereLightHelper ||
        parts.helper instanceof THREE.PointLightHelper ||
        parts.helper instanceof THREE.SpotLightHelper ||
        parts.helper instanceof RectAreaLightHelper
      ) {
        parts.helper.dispose();
      }
    }
  };
}

export function updateLightBinding(binding: RenderBinding, patch: Partial<EditorLightJSON>) {
  if (binding.kind !== "light") return;

  const model = binding.model as LightEntityModel;
  const root = binding.object;
  const light = root.children.find((child) => child instanceof THREE.Light) as SupportedLight | undefined;
  const helper = binding.pickTargets?.find(
    (child) =>
      child !== binding.object &&
      (child instanceof THREE.DirectionalLightHelper ||
        child instanceof THREE.HemisphereLightHelper ||
        child instanceof THREE.PointLightHelper ||
        child instanceof THREE.SpotLightHelper ||
        child instanceof RectAreaLightHelper ||
        child instanceof THREE.LineSegments)
  );

  if (!light) return;

  model.patchLight(patch);
  applyLightModelToObject(model, {
    root: root as THREE.Group,
    light,
    helper
  });
  binding.lastTransformSignature = buildTransformSignature(binding.object);
}
