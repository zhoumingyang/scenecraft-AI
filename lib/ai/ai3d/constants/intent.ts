export const AI3D_INTENT_SUBJECT_TYPES = [
  "auto",
  "character",
  "animal",
  "prop",
  "icon",
  "abstract"
] as const;

export const AI3D_INTENT_DETAIL_LEVELS = ["low", "medium", "high"] as const;
export const AI3D_INTENT_POSES = ["auto", "standing", "sitting", "flying", "coiled", "static"] as const;
export const AI3D_INTENT_SYMMETRIES = ["auto", "symmetric", "asymmetric"] as const;
export const AI3D_INTENT_STYLE_BIASES = ["stylized", "cute", "clean", "chunky"] as const;
export const AI3D_GEOMETRY_BIASES = ["primitive", "tube", "extrude", "shape"] as const;
export const AI3D_ARCHETYPES = [
  "humanoid",
  "quadruped",
  "fish",
  "bird",
  "tree",
  "plant",
  "rock",
  "abstract_curve",
  "freeform_object"
] as const;
export const AI3D_ASSEMBLY_STRATEGIES = [
  "template_first",
  "rule_first",
  "freeform_first"
] as const;
export const AI3D_DIAGNOSTIC_EVALUATORS = ["template", "rule", "freeform"] as const;

export const AI3D_RESOLVED_SUBJECT_TYPES = AI3D_INTENT_SUBJECT_TYPES.filter(
  (value): value is Exclude<(typeof AI3D_INTENT_SUBJECT_TYPES)[number], "auto"> => value !== "auto"
);
export const AI3D_RESOLVED_POSES = AI3D_INTENT_POSES.filter(
  (value): value is Exclude<(typeof AI3D_INTENT_POSES)[number], "auto"> => value !== "auto"
);
export const AI3D_RESOLVED_SYMMETRIES = AI3D_INTENT_SYMMETRIES.filter(
  (value): value is Exclude<(typeof AI3D_INTENT_SYMMETRIES)[number], "auto"> => value !== "auto"
);
