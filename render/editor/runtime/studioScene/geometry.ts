import * as THREE from "three";

export function createMaterial(
  color: string,
  options: Partial<THREE.MeshStandardMaterialParameters> = {}
) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.82,
    metalness: 0,
    ...options
  });
}

export function createEmissiveMaterial(color: string, intensity = 1.4) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0
  });
}

export function disposeStudioObject(object: THREE.Object3D) {
  object.traverse((entry) => {
    const mesh = entry as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else {
      material?.dispose();
    }
  });
}

export function lookAtQuaternion(position: THREE.Vector3, target: THREE.Vector3) {
  const helper = new THREE.Object3D();
  helper.position.copy(position);
  helper.lookAt(target);
  return helper.quaternion.clone();
}

export function createPlaneMesh({
  name,
  width,
  height,
  position,
  rotation,
  material
}: {
  name: string;
  width: number;
  height: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  material: THREE.Material;
}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.name = name;
  mesh.position.copy(position);
  mesh.rotation.copy(rotation);
  mesh.receiveShadow = true;
  return mesh;
}

export function createBoxMesh({
  name,
  size,
  position,
  material
}: {
  name: string;
  size: THREE.Vector3;
  position: THREE.Vector3;
  material: THREE.Material;
}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.name = name;
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createCylinderMesh({
  name,
  radius,
  height,
  position,
  material
}: {
  name: string;
  radius: number;
  height: number;
  position: THREE.Vector3;
  material: THREE.Material;
}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 64), material);
  mesh.name = name;
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createAreaLightPanel({
  name,
  position,
  target,
  width,
  height,
  color
}: {
  name: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  width: number;
  height: number;
  color: string;
}) {
  const panel = createPlaneMesh({
    name,
    width,
    height,
    position,
    rotation: new THREE.Euler(),
    material: createEmissiveMaterial(color)
  });
  panel.quaternion.copy(lookAtQuaternion(position, target));
  return panel;
}
