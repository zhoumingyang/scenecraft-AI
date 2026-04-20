import type { Ai3DIntent } from "@/lib/ai/ai3d/intent";
import type { Ai3DPlan } from "@/render/editor/ai3d/plan";

export type Ai3DRuleKey = "tree_growth";

export type Ai3DRuleBuildContext<TParams> = {
  prompt: string;
  intent: Ai3DIntent;
  params: TParams;
};

export type Ai3DRuleDefinition<TParams> = {
  key: Ai3DRuleKey;
  archetype: Ai3DIntent["archetype"];
  validateParams: (value: unknown) => TParams;
  buildPlan: (context: Ai3DRuleBuildContext<TParams>) => Ai3DPlan;
};
