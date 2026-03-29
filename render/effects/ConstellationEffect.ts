import * as THREE from "three";
import { constellationFragmentShader, constellationVertexShader } from "@/render/shader/constellationShader";
import type { WorldBounds } from "@/render/effects/types";

const CONSTELLATION_COUNT = 14;
const CONSTELLATION_MARGIN = 120;
const CONSTELLATION_MIN_SPEED = 7;
const CONSTELLATION_MAX_SPEED = 16;
const CONSTELLATION_POINT_SIZE = 10.6;
const CONSTELLATION_GLOW_SIZE = 24.5;

type ConstellationInstance = {
  center: THREE.Vector2;
  velocity: THREE.Vector2;
  pointCount: number;
  localOffsets: Float32Array;
  motionAmplitudes: Float32Array;
  motionFrequencies: Float32Array;
  motionPhases: Float32Array;
  worldPositions: Float32Array;
  positionsAttr: THREE.BufferAttribute;
  linePositions: Float32Array;
  linePositionsAttr: THREE.BufferAttribute;
  corePoints: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  glowPoints: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  lines: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
};

export class ConstellationEffect {
  private scene: THREE.Scene;
  private constellations: ConstellationInstance[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  resize(worldBounds: WorldBounds, elapsed: number) {
    this.buildConstellations(worldBounds, elapsed);
  }

  update(elapsed: number, dt: number, worldBounds: WorldBounds) {
    for (const item of this.constellations) {
      item.center.x += item.velocity.x * dt;
      item.center.y += item.velocity.y * dt;

      if (item.center.x > worldBounds.halfW + CONSTELLATION_MARGIN && item.velocity.x > 0) {
        item.center.x = -worldBounds.halfW - CONSTELLATION_MARGIN;
        item.center.y = THREE.MathUtils.randFloatSpread(worldBounds.halfH * 2);
      } else if (
        item.center.x < -worldBounds.halfW - CONSTELLATION_MARGIN &&
        item.velocity.x < 0
      ) {
        item.center.x = worldBounds.halfW + CONSTELLATION_MARGIN;
        item.center.y = THREE.MathUtils.randFloatSpread(worldBounds.halfH * 2);
      }

      if (item.center.y > worldBounds.halfH + CONSTELLATION_MARGIN && item.velocity.y > 0) {
        item.center.y = -worldBounds.halfH - CONSTELLATION_MARGIN;
        item.center.x = THREE.MathUtils.randFloatSpread(worldBounds.halfW * 2);
      } else if (
        item.center.y < -worldBounds.halfH - CONSTELLATION_MARGIN &&
        item.velocity.y < 0
      ) {
        item.center.y = worldBounds.halfH + CONSTELLATION_MARGIN;
        item.center.x = THREE.MathUtils.randFloatSpread(worldBounds.halfW * 2);
      }

      item.corePoints.material.uniforms.uTime.value = elapsed;
      item.glowPoints.material.uniforms.uTime.value = elapsed;
      this.updateConstellationGeometry(item, elapsed);
    }
  }

  dispose() {
    for (const item of this.constellations) {
      this.scene.remove(item.lines);
      this.scene.remove(item.corePoints);
      this.scene.remove(item.glowPoints);
      item.lines.geometry.dispose();
      item.corePoints.geometry.dispose();
      item.lines.material.dispose();
      item.corePoints.material.dispose();
      item.glowPoints.material.dispose();
    }
    this.constellations.length = 0;
  }

  private makeConstellationMaterial(pointScale: number, opacity: number) {
    return new THREE.ShaderMaterial({
      vertexShader: constellationVertexShader,
      fragmentShader: constellationFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPointScale: { value: pointScale },
        uColor: { value: new THREE.Color("#b7ddff") },
        uOpacity: { value: opacity }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  private createConstellationShape() {
    const pointCount = 5 + Math.floor(Math.random() * 4);
    const localOffsets = new Float32Array(pointCount * 3);
    const maxRadius = THREE.MathUtils.randFloat(44, 88);

    for (let i = 0; i < pointCount; i += 1) {
      const angle = (Math.PI * 2 * i) / pointCount + THREE.MathUtils.randFloatSpread(0.55);
      const radius = maxRadius * THREE.MathUtils.randFloat(0.25, 1);
      localOffsets[i * 3] = Math.cos(angle) * radius;
      localOffsets[i * 3 + 1] = Math.sin(angle) * radius;
      localOffsets[i * 3 + 2] = THREE.MathUtils.randFloatSpread(8);
    }

    return { pointCount, localOffsets };
  }

  private createConstellation(worldBounds: WorldBounds) {
    const { pointCount, localOffsets } = this.createConstellationShape();
    const worldPositions = new Float32Array(pointCount * 3);
    const pulseFlags = new Float32Array(pointCount);
    const starSeeds = new Float32Array(pointCount);
    const motionAmplitudes = new Float32Array(pointCount * 2);
    const motionFrequencies = new Float32Array(pointCount);
    const motionPhases = new Float32Array(pointCount);

    let movingStarCount = 0;
    for (let i = 0; i < pointCount; i += 1) {
      starSeeds[i] = Math.random();
      pulseFlags[i] = Math.random() > 0.55 ? THREE.MathUtils.randFloat(0.62, 0.9) : 0;

      if (Math.random() > 0.52) {
        movingStarCount += 1;
        motionAmplitudes[i * 2] = THREE.MathUtils.randFloat(2.8, 9.8);
        motionAmplitudes[i * 2 + 1] = THREE.MathUtils.randFloat(2.8, 9.8);
        motionFrequencies[i] = THREE.MathUtils.randFloat(0.9, 2.2);
        motionPhases[i] = Math.random() * Math.PI * 2;
      } else {
        motionAmplitudes[i * 2] = 0;
        motionAmplitudes[i * 2 + 1] = 0;
        motionFrequencies[i] = 0;
        motionPhases[i] = 0;
      }
    }

    if (pulseFlags.every((flag) => flag === 0)) {
      pulseFlags[Math.floor(Math.random() * pointCount)] = THREE.MathUtils.randFloat(0.65, 0.9);
    }

    if (movingStarCount === 0) {
      const chosen = Math.floor(Math.random() * pointCount);
      motionAmplitudes[chosen * 2] = THREE.MathUtils.randFloat(2.8, 9.8);
      motionAmplitudes[chosen * 2 + 1] = THREE.MathUtils.randFloat(2.8, 9.8);
      motionFrequencies[chosen] = THREE.MathUtils.randFloat(0.9, 2.2);
      motionPhases[chosen] = Math.random() * Math.PI * 2;
    }

    const positionsAttr = new THREE.BufferAttribute(worldPositions, 3);
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", positionsAttr);
    starGeometry.setAttribute("aSeed", new THREE.BufferAttribute(starSeeds, 1));
    starGeometry.setAttribute("aPulse", new THREE.BufferAttribute(pulseFlags, 1));

    const corePoints = new THREE.Points(
      starGeometry,
      this.makeConstellationMaterial(CONSTELLATION_POINT_SIZE, 0.88)
    );
    const glowPoints = new THREE.Points(
      starGeometry,
      this.makeConstellationMaterial(CONSTELLATION_GLOW_SIZE, 0.66)
    );

    const edges: number[] = [];
    for (let i = 0; i < pointCount - 1; i += 1) edges.push(i, i + 1);
    for (let i = 0; i < pointCount - 2; i += 1) {
      if (Math.random() > 0.45) edges.push(i, i + 2);
    }

    const linePositions = new Float32Array(edges.length * 3);
    const linePositionsAttr = new THREE.BufferAttribute(linePositions, 3);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", linePositionsAttr);
    const lines = new THREE.LineSegments(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: "#90c9ff",
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    lines.userData.edgeIndices = edges;

    const velocityAngle = Math.random() * Math.PI * 2;
    const velocitySpeed = THREE.MathUtils.randFloat(CONSTELLATION_MIN_SPEED, CONSTELLATION_MAX_SPEED);
    const center = new THREE.Vector2(
      THREE.MathUtils.randFloatSpread(worldBounds.halfW * 2),
      THREE.MathUtils.randFloatSpread(worldBounds.halfH * 2)
    );
    const velocity = new THREE.Vector2(
      Math.cos(velocityAngle) * velocitySpeed,
      Math.sin(velocityAngle) * velocitySpeed
    );

    this.scene.add(lines);
    this.scene.add(glowPoints);
    this.scene.add(corePoints);

    return {
      center,
      velocity,
      pointCount,
      localOffsets,
      motionAmplitudes,
      motionFrequencies,
      motionPhases,
      worldPositions,
      positionsAttr,
      linePositions,
      linePositionsAttr,
      corePoints,
      glowPoints,
      lines
    } satisfies ConstellationInstance;
  }

  private updateConstellationGeometry(item: ConstellationInstance, elapsed: number) {
    for (let i = 0; i < item.pointCount; i += 1) {
      const p = i * 3;
      const mx =
        Math.sin(elapsed * item.motionFrequencies[i] + item.motionPhases[i]) *
        item.motionAmplitudes[i * 2];
      const my =
        Math.cos(elapsed * (item.motionFrequencies[i] * 1.17) + item.motionPhases[i] * 1.12) *
        item.motionAmplitudes[i * 2 + 1];

      item.worldPositions[p] = item.center.x + item.localOffsets[p] + mx;
      item.worldPositions[p + 1] = item.center.y + item.localOffsets[p + 1] + my;
      item.worldPositions[p + 2] = item.localOffsets[p + 2] - 120;
    }

    const edgeIndices = item.lines.userData.edgeIndices as number[];
    for (let edge = 0; edge < edgeIndices.length; edge += 2) {
      const from = edgeIndices[edge] * 3;
      const to = edgeIndices[edge + 1] * 3;
      const lp = edge * 3;
      item.linePositions[lp] = item.worldPositions[from];
      item.linePositions[lp + 1] = item.worldPositions[from + 1];
      item.linePositions[lp + 2] = item.worldPositions[from + 2];
      item.linePositions[lp + 3] = item.worldPositions[to];
      item.linePositions[lp + 4] = item.worldPositions[to + 1];
      item.linePositions[lp + 5] = item.worldPositions[to + 2];
    }

    item.positionsAttr.needsUpdate = true;
    item.linePositionsAttr.needsUpdate = true;
  }

  private buildConstellations(worldBounds: WorldBounds, elapsed: number) {
    this.dispose();
    for (let i = 0; i < CONSTELLATION_COUNT; i += 1) {
      const item = this.createConstellation(worldBounds);
      this.updateConstellationGeometry(item, elapsed);
      this.constellations.push(item);
    }
  }
}
