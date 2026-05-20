export const PROMPT_TRANSFORM_MODES = ["optimize", "translate-en"] as const;
export const PROMPT_TRANSFORM_TARGETS = ["image", "texture", "panorama"] as const;

export type PromptTransformMode = (typeof PROMPT_TRANSFORM_MODES)[number];
export type PromptTransformTarget = (typeof PROMPT_TRANSFORM_TARGETS)[number];
