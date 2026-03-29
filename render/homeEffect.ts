import * as THREE from "three";
import { ConstellationEffect } from "@/render/effects/ConstellationEffect";
import { StarfieldEffect } from "@/render/effects/StarfieldEffect";
import { TextParticleEffect } from "@/render/effects/TextParticleEffect";
import type { WorldBounds } from "@/render/effects/types";

export class HomeEffect {
  private host: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private textEffect: TextParticleEffect;
  private constellationEffect: ConstellationEffect;
  private starfieldEffect: StarfieldEffect;

  private worldBounds: WorldBounds = { halfW: 0, halfH: 0 };
  private clickPoint = new THREE.Vector3();
  private helperVector = new THREE.Vector3();
  private animationFrame = 0;

  constructor(host: HTMLDivElement) {
    this.host = host;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#090118");

    this.camera = new THREE.PerspectiveCamera(44, 1, 1, 2400);
    this.camera.position.z = 540;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.clock = new THREE.Clock();

    this.textEffect = new TextParticleEffect(this.scene, this.camera);
    this.constellationEffect = new ConstellationEffect(this.scene);
    this.starfieldEffect = new StarfieldEffect(this.scene);
  }

  start() {
    this.host.appendChild(this.renderer.domElement);
    this.resize();
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("resize", this.resize);
    this.animate();
  }

  dispose() {
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    window.cancelAnimationFrame(this.animationFrame);

    this.textEffect.dispose();
    this.constellationEffect.dispose();
    this.starfieldEffect.dispose();

    this.renderer.dispose();
    if (this.host.contains(this.renderer.domElement)) {
      this.host.removeChild(this.renderer.domElement);
    }
  }

  private updateCamera(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const worldHeight =
      2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * this.camera.position.z;
    this.worldBounds.halfH = worldHeight * 0.5;
    this.worldBounds.halfW = this.worldBounds.halfH * this.camera.aspect;
  }

  private resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.updateCamera(width, height);

    this.starfieldEffect.resize(this.worldBounds);
    this.textEffect.resize(width, height);
    this.constellationEffect.resize(this.worldBounds, this.clock.elapsedTime);
  };

  private updateClickWorldPoint(clientX: number, clientY: number) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.helperVector.set((clientX / width) * 2 - 1, -(clientY / height) * 2 + 1, 0.5);
    this.helperVector.unproject(this.camera);
    this.helperVector.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / this.helperVector.z;
    this.clickPoint.copy(this.camera.position).add(this.helperVector.multiplyScalar(distance));
  }

  private onPointerDown = (event: PointerEvent) => {
    this.updateClickWorldPoint(event.clientX, event.clientY);
    if (!this.textEffect.isPointOnText(this.clickPoint)) return;
    this.textEffect.triggerBurst(this.clickPoint, this.clock.elapsedTime);
  };

  private animate = () => {
    this.animationFrame = window.requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this.textEffect.update(elapsed);
    this.starfieldEffect.update(elapsed);
    this.constellationEffect.update(elapsed, dt, this.worldBounds);

    this.renderer.render(this.scene, this.camera);
  };
}
