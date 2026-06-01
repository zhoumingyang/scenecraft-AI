import {
  formatOpenRouterErrorMessage,
  postOpenRouterChatCompletion,
  readOpenRouterTextContent,
  type OpenRouterTextResponse
} from "@/lib/ai/openrouter/client";
import type {
  PromptTransformMode,
  PromptTransformTarget
} from "@/lib/ai/prompt-transform/constants";

const OPENROUTER_PROMPT_MODEL = "openai/gpt-5.4";

const SHARED_OPTIMIZE_PROMPT_RULES = [
  "You rewrite prompts for AI visual generation.",
  "Return only the optimized prompt text.",
  "Do not add explanations, labels, quotes, markdown, or any extra content.",
  "Keep the same language as the input.",
  "Preserve the user's intent and avoid inventing a different subject.",
  "Improve clarity, specificity, visual detail, and generation reliability."
];

const TARGET_OPTIMIZE_PROMPT_RULES: Record<PromptTransformTarget, string[]> = {
  image: [
    "Optimize for a general image-generation model.",
    "Add concrete subject details, composition, camera or framing, lighting, style, material or surface detail, color palette, atmosphere, and image quality cues when helpful.",
    "Avoid adding texture-atlas, panorama, equirectangular, or 3D editor constraints."
  ],
  texture: [
    "Optimize for generating one seamless tileable PBR material texture atlas.",
    "Preserve the user's material intent while adding physically plausible material properties, surface detail, scale, wear, roughness, metalness, and tileability cues.",
    "Include the 3 column by 2 row atlas requirement: top row diffuse or albedo, metalness, roughness; bottom row normal, ambient occlusion, emissive.",
    "Require aligned map features across all six slots.",
    "Forbid text, labels, captions, borders, gutters, icons, annotations, and unrelated objects.",
    "Do not ask for six separate files."
  ],
  panorama: [
    "Optimize for a 360-degree equirectangular scene environment panorama.",
    "Preserve the user's environment intent while adding horizon continuity, seamless edge wrapping, background or environment lighting, sky and ground relationship, depth cues, and immersive atmosphere.",
    "Request an ultra-wide provider-compatible composition with important content inside a centered 2:1 safe area for the final 2048x1024 crop.",
    "Avoid ordinary wide landscape-photo framing, close foreground hero subjects, text, labels, UI, watermarks, and visible frame edges."
  ]
};

const TRANSLATE_PROMPT_RULES = [
  "You translate image-generation prompts into English.",
  "Return only the translated English prompt text.",
  "Do not add explanations, labels, quotes, markdown, or any extra content.",
  "If the input is already English, return it unchanged.",
  "Preserve the original intent and visual detail."
];

function getSystemPrompt(mode: PromptTransformMode, target: PromptTransformTarget = "image") {
  if (mode === "translate-en") {
    return TRANSLATE_PROMPT_RULES.join(" ");
  }

  return [...SHARED_OPTIMIZE_PROMPT_RULES, ...TARGET_OPTIMIZE_PROMPT_RULES[target]].join(" ");
}

export async function transformPromptWithOpenRouter({
  apiKey,
  mode,
  prompt,
  target = "image"
}: {
  apiKey: string;
  mode: PromptTransformMode;
  prompt: string;
  target?: PromptTransformTarget;
}) {
  try {
    const { data, traceId } = await postOpenRouterChatCompletion<OpenRouterTextResponse>({
      apiKey,
      body: {
        model: OPENROUTER_PROMPT_MODEL,
        messages: [
          {
            role: "system",
            content: getSystemPrompt(mode, target)
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        stream: false
      }
    });

    const result = readOpenRouterTextContent(data?.choices?.[0]?.message?.content);

    if (!result) {
      throw new Error("OpenRouter returned an empty prompt.");
    }

    return {
      prompt: result,
      traceId
    };
  } catch (error) {
    throw new Error(formatOpenRouterErrorMessage(error, "OpenRouter prompt transform"));
  }
}
