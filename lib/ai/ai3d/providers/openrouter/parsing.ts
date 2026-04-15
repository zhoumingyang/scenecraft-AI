import { validateAi3DIntent } from "@/lib/ai/ai3d/intent";
import { validateAi3DToolCall } from "@/render/editor/ai3d/plan";
import type { OpenRouterRequestContent, OpenRouterTextContent } from "./types";

export function readTextContent(content: OpenRouterTextContent) {
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

export function extractJsonObject(raw: string) {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error("OpenRouter returned an empty 3D response.");
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

  throw new Error("OpenRouter did not return a valid JSON object for the AI 3D pipeline.");
}

function parseJsonWithValidator<T>(raw: string, validate: (value: unknown) => T) {
  return validate(JSON.parse(extractJsonObject(raw)));
}

export function parseAi3DToolCall(raw: string) {
  return parseJsonWithValidator(raw, validateAi3DToolCall);
}

export function parseAi3DIntent(raw: string) {
  return parseJsonWithValidator(raw, validateAi3DIntent);
}

export function buildTextAndImagesContent(text: string, images: string[]): OpenRouterRequestContent {
  if (images.length === 0) {
    return text;
  }

  return [
    { type: "text", text },
    ...images.map((url) => ({
      type: "image_url" as const,
      image_url: { url }
    }))
  ];
}
