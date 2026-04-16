import { getAi3DPlanDiagnostics, shouldAcceptAi3DPlanCandidate, type Ai3DPlanDiagnostics } from "@/lib/ai/ai3d/intent";
import { AI3D_TOOL_NAME, type Ai3DPlan } from "@/render/editor/ai3d/plan";
import { getAi3DProvider, getAi3DProviderForIntent } from "./registry";
import type { Ai3DGenerateContext, Ai3DOptimizeContext } from "./types";

function toError(message: string) {
  return new Error(message);
}

export async function generateAi3DPlan({
  apiKey,
  prompt,
  intent,
  referenceImages = []
}: Ai3DGenerateContext) {
  const intentProvider = getAi3DProvider();

  try {
    const intentResult = await intentProvider.resolveIntent({
      apiKey,
      prompt,
      intent,
      referenceImages
    });
    const provider = getAi3DProviderForIntent(intentResult.result);
    const planResult = await provider.generatePlan({
      apiKey,
      prompt,
      intent: intentResult.result,
      referenceImages
    });

    let finalPlan: Ai3DPlan = planResult.result;
    let finalDiagnostics = getAi3DPlanDiagnostics({
      plan: finalPlan,
      intent: intentResult.result
    });
    let traceId = planResult.traceId ?? intentResult.traceId;

    if (
      finalDiagnostics.structuralScore < 75 ||
      finalDiagnostics.problemCodes.length > 0 ||
      finalDiagnostics.missingKeyParts.length > 0
    ) {
      try {
        const reviewResult = await provider.reviewPlan({
          apiKey,
          prompt,
          intent: intentResult.result,
          plan: finalPlan,
          diagnostics: finalDiagnostics
        });
        const reviewedDiagnostics = getAi3DPlanDiagnostics({
          plan: reviewResult.result,
          intent: intentResult.result
        });

        if (
          shouldAcceptAi3DPlanCandidate({
            baseline: finalDiagnostics,
            candidate: reviewedDiagnostics
          })
        ) {
          finalPlan = reviewResult.result;
          finalDiagnostics = reviewedDiagnostics;
          traceId = reviewResult.traceId ?? traceId;
        }
      } catch {
        // Keep the initial plan if the review pass fails.
      }
    }

    return {
      toolName: AI3D_TOOL_NAME,
      plan: finalPlan,
      intent: intentResult.result,
      diagnostics: finalDiagnostics,
      traceId
    };
  } catch (error) {
    throw toError(intentProvider.toErrorMessage(error, "OpenRouter AI 3D generation"));
  }
}

export async function optimizeAi3DPlan({
  apiKey,
  prompt,
  plan,
  images,
  intent,
  diagnostics
}: Ai3DOptimizeContext) {
  const intentProvider = getAi3DProvider();

  try {
    const intentResult = await intentProvider.resolveIntent({
      apiKey,
      prompt,
      intent,
      referenceImages: [],
      diagnostics
    });
    const provider = getAi3DProviderForIntent(intentResult.result);
    const baselineDiagnostics: Ai3DPlanDiagnostics =
      diagnostics ??
      getAi3DPlanDiagnostics({
        plan,
        intent: intentResult.result
      });
    const optimizeResult = await provider.optimizePlan({
      apiKey,
      prompt,
      intent: intentResult.result,
      plan,
      images,
      diagnostics: baselineDiagnostics
    });
    const candidateDiagnostics = getAi3DPlanDiagnostics({
      plan: optimizeResult.result,
      intent: intentResult.result
    });
    const accepted = shouldAcceptAi3DPlanCandidate({
      baseline: baselineDiagnostics,
      candidate: candidateDiagnostics
    });

    return {
      toolName: AI3D_TOOL_NAME,
      plan: accepted ? optimizeResult.result : plan,
      intent: intentResult.result,
      diagnostics: accepted ? candidateDiagnostics : baselineDiagnostics,
      traceId: optimizeResult.traceId ?? intentResult.traceId
    };
  } catch (error) {
    throw toError(intentProvider.toErrorMessage(error, "OpenRouter AI 3D optimization"));
  }
}

export type { Ai3DPlanDiagnostics };
