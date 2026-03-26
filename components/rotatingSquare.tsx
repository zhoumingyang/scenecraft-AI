"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./rotatingSquare.module.scss";

export default function RotatingSquare() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const width = rect.width || container.clientWidth || 600;
    const height = rect.height || container.clientHeight || 400;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b1020");

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 100);
    camera.position.z = 2;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(1.6, 1.6);
    const material = new THREE.MeshBasicMaterial({
      color: "#67d7ff",
      wireframe: false
    });
    const square = new THREE.Mesh(geometry, material);
    scene.add(square);

    const handleResize = () => {
      if (!containerRef.current) return;
      const currentWidth = containerRef.current.clientWidth;
      const currentHeight = containerRef.current.clientHeight;
      camera.aspect = currentWidth / currentHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentWidth, currentHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener("resize", handleResize);

    let frame = 0;
    const animate = () => {
      square.rotation.z += 0.01;
      square.rotation.x = Math.sin(frame * 0.01) * 0.4;
      frame += 1;
      renderer.render(scene, camera);
      animationId = window.requestAnimationFrame(animate);
    };

    let animationId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(animationId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className={styles.canvasHost} />;
}
