"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { authClient } from "@/lib/authClient";
import { useAppStore } from "@/stores/appStore";
import AuthDialog from "@/components/authDialog";

type HomeViewProps = {
  isAuthenticated: boolean;
  displayName: string | null;
};

const TEXT_SAMPLE_GAP = 5;
const BURST_DURATION = 1.55;
const BURST_SPREAD_RATIO = 0.36;

const vertexShader = `
attribute vec3 aRandom;
attribute float aSeed;

uniform float uTime;
uniform float uPointScale;
uniform vec3 uClickPoint;
uniform float uBurstStart;
uniform float uBurstDuration;
uniform float uSpreadRatio;
uniform float uRadius;
uniform float uAmplitude;

varying vec3 vColor;
varying float vAlpha;

float easeOutCubic(float x) {
  return 1.0 - pow(1.0 - x, 3.0);
}

void main() {
  vec3 displaced = position;
  float burstTime = uTime - uBurstStart;

  if (burstTime > 0.0 && burstTime < uBurstDuration) {
    float p = clamp(burstTime / uBurstDuration, 0.0, 1.0);
    float spreadP = clamp(p / max(uSpreadRatio, 0.001), 0.0, 1.0);
    float gatherP = clamp((p - uSpreadRatio) / max(1.0 - uSpreadRatio, 0.001), 0.0, 1.0);
    float envelope = 0.0;

    if (p < uSpreadRatio) {
      envelope = easeOutCubic(spreadP);
    } else {
      envelope = 1.0 - smoothstep(0.0, 1.0, gatherP);
    }

    vec2 delta = position.xy - uClickPoint.xy;
    float dist = length(delta);
    float influence = smoothstep(uRadius, 0.0, dist);
    vec2 dir = normalize(delta + aRandom.xy * 0.55 + vec2(0.0001));
    float amp = uAmplitude * (0.72 + aSeed * 0.62);

    displaced.xy += dir * influence * amp * envelope;
    displaced.z += (aRandom.z * 34.0 + sin(aSeed * 35.0 + uTime * 12.0) * 6.0) * influence * envelope;
  }

  float twinkle = 0.72 + 0.28 * sin(uTime * 7.5 + aSeed * 40.0);
  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uPointScale * twinkle * (320.0 / max(-mvPosition.z, 120.0));

  vColor = color;
  vAlpha = 0.75 + 0.25 * twinkle;
}
`;

const fragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  float core = smoothstep(0.26, 0.0, d);
  float halo = exp(-d * d * 11.0);
  float alpha = clamp(core * 1.05 + halo * 0.85, 0.0, 1.0) * vAlpha;

  gl_FragColor = vec4(vColor * (0.8 + halo * 0.55), alpha);
}
`;

export default function HomeView({ isAuthenticated, displayName }: HomeViewProps) {
  const router = useRouter();
  const { authMode, setAuthMode } = useAppStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#090118");
    const camera = new THREE.PerspectiveCamera(44, 1, 1, 2400);
    camera.position.z = 540;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    let pointsCore: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
    let pointsGlow: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
    let coreMaterial: THREE.ShaderMaterial | null = null;
    let glowMaterial: THREE.ShaderMaterial | null = null;
    let basePositions = new Float32Array();
    let colors = new Float32Array();
    let randomVectors = new Float32Array();
    let seeds = new Float32Array();
    const clickPoint = new THREE.Vector3();
    const helperVector = new THREE.Vector3();
    const clock = new THREE.Clock();

    const updateCamera = (width: number, height: number) => {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const createTextPositions = (width: number, height: number) => {
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
        2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z;
      const worldWidth = worldHeight * camera.aspect;
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

      colors = new Float32Array(collectedColors);
      randomVectors = new Float32Array(collectedRandoms);
      seeds = new Float32Array(collectedSeeds);
      return new Float32Array(collectedPositions);
    };

    const buildMaterial = (pointScale: number, amplitude: number) =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
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

    const disposeParticles = () => {
      if (pointsCore && pointsGlow) {
        scene.remove(pointsCore);
        scene.remove(pointsGlow);
        pointsCore.geometry.dispose();
      }
      coreMaterial?.dispose();
      glowMaterial?.dispose();
      pointsCore = null;
      pointsGlow = null;
      coreMaterial = null;
      glowMaterial = null;
    };

    const buildParticles = () => {
      disposeParticles();

      const width = window.innerWidth;
      const height = window.innerHeight;
      basePositions = createTextPositions(width, height);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(basePositions, 3));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute("aRandom", new THREE.Float32BufferAttribute(randomVectors, 3));
      geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));

      coreMaterial = buildMaterial(6.8, 150);
      glowMaterial = buildMaterial(14.5, 168);

      pointsCore = new THREE.Points(geometry, coreMaterial);
      pointsGlow = new THREE.Points(geometry, glowMaterial);
      scene.add(pointsGlow);
      scene.add(pointsCore);
    };

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      updateCamera(width, height);
      buildParticles();
    };

    const updateClickWorldPoint = (clientX: number, clientY: number) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      helperVector.set((clientX / width) * 2 - 1, -(clientY / height) * 2 + 1, 0.5);
      helperVector.unproject(camera);
      helperVector.sub(camera.position).normalize();
      const distance = -camera.position.z / helperVector.z;
      clickPoint.copy(camera.position).add(helperVector.multiplyScalar(distance));
    };

    const isClickOnText = () => {
      if (basePositions.length === 0) return false;
      let minDistSq = Number.POSITIVE_INFINITY;
      for (let i = 0; i < basePositions.length; i += 12) {
        const dx = basePositions[i] - clickPoint.x;
        const dy = basePositions[i + 1] - clickPoint.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < minDistSq) minDistSq = d2;
      }
      return minDistSq < 28 * 28;
    };

    const triggerBurst = () => {
      const now = clock.getElapsedTime();
      if (coreMaterial && glowMaterial) {
        coreMaterial.uniforms.uClickPoint.value.copy(clickPoint);
        glowMaterial.uniforms.uClickPoint.value.copy(clickPoint);
        coreMaterial.uniforms.uBurstStart.value = now;
        glowMaterial.uniforms.uBurstStart.value = now;
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      updateClickWorldPoint(event.clientX, event.clientY);
      if (!isClickOnText()) return;
      triggerBurst();
    };

    resize();
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    let animationFrame = 0;
    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      if (coreMaterial && glowMaterial) {
        coreMaterial.uniforms.uTime.value = elapsed;
        glowMaterial.uniforms.uTime.value = elapsed;
      }
      renderer.render(scene, camera);
    };
    animate();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.cancelAnimationFrame(animationFrame);
      disposeParticles();
      renderer.dispose();
      if (host.contains(renderer.domElement)) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  const openAuthModal = (mode: "login" | "register") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const signOut = async () => {
    setSignOutBusy(true);
    try {
      await authClient.signOut();
      router.refresh();
    } finally {
      setSignOutBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <Box
        ref={canvasHostRef}
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          cursor: "pointer"
        }}
      />
      <Box
        sx={{
          position: "absolute",
          right: 28,
          top: 22,
          zIndex: 10,
          display: "flex",
          gap: 1.5
        }}
      >
        {!isAuthenticated ? (
          <>
            <Button
              variant="contained"
              startIcon={<LoginRoundedIcon />}
              onClick={() => openAuthModal("login")}
            >
              登录
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<PersonAddRoundedIcon />}
              onClick={() => openAuthModal("register")}
            >
              注册
            </Button>
          </>
        ) : (
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<LogoutRoundedIcon />}
            onClick={signOut}
            disabled={signOutBusy}
          >
            退出
          </Button>
        )}
      </Box>
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          top: "calc(50% + clamp(120px, 18vh, 190px))",
          transform: "translateX(-50%)",
          zIndex: 9,
          pointerEvents: "none",
          textAlign: "center"
        }}
      >
        <Typography
          sx={{
            color: "rgba(220,233,255,0.88)",
            fontSize: { xs: 16, md: 19 },
            letterSpacing: "0.04em"
          }}
        >
          3D创意平台，AI助力创作
        </Typography>
        {isAuthenticated ? (
          <Button
            variant="contained"
            size="large"
            startIcon={<OpenInNewRoundedIcon />}
            sx={{ mt: 2.2, pointerEvents: "auto" }}
            onClick={() => router.push("/editor")}
          >
            进入 Editor（{displayName || "creator"}）
          </Button>
        ) : null}
      </Box>

      <AuthDialog open={isAuthModalOpen} mode={authMode} onClose={closeAuthModal} />
    </Box>
  );
}
