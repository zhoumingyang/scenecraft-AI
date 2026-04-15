import type { Ai3DIntent, Ai3DIntentInput, Ai3DPlanDiagnostics } from "@/lib/ai/ai3d/intent";
import { AI3D_TOOL_NAME, type Ai3DPlan } from "@/render/editor/ai3d/plan";
import type { Ai3DStructuredResult } from "@/lib/ai/ai3d/core/types";
import { OPENROUTER_AI3D_MODEL, requestStructuredResponse } from "./client";
import { buildTextAndImagesContent, parseAi3DIntent, parseAi3DToolCall, readTextContent } from "./parsing";
import { getIntentSystemPrompt, getOptimizeSystemPrompt, getPlanSystemPrompt, getReviewSystemPrompt, readReferenceImageNote } from "./prompts";
import type { OpenRouterRequestContent } from "./types";

function buildIntentHintSummary(intent?: Partial<Ai3DIntentInput>, diagnostics?: Ai3DPlanDiagnostics) {
  const sections: string[] = [];

  if (intent && Object.keys(intent).length > 0) {
    sections.push(`Structured intent hints: ${JSON.stringify(intent)}`);
  }

  if (diagnostics) {
    sections.push(`Existing plan diagnostics: ${JSON.stringify(diagnostics)}`);
  }

  return sections.join("\n");
}

async function completeStructuredJson<T>({
  apiKey,
  systemPrompt,
  userContent,
  parser
}: {
  apiKey: string;
  systemPrompt: string;
  userContent: OpenRouterRequestContent;
  parser: (raw: string) => T;
}): Promise<Ai3DStructuredResult<T>> {
  const initialAttempt = await requestStructuredResponse({
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

export async function resolveAi3DIntent({
  apiKey,
  prompt,
  intent,
  referenceImages,
  diagnostics
}: {
  apiKey: string;
  prompt: string;
  intent?: Partial<Ai3DIntentInput>;
  referenceImages: string[];
  diagnostics?: Ai3DPlanDiagnostics;
}) {
  const hintSummary = buildIntentHintSummary(intent, diagnostics);
  const text = [
    `Original prompt: ${prompt}`,
    readReferenceImageNote(referenceImages),
    hintSummary
  ]
    .filter(Boolean)
    .join("\n");

  return completeStructuredJson({
    apiKey,
    systemPrompt: getIntentSystemPrompt(),
    userContent: buildTextAndImagesContent(text, referenceImages),
    parser: parseAi3DIntent
  });
}

export async function requestAi3DPlan({
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
  const text = [
    `Original prompt: ${prompt}`,
    `Resolved intent JSON: ${JSON.stringify(intent)}`,
    readReferenceImageNote(referenceImages),
    "Build the best executable low-poly plan for this intent."
  ].join("\n");

  return completeStructuredJson({
    apiKey,
    systemPrompt: getPlanSystemPrompt(intent),
    userContent: buildTextAndImagesContent(text, referenceImages),
    parser: (raw) => parseAi3DToolCall(raw).plan
  });
}

export async function reviewAi3DPlan({
  apiKey,
  prompt,
  intent,
  plan,
  diagnostics
}: {
  apiKey: string;
  prompt: string;
  intent: Ai3DIntent;
  plan: Ai3DPlan;
  diagnostics: Ai3DPlanDiagnostics;
}) {
  const text = [
    `Original prompt: ${prompt}`,
    `Resolved intent JSON: ${JSON.stringify(intent)}`,
    `Current plan JSON: ${JSON.stringify({ toolName: AI3D_TOOL_NAME, plan })}`,
    `Current diagnostics JSON: ${JSON.stringify(diagnostics)}`,
    "If the current plan already satisfies the intent, you may return the same plan unchanged.",
    "Otherwise return a stronger complete replacement plan."
  ].join("\n");

  return completeStructuredJson({
    apiKey,
    systemPrompt: getReviewSystemPrompt(intent),
    userContent: text,
    parser: (raw) => parseAi3DToolCall(raw).plan
  });
}

export async function optimizeAi3DPlan({
  apiKey,
  prompt,
  intent,
  plan,
  images,
  diagnostics
}: {
  apiKey: string;
  prompt: string;
  intent: Ai3DIntent;
  plan: Ai3DPlan;
  images: string[];
  diagnostics: Ai3DPlanDiagnostics;
}) {
  const text = [
    `Original prompt: ${prompt}`,
    `Resolved intent JSON: ${JSON.stringify(intent)}`,
    `Current plan JSON: ${JSON.stringify({ toolName: AI3D_TOOL_NAME, plan })}`,
    `Current diagnostics JSON: ${JSON.stringify(diagnostics)}`,
    "Optimize the result using the screenshots and diagnostics.",
    "Fix only the highest-impact visual issues while preserving subject identity."
  ].join("\n");

  return completeStructuredJson({
    apiKey,
    systemPrompt: getOptimizeSystemPrompt(intent),
    userContent: buildTextAndImagesContent(text, images),
    parser: (raw) => parseAi3DToolCall(raw).plan
  });
}
