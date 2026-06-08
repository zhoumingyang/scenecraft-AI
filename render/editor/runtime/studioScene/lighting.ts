import * as THREE from "three";

import type { StudioScenePresetDefinition } from "../../studioScenes";
import {
  getStudioLightFixtureClearance,
  getStudioLightFixtureRadius
} from "../../studioSceneRoomGeometry";
import {
  MIN_FRAME_RADIUS,
  ROOM_TARGET_MARGIN_RATIO,
  type StudioRoomBounds,
  type StudioSceneFrame
} from "./types";
import {
  createAreaLightPanel,
  createMaterial,
  createPlaneMesh,
  lookAtQuaternion
} from "./geometry";
import { clampPointToRoom, toRoomPoint, toWorldPoint } from "./room";

function toLightRoomPoint(
  frame: StudioSceneFrame,
  bounds: StudioRoomBounds,
  offset: [number, number, number],
  fixtureRadius: number
) {
  return clampPointToRoom(
    toWorldPoint(frame, offset),
    bounds,
    fixtureRadius + getStudioLightFixtureClearance(bounds.radius)
  );
}

function createRectAreaLight(
  preset: StudioScenePresetDefinition,
  key: "keyLight" | "fillLight",
  frame: StudioSceneFrame,
  bounds: StudioRoomBounds
) {
  const config = preset[key];
  const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
  const width = Math.min((config.width ?? 2.5) * radius, bounds.width * 0.48);
  const height = Math.min((config.height ?? 2) * radius, bounds.wallHeight * 0.55);
  const fixtureRadius = getStudioLightFixtureRadius(radius, config);
  const position = toLightRoomPoint(frame, bounds, config.position, fixtureRadius);
  const target = toRoomPoint(frame, bounds, config.target, ROOM_TARGET_MARGIN_RATIO);
  const light = new THREE.RectAreaLight(
    new THREE.Color(config.color),
    config.intensity,
    width,
    height
  );
  light.name = `studio-${key}`;
  light.position.copy(position);
  light.quaternion.copy(lookAtQuaternion(position, target));
  return light;
}

function createRimSpotLight(
  preset: StudioScenePresetDefinition,
  frame: StudioSceneFrame,
  bounds: StudioRoomBounds
) {
  const config = preset.rimLight;
  const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
  const position = toLightRoomPoint(
    frame,
    bounds,
    config.position,
    getStudioLightFixtureRadius(radius, config)
  );
  const target = toRoomPoint(frame, bounds, config.target, ROOM_TARGET_MARGIN_RATIO);
  const light = new THREE.SpotLight(
    new THREE.Color(config.color),
    config.intensity,
    config.distance ? config.distance * radius : 0,
    config.angle ?? Math.PI / 4,
    config.penumbra ?? 0.35,
    2
  );
  light.name = "studio-rim-light";
  light.position.copy(position);
  light.target.position.copy(target);
  light.castShadow = true;
  return { light, target: light.target };
}

export function createStudioLightingObjects(
  preset: StudioScenePresetDefinition,
  frame: StudioSceneFrame,
  bounds: StudioRoomBounds
) {
  const keyLight = createRectAreaLight(preset, "keyLight", frame, bounds);
  const fillLight = createRectAreaLight(preset, "fillLight", frame, bounds);
  const rimLight = createRimSpotLight(preset, frame, bounds);
  const radius = Math.max(frame.radius, MIN_FRAME_RADIUS);
  const objects: THREE.Object3D[] = [
    keyLight,
    fillLight,
    rimLight.light,
    rimLight.target,
    createAreaLightPanel({
      name: "studio-key-softbox-panel",
      position: keyLight.position.clone(),
      target: frame.center,
      width: keyLight.width,
      height: keyLight.height,
      color: preset.keyLight.color
    }),
    createAreaLightPanel({
      name: "studio-fill-softbox-panel",
      position: fillLight.position.clone(),
      target: frame.center,
      width: fillLight.width,
      height: fillLight.height,
      color: preset.fillLight.color
    })
  ];

  const ambient = new THREE.HemisphereLight(
    new THREE.Color(preset.keyLight.color),
    new THREE.Color(preset.floorColor),
    preset.id === "darkTech" ? 0.25 : 0.38
  );
  ambient.name = "studio-ambient-fill";
  objects.push(ambient);

  objects.push(
    createPlaneMesh({
      name: "studio-bounce-card",
      width: radius * 1.1,
      height: radius * 1.7,
      position: toRoomPoint(frame, bounds, [-2.2, 1.2, 1.2]),
      rotation: new THREE.Euler(0, -Math.PI / 5, 0),
      material: createMaterial("#f6f3ea")
    })
  );

  return objects;
}
