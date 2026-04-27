export const MODEL_FILE_FORMATS = ["gltf", "glb", "fbx", "obj", "vrm"] as const;
export type ModelFileFormat = (typeof MODEL_FILE_FORMATS)[number];

export const ASSET_UNITS = ["m", "cm", "mm", "unknown"] as const;
export type AssetUnit = (typeof ASSET_UNITS)[number];

export const MODEL_ANIMATION_PLAYBACK_STATES = ["playing", "paused", "stopped"] as const;
export type ModelAnimationPlaybackState = (typeof MODEL_ANIMATION_PLAYBACK_STATES)[number];
