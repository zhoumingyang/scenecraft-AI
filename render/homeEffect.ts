import * as THREE from "three";
import { ConstellationEffect } from "@/render/effects/ConstellationEffect";
import { StarfieldEffect } from "@/render/effects/StarfieldEffect";
import { TextParticleEffect } from "@/render/effects/TextParticleEffect";
import {
  getHomeEffectViewportSize,
  type HomeEffectViewportSize
} from "@/render/effects/homeEffectSizing";
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
  private pendingResizeFrame = 0;
  private resizeObserver: ResizeObserver | null = null;
  private currentSize: HomeEffectViewportSize | null = null;

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
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.scheduleResize);
      this.resizeObserver.observe(this.host);
    }
    this.scheduleResize();
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("resize", this.scheduleResize);
    this.animate();
  }

  dispose() {
    window.removeEventListener("resize", this.scheduleResize);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    window.cancelAnimationFrame(this.animationFrame);
    window.cancelAnimationFrame(this.pendingResizeFrame);
    this.resizeObserver?.disconnect();

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

  private scheduleResize = () => {
    if (this.pendingResizeFrame !== 0) return;
    this.pendingResizeFrame = window.requestAnimationFrame(() => {
      this.pendingResizeFrame = 0;
      this.resize();
    });
  };

  private resize = () => {
    const size = getHomeEffectViewportSize(this.host);
    if (!size) return;

    const { width, height } = size;
    this.currentSize = size;
    this.renderer.setSize(width, height);
    this.updateCamera(width, height);

    this.starfieldEffect.resize(this.worldBounds);
    this.textEffect.resize(width, height);
    this.constellationEffect.resize(this.worldBounds, this.clock.elapsedTime);
  };

  private updateClickWorldPoint(clientX: number, clientY: number) {
    const size = this.currentSize ?? getHomeEffectViewportSize(this.host);
    if (!size) return false;

    const { width, height } = size;

    this.helperVector.set((clientX / width) * 2 - 1, -(clientY / height) * 2 + 1, 0.5);
    this.helperVector.unproject(this.camera);
    this.helperVector.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / this.helperVector.z;
    this.clickPoint.copy(this.camera.position).add(this.helperVector.multiplyScalar(distance));
    return true;
  }

  private onPointerDown = (event: PointerEvent) => {
    if (!this.updateClickWorldPoint(event.clientX, event.clientY)) return;
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
