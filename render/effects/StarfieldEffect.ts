import * as THREE from "three";
import { starfieldFragmentShader, starfieldVertexShader } from "@/render/shader/starfieldShader";
import type { WorldBounds } from "@/render/effects/types";

const STARFIELD_COUNT = 220;
const STARFIELD_Z = -210;
const STARFIELD_POINT_SCALE = 7.8;

export class StarfieldEffect {
  private scene: THREE.Scene;
  private starfieldPoints: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
  private material: THREE.ShaderMaterial | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  resize(worldBounds: WorldBounds) {
    this.buildStarfield(worldBounds);
  }

  update(elapsed: number) {
    if (this.material) {
      this.material.uniforms.uTime.value = elapsed;
    }
  }

  dispose() {
    if (this.starfieldPoints) {
      this.scene.remove(this.starfieldPoints);
      this.starfieldPoints.geometry.dispose();
      this.starfieldPoints = null;
    }
    this.material?.dispose();
    this.material = null;
  }

  private makeMaterial() {
    return new THREE.ShaderMaterial({
      vertexShader: starfieldVertexShader,
      fragmentShader: starfieldFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPointScale: { value: STARFIELD_POINT_SCALE },
        uColor: { value: new THREE.Color("#a7cfff") },
        uOpacity: { value: 0.72 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  private buildStarfield(worldBounds: WorldBounds) {
    this.dispose();

    const positions = new Float32Array(STARFIELD_COUNT * 3);
    const starSeeds = new Float32Array(STARFIELD_COUNT);
    const pulseFlags = new Float32Array(STARFIELD_COUNT);
    const glowLevels = new Float32Array(STARFIELD_COUNT);
    const starSizes = new Float32Array(STARFIELD_COUNT);

    for (let i = 0; i < STARFIELD_COUNT; i += 1) {
      const p = i * 3;
      positions[p] = THREE.MathUtils.randFloatSpread(worldBounds.halfW * 2.55);
      positions[p + 1] = THREE.MathUtils.randFloatSpread(worldBounds.halfH * 2.45);
      positions[p + 2] = STARFIELD_Z + THREE.MathUtils.randFloatSpread(48);
      starSeeds[i] = Math.random();
      glowLevels[i] = THREE.MathUtils.randFloat(0.4, 1);
      starSizes[i] = THREE.MathUtils.randFloat(0.75, 1.95);
      pulseFlags[i] = Math.random() > 0.7 ? THREE.MathUtils.randFloat(0.45, 0.9) : 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(starSeeds, 1));
    geometry.setAttribute("aPulse", new THREE.BufferAttribute(pulseFlags, 1));
    geometry.setAttribute("aGlow", new THREE.BufferAttribute(glowLevels, 1));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(starSizes, 1));

    this.material = this.makeMaterial();
    this.starfieldPoints = new THREE.Points(geometry, this.material);
    this.scene.add(this.starfieldPoints);
  }
}
