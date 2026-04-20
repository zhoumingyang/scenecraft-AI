import type { Ai3DIntent } from "@/lib/ai/ai3d/intent";
import type { Ai3DPlan } from "@/render/editor/ai3d/plan";
import { treeGrowthRule } from "./tree";
import type { Ai3DRuleDefinition, Ai3DRuleKey } from "./types";

const ruleRegistry = new Map<Ai3DRuleKey, Ai3DRuleDefinition<unknown>>([
  [treeGrowthRule.key, treeGrowthRule as Ai3DRuleDefinition<unknown>]
]);

export function getAi3DRuleDefinition(ruleKey: Ai3DRuleKey) {
  const rule = ruleRegistry.get(ruleKey);

  if (!rule) {
    throw new Error(`Unknown AI 3D rule: ${ruleKey}`);
  }

  return rule;
}

export function getDefaultRuleKeyForIntent(intent: Ai3DIntent): Ai3DRuleKey | null {
  if (intent.archetype === "tree" && intent.assemblyStrategy === "rule_first") {
    return "tree_growth";
  }

  return null;
}

export function buildAi3DRulePlan({
  ruleKey,
  prompt,
  intent,
  params
}: {
  ruleKey: Ai3DRuleKey;
  prompt: string;
  intent: Ai3DIntent;
  params: unknown;
}): Ai3DPlan {
  const rule = getAi3DRuleDefinition(ruleKey);
  const validatedParams = rule.validateParams(params);

  return rule.buildPlan({
    prompt,
    intent,
    params: validatedParams
  });
}
