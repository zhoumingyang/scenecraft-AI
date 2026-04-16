import type { Ai3DDiagnosticContext, Ai3DPartialDiagnostics } from "./types";
import { clampScore, compactUnique } from "./common";

export function evaluateFreeformDiagnostics(context: Ai3DDiagnosticContext): Ai3DPartialDiagnostics {
  const warnings: string[] = [];
  const problemCodes: string[] = [];
  const { primitiveBreakdown, createCount } = context;

  if (context.intent?.archetype === "abstract_curve" && primitiveBreakdown.createTube === 0) {
    warnings.push("A curved abstract subject should usually include a tube-based primary form.");
    problemCodes.push("missing_primary_curve");
  }

  if (
    primitiveBreakdown.createPrimitive >= Math.max(6, Math.ceil(createCount * 0.9)) &&
    primitiveBreakdown.createTube === 0 &&
    primitiveBreakdown.createExtrude === 0 &&
    primitiveBreakdown.createShape === 0
  ) {
    warnings.push("The plan relies almost entirely on primitive stacking, which weakens freeform silhouettes.");
    problemCodes.push("primitive_overstack");
  }

  return {
    warnings: compactUnique(warnings),
    problemCodes: compactUnique(problemCodes),
    scoreBreakdown: {
      archetypeFit: clampScore(
        100 -
          (context.intent?.archetype === "abstract_curve" && primitiveBreakdown.createTube === 0 ? 35 : 0) -
          (primitiveBreakdown.createPrimitive >= Math.max(6, Math.ceil(createCount * 0.9)) &&
          primitiveBreakdown.createTube === 0 &&
          primitiveBreakdown.createExtrude === 0 &&
          primitiveBreakdown.createShape === 0
            ? 20
            : 0)
      )
    }
  };
}
