export const MAX_AI_3D_PRIMITIVES = 32;
export const AI3D_TOOL_NAME = "generate_stylized_ai3d_model" as const;
export const AI3D_PRIMITIVE_TYPES = [
  "box",
  "sphere",
  "cylinder",
  "capsule",
  "cone",
  "torus",
  "plane"
] as const;
export const AI3D_SHAPE_PRESETS = ["star", "heart", "leaf", "wing", "fin"] as const;
export const AI3D_TUBE_PRESETS = ["arc", "wave", "loop", "s_curve", "snake"] as const;
