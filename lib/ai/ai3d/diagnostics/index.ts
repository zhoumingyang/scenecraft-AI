import type { Ai3DPlanDiagnostics, Ai3DIntent } from "@/lib/ai/ai3d/intent/schema";
import type { Ai3DPlan } from "@/render/editor/ai3d/plan";
import { buildAi3DDiagnosticContext, clampScore, compactUnique, evaluateCommonDiagnostics } from "./common";
import { evaluateFreeformDiagnostics } from "./freeform";
import { evaluateRuleDiagnostics } from "./rule";
import { evaluateTemplateDiagnostics } from "./template";

function mergeDiagnosticsParts(
  ...parts: Array<ReturnType<typeof evaluateCommonDiagnostics>>
) {
  return parts.reduce(
    (acc, part) => {
      acc.warnings.push(...part.warnings);
      acc.problemCodes.push(...part.problemCodes);
      Object.assign(acc.scoreBreakdown, part.scoreBreakdown);
      return acc;
    },
    {
      warnings: [] as string[],
      problemCodes: [] as string[],
      scoreBreakdown: {} as Record<string, number>
    }
  );
}

export function getAi3DPlanDiagnostics({
  plan,
  intent
}: {
  plan: Ai3DPlan;
  intent?: Ai3DIntent;
}): Ai3DPlanDiagnostics {
  const context = buildAi3DDiagnosticContext({ plan, intent });
  const common = evaluateCommonDiagnostics(context);
  const strategySpecific =
    context.assemblyStrategy === "template_first"
      ? evaluateTemplateDiagnostics(context)
      : context.assemblyStrategy === "rule_first"
        ? evaluateRuleDiagnostics(context)
        : evaluateFreeformDiagnostics(context);
  const merged = mergeDiagnosticsParts(common, strategySpecific);

  const scoreBreakdown = {
    keyPartCoverage: clampScore(merged.scoreBreakdown.keyPartCoverage ?? 100),
    cohesion: clampScore(merged.scoreBreakdown.cohesion ?? 100),
    grounding: clampScore(merged.scoreBreakdown.grounding ?? 100),
    geometryFit: clampScore(merged.scoreBreakdown.geometryFit ?? 100),
    proportion: clampScore(merged.scoreBreakdown.proportion ?? 100),
    budget: clampScore(merged.scoreBreakdown.budget ?? 100),
    archetypeFit: clampScore(merged.scoreBreakdown.archetypeFit ?? 100)
  };

  const structuralScore = clampScore(
    scoreBreakdown.keyPartCoverage * 0.26 +
      scoreBreakdown.cohesion * 0.17 +
      scoreBreakdown.grounding * 0.11 +
      scoreBreakdown.geometryFit * 0.16 +
      scoreBreakdown.proportion * 0.1 +
      scoreBreakdown.budget * 0.1 +
      scoreBreakdown.archetypeFit * 0.1
  );

  return {
    createCount: context.createCount,
    primitiveBreakdown: context.primitiveBreakdown,
    hasTube: context.primitiveBreakdown.createTube > 0,
    hasExtrude: context.primitiveBreakdown.createExtrude > 0,
    missingKeyParts: context.missingKeyParts,
    warnings: compactUnique(merged.warnings).slice(0, 12),
    evaluator:
      context.assemblyStrategy === "template_first"
        ? "template"
        : context.assemblyStrategy === "rule_first"
          ? "rule"
          : "freeform",
    structuralScore,
    scoreBreakdown,
    problemCodes: compactUnique(merged.problemCodes).slice(0, 16)
  };
}

export function shouldAcceptAi3DPlanCandidate({
  baseline,
  candidate
}: {
  baseline?: Ai3DPlanDiagnostics;
  candidate: Ai3DPlanDiagnostics;
}) {
  if (!baseline) {
    return candidate.missingKeyParts.length === 0 && candidate.structuralScore >= 70;
  }

  if (candidate.missingKeyParts.length > baseline.missingKeyParts.length) {
    return false;
  }

  if (candidate.structuralScore > baseline.structuralScore + 2) {
    return true;
  }

  if (candidate.structuralScore < baseline.structuralScore - 2) {
    return false;
  }

  if (candidate.problemCodes.length < baseline.problemCodes.length) {
    return true;
  }

  if (candidate.problemCodes.length > baseline.problemCodes.length) {
    return false;
  }

  return candidate.warnings.length <= baseline.warnings.length;
}
