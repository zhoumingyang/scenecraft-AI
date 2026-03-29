import * as THREE from "three";
import { textParticleFragmentShader, textParticleVertexShader } from "@/render/shader/textParticleShader";

const TEXT_SAMPLE_GAP = 5;
const BURST_DURATION = 1.55;
const BURST_SPREAD_RATIO = 0.36;

export class TextParticleEffect {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pointsCore: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
  private pointsGlow: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
  private coreMaterial: THREE.ShaderMaterial | null = null;
  private glowMaterial: THREE.ShaderMaterial | null = null;

  private basePositions = new Float32Array();
  private colors = new Float32Array();
  private randomVectors = new Float32Array();
  private seeds = new Float32Array();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  resize(width: number, height: number) {
    this.buildParticles(width, height);
  }

  update(elapsed: number) {
    if (this.coreMaterial && this.glowMaterial) {
      this.coreMaterial.uniforms.uTime.value = elapsed;
      this.glowMaterial.uniforms.uTime.value = elapsed;
    }
  }

  isPointOnText(point: THREE.Vector3) {
    if (this.basePositions.length === 0) return false;
    let minDistSq = Number.POSITIVE_INFINITY;
    for (let i = 0; i < this.basePositions.length; i += 12) {
      const dx = this.basePositions[i] - point.x;
      const dy = this.basePositions[i + 1] - point.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < minDistSq) minDistSq = d2;
    }
    return minDistSq < 28 * 28;
  }

  triggerBurst(point: THREE.Vector3, elapsed: number) {
    if (this.coreMaterial && this.glowMaterial) {
      this.coreMaterial.uniforms.uClickPoint.value.copy(point);
      this.glowMaterial.uniforms.uClickPoint.value.copy(point);
      this.coreMaterial.uniforms.uBurstStart.value = elapsed;
      this.glowMaterial.uniforms.uBurstStart.value = elapsed;
    }
  }

  dispose() {
    this.disposeParticles();
  }

  private buildMaterial(pointScale: number, amplitude: number) {
    return new THREE.ShaderMaterial({
      vertexShader: textParticleVertexShader,
      fragmentShader: textParticleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uPointScale: { value: pointScale },
        uClickPoint: { value: new THREE.Vector3(100000, 100000, 0) },
        uBurstStart: { value: -100 },
        uBurstDuration: { value: BURST_DURATION },
        uSpreadRatio: { value: BURST_SPREAD_RATIO },
        uRadius: { value: 168 },
        uAmplitude: { value: amplitude }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });
  }

  private disposeParticles() {
    if (this.pointsCore && this.pointsGlow) {
      this.scene.remove(this.pointsCore);
      this.scene.remove(this.pointsGlow);
      this.pointsCore.geometry.dispose();
    }
    this.coreMaterial?.dispose();
    this.glowMaterial?.dispose();
    this.pointsCore = null;
    this.pointsGlow = null;
    this.coreMaterial = null;
    this.glowMaterial = null;
  }

  private buildParticles(width: number, height: number) {
    this.disposeParticles();
    this.basePositions = this.createTextPositions(width, height);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.basePositions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.setAttribute("aRandom", new THREE.Float32BufferAttribute(this.randomVectors, 3));
    geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(this.seeds, 1));

    this.coreMaterial = this.buildMaterial(6.8, 150);
    this.glowMaterial = this.buildMaterial(14.5, 168);

    this.pointsCore = new THREE.Points(geometry, this.coreMaterial);
    this.pointsGlow = new THREE.Points(geometry, this.glowMaterial);
    this.scene.add(this.pointsGlow);
    this.scene.add(this.pointsCore);
  }

  private createTextPositions(width: number, height: number) {
    const canvas = document.createElement("canvas");
    const scale = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.floor(width * scale);
    canvas.height = Math.floor(height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return new Float32Array();

    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, width, height);
    const maxTextWidth = width * 0.82;
    let fontSize = Math.min(width * 0.18, height * 0.3, 220);
    ctx.font = `700 ${fontSize}px "Manrope", "PingFang SC", "Hiragino Sans GB", sans-serif`;
    while (ctx.measureText("Scenecraft AI").width > maxTextWidth && fontSize > 42) {
      fontSize -= 2;
      ctx.font = `700 ${fontSize}px "Manrope", "PingFang SC", "Hiragino Sans GB", sans-serif`;
    }

    ctx.font = `700 ${fontSize}px "Manrope", "PingFang SC", "Hiragino Sans GB", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Scenecraft AI", width / 2, height * 0.5);

    const imageData = ctx.getImageData(0, 0, width, height).data;
    const collectedPositions: number[] = [];
    const collectedColors: number[] = [];
    const collectedRandoms: number[] = [];
    const collectedSeeds: number[] = [];

    const worldHeight =
      2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * this.camera.position.z;
    const worldWidth = worldHeight * this.camera.aspect;
    const xScale = worldWidth / width;
    const yScale = worldHeight / height;

    for (let y = 0; y < height; y += TEXT_SAMPLE_GAP) {
      for (let x = 0; x < width; x += TEXT_SAMPLE_GAP) {
        const alpha = imageData[(y * width + x) * 4 + 3];
        if (alpha > 120) {
          const nx = x / width;
          const ny = y / height;
          const gradA = new THREE.Color("#ff9a55");
          const gradB = new THREE.Color("#f4abff");
          const gradC = new THREE.Color("#80d7ff");
          const gradMix = gradA.clone().lerp(gradB, nx).lerp(gradC, 1 - ny);

          const layers = 2;
          for (let layer = 0; layer < layers; layer += 1) {
            const jitterX = (Math.random() - 0.5) * 1.3;
            const jitterY = (Math.random() - 0.5) * 1.3;
            const depthOffset = (layer - 0.5) * 6 + (Math.random() - 0.5) * 1.4;
            collectedPositions.push((x - width / 2) * xScale + jitterX);
            collectedPositions.push((height * 0.5 - y) * yScale + jitterY);
            collectedPositions.push(depthOffset);

            const layerBoost = layer === 0 ? 0.95 : 1.12;
            collectedColors.push(Math.min(1, gradMix.r * layerBoost));
            collectedColors.push(Math.min(1, gradMix.g * layerBoost));
            collectedColors.push(Math.min(1, gradMix.b * layerBoost));

            collectedRandoms.push(Math.random() * 2 - 1);
            collectedRandoms.push(Math.random() * 2 - 1);
            collectedRandoms.push(Math.random() * 2 - 1);
            collectedSeeds.push(Math.random());
          }
        }
      }
    }

    this.colors = new Float32Array(collectedColors);
    this.randomVectors = new Float32Array(collectedRandoms);
    this.seeds = new Float32Array(collectedSeeds);
    return new Float32Array(collectedPositions);
  }
}
