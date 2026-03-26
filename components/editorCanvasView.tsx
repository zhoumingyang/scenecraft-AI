"use client";

import { useEffect, useRef } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useRouter } from "next/navigation";
import * as THREE from "three";

type EditorCanvasViewProps = {
  displayName: string;
};

export default function EditorCanvasView({ displayName }: EditorCanvasViewProps) {
  const router = useRouter();
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!canvasHostRef.current) return;

    const container = canvasHostRef.current;
    const getSize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      return { width, height };
    };

    const { width, height } = getSize();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#05070f");
    scene.fog = new THREE.Fog("#05070f", 8, 22);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.38);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x9fd8ff, 1.2);
    dirLight.position.set(6, 10, 5);
    scene.add(dirLight);

    const pointA = new THREE.PointLight(0xc5a4ff, 1.1);
    pointA.position.set(-6, -2, 4);
    scene.add(pointA);

    const pointB = new THREE.PointLight(0x88ffd8, 0.7);
    pointB.position.set(0, 4, -4);
    scene.add(pointB);

    const geometry = new THREE.BoxGeometry(3.6, 3.6, 0.45);
    const material = new THREE.MeshStandardMaterial({
      color: "#87c8ff",
      roughness: 0.26,
      metalness: 0.35,
      emissive: "#15253f",
      emissiveIntensity: 0.5
    });
    const panel = new THREE.Mesh(geometry, material);
    panel.rotation.set(0.3, 0.6, 0);
    scene.add(panel);

    let isDragging = false;
    let isPanning = false;
    let previousX = 0;
    let previousY = 0;
    let zoomDistance = camera.position.z;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button === 0) {
        isDragging = true;
      } else if (event.button === 2) {
        isPanning = true;
      }
      previousX = event.clientX;
      previousY = event.clientY;
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - previousX;
      const deltaY = event.clientY - previousY;
      previousX = event.clientX;
      previousY = event.clientY;

      if (isDragging) {
        panel.rotation.y += deltaX * 0.005;
        panel.rotation.x += deltaY * 0.005;
      } else if (isPanning) {
        camera.position.x -= deltaX * 0.01;
        camera.position.y += deltaY * 0.01;
      }
    };

    const handlePointerUp = () => {
      isDragging = false;
      isPanning = false;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomDistance += event.deltaY * 0.01;
      zoomDistance = Math.min(Math.max(3, zoomDistance), 14);
      camera.position.z = zoomDistance;
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });
    renderer.domElement.addEventListener("contextmenu", handleContextMenu);

    const handleResize = () => {
      const { width: nextWidth, height: nextHeight } = getSize();
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener("resize", handleResize);

    let animationFrameId: number;
    const animate = () => {
      panel.rotation.z += 0.01;
      renderer.render(scene, camera);
      animationFrameId = window.requestAnimationFrame(animate);
    };

    animationFrameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("wheel", handleWheel);
      renderer.domElement.removeEventListener("contextmenu", handleContextMenu);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      scene.clear();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <Box sx={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <Box
        ref={canvasHostRef}
        sx={{
          position: "absolute",
          inset: 0
        }}
      />

      <Stack
        spacing={1}
        sx={{
          position: "absolute",
          left: { xs: 14, md: 20 },
          top: { xs: 14, md: 20 },
          p: { xs: 1.5, md: 2 },
          borderRadius: 2.5,
          border: "1px solid rgba(180,205,255,0.28)",
          background: "rgba(8,12,24,0.58)",
          backdropFilter: "blur(10px)"
        }}
      >
        <Typography variant="subtitle2" sx={{ color: "primary.main" }}>
          Editor
        </Typography>
        <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
          你好，{displayName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          鼠标拖拽旋转 · 滚轮缩放 · 右键平移
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => router.push("/home")}
        >
          返回 Home
        </Button>
      </Stack>
    </Box>
  );
}
