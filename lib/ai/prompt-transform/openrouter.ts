const OPENROUTER_TEXT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_PROMPT_MODEL = "moonshotai/kimi-k2.5";

export type PromptTransformMode = "optimize" | "translate-en";

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

function getSystemPrompt(mode: PromptTransformMode) {
  if (mode === "optimize") {
    return [
      "You rewrite image-generation prompts.",
      "Return only the optimized prompt text.",
      "Do not add explanations, labels, quotes, markdown, or any extra content.",
      "Keep the same language as the input.",
      "Improve clarity, specificity, visual detail, and generation quality.",
      "Do not change the user's intent."
    ].join(" ");
  }

  return [
    "You translate image-generation prompts into English.",
    "Return only the translated English prompt text.",
    "Do not add explanations, labels, quotes, markdown, or any extra content.",
    "If the input is already English, return it unchanged.",
    "Preserve the original intent and visual detail."
  ].join(" ");
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

export async function transformPromptWithOpenRouter({
  apiKey,
  mode,
  prompt
}: {
  apiKey: string;
  mode: PromptTransformMode;
  prompt: string;
}) {
  const response = await fetch(OPENROUTER_TEXT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENROUTER_PROMPT_MODEL,
      messages: [
        {
          role: "system",
          content: getSystemPrompt(mode)
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      stream: false
    })
  });

  const payload = (await response.json().catch(() => null)) as OpenRouterTextResponse | null;
  const traceId = response.headers.get("x-request-id") ?? payload?.id ?? null;

  if (!response.ok) {
    const message =
      payload?.error?.message || `OpenRouter prompt transform failed with status ${response.status}.`;
    throw new Error(traceId ? `${message} (trace: ${traceId})` : message);
  }

  const result = readTextContent(payload?.choices?.[0]?.message?.content);

  if (!result) {
    throw new Error("OpenRouter returned an empty prompt.");
  }

  return {
    prompt: result,
    traceId
  };
}
