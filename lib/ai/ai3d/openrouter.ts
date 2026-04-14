import axios from "axios";
import {
  getOpenRouterChatCompletionsEndpoint,
  getOpenRouterHeaders
} from "@/lib/ai/openrouter/config";
import { createHttpClient, getResponseHeader } from "@/lib/http/axios";
import {
  AI3D_TOOL_NAME,
  AI3D_PRIMITIVE_TYPES,
  AI3D_SHAPE_PRESETS,
  AI3D_TUBE_PRESETS,
  type Ai3DPlan,
  validateAi3DToolCall,
  type Ai3DToolCall
} from "@/render/editor/ai3d/plan";

const OPENROUTER_AI3D_MODEL = "openai/gpt-5.4";
const openRouterAi3DClient = createHttpClient({
  timeout: 180_000
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
      image_url?: {
        url?: string;
      };
    }>
  | undefined;

type OpenRouterRequestContent =
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

type OpenRouterRequestMessage = {
  role: "system" | "user" | "assistant";
  content: OpenRouterRequestContent;
};

function getSystemPrompt() {
  const supportedMaterialFields = [
    "color",
    "opacity",
    "metalness",
    "roughness",
    "emissive",
    "emissiveIntensity"
  ].join(", ");

  return [
    "You are a stylized low-poly 3D planning model for a browser editor.",
    "Convert each user request into an immediately executable low-poly sketch plan.",
    "You are authoring a DSL, not explaining steps.",
    "Return only one valid JSON object with this exact shape:",
    `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"short text","operations":[...]}}`,
    "Never return markdown, comments, prose, or code fences.",
    "The plan is the contract. The editor will execute operations exactly as written.",
    "STYLE RULES:",
    "1. The result must be a readable stylized low-poly sketch with clear silhouettes and enough parts to describe the subject convincingly.",
    "2. Prefer the geometry that best matches the form instead of defaulting to boxes.",
    "3. Use at most 32 create operations total.",
    "4. Keep materials flat and simple with clean, stylized colors.",
    "5. Add meaningful secondary forms when they improve readability, such as joints, hands, feet, ears, fins, tails, or simple facial features.",
    "6. Do not use unsupported fields, nesting, parenting, textures, maps, or metadata.",
    "AVAILABLE OPERATION TYPES:",
    "create_primitive: create one primitive mesh. Required fields: nodeId, primitive, transform.position, transform.scale. Optional: label, transform.quaternion, material.",
    "create_shape: create a flat preset silhouette. Required fields: nodeId, preset, transform.position, transform.scale. Optional: label, transform.quaternion, material.",
    "create_extrude: create an extruded preset silhouette. Required fields: nodeId, preset, transform.position, transform.scale. Optional: depth, label, transform.quaternion, material.",
    "create_tube: create a tube along a preset curve. Required fields: nodeId, preset, transform.position, transform.scale. Optional: radius, tubularSegments, radialSegments, closed, label, transform.quaternion, material.",
    "set_transform: update an existing node's transform. Required fields: nodeId, transform. transform can contain position and/or scale and/or quaternion.",
    "set_material: update an existing node's material. Required fields: nodeId, material.",
    `ALLOWED PRIMITIVES: ${AI3D_PRIMITIVE_TYPES.join(", ")}.`,
    `ALLOWED SHAPE PRESETS: ${AI3D_SHAPE_PRESETS.join(", ")}.`,
    `ALLOWED TUBE PRESETS: ${AI3D_TUBE_PRESETS.join(", ")}.`,
    `ALLOWED MATERIAL FIELDS: ${supportedMaterialFields}.`,
    "NODE RULES:",
    "Each created node must have a unique lowercase snake_case nodeId such as head, left_arm, star_badge.",
    "A set_transform or set_material operation can only target a nodeId that has already been created earlier in the operations array.",
    "TRANSFORM RULES:",
    "position is [x, y, z]. scale is [x, y, z]. quaternion is [x, y, z, w].",
    "For create operations, always include transform.position and transform.scale. Add quaternion only when rotation is truly needed.",
    "COMPOSITION GUIDANCE:",
    "For humanoids or rigid props, use primitive meshes for head, torso, pelvis, limbs, joints, or hard masses.",
    "For humanoids, prefer splitting each arm into upper_arm and lower_arm, and each leg into upper_leg and lower_leg when budget allows.",
    "For humanoids, add simple hands and feet when they improve the read of the pose.",
    "For faces on characters or animals, add a few large readable features such as eyes, nose, beak, snout, mouth, ears, or horns when they materially help recognition.",
    "Do not stop at a mannequin if the prompt clearly implies a recognizable character, creature, or expressive subject.",
    "For snakes, worms, tentacles, vines, ropes, tails, cables, smiles, arches, halos, or other curved bodies, prefer create_tube for the main body.",
    "For wings, leaves, fins, petals, badges, and other thin silhouette-driven parts, prefer create_extrude or create_shape.",
    "For icons like a star or heart, prefer create_extrude with the matching preset unless the user explicitly asks for primitive-only construction.",
    "A snake should not be built mainly from box segments when a tube can represent the body more clearly.",
    "EXAMPLE: user='draw a human'",
    `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"A stylized low-poly human with segmented limbs and simple facial features.","operations":[{"type":"create_primitive","nodeId":"torso","primitive":"capsule","label":"Torso","transform":{"position":[0,1.52,0],"scale":[0.8,1.18,0.5]},"material":{"color":"#5b8def","roughness":1}},{"type":"create_primitive","nodeId":"pelvis","primitive":"box","label":"Pelvis","transform":{"position":[0,0.82,0],"scale":[0.62,0.34,0.4]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"head","primitive":"sphere","label":"Head","transform":{"position":[0,2.5,0],"scale":[0.62,0.72,0.62]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"nose","primitive":"cone","label":"Nose","transform":{"position":[0.3,2.46,0],"scale":[0.08,0.14,0.08]},"material":{"color":"#e8b38d","roughness":1}},{"type":"create_primitive","nodeId":"left_eye","primitive":"sphere","label":"Left Eye","transform":{"position":[0.22,2.58,0.14],"scale":[0.06,0.06,0.06]},"material":{"color":"#111827","roughness":0.9}},{"type":"create_primitive","nodeId":"right_eye","primitive":"sphere","label":"Right Eye","transform":{"position":[0.22,2.58,-0.14],"scale":[0.06,0.06,0.06]},"material":{"color":"#111827","roughness":0.9}},{"type":"create_primitive","nodeId":"mouth","primitive":"capsule","label":"Mouth","transform":{"position":[0.26,2.34,0],"scale":[0.05,0.14,0.22]},"material":{"color":"#c26a5a","roughness":1}},{"type":"create_primitive","nodeId":"left_upper_arm","primitive":"cylinder","label":"Left Upper Arm","transform":{"position":[-0.84,1.74,0],"scale":[0.18,0.56,0.18]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"left_lower_arm","primitive":"cylinder","label":"Left Lower Arm","transform":{"position":[-1.08,1.15,0],"scale":[0.16,0.5,0.16]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"right_upper_arm","primitive":"cylinder","label":"Right Upper Arm","transform":{"position":[0.84,1.74,0],"scale":[0.18,0.56,0.18]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"right_lower_arm","primitive":"cylinder","label":"Right Lower Arm","transform":{"position":[1.08,1.15,0],"scale":[0.16,0.5,0.16]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"left_hand","primitive":"sphere","label":"Left Hand","transform":{"position":[-1.16,0.72,0],"scale":[0.12,0.12,0.12]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"right_hand","primitive":"sphere","label":"Right Hand","transform":{"position":[1.16,0.72,0],"scale":[0.12,0.12,0.12]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"left_upper_leg","primitive":"cylinder","label":"Left Upper Leg","transform":{"position":[-0.22,0.34,0],"scale":[0.22,0.64,0.22]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"left_lower_leg","primitive":"cylinder","label":"Left Lower Leg","transform":{"position":[-0.22,-0.42,0],"scale":[0.2,0.62,0.2]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"right_upper_leg","primitive":"cylinder","label":"Right Upper Leg","transform":{"position":[0.22,0.34,0],"scale":[0.22,0.64,0.22]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"right_lower_leg","primitive":"cylinder","label":"Right Lower Leg","transform":{"position":[0.22,-0.42,0],"scale":[0.2,0.62,0.2]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"left_foot","primitive":"box","label":"Left Foot","transform":{"position":[-0.22,-0.92,0.14],"scale":[0.18,0.08,0.32]},"material":{"color":"#1f2937","roughness":1}},{"type":"create_primitive","nodeId":"right_foot","primitive":"box","label":"Right Foot","transform":{"position":[0.22,-0.92,0.14],"scale":[0.18,0.08,0.32]},"material":{"color":"#1f2937","roughness":1}}]}}`,
    "EXAMPLE: user='draw a snake'",
    `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"A stylized snake with a curved tube body and a simple head.","operations":[{"type":"create_tube","nodeId":"body","preset":"snake","radius":0.16,"tubularSegments":72,"radialSegments":10,"label":"Body","transform":{"position":[0,0.9,0],"scale":[1.2,0.72,0.9]},"material":{"color":"#4f8a41","roughness":1}},{"type":"create_primitive","nodeId":"head","primitive":"capsule","label":"Head","transform":{"position":[1.22,1.05,0.04],"scale":[0.34,0.24,0.28]},"material":{"color":"#5f9a4f","roughness":1}},{"type":"create_primitive","nodeId":"left_eye","primitive":"sphere","label":"Left Eye","transform":{"position":[1.33,1.12,0.1],"scale":[0.05,0.05,0.05]},"material":{"color":"#101010","roughness":0.8}},{"type":"create_primitive","nodeId":"right_eye","primitive":"sphere","label":"Right Eye","transform":{"position":[1.33,1.12,-0.02],"scale":[0.05,0.05,0.05]},"material":{"color":"#101010","roughness":0.8}}]}}`,
    "EXAMPLE: user='draw a fish'",
    `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"A compact low-poly fish with a rounded body and fin silhouettes.","operations":[{"type":"create_primitive","nodeId":"body","primitive":"capsule","label":"Body","transform":{"position":[0,1.1,0],"scale":[1.15,0.52,0.48]},"material":{"color":"#5bb6d9","roughness":1}},{"type":"create_extrude","nodeId":"tail_fin","preset":"fin","depth":0.18,"label":"Tail Fin","transform":{"position":[-1.02,1.1,0],"scale":[0.55,0.62,0.18]},"material":{"color":"#4a9fc0","roughness":1}},{"type":"create_extrude","nodeId":"top_fin","preset":"fin","depth":0.16,"label":"Top Fin","transform":{"position":[-0.05,1.42,0],"scale":[0.34,0.42,0.16]},"material":{"color":"#72c8e4","roughness":1}}]}}`,
    "EXAMPLE: user='draw a star'",
    `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"A clean extruded star badge.","operations":[{"type":"create_extrude","nodeId":"star_badge","preset":"star","depth":0.35,"label":"Star Badge","transform":{"position":[0,1.2,0],"scale":[0.9,0.9,0.35]},"material":{"color":"#f5c542","roughness":1}}]}}`,
    "BAD EXAMPLE NOTES:",
    "Do not invent fields like children, geometry, dimensions, rotationEuler, textureUrl, bevel, points, parentId, or groupId.",
    "Do not omit transform.position or transform.scale on create operations."
  ].join(" ");
}

function getOptimizeSystemPrompt() {
  return [
    "You are optimizing an existing stylized low-poly 3D plan for a browser editor.",
    "You will receive the original prompt, the current JSON plan, and isolated screenshots of the current rendered result.",
    "Judge the model by the screenshots first, then use the plan to understand how to improve it.",
    "Return only one valid JSON object with this exact shape:",
    `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"short text","operations":[...]}}`,
    "You may adjust transforms, swap geometry choices, add necessary parts, delete bad parts, or replace awkward structures.",
    "Any additions, replacements, or deletions must remain faithful to the original prompt and improve the current result.",
    "Focus on visual issues such as wrong part orientation, messy layout, intersections, floating parts, awkward support, bad proportions, missing secondary forms, or overly clumsy structure.",
    "If the result reads as too primitive or mannequin-like, increase part separation with a few meaningful forms such as segmented limbs, hands, feet, facial features, ears, fins, or tails while staying within the create-operation budget.",
    "Do not drift away from the subject. Do not add unnecessary detail. Keep the result clean and executable.",
    "Return a complete replacement plan, not a patch.",
    "Never return markdown, prose, or code fences."
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

function extractJsonObject(raw: string) {
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

  throw new Error("OpenRouter did not return a valid JSON object for the 3D tool call.");
}

function parseAi3DToolCall(raw: string): Ai3DToolCall {
  return validateAi3DToolCall(JSON.parse(extractJsonObject(raw)));
}

async function requestAi3DPlan({
  apiKey,
  model,
  messages
}: {
  apiKey: string;
  model?: string;
  messages: OpenRouterRequestMessage[];
}) {
  const response = await openRouterAi3DClient.post<OpenRouterTextResponse>(
    getOpenRouterChatCompletionsEndpoint(),
    {
      model: model ?? OPENROUTER_AI3D_MODEL,
      messages,
      temperature: 0.2,
      stream: false
    },
    {
      headers: getOpenRouterHeaders(apiKey)
    }
  );

  return {
    traceId: getResponseHeader(response.headers, "x-request-id") ?? response.data.id ?? null,
    rawContent: readTextContent(response.data?.choices?.[0]?.message?.content)
  };
}

async function completeAi3DPlan({
  apiKey,
  model,
  systemPrompt,
  userContent
}: {
  apiKey: string;
  model?: string;
  systemPrompt: string;
  userContent: OpenRouterRequestContent;
}) {
  const initialAttempt = await requestAi3DPlan({
    apiKey,
    model,
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

  let traceId = initialAttempt.traceId;
  let result: Ai3DToolCall;

  try {
    result = parseAi3DToolCall(initialAttempt.rawContent);
  } catch (validationError) {
    const repairReason =
      validationError instanceof Error
        ? validationError.message
        : "The previous response did not satisfy the required JSON schema.";
    const repairAttempt = await requestAi3DPlan({
      apiKey,
      model,
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
          content: initialAttempt.rawContent
        },
        {
          role: "user",
          content: [
            "Repair the previous response.",
            "Return only one corrected JSON object with the same top-level shape.",
            `Validation error: ${repairReason}`
          ].join(" ")
        }
      ]
    });

    traceId = repairAttempt.traceId ?? traceId;
    result = parseAi3DToolCall(repairAttempt.rawContent);
  }

  return {
    ...result,
    traceId
  };
}

export async function generateAi3DPlanWithOpenRouter({
  apiKey,
  prompt
}: {
  apiKey: string;
  prompt: string;
}) {
  try {
    return await completeAi3DPlan({
      apiKey,
      systemPrompt: getSystemPrompt(),
      userContent: prompt
    });
  } catch (error) {
    if (axios.isAxiosError<OpenRouterTextResponse>(error)) {
      const traceId =
        getResponseHeader(error.response?.headers, "x-request-id") ?? error.response?.data?.id ?? null;
      const status = error.response?.status ?? "unknown";
      const message =
        error.response?.data?.error?.message ||
        `OpenRouter AI 3D generation failed with status ${status}.`;
      throw new Error(traceId ? `${message} (trace: ${traceId})` : message);
    }

    if (error instanceof SyntaxError) {
      throw new Error("OpenRouter returned invalid JSON for the AI 3D tool call.");
    }

    throw error;
  }
}

export async function optimizeAi3DPlanWithOpenRouter({
  apiKey,
  prompt,
  plan,
  images
}: {
  apiKey: string;
  prompt: string;
  plan: Ai3DPlan;
  images: string[];
}) {
  try {
    const text = [
      "Optimize the current 3D result using the screenshots and the current plan.",
      "The screenshots are isolated views of the current generated model only.",
      "The images are provided in this order: front view, side view, top view.",
      "You may add, replace, or delete parts if doing so makes the result more reasonable and closer to the prompt.",
      `Original prompt: ${prompt}`,
      `Current plan JSON: ${JSON.stringify({ toolName: AI3D_TOOL_NAME, plan })}`
    ].join("\n");

    return await completeAi3DPlan({
      apiKey,
      model: OPENROUTER_AI3D_MODEL,
      systemPrompt: getOptimizeSystemPrompt(),
      userContent: [
        { type: "text", text },
        ...images.map((url) => ({
          type: "image_url" as const,
          image_url: { url }
        }))
      ]
    });
  } catch (error) {
    if (axios.isAxiosError<OpenRouterTextResponse>(error)) {
      const traceId =
        getResponseHeader(error.response?.headers, "x-request-id") ?? error.response?.data?.id ?? null;
      const status = error.response?.status ?? "unknown";
      const message =
        error.response?.data?.error?.message ||
        `OpenRouter AI 3D optimization failed with status ${status}.`;
      throw new Error(traceId ? `${message} (trace: ${traceId})` : message);
    }

    if (error instanceof SyntaxError) {
      throw new Error("OpenRouter returned invalid JSON for the AI 3D tool call.");
    }

    throw error;
  }
}
