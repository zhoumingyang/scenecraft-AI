import {
  postOpenRouterChatCompletion,
  type OpenRouterTextResponse
} from "@/lib/ai/openrouter/client";
import type {
  OpenRouterRequestMessage
} from "./types";

const OPENROUTER_AI3D_MODEL = "openai/gpt-5.4";

export async function requestStructuredResponse({
  apiKey,
  model,
  messages,
  temperature
}: {
  apiKey: string;
  model?: string;
  messages: OpenRouterRequestMessage[];
  temperature?: number;
}) {
  const { data, traceId } = await postOpenRouterChatCompletion<OpenRouterTextResponse>({
    apiKey,
    body: {
      model: model ?? OPENROUTER_AI3D_MODEL,
      messages,
      temperature: temperature ?? 0.2,
      stream: false
    },
    timeout: 180_000
  });

  return {
    traceId,
    rawContent: data?.choices?.[0]?.message?.content
  };
}

export { OPENROUTER_AI3D_MODEL };
