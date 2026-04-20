import type { Ai3DIntent } from "@/lib/ai/ai3d/intent";
import type { Ai3DPlan } from "@/render/editor/ai3d/plan";

export type Ai3DTemplateKey = "humanoid_base";

export type Ai3DTemplateBuildContext<TParams> = {
  prompt: string;
  intent: Ai3DIntent;
  params: TParams;
};

export type Ai3DTemplateDefinition<TParams> = {
  key: Ai3DTemplateKey;
  archetype: Ai3DIntent["archetype"];
  validateParams: (value: unknown) => TParams;
  buildPlan: (context: Ai3DTemplateBuildContext<TParams>) => Ai3DPlan;
};
