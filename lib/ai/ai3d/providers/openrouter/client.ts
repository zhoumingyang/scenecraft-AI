import {
  getOpenRouterChatCompletionsEndpoint,
  getOpenRouterHeaders
} from "@/lib/ai/openrouter/config";
import { createHttpClient, getResponseHeader } from "@/lib/http/axios";
import type {
  OpenRouterRequestMessage,
  OpenRouterTextResponse
} from "./types";

const OPENROUTER_AI3D_MODEL = "openai/gpt-5.4";

const openRouterAi3DClient = createHttpClient({
  timeout: 180_000
});

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
  const response = await openRouterAi3DClient.post<OpenRouterTextResponse>(
    getOpenRouterChatCompletionsEndpoint(),
    {
      model: model ?? OPENROUTER_AI3D_MODEL,
      messages,
      temperature: temperature ?? 0.2,
      stream: false
    },
    {
      headers: getOpenRouterHeaders(apiKey)
    }
  );

  return {
    traceId: getResponseHeader(response.headers, "x-request-id") ?? response.data.id ?? null,
    rawContent: response.data?.choices?.[0]?.message?.content
  };
}

export { OPENROUTER_AI3D_MODEL };
