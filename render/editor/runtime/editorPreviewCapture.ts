import * as THREE from "three";

export function captureAiPreviewImages(
  objects: THREE.Object3D[],
  rendererSettings: { toneMapping: THREE.ToneMapping; toneMappingExposure: number }
) {
  const size = 768;
  const snapshotScene = new THREE.Scene();
  snapshotScene.background = new THREE.Color("#0a1020");

  const ambientLight = new THREE.AmbientLight("#ffffff", 1.35);
  const keyLight = new THREE.DirectionalLight("#ffffff", 1.8);
  keyLight.position.set(5, 8, 7);
  const fillLight = new THREE.DirectionalLight("#9fc6ff", 0.75);
  fillLight.position.set(-6, 4, -5);
  snapshotScene.add(ambientLight, keyLight, fillLight);

  const root = new THREE.Group();
  objects.forEach((object) => {
    root.add(object);
  });
  snapshotScene.add(root);

  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  const sizeVector = bounds.getSize(new THREE.Vector3());
  const maxDimension = Math.max(sizeVector.x, sizeVector.y, sizeVector.z, 1);
  const distance = maxDimension * 2.2;

  const views = [
    {
      position: new THREE.Vector3(center.x, center.y + maxDimension * 0.15, center.z + distance),
      up: new THREE.Vector3(0, 1, 0)
    },
    {
      position: new THREE.Vector3(center.x + distance, center.y + maxDimension * 0.12, center.z),
      up: new THREE.Vector3(0, 1, 0)
    },
    {
      position: new THREE.Vector3(center.x, center.y + distance, center.z),
      up: new THREE.Vector3(0, 0, -1)
    }
  ];

  const snapshotCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
  const snapshotRenderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  });
  snapshotRenderer.setSize(size, size, false);
  snapshotRenderer.setPixelRatio(1);
  snapshotRenderer.toneMapping = rendererSettings.toneMapping;
  snapshotRenderer.toneMappingExposure = rendererSettings.toneMappingExposure;

  try {
    return views.map((view) => {
      snapshotCamera.position.copy(view.position);
      snapshotCamera.up.copy(view.up);
      snapshotCamera.lookAt(center);
      snapshotCamera.updateProjectionMatrix();
      snapshotRenderer.render(snapshotScene, snapshotCamera);
      return snapshotRenderer.domElement.toDataURL("image/png");
    });
  } finally {
    snapshotRenderer.dispose();
  }
}
