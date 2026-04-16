import type { Ai3DDiagnosticContext, Ai3DPartialDiagnostics } from "./types";
import { clampScore, compactUnique } from "./common";

export function evaluateTemplateDiagnostics(context: Ai3DDiagnosticContext): Ai3DPartialDiagnostics {
  const warnings: string[] = [];
  const problemCodes: string[] = [];

  const leftCount = context.nodes.filter((node) => node.nodeId.startsWith("left_")).length;
  const rightCount = context.nodes.filter((node) => node.nodeId.startsWith("right_")).length;
  const symmetryPenalty = Math.abs(leftCount - rightCount) * 18;

  if (context.intent?.symmetry === "symmetric" && Math.abs(leftCount - rightCount) > 1) {
    warnings.push("The plan reads as imbalanced for a symmetric subject.");
    problemCodes.push("symmetry_imbalance");
  }

  const coreMassCount = context.nodes.filter((node) =>
    ["head", "body", "torso", "pelvis", "trunk"].some((term) => node.nodeId.includes(term))
  ).length;

  if (coreMassCount < 2) {
    warnings.push("The plan lacks enough core body masses for a strongly structured subject.");
    problemCodes.push("missing_core_mass");
  }

  return {
    warnings: compactUnique(warnings),
    problemCodes: compactUnique(problemCodes),
    scoreBreakdown: {
      archetypeFit: clampScore(100 - symmetryPenalty - (coreMassCount < 2 ? 35 : 0))
    }
  };
}
