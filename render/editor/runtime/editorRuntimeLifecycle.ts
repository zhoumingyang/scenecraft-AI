import type { Clock, WebGLRenderer } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { FirstPersonController } from "./firstPersonController";

export type RuntimeStartOptions = {
  onPointerDown: (event: PointerEvent) => void;
  onFrame: (deltaSeconds: number) => boolean;
};

type RuntimeLifecycleBindings = {
  clock: Clock;
  firstPersonController: FirstPersonController;
  host: HTMLDivElement;
  onOrbitControlsChange: () => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: () => void;
  orbitControls: OrbitControls;
  renderer: WebGLRenderer;
  resize: () => void;
};

export function startRuntimeLifecycle(
  bindings: RuntimeLifecycleBindings,
  options: RuntimeStartOptions
) {
  bindings.host.appendChild(bindings.renderer.domElement);
  bindings.resize();
  bindings.clock.start();
  bindings.firstPersonController.connect();
  bindings.orbitControls.addEventListener("change", bindings.onOrbitControlsChange);
  bindings.renderer.domElement.addEventListener("pointerdown", options.onPointerDown);
  window.addEventListener("pointermove", bindings.onPointerMove);
  window.addEventListener("pointerup", bindings.onPointerUp);
  window.addEventListener("resize", bindings.resize);
}

export function stopRuntimeLifecycle(
  bindings: RuntimeLifecycleBindings,
  options: RuntimeStartOptions
) {
  bindings.clock.stop();
  window.removeEventListener("resize", bindings.resize);
  bindings.orbitControls.removeEventListener("change", bindings.onOrbitControlsChange);
  bindings.renderer.domElement.removeEventListener("pointerdown", options.onPointerDown);
  window.removeEventListener("pointermove", bindings.onPointerMove);
  window.removeEventListener("pointerup", bindings.onPointerUp);
  bindings.firstPersonController.disconnect();
}
