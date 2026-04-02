import * as THREE from "three";

type KeyState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
};

export class FirstPersonController {
  enabled = false;
  private static readonly MAX_PITCH = Math.PI / 2 - 1e-3;

  private readonly camera: THREE.Camera;
  private readonly domElement: HTMLCanvasElement;
  private readonly keyState: KeyState = {
    forward: false,
    backward: false,
    left: false,
    right: false
  };
  private yaw = 0;
  private pitch = 0;
  private isDragging = false;
  private lastPointerX: number | null = null;
  private lastPointerY: number | null = null;
  private readonly lookSpeed = 0.003;
  private readonly moveSpeed = 8;
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private readonly worldUp = new THREE.Vector3(0, 1, 0);

  constructor(camera: THREE.Camera, domElement: HTMLCanvasElement) {
    this.camera = camera;
    this.domElement = domElement;
  }

  connect() {
    this.domElement.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.domElement.addEventListener("contextmenu", this.onContextMenu);
  }

  disconnect() {
    this.domElement.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.domElement.removeEventListener("contextmenu", this.onContextMenu);
    this.resetKeys();
    this.resetPointer();
  }

  syncFromCamera() {
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ");
    this.yaw = euler.y;
    this.pitch = THREE.MathUtils.clamp(
      euler.x,
      -FirstPersonController.MAX_PITCH,
      FirstPersonController.MAX_PITCH
    );
    this.applyRotationToCamera();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.resetKeys();
      this.resetPointer();
    }
  }

  update(deltaSeconds: number) {
    if (!this.enabled) return;

    this.forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-6) {
      this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    }
    this.forward.normalize();

    this.right.crossVectors(this.forward, this.worldUp);
    if (this.right.lengthSq() < 1e-6) return;
    this.right.normalize();

    this.velocity.set(0, 0, 0);
    if (this.keyState.forward) this.velocity.add(this.forward);
    if (this.keyState.backward) this.velocity.sub(this.forward);
    if (this.keyState.left) this.velocity.sub(this.right);
    if (this.keyState.right) this.velocity.add(this.right);
    if (this.velocity.lengthSq() === 0) return;

    this.velocity.normalize().multiplyScalar(this.moveSpeed * deltaSeconds);
    this.camera.position.add(this.velocity);
  }

  private onMouseDown = (event: MouseEvent) => {
    if (!this.enabled) return;
    if (event.button !== 0) return;
    event.preventDefault();
    this.isDragging = true;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.enabled || !this.isDragging) return;
    if (this.lastPointerX === null || this.lastPointerY === null) {
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
      return;
    }

    const deltaX = event.movementX || event.clientX - this.lastPointerX;
    const deltaY = event.movementY || event.clientY - this.lastPointerY;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    if (deltaX === 0 && deltaY === 0) return;

    this.yaw -= deltaX * this.lookSpeed;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - deltaY * this.lookSpeed,
      -FirstPersonController.MAX_PITCH,
      FirstPersonController.MAX_PITCH
    );
    this.applyRotationToCamera();
  };

  private onMouseUp = (event: MouseEvent) => {
    if (event.button !== 0) return;
    this.isDragging = false;
    this.resetPointer();
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.enabled) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.code === "KeyW") this.keyState.forward = true;
    if (event.code === "KeyS") this.keyState.backward = true;
    if (event.code === "KeyA") this.keyState.left = true;
    if (event.code === "KeyD") this.keyState.right = true;
  };

  private onKeyUp = (event: KeyboardEvent) => {
    if (event.code === "KeyW") this.keyState.forward = false;
    if (event.code === "KeyS") this.keyState.backward = false;
    if (event.code === "KeyA") this.keyState.left = false;
    if (event.code === "KeyD") this.keyState.right = false;
  };

  private onContextMenu = (event: MouseEvent) => {
    if (!this.enabled) return;
    event.preventDefault();
  };

  private resetKeys() {
    this.keyState.forward = false;
    this.keyState.backward = false;
    this.keyState.left = false;
    this.keyState.right = false;
  }

  private resetPointer() {
    this.isDragging = false;
    this.lastPointerX = null;
    this.lastPointerY = null;
  }

  private applyRotationToCamera() {
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"));
  }
}
