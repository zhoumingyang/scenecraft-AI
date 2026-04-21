import * as THREE from "three";

type GizmoHandleType = "translate-axis" | "translate-free" | "rotate-axis";
type GizmoHandleAxis = "x" | "y" | "z" | "free";
type GizmoHandleKey =
  | "translate-axis:x"
  | "translate-axis:y"
  | "translate-axis:z"
  | "translate-free:free"
  | "rotate-axis:x"
  | "rotate-axis:y"
  | "rotate-axis:z";

type ActiveDrag =
  | {
      type: "translate-axis";
      axis: "x" | "y" | "z";
      origin: THREE.Vector3;
      startPosition: THREE.Vector3;
      plane: THREE.Plane;
      startOffset: number;
    }
  | {
      type: "translate-free";
      plane: THREE.Plane;
      startPoint: THREE.Vector3;
      startPosition: THREE.Vector3;
    }
  | {
      type: "rotate-axis";
      axis: "x" | "y" | "z";
      origin: THREE.Vector3;
      plane: THREE.Plane;
      startVector: THREE.Vector3;
      startQuaternion: THREE.Quaternion;
      currentAngle: number;
    };

type PointerInfo = {
  clientX: number;
  clientY: number;
};

type HandleVisual = {
  key: GizmoHandleKey;
  type: GizmoHandleType;
  axis: GizmoHandleAxis;
  root: THREE.Object3D;
  pickTargets: THREE.Object3D[];
  materials: THREE.MeshBasicMaterial[];
};

type RotateVisual = HandleVisual & {
  base: THREE.Group;
  previewMesh: THREE.Mesh;
  fullMesh: THREE.Mesh;
};

type TranslateVisual = HandleVisual & {
  base: THREE.Group;
  tip: THREE.Mesh;
};

function normalizePositiveAngle(angle: number) {
  const fullTurn = Math.PI * 2;
  return ((angle % fullTurn) + fullTurn) % fullTurn;
}

function getAxisVector(axis: "x" | "y" | "z"): THREE.Vector3 {
  if (axis === "x") return new THREE.Vector3(1, 0, 0);
  if (axis === "y") return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

function getHandleKey(type: GizmoHandleType, axis: GizmoHandleAxis): GizmoHandleKey {
  return `${type}:${axis}` as GizmoHandleKey;
}

function createHandleMaterial(color: string, opacity: number) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false
  });

  material.userData.baseColor = color;
  material.userData.baseOpacity = opacity;
  return material;
}

function tintHex(color: string, amount: number) {
  const source = new THREE.Color(color);
  const target = new THREE.Color(amount >= 0 ? "#ffffff" : "#000000");
  return `#${source.lerp(target, Math.min(Math.abs(amount), 1)).getHexString()}`;
}

function tagHandle(object: THREE.Object3D, type: GizmoHandleType, axis: GizmoHandleAxis) {
  object.userData.gizmoHandleType = type;
  object.userData.gizmoAxis = axis;
  object.renderOrder = 999;
}

export class CustomTransformGizmo {
  readonly root: THREE.Group;

  private readonly camera: THREE.PerspectiveCamera;
  private readonly domElement: HTMLCanvasElement;
  private readonly raycaster: THREE.Raycaster;
  private readonly pointer = new THREE.Vector2();
  private readonly worldUp = new THREE.Vector3(0, 1, 0);
  private readonly intersection = new THREE.Vector3();
  private readonly tmpV1 = new THREE.Vector3();
  private readonly tmpV2 = new THREE.Vector3();
  private readonly tmpV3 = new THREE.Vector3();
  private readonly handleTargets: THREE.Object3D[] = [];
  private readonly visuals = new Map<GizmoHandleKey, HandleVisual>();
  private readonly rotateVisuals = new Map<"x" | "y" | "z", RotateVisual>();
  private readonly translateVisuals = new Map<"x" | "y" | "z", TranslateVisual>();
  private readonly freeVisual: HandleVisual;
  private readonly minScale = 0.6;
  private readonly maxScale = 2.1;
  private readonly scaleFactor = 0.12;

  private target: THREE.Object3D | null = null;
  private activeDrag: ActiveDrag | null = null;
  private activeHandleKey: GizmoHandleKey | null = null;
  private dragging = false;
  private enabled = true;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLCanvasElement, raycaster: THREE.Raycaster) {
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = raycaster;
    this.root = new THREE.Group();
    this.root.visible = false;
    this.root.renderOrder = 999;

    const colors = {
      x: "#f26d72",
      y: "#6fd38a",
      z: "#6fa8ff",
      free: "#edf3ff"
    } as const;

    (["x", "y", "z"] as const).forEach((axis) => {
      const translateVisual = this.createTranslateVisual(axis, colors[axis]);
      this.translateVisuals.set(axis, translateVisual);
      this.visuals.set(translateVisual.key, translateVisual);
      this.root.add(translateVisual.root);

      const rotateVisual = this.createRotateVisual(axis, colors[axis]);
      this.rotateVisuals.set(axis, rotateVisual);
      this.visuals.set(rotateVisual.key, rotateVisual);
      this.root.add(rotateVisual.root);
    });

    this.freeVisual = this.createFreeTranslateVisual();
    this.visuals.set(this.freeVisual.key, this.freeVisual);
    this.root.add(this.freeVisual.root);

    this.updateVisualState();
  }

  dispose() {
    this.root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  setTarget(object: THREE.Object3D | null) {
    this.target = object;
    this.activeDrag = null;
    this.activeHandleKey = null;
    this.dragging = false;
    this.root.visible = this.enabled && Boolean(object);
    if (!object) return;
    this.syncToTarget();
    this.updateVisualState();
  }

  setVisible(visible: boolean) {
    this.enabled = visible;
    this.root.visible = visible && Boolean(this.target);
  }

  isVisible() {
    return this.enabled;
  }

  update() {
    if (!this.target) {
      this.root.visible = false;
      return;
    }

    this.root.visible = this.enabled;
    if (!this.enabled) return;
    this.syncToTarget();

    const distance = this.camera.position.distanceTo(this.root.position);
    const scale = THREE.MathUtils.clamp(distance * this.scaleFactor, this.minScale, this.maxScale);
    this.root.scale.setScalar(scale);

    this.updateTranslateFacing();
    this.updateRotateFacing();
    this.updateVisualState();
  }

  isDragging() {
    return this.dragging;
  }

  getActiveRotateAxisDrag() {
    if (!this.activeDrag || this.activeDrag.type !== "rotate-axis") return null;
    return {
      axis: this.activeDrag.axis,
      angle: this.activeDrag.currentAngle
    };
  }

  beginPointerInteraction(info: PointerInfo): boolean {
    if (!this.target) return false;

    const hit = this.pickHandle(info.clientX, info.clientY);
    if (!hit) return false;

    const type = hit.object.userData.gizmoHandleType as GizmoHandleType;
    const axis = hit.object.userData.gizmoAxis as GizmoHandleAxis;
    const origin = this.root.position.clone();
    const cameraDirection = this.camera.getWorldDirection(this.tmpV1).normalize().clone();
    const handleKey = getHandleKey(type, axis);
    this.activeHandleKey = handleKey;

    if (type === "translate-free") {
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(cameraDirection, origin);
      const point = this.intersectPlane(info.clientX, info.clientY, plane);
      if (!point) {
        this.activeHandleKey = null;
        return false;
      }
      this.activeDrag = {
        type: "translate-free",
        plane,
        startPoint: point.clone(),
        startPosition: this.target.position.clone()
      };
      this.dragging = true;
      this.updateVisualState();
      return true;
    }

    if (type === "translate-axis" && axis !== "free") {
      const axisVector = getAxisVector(axis);
      const planeNormal = this.tmpV2
        .copy(cameraDirection)
        .cross(axisVector)
        .cross(axisVector);

      if (planeNormal.lengthSq() < 1e-6) {
        planeNormal.copy(this.worldUp).cross(axisVector);
      }
      if (planeNormal.lengthSq() < 1e-6) {
        planeNormal.set(0, 0, 1);
      }
      planeNormal.normalize();

      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, origin);
      const point = this.intersectPlane(info.clientX, info.clientY, plane);
      if (!point) {
        this.activeHandleKey = null;
        return false;
      }

      this.activeDrag = {
        type: "translate-axis",
        axis,
        origin: origin.clone(),
        plane,
        startPosition: this.target.position.clone(),
        startOffset: point.sub(origin).dot(axisVector)
      };
      this.dragging = true;
      this.updateVisualState();
      return true;
    }

    if (type === "rotate-axis" && axis !== "free") {
      const axisVector = getAxisVector(axis);
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(axisVector, origin);
      const point = this.intersectPlane(info.clientX, info.clientY, plane);
      if (!point) {
        this.activeHandleKey = null;
        return false;
      }

      this.activeDrag = {
        type: "rotate-axis",
        axis,
        origin: origin.clone(),
        plane,
        startVector: point.sub(origin).normalize(),
        startQuaternion: this.target.quaternion.clone(),
        currentAngle: 0
      };
      this.dragging = true;
      this.updateVisualState();
      return true;
    }

    this.activeHandleKey = null;
    return false;
  }

  updatePointerInteraction(info: PointerInfo) {
    if (!this.target || !this.activeDrag) return;

    if (this.activeDrag.type === "translate-free") {
      const point = this.intersectPlane(info.clientX, info.clientY, this.activeDrag.plane);
      if (!point) return;

      const delta = point.clone().sub(this.activeDrag.startPoint);
      this.target.position.copy(this.activeDrag.startPosition).add(delta);
      return;
    }

    if (this.activeDrag.type === "translate-axis") {
      const point = this.intersectPlane(info.clientX, info.clientY, this.activeDrag.plane);
      if (!point) return;

      const axisVector = getAxisVector(this.activeDrag.axis);
      const delta = point.clone().sub(this.activeDrag.origin).dot(axisVector) - this.activeDrag.startOffset;
      this.target.position.copy(this.activeDrag.startPosition).add(axisVector.multiplyScalar(delta));
      return;
    }

    const point = this.intersectPlane(info.clientX, info.clientY, this.activeDrag.plane);
    if (!point) return;

    const axisVector = getAxisVector(this.activeDrag.axis);
    const currentVector = point.sub(this.activeDrag.origin).normalize();
    if (currentVector.lengthSq() < 1e-6) return;

    const sin = axisVector.dot(this.tmpV3.crossVectors(this.activeDrag.startVector, currentVector));
    const cos = this.activeDrag.startVector.dot(currentVector);
    const angle = Math.atan2(sin, cos);
    this.activeDrag.currentAngle = angle;

    const rotation = new THREE.Quaternion().setFromAxisAngle(axisVector, angle);
    this.target.quaternion.copy(this.activeDrag.startQuaternion).premultiply(rotation);
  }

  endPointerInteraction() {
    this.activeDrag = null;
    this.dragging = false;
    this.activeHandleKey = null;
    this.updateVisualState();
  }

  isHandleHit(clientX: number, clientY: number): boolean {
    return Boolean(this.pickHandle(clientX, clientY));
  }

  private createTranslateVisual(axis: "x" | "y" | "z", color: string): TranslateVisual {
    const key = getHandleKey("translate-axis", axis);
    const root = new THREE.Group();
    const base = new THREE.Group();
    const shaftMaterial = createHandleMaterial(tintHex(color, -0.16), 0.92);
    const tipMaterial = createHandleMaterial(tintHex(color, 0.08), 0.98);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.92, 12), shaftMaterial);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 18), tipMaterial);

    shaft.position.y = 0.46;
    tip.position.y = 1.08;
    tagHandle(root, "translate-axis", axis);
    tagHandle(base, "translate-axis", axis);
    tagHandle(shaft, "translate-axis", axis);
    tagHandle(tip, "translate-axis", axis);
    base.add(shaft, tip);
    root.add(base);
    this.handleTargets.push(root, base, shaft, tip);

    return {
      key,
      type: "translate-axis",
      axis,
      root,
      base,
      tip,
      pickTargets: [root, base, shaft, tip],
      materials: [shaftMaterial, tipMaterial]
    };
  }

  private createRotateVisual(axis: "x" | "y" | "z", color: string): RotateVisual {
    const key = getHandleKey("rotate-axis", axis);
    const root = new THREE.Group();
    const base = new THREE.Group();
    const previewMaterial = createHandleMaterial(tintHex(color, -0.08), 0.48);
    const fullMaterial = createHandleMaterial(color, 0.86);
    const previewMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.022, 10, 48, Math.PI / 2),
      previewMaterial
    );
    const fullMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.022, 10, 96, Math.PI * 2),
      fullMaterial
    );

    fullMesh.visible = false;
    tagHandle(root, "rotate-axis", axis);
    tagHandle(base, "rotate-axis", axis);
    tagHandle(previewMesh, "rotate-axis", axis);
    tagHandle(fullMesh, "rotate-axis", axis);
    base.add(previewMesh, fullMesh);
    root.add(base);
    this.handleTargets.push(root, base, previewMesh, fullMesh);

    return {
      key,
      type: "rotate-axis",
      axis,
      root,
      base,
      previewMesh,
      fullMesh,
      pickTargets: [root, base, previewMesh, fullMesh],
      materials: [previewMaterial, fullMaterial]
    };
  }

  private createFreeTranslateVisual(): HandleVisual {
    const key = getHandleKey("translate-free", "free");
    const root = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14, 0),
      createHandleMaterial("#f4f7ff", 0.95)
    );
    tagHandle(root, "translate-free", "free");
    this.handleTargets.push(root);

    return {
      key,
      type: "translate-free",
      axis: "free",
      root,
      pickTargets: [root],
      materials: [root.material as THREE.MeshBasicMaterial]
    };
  }

  private syncToTarget() {
    if (!this.target) return;
    this.root.position.copy(this.target.position);
  }

  private updateTranslateFacing() {
    const cameraOffset = this.tmpV1.copy(this.camera.position).sub(this.root.position);

    this.translateVisuals.forEach((visual, axis) => {
      const axisVector = getAxisVector(axis);
      const direction =
        axis === "y"
          ? axisVector
          : axisVector.clone().multiplyScalar(cameraOffset.dot(axisVector) >= 0 ? 1 : -1);

      visual.base.quaternion.setFromUnitVectors(this.worldUp, direction.normalize());
    });
  }

  private updateRotateFacing() {
    this.rotateVisuals.forEach((visual, axis) => {
      const axisVector = getAxisVector(axis);
      visual.base.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axisVector);
      this.alignRotatePreviewToTranslateTips(axis, visual);
    });
  }

  private alignRotatePreviewToTranslateTips(axis: "x" | "y" | "z", visual: RotateVisual) {
    const endpointAxes =
      axis === "x" ? (["y", "z"] as const) : axis === "y" ? (["z", "x"] as const) : (["x", "y"] as const);

    const firstTip = this.translateVisuals.get(endpointAxes[0])?.tip ?? null;
    const secondTip = this.translateVisuals.get(endpointAxes[1])?.tip ?? null;
    if (!firstTip || !secondTip) return;

    const firstLocal = visual.base.worldToLocal(firstTip.getWorldPosition(this.tmpV1.clone()));
    const secondLocal = visual.base.worldToLocal(secondTip.getWorldPosition(this.tmpV2.clone()));

    firstLocal.z = 0;
    secondLocal.z = 0;
    if (firstLocal.lengthSq() < 1e-6 || secondLocal.lengthSq() < 1e-6) return;

    const firstAngle = normalizePositiveAngle(Math.atan2(firstLocal.y, firstLocal.x));
    const secondAngle = normalizePositiveAngle(Math.atan2(secondLocal.y, secondLocal.x));
    const delta = normalizePositiveAngle(secondAngle - firstAngle);

    visual.previewMesh.rotation.z = delta <= Math.PI ? firstAngle : secondAngle;
  }

  private updateVisualState() {
    const activeKey = this.activeHandleKey;
    const hideOthers = this.dragging && activeKey !== null;

    this.visuals.forEach((visual, key) => {
      const active = key === activeKey;
      visual.root.visible = hideOthers ? active : true;

      visual.materials.forEach((material) => {
        const baseColor = material.userData.baseColor as string;
        const baseOpacity = material.userData.baseOpacity as number;
        material.color.set(active ? this.getActiveColor(key) : baseColor);
        material.opacity = active ? this.getActiveOpacity(key, baseOpacity) : baseOpacity;
      });
    });

    this.rotateVisuals.forEach((visual, axis) => {
      const key = getHandleKey("rotate-axis", axis);
      const active = key === activeKey;
      visual.previewMesh.visible = !active;
      visual.fullMesh.visible = active;
    });
  }

  private getActiveColor(key: GizmoHandleKey) {
    if (key.startsWith("translate-free")) return "#ffffff";
    return "#fff1a8";
  }

  private getActiveOpacity(key: GizmoHandleKey, baseOpacity: number) {
    if (key.startsWith("rotate-axis")) return Math.max(baseOpacity, 0.96);
    if (key.startsWith("translate-free")) return 1;
    return Math.min(1, baseOpacity + 0.08);
  }

  private pickHandle(clientX: number, clientY: number) {
    this.updatePointer(clientX, clientY);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.handleTargets, true);
    return intersects[0] ?? null;
  }

  private intersectPlane(clientX: number, clientY: number, plane: THREE.Plane) {
    this.updatePointer(clientX, clientY);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.ray.intersectPlane(plane, this.intersection) ? this.intersection.clone() : null;
  }

  private updatePointer(clientX: number, clientY: number) {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
  }
}
