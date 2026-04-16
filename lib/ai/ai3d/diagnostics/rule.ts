import type { Ai3DDiagnosticContext, Ai3DPartialDiagnostics } from "./types";
import { clampScore, compactUnique } from "./common";

export function evaluateRuleDiagnostics(context: Ai3DDiagnosticContext): Ai3DPartialDiagnostics {
  const warnings: string[] = [];
  const problemCodes: string[] = [];
  const { bounds, nodes } = context;

  const verticality = bounds.size[1] / Math.max(bounds.size[0], bounds.size[2], 0.25);
  const upperNodeCount = nodes.filter((node) => node.position[1] > context.centroid[1]).length;
  const lowerNodeCount = Math.max(1, nodes.length - upperNodeCount);
  const upwardBias = upperNodeCount / lowerNodeCount;

  if (context.intent?.archetype === "tree" || context.intent?.archetype === "plant") {
    if (verticality < 1.2) {
      warnings.push("A growth-like subject should have a clearer upward structure.");
      problemCodes.push("weak_vertical_growth");
    }

    if (upwardBias < 0.8) {
      warnings.push("The upper masses are not clearly organized above the base structure.");
      problemCodes.push("weak_canopy_distribution");
    }
  }

  return {
    warnings: compactUnique(warnings),
    problemCodes: compactUnique(problemCodes),
    scoreBreakdown: {
      archetypeFit: clampScore(
        100 -
          ((context.intent?.archetype === "tree" || context.intent?.archetype === "plant") && verticality < 1.2
            ? 35
            : 0) -
          ((context.intent?.archetype === "tree" || context.intent?.archetype === "plant") && upwardBias < 0.8
            ? 25
            : 0)
      )
    }
  };
}
