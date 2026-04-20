import type { Ai3DArchetype, Ai3DAssemblyStrategy, Ai3DIntent } from "@/lib/ai/ai3d/intent";

export function getDefaultAssemblyStrategyForArchetype(
  archetype: Ai3DArchetype
): Ai3DAssemblyStrategy {
  switch (archetype) {
    case "humanoid":
    case "quadruped":
    case "fish":
    case "bird":
      return "template_first";
    case "tree":
    case "plant":
      return "rule_first";
    case "rock":
    case "abstract_curve":
    case "freeform_object":
      return "freeform_first";
  }
}

export function getAi3DProviderKeyForIntent(intent: Ai3DIntent) {
  if (intent.archetype === "humanoid" && intent.assemblyStrategy === "template_first") {
    return "openrouter-humanoid-template";
  }

  if (intent.archetype === "tree" && intent.assemblyStrategy === "rule_first") {
    return "openrouter-tree-rule";
  }

  switch (intent.assemblyStrategy) {
    case "template_first":
    case "rule_first":
    case "freeform_first":
      return "openrouter-freeform";
  }
}
