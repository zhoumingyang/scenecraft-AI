import type { Ai3DDiagnosticContext, Ai3DPartialDiagnostics } from "./types";
import { clampScore, compactUnique } from "./common";

export function evaluateTemplateDiagnostics(context: Ai3DDiagnosticContext): Ai3DPartialDiagnostics {
  const warnings: string[] = [];
  const problemCodes: string[] = [];

  const leftCount = context.nodes.filter((node) => node.nodeId.startsWith("left_")).length;
  const rightCount = context.nodes.filter((node) => node.nodeId.startsWith("right_")).length;
  const symmetryPenalty = Math.abs(leftCount - rightCount) * 18;

  const limbNodes = context.nodes.filter((node) =>
    ["arm", "leg"].some((term) => node.nodeId.includes(term))
  );
  const limbHeights = limbNodes.map((node) => node.scale[1]);
  const limbMaxHeight = limbHeights.length > 0 ? Math.max(...limbHeights) : 0;
  const limbMinHeight = limbHeights.length > 0 ? Math.min(...limbHeights) : 0;
  const limbRatio = limbMinHeight > 0 ? limbMaxHeight / limbMinHeight : 1;

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

  if (limbNodes.length >= 4 && limbRatio > 1.75) {
    warnings.push("The limb proportions are too uneven for a stable template-based character.");
    problemCodes.push("limb_proportion_off");
  }

  return {
    warnings: compactUnique(warnings),
    problemCodes: compactUnique(problemCodes),
    scoreBreakdown: {
      archetypeFit: clampScore(
        100 - symmetryPenalty - (coreMassCount < 2 ? 35 : 0) - (limbNodes.length >= 4 && limbRatio > 1.75 ? 25 : 0)
      )
    }
  };
}
