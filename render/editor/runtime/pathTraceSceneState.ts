import * as THREE from "three";

type EditorHelperVisibilityOptions = {
  groundPlane: THREE.Object3D;
  hideGroundPlane: boolean;
};

export function withEditorHelperVisibility<T>(
  scene: THREE.Scene,
  options: EditorHelperVisibilityOptions,
  callback: () => T
): T {
  const previousGroundVisible = options.groundPlane.visible;
  const lightHelperSnapshots: Array<{ object: THREE.Object3D; visible: boolean }> = [];

  scene.traverse((object) => {
    if (object.userData?.editorLightHelper !== true) return;
    lightHelperSnapshots.push({ object, visible: object.visible });
    object.visible = false;
  });

  if (options.hideGroundPlane) {
    options.groundPlane.visible = false;
  }

  try {
    return callback();
  } finally {
    options.groundPlane.visible = previousGroundVisible;
    lightHelperSnapshots.forEach(({ object, visible }) => {
      object.visible = visible;
    });
  }
}

export function withPathTraceCompatibleEnvironment<T>(
  scene: THREE.Scene,
  sourceEnvironmentTexture: THREE.Texture | null,
  callback: () => T
): T {
  const previousEnvironment = scene.environment;
  const shouldPatchEnvironment = previousEnvironment !== null;

  if (shouldPatchEnvironment) {
    scene.environment = isPathTraceReadableEnvironmentTexture(sourceEnvironmentTexture)
      ? sourceEnvironmentTexture
      : null;
  }

  try {
    return callback();
  } finally {
    if (shouldPatchEnvironment) {
      scene.environment = previousEnvironment;
    }
  }
}

function isPathTraceReadableEnvironmentTexture(
  texture: THREE.Texture | null
): texture is THREE.Texture {
  const image = texture?.image as { width?: number; height?: number; data?: ArrayLike<number> } | undefined;
  const width = image?.width ?? 0;
  const height = image?.height ?? 0;
  return Boolean(
    image &&
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0 &&
      image.data &&
      image.data.length > 0
  );
}
