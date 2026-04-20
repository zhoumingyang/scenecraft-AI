import axios from "axios";
import { getResponseHeader } from "@/lib/http/axios";
import type { Ai3DProvider } from "@/lib/ai/ai3d/core/types";
import { openRouterTreeRuleProvider } from "./treeRule";
import type { OpenRouterTextResponse } from "./types";
import { openRouterHumanoidTemplateProvider } from "./humanoidTemplate";
import {
  optimizeAi3DPlan,
  requestAi3DPlan,
  resolveAi3DIntent,
  reviewAi3DPlan
} from "./workflow";

function toAi3DErrorMessage(error: unknown, fallbackPrefix: string) {
  if (axios.isAxiosError<OpenRouterTextResponse>(error)) {
    const traceId =
      getResponseHeader(error.response?.headers, "x-request-id") ?? error.response?.data?.id ?? null;
    const status = error.response?.status ?? "unknown";
    const message = error.response?.data?.error?.message || `${fallbackPrefix} failed with status ${status}.`;
    return traceId ? `${message} (trace: ${traceId})` : message;
  }

  if (error instanceof SyntaxError) {
    return "OpenRouter returned invalid JSON for the AI 3D pipeline.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return `${fallbackPrefix} failed.`;
}

export const openRouterAi3DProvider: Ai3DProvider = {
  key: "openrouter-freeform",
  resolveIntent: resolveAi3DIntent,
  generatePlan: requestAi3DPlan,
  reviewPlan: reviewAi3DPlan,
  optimizePlan: optimizeAi3DPlan,
  toErrorMessage: toAi3DErrorMessage
};

export { openRouterHumanoidTemplateProvider, openRouterTreeRuleProvider };

export async function generateAi3DPlanWithOpenRouter(args: Parameters<typeof resolveAi3DIntent>[0] & {
  referenceImages?: string[];
}) {
  const { generateAi3DPlan } = await import("@/lib/ai/ai3d/core/pipeline");

  return generateAi3DPlan({
    apiKey: args.apiKey,
    prompt: args.prompt,
    intent: args.intent,
    referenceImages: args.referenceImages ?? []
  });
}

export async function optimizeAi3DPlanWithOpenRouter(args: {
  apiKey: string;
  prompt: string;
  plan: Parameters<typeof optimizeAi3DPlan>[0]["plan"];
  images: string[];
  intent?: Parameters<typeof resolveAi3DIntent>[0]["intent"];
  diagnostics?: Parameters<typeof optimizeAi3DPlan>[0]["diagnostics"];
}) {
  const { optimizeAi3DPlan: optimizePipelinePlan } = await import("@/lib/ai/ai3d/core/pipeline");

  return optimizePipelinePlan({
    apiKey: args.apiKey,
    prompt: args.prompt,
    plan: args.plan,
    images: args.images,
    intent: args.intent,
    diagnostics: args.diagnostics
  });
}
