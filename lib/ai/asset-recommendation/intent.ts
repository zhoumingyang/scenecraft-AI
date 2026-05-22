import axios from "axios";
import { z } from "zod";
import {
  getOpenRouterChatCompletionsEndpoint,
  getOpenRouterHeaders
} from "@/lib/ai/openrouter/config";
import { createHttpClient, getResponseHeader } from "@/lib/http/axios";
import type { AssetRecommendationInput, AssetRecommendationIntent } from "./types";

const OPENROUTER_ASSET_RECOMMENDATION_MODEL = "openai/gpt-5.4";
const textClient = createHttpClient();

type OpenRouterTextResponse = {
  id?: string;
  error?: {
    message?: string;
  };
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
};

type OpenRouterTextContent =
  | string
  | Array<{
      type?: string;
      text?: string;
    }>
  | undefined;

const intentSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(240),
    environmentQueries: z.array(z.string().trim().min(1).max(80)).max(4).default([]),
    groundTextureQueries: z.array(z.string().trim().min(1).max(80)).max(4).default([]),
    selectedTextureQueries: z.array(z.string().trim().min(1).max(80)).max(4).default([]),
    modelQueries: z.array(z.string().trim().min(1).max(80)).max(6).default([]),
    moodKeywords: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
    colorTone: z.enum(["cold", "warm", "neutral"]).default("neutral"),
    lightingHint: z.string().trim().max(160).default("")
  })
  .strict();

function readTextContent(content: OpenRouterTextContent) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => (typeof item?.text === "string" ? item.text : ""))
    .join("")
    .trim();
}

function parseJsonContent(content: string) {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const rawJson = fencedMatch?.[1] ?? content;
  return JSON.parse(rawJson);
}

function compactPromptTerms(prompt: string) {
  const normalized = prompt
    .replace(/[\u3000，。！？、；：“”‘’]/g, " ")
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, 8);

  return normalized.length > 0 ? normalized.join(" ") : prompt.trim();
}

export function createFallbackIntent(input: Pick<AssetRecommendationInput, "prompt" | "scope">) {
  const compactPrompt = compactPromptTerms(input.prompt);
  const wantsEnvironment = input.scope === "scene" || input.scope === "environment";
  const wantsMaterials =
    input.scope === "scene" || input.scope === "selection" || input.scope === "materials";
  const wantsModels = input.scope === "scene" || input.scope === "models";

  return {
    title: compactPrompt.slice(0, 72) || "Scene kit",
    description: `Poly Haven asset kit for: ${input.prompt}`,
    environmentQueries: wantsEnvironment ? [compactPrompt] : [],
    groundTextureQueries: wantsMaterials ? [compactPrompt] : [],
    selectedTextureQueries: wantsMaterials ? [compactPrompt] : [],
    modelQueries: wantsModels ? [compactPrompt] : [],
    moodKeywords: [compactPrompt],
    colorTone: "neutral",
    lightingHint: ""
  } satisfies AssetRecommendationIntent;
}

function buildSystemPrompt() {
  return [
    "You convert a 3D scene styling request into Poly Haven search intent.",
    "Return only strict JSON matching this shape:",
    '{"title":"short kit name","description":"one sentence","environmentQueries":["hdri search"],"groundTextureQueries":["ground material search"],"selectedTextureQueries":["selected object material search"],"modelQueries":["prop model search"],"moodKeywords":["style words"],"colorTone":"cold|warm|neutral","lightingHint":"short lighting note"}',
    "Use concise English search phrases, not URLs or asset IDs.",
    "Favor concrete Poly Haven terms such as studio, urban, forest, cloudy, concrete, wood, metal, brick, rock, barrel, crate, furniture, plant.",
    "For environment-only requests, keep texture and model arrays empty. For material-only requests, keep environment and model arrays empty."
  ].join(" ");
}

function buildUserPrompt(input: AssetRecommendationInput) {
  return JSON.stringify({
    prompt: input.prompt,
    scope: input.scope,
    selectedTarget: input.selectedTarget ?? null,
    sceneContext: input.sceneContext ?? null
  });
}

export async function resolveAssetRecommendationIntent(input: AssetRecommendationInput) {
  try {
    const response = await textClient.post<OpenRouterTextResponse>(
      getOpenRouterChatCompletionsEndpoint(),
      {
        model: OPENROUTER_ASSET_RECOMMENDATION_MODEL,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt()
          },
          {
            role: "user",
            content: buildUserPrompt(input)
          }
        ],
        temperature: 0.2,
        stream: false
      },
      {
        headers: getOpenRouterHeaders(input.apiKey)
      }
    );

    const traceId = getResponseHeader(response.headers, "x-request-id") ?? response.data.id ?? null;
    const content = readTextContent(response.data?.choices?.[0]?.message?.content);
    const intent = intentSchema.parse(parseJsonContent(content));

    return {
      intent,
      traceId
    };
  } catch (error) {
    if (axios.isAxiosError<OpenRouterTextResponse>(error)) {
      const traceId =
        getResponseHeader(error.response?.headers, "x-request-id") ?? error.response?.data?.id ?? null;
      const status = error.response?.status ?? "unknown";
      const message =
        error.response?.data?.error?.message ||
        `OpenRouter asset recommendation intent failed with status ${status}.`;
      throw new Error(traceId ? `${message} (trace: ${traceId})` : message);
    }

    return {
      intent: createFallbackIntent(input),
      traceId: null
    };
  }
}
