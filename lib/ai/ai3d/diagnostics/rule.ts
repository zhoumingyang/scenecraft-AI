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
    const trunkNode = nodes.find((node) => node.nodeId === "trunk");
    const branchNodes = nodes.filter((node) => node.nodeId.startsWith("branch_"));

    if (verticality < 1.2) {
      warnings.push("A growth-like subject should have a clearer upward structure.");
      problemCodes.push("weak_vertical_growth");
    }

    if (upwardBias < 0.8) {
      warnings.push("The upper masses are not clearly organized above the base structure.");
      problemCodes.push("weak_canopy_distribution");
    }

    if (trunkNode && branchNodes.length > 0) {
      const detachedBranches = branchNodes.filter((node) => {
        const horizontalDistance = Math.abs(node.position[0] - trunkNode.position[0]);
        const expectedReach = trunkNode.scale[0] * 2.8;
        return horizontalDistance > expectedReach || node.position[1] < trunkNode.position[1] * 0.55;
      });

      if (detachedBranches.length > Math.ceil(branchNodes.length / 2)) {
        warnings.push("Too many branches feel detached from the trunk structure.");
        problemCodes.push("bad_branch_attachment");
      }
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
            : 0) -
          ((context.intent?.archetype === "tree" || context.intent?.archetype === "plant") &&
          nodes.some((node) => node.nodeId === "trunk") &&
          nodes.filter((node) => node.nodeId.startsWith("branch_")).length > 0 &&
          nodes.filter((node) => node.nodeId.startsWith("branch_")).filter((node) => {
            const trunkNode = nodes.find((item) => item.nodeId === "trunk");
            if (!trunkNode) return false;
            const horizontalDistance = Math.abs(node.position[0] - trunkNode.position[0]);
            const expectedReach = trunkNode.scale[0] * 2.8;
            return horizontalDistance > expectedReach || node.position[1] < trunkNode.position[1] * 0.55;
          }).length > Math.ceil(nodes.filter((node) => node.nodeId.startsWith("branch_")).length / 2)
            ? 30
            : 0)
      )
    }
  };
}
