import axios from "axios";
import type { AxiosResponseHeaders, RawAxiosResponseHeaders } from "axios";
import {
  getOpenRouterChatCompletionsEndpoint,
  getOpenRouterHeaders
} from "@/lib/ai/openrouter/config";
import { createHttpClient, getResponseHeader } from "@/lib/http/axios";

type OpenRouterTraceablePayload = {
  id?: string;
  error?: {
    message?: string;
  };
};

export type OpenRouterTextContent =
  | string
  | Array<{
      type?: string;
      text?: string;
      image_url?: {
        url?: string;
      };
    }>
  | undefined;

export type OpenRouterTextResponse = OpenRouterTraceablePayload & {
  choices?: Array<{
    message?: {
      content?: OpenRouterTextContent;
    };
  }>;
};

export type OpenRouterRequestContent =
  | string
  | Array<
      | {
          type: "text";
          text: string;
        }
      | {
          type: "image_url";
          image_url: {
            url: string;
          };
        }
    >;

export type OpenRouterRequestMessage = {
  role: "system" | "user" | "assistant";
  content: OpenRouterRequestContent;
};

export type OpenRouterChatCompletionRequest = {
  model: string;
  messages: OpenRouterRequestMessage[];
  stream?: boolean;
  temperature?: number;
  [key: string]: unknown;
};

const openRouterHttpClient = createHttpClient();

function readOpenRouterTraceId(
  headers: AxiosResponseHeaders | RawAxiosResponseHeaders | undefined,
  data: OpenRouterTraceablePayload | undefined
) {
  return getResponseHeader(headers, "x-request-id") ?? data?.id ?? null;
}

export async function postOpenRouterChatCompletion<
  TResponse extends OpenRouterTraceablePayload,
  TBody extends OpenRouterChatCompletionRequest = OpenRouterChatCompletionRequest
>({
  apiKey,
  body,
  timeout
}: {
  apiKey: string;
  body: TBody;
  timeout?: number;
}) {
  const response = await openRouterHttpClient.post<TResponse>(
    getOpenRouterChatCompletionsEndpoint(),
    body,
    {
      headers: getOpenRouterHeaders(apiKey),
      ...(typeof timeout === "number" ? { timeout } : {})
    }
  );

  return {
    data: response.data,
    traceId: readOpenRouterTraceId(response.headers, response.data)
  };
}

export function readOpenRouterTextContent(content: OpenRouterTextContent) {
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

export function isOpenRouterHttpError(error: unknown) {
  return axios.isAxiosError<OpenRouterTraceablePayload>(error);
}

export function formatOpenRouterErrorMessage(
  error: unknown,
  fallbackPrefix: string,
  options: {
    invalidJsonMessage?: string;
  } = {}
) {
  if (isOpenRouterHttpError(error)) {
    const traceId = readOpenRouterTraceId(error.response?.headers, error.response?.data);
    const status = error.response?.status ?? "unknown";
    const message =
      error.response?.data?.error?.message ||
      (error.response
        ? `${fallbackPrefix} failed with status ${status}.`
        : [
            `${fallbackPrefix} failed before receiving a response.`,
            error.code ? `code: ${error.code}.` : null,
            error.message ? `message: ${error.message}` : null
          ]
            .filter(Boolean)
            .join(" "));

    return traceId ? `${message} (trace: ${traceId})` : message;
  }

  if (error instanceof SyntaxError && options.invalidJsonMessage) {
    return options.invalidJsonMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return `${fallbackPrefix} failed.`;
}
