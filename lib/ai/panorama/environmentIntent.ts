import axios from "axios";
import { z } from "zod";
import {
  getOpenRouterChatCompletionsEndpoint,
  getOpenRouterHeaders
} from "@/lib/ai/openrouter/config";
import {
  aiPanoramaEnvironmentPatchSchema,
  type AiPanoramaEnvironmentPatch
} from "@/lib/api/contracts/ai";
import { createHttpClient, getResponseHeader } from "@/lib/http/axios";

const OPENROUTER_PANORAMA_INTENT_MODEL = "openai/gpt-5.4";

const panoramaIntentClient = createHttpClient({
  timeout: 90_000
});

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

type PanoramaEnvironmentIntent = {
  enhancedPrompt: string;
  atmosphereSummary: string;
  environmentPatch: AiPanoramaEnvironmentPatch;
  traceId: string | null;
};

const rawEnvironmentPatchSchema = z
  .object({
    environment: z.literal(1),
    backgroundShow: z.literal(1),
    environmentIntensity: z.number(),
    backgroundIntensity: z.number(),
    backgroundBlurriness: z.number(),
    environmentRotationY: z.number(),
    toneMappingExposure: z.number()
  })
  .strict();

const rawPanoramaEnvironmentIntentSchema = z
  .object({
    enhancedPrompt: z.string().trim().min(1).max(1800),
    atmosphereSummary: z.string().trim().min(1).max(240),
    environmentPatch: rawEnvironmentPatchSchema
  })
  .strict();

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

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

function extractJsonObject(raw: string) {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error("OpenRouter returned an empty panorama intent response.");
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1).trim();
  }

  throw new Error("OpenRouter did not return valid JSON for panorama intent.");
}

function normalizeEnvironmentPatch(
  patch: z.infer<typeof rawEnvironmentPatchSchema>
): AiPanoramaEnvironmentPatch {
  return aiPanoramaEnvironmentPatchSchema.parse({
    environment: 1,
    backgroundShow: 1,
    environmentIntensity: clamp(patch.environmentIntensity, 0.45, 1.35),
    backgroundIntensity: clamp(patch.backgroundIntensity, 0.7, 1.15),
    backgroundBlurriness: clamp(patch.backgroundBlurriness, 0.05, 0.45),
    environmentRotationY: clamp(patch.environmentRotationY, -0.8, 0.8),
    toneMappingExposure: clamp(patch.toneMappingExposure, 0.8, 1.15)
  });
}

function parsePanoramaEnvironmentIntent(raw: string, traceId: string | null) {
  const parsed = rawPanoramaEnvironmentIntentSchema.parse(
    JSON.parse(extractJsonObject(raw))
  );

  return {
    enhancedPrompt: parsed.enhancedPrompt,
    atmosphereSummary: parsed.atmosphereSummary,
    environmentPatch: normalizeEnvironmentPatch(parsed.environmentPatch),
    traceId
  } satisfies PanoramaEnvironmentIntent;
}

function buildSystemPrompt() {
  return [
    "You prepare AI panorama generation prompts for a browser-based 3D scene editor.",
    "Return only strict JSON. Do not wrap it in markdown.",
    "Shape:",
    '{"enhancedPrompt":"English panorama prompt","atmosphereSummary":"short explanation","environmentPatch":{"environment":1,"backgroundShow":1,"environmentIntensity":1,"backgroundIntensity":1,"backgroundBlurriness":0.15,"environmentRotationY":0,"toneMappingExposure":1}}',
    "Preserve the user's main subject exactly. If the user asks for a sky panorama, keep it a sky panorama.",
    "If atmosphere, weather, lighting, time of day, color tone, or visual style are missing, infer a coherent common choice that improves visual specificity without adding unrelated subjects.",
    "Do not add people, buildings, vehicles, spacecraft, fantasy objects, UI, text, logos, or landmarks unless the user asked for them.",
    "The enhancedPrompt must describe a seamless equirectangular 360-degree panorama suitable for scene background and environment lighting.",
    "Do not include postProcessing, panoUrl, panoAssetId, panoAssetName, externalSource, ground, or material fields.",
    "Environment ranges: environmentIntensity 0.45-1.35, backgroundIntensity 0.7-1.15, backgroundBlurriness 0.05-0.45, environmentRotationY -0.8-0.8, toneMappingExposure 0.8-1.15.",
    "Use lower environment intensity and exposure for night or moody scenes, higher but not overbright values for clear daylight, and more background blur for soft, foggy, or atmospheric scenes."
  ].join(" ");
}

function buildUserPrompt(prompt: string) {
  return JSON.stringify({
    prompt
  });
}

export async function resolvePanoramaEnvironmentIntent({
  apiKey,
  prompt
}: {
  apiKey: string;
  prompt: string;
}) {
  try {
    const response = await panoramaIntentClient.post<OpenRouterTextResponse>(
      getOpenRouterChatCompletionsEndpoint(),
      {
        model: OPENROUTER_PANORAMA_INTENT_MODEL,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt()
          },
          {
            role: "user",
            content: buildUserPrompt(prompt)
          }
        ],
        temperature: 0.35,
        stream: false
      },
      {
        headers: getOpenRouterHeaders(apiKey)
      }
    );
    const traceId = getResponseHeader(response.headers, "x-request-id") ?? response.data.id ?? null;
    const content = readTextContent(response.data?.choices?.[0]?.message?.content);

    return parsePanoramaEnvironmentIntent(content, traceId);
  } catch (error) {
    if (axios.isAxiosError<OpenRouterTextResponse>(error)) {
      const traceId =
        getResponseHeader(error.response?.headers, "x-request-id") ?? error.response?.data?.id ?? null;
      const status = error.response?.status ?? "unknown";
      const message =
        error.response?.data?.error?.message ||
        `OpenRouter panorama intent failed with status ${status}.`;
      throw new Error(traceId ? `${message} (trace: ${traceId})` : message);
    }

    throw error;
  }
}
