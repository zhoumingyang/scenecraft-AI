import axios from "axios";
import type { Ai3DProvider, Ai3DStructuredResult } from "@/lib/ai/ai3d/core/types";
import {
  getAi3DDiagnosticPromptSummary,
  type Ai3DIntent,
  type Ai3DPlanDiagnostics
} from "@/lib/ai/ai3d/intent";
import type { Ai3DPlan } from "@/render/editor/ai3d/plan";
import {
  buildAi3DTemplatePlan,
  createHumanoidTemplateVariant,
  inferHumanoidTemplateParamsFromPlan,
  validateHumanoidTemplateParams,
  type HumanoidTemplateParams
} from "@/lib/ai/ai3d/templates";
import { getResponseHeader } from "@/lib/http/axios";
import { OPENROUTER_AI3D_MODEL, requestStructuredResponse } from "./client";
import { buildTextAndImagesContent, parseJsonWithValidator, readTextContent } from "./parsing";
import {
  getHumanoidTemplateOptimizeSystemPrompt,
  getHumanoidTemplateParamsSystemPrompt,
  getHumanoidTemplateReviewSystemPrompt,
  readReferenceImageNote
} from "./prompts";
import type { OpenRouterRequestContent } from "./types";
import type { OpenRouterTextResponse } from "./types";
import { resolveAi3DIntent } from "./workflow";

async function completeStructuredJson<T>({
  apiKey,
  systemPrompt,
  userContent,
  parser,
  temperature
}: {
  apiKey: string;
  systemPrompt: string;
  userContent: OpenRouterRequestContent;
  parser: (raw: string) => T;
  temperature?: number;
}): Promise<Ai3DStructuredResult<T>> {
  const initialAttempt = await requestStructuredResponse({
    apiKey,
    model: OPENROUTER_AI3D_MODEL,
    temperature,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userContent
      }
    ]
  });

  const initialRawContent = readTextContent(initialAttempt.rawContent);
  let traceId = initialAttempt.traceId;

  try {
    return {
      result: parser(initialRawContent),
      traceId
    };
  } catch (validationError) {
    const repairReason =
      validationError instanceof Error
        ? validationError.message
        : "The previous response did not satisfy the required JSON schema.";
    const repairAttempt = await requestStructuredResponse({
      apiKey,
      model: OPENROUTER_AI3D_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userContent
        },
        {
          role: "assistant",
          content: initialRawContent
        },
        {
          role: "user",
          content: [
            "Repair the previous response.",
            "Return only one corrected JSON object with the same required shape.",
            `Validation error: ${repairReason}`
          ].join(" ")
        }
      ]
    });

    traceId = repairAttempt.traceId ?? traceId;

    return {
      result: parser(readTextContent(repairAttempt.rawContent)),
      traceId
    };
  }
}

function parseHumanoidTemplateParams(raw: string) {
  return parseJsonWithValidator(raw, validateHumanoidTemplateParams);
}

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

async function requestHumanoidTemplateParams({
  apiKey,
  prompt,
  intent,
  referenceImages
}: {
  apiKey: string;
  prompt: string;
  intent: Ai3DIntent;
  referenceImages: string[];
}) {
  const variationToken = Math.random().toString(36).slice(2, 8);
  const text = [
    `Original prompt: ${prompt}`,
    `Resolved intent JSON: ${JSON.stringify(intent)}`,
    readReferenceImageNote(referenceImages),
    `Variation token: ${variationToken}`,
    "Produce a fresh but plausible humanoid variation for this request.",
    "Select the best humanoid template parameters for this subject."
  ].join("\n");

  const result = await completeStructuredJson({
    apiKey,
    systemPrompt: getHumanoidTemplateParamsSystemPrompt(),
    userContent: buildTextAndImagesContent(text, referenceImages),
    parser: parseHumanoidTemplateParams,
    temperature: 0.45
  });

  return {
    ...result,
    result: createHumanoidTemplateVariant(result.result, variationToken)
  };
}

async function reviewHumanoidTemplateParams({
  apiKey,
  prompt,
  intent,
  diagnostics,
  plan
}: {
  apiKey: string;
  prompt: string;
  intent: Ai3DIntent;
  diagnostics: Ai3DPlanDiagnostics;
  plan: Ai3DPlan;
}) {
  const text = [
    `Original prompt: ${prompt}`,
    `Resolved intent JSON: ${JSON.stringify(intent)}`,
    `Current template params JSON: ${JSON.stringify(inferHumanoidTemplateParamsFromPlan(plan))}`,
    `Current template-built plan JSON: ${JSON.stringify(plan)}`,
    `Diagnostics JSON: ${JSON.stringify(diagnostics)}`,
    getAi3DDiagnosticPromptSummary(diagnostics),
    "Return adjusted humanoid template parameters only if the current result should be improved."
  ].join("\n");

  return completeStructuredJson({
    apiKey,
    systemPrompt: getHumanoidTemplateReviewSystemPrompt(),
    userContent: text,
    parser: parseHumanoidTemplateParams,
    temperature: 0.35
  });
}

async function optimizeHumanoidTemplateParams({
  apiKey,
  prompt,
  intent,
  diagnostics,
  images,
  plan
}: {
  apiKey: string;
  prompt: string;
  intent: Ai3DIntent;
  diagnostics: Ai3DPlanDiagnostics;
  images: string[];
  plan: Ai3DPlan;
}) {
  const text = [
    `Original prompt: ${prompt}`,
    `Resolved intent JSON: ${JSON.stringify(intent)}`,
    `Current template params JSON: ${JSON.stringify(inferHumanoidTemplateParamsFromPlan(plan))}`,
    `Current template-built plan JSON: ${JSON.stringify(plan)}`,
    `Diagnostics JSON: ${JSON.stringify(diagnostics)}`,
    getAi3DDiagnosticPromptSummary(diagnostics),
    "Use the screenshots to adjust the humanoid template parameters."
  ].join("\n");

  return completeStructuredJson({
    apiKey,
    systemPrompt: getHumanoidTemplateOptimizeSystemPrompt(),
    userContent: buildTextAndImagesContent(text, images),
    parser: parseHumanoidTemplateParams,
    temperature: 0.4
  });
}

function buildHumanoidPlanFromParams({
  prompt,
  intent,
  params
}: {
  prompt: string;
  intent: Ai3DIntent;
  params: HumanoidTemplateParams;
}) {
  return buildAi3DTemplatePlan({
    templateKey: "humanoid_base",
    prompt,
    intent,
    params
  });
}

export const openRouterHumanoidTemplateProvider: Ai3DProvider = {
  key: "openrouter-humanoid-template",
  resolveIntent: resolveAi3DIntent,
  async generatePlan({ apiKey, prompt, intent, referenceImages }) {
    const paramsResult = await requestHumanoidTemplateParams({
      apiKey,
      prompt,
      intent,
      referenceImages
    });

    return {
      result: buildHumanoidPlanFromParams({
        prompt,
        intent,
        params: paramsResult.result
      }),
      traceId: paramsResult.traceId
    };
  },
  async reviewPlan({ apiKey, prompt, intent, plan, diagnostics }) {
    const paramsResult = await reviewHumanoidTemplateParams({
      apiKey,
      prompt,
      intent,
      diagnostics,
      plan
    });

    return {
      result: buildHumanoidPlanFromParams({
        prompt,
        intent,
        params: paramsResult.result
      }),
      traceId: paramsResult.traceId
    };
  },
  async optimizePlan({ apiKey, prompt, intent, plan, images, diagnostics }) {
    const paramsResult = await optimizeHumanoidTemplateParams({
      apiKey,
      prompt,
      intent,
      plan,
      images,
      diagnostics
    });

    return {
      result: buildHumanoidPlanFromParams({
        prompt,
        intent,
        params: paramsResult.result
      }),
      traceId: paramsResult.traceId
    };
  },
  toErrorMessage: toAi3DErrorMessage
};
