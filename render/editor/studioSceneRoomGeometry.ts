import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const STUDIO_ROOM_HALF_EXTENT_RATIO = 0.48;
export const STUDIO_ROOM_DEFAULT_CORNER_RADIUS_RATIO = 0.16;
export const STUDIO_ROOM_MIN_CORNER_RADIUS_RATIO = 0.12;
export const STUDIO_ROOM_LIGHT_CLEARANCE_RATIO = 0.36;
export const STUDIO_ROOM_MIN_LIGHT_CLEARANCE = 0.4;
export const STUDIO_ROOM_CURVE_SEGMENTS = 24;

export type StudioRoomGeometryInput = {
  width: number;
  height: number;
  depth: number;
  radius: number;
  cornerRadiusRatio?: number;
};

export type StudioRoomLightingBoundsInput = {
  radius: number;
  width: number;
  depth: number;
  wallHeight: number;
  floorLiftRatio?: number;
  halfExtentRatio?: number;
  lights: Array<{
    position: [number, number, number];
    width?: number;
    height?: number;
  }>;
};

export function resolveStudioRoomCornerRadius({
  width,
  height,
  depth,
  radius,
  cornerRadiusRatio
}: StudioRoomGeometryInput) {
  const ratio = Math.max(
    cornerRadiusRatio && cornerRadiusRatio > 0
      ? cornerRadiusRatio
      : STUDIO_ROOM_DEFAULT_CORNER_RADIUS_RATIO,
    STUDIO_ROOM_MIN_CORNER_RADIUS_RATIO
  );
  return Math.min(
    Math.max(radius * ratio, 0.18),
    width * 0.2,
    height * 0.2,
    depth * 0.2
  );
}

export function createStudioRoundedRoomGeometry(input: StudioRoomGeometryInput) {
  const geometry = new RoundedBoxGeometry(
    input.width,
    input.height,
    input.depth,
    STUDIO_ROOM_CURVE_SEGMENTS,
    resolveStudioRoomCornerRadius(input)
  );
  geometry.computeVertexNormals();
  return geometry;
}

export function getStudioLightFixtureClearance(radius: number) {
  return Math.max(radius * STUDIO_ROOM_LIGHT_CLEARANCE_RATIO, STUDIO_ROOM_MIN_LIGHT_CLEARANCE);
}

export function getStudioLightFixtureRadius(
  radius: number,
  light: { width?: number; height?: number }
) {
  return Math.max(light.width ?? 0, light.height ?? 0, 0.8) * radius * 0.5;
}

export function expandStudioRoomBoundsForLights({
  radius,
  width,
  depth,
  wallHeight,
  floorLiftRatio = 0,
  halfExtentRatio = STUDIO_ROOM_HALF_EXTENT_RATIO,
  lights
}: StudioRoomLightingBoundsInput) {
  let halfWidth = width * halfExtentRatio;
  let halfDepth = depth * halfExtentRatio;
  let nextWallHeight = wallHeight;

  lights.forEach((light) => {
    const fixtureMargin =
      getStudioLightFixtureRadius(radius, light) + getStudioLightFixtureClearance(radius);
    halfWidth = Math.max(halfWidth, Math.abs(light.position[0] * radius) + fixtureMargin);
    halfDepth = Math.max(halfDepth, Math.abs(light.position[2] * radius) + fixtureMargin);
    nextWallHeight = Math.max(
      nextWallHeight,
      (floorLiftRatio + light.position[1]) * radius + fixtureMargin
    );
  });

  return {
    width: halfWidth / halfExtentRatio,
    depth: halfDepth / halfExtentRatio,
    wallHeight: nextWallHeight
  };
}
