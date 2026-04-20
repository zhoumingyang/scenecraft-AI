import type { Ai3DIntent } from "@/lib/ai/ai3d/intent";
import type { Ai3DPlan } from "@/render/editor/ai3d/plan";
import { humanoidBaseTemplate } from "./humanoid";
import type { Ai3DTemplateDefinition, Ai3DTemplateKey } from "./types";

const templateRegistry = new Map<Ai3DTemplateKey, Ai3DTemplateDefinition<unknown>>([
  [humanoidBaseTemplate.key, humanoidBaseTemplate as Ai3DTemplateDefinition<unknown>]
]);

export function getAi3DTemplateDefinition(templateKey: Ai3DTemplateKey) {
  const template = templateRegistry.get(templateKey);

  if (!template) {
    throw new Error(`Unknown AI 3D template: ${templateKey}`);
  }

  return template;
}

export function getDefaultTemplateKeyForIntent(intent: Ai3DIntent): Ai3DTemplateKey | null {
  if (intent.archetype === "humanoid" && intent.assemblyStrategy === "template_first") {
    return "humanoid_base";
  }

  return null;
}

export function buildAi3DTemplatePlan({
  templateKey,
  prompt,
  intent,
  params
}: {
  templateKey: Ai3DTemplateKey;
  prompt: string;
  intent: Ai3DIntent;
  params: unknown;
}): Ai3DPlan {
  const template = getAi3DTemplateDefinition(templateKey);
  const validatedParams = template.validateParams(params);

  return template.buildPlan({
    prompt,
    intent,
    params: validatedParams
  });
}
