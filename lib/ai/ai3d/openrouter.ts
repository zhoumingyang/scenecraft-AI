import axios from "axios";
import { createHttpClient, getResponseHeader } from "@/lib/http/axios";
import {
  AI3D_PRIMITIVE_TYPES,
  AI3D_SHAPE_PRESETS,
  AI3D_TUBE_PRESETS,
  validateAi3DToolCall,
  type Ai3DToolCall
} from "@/render/editor/ai3d/plan";

const OPENROUTER_TEXT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_AI3D_MODEL = "moonshotai/kimi-k2.5";
const openRouterAi3DClient = createHttpClient({
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
    "You are a 3D blockout planning model for a browser editor.",
    "Convert each user request into an immediately executable Minecraft-style blockout plan.",
    "You are authoring a DSL, not explaining steps.",
    "Return only one valid JSON object with this exact shape:",
    '{"toolName":"generate_minecraft_ai3d_model","plan":{"summary":"short text","operations":[...]}}',
    "Never return markdown, comments, prose, or code fences.",
    "The plan is the contract. The editor will execute operations exactly as written.",
    "STYLE RULES:",
    "1. The result must be a rough voxel-like blockout with simple silhouettes.",
    "2. Prefer create_primitive with primitive=box for body parts and main masses.",
    "3. If any create_primitive operations are used, at least half of them must be primitive=box.",
    "4. Use at most 16 create operations total.",
    "5. Keep materials flat and simple with Minecraft-like colors.",
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
    "For humanoids or animals, assemble them from 5 to 10 mostly box primitives: head, torso, limbs, tail, ears, etc.",
    "For icons like a star or heart, prefer create_extrude with the matching preset unless the user explicitly asks for a box-built version.",
    "For arches, tails, smiles, halos, or curved accents, use create_tube with arc, wave, or loop.",
    "EXAMPLE: user='draw a human'",
    '{"toolName":"generate_minecraft_ai3d_model","plan":{"summary":"A simple Minecraft-style human made from box primitives.","operations":[{"type":"create_primitive","nodeId":"torso","primitive":"box","label":"Torso","transform":{"position":[0,1.4,0],"scale":[1,1.4,0.6]},"material":{"color":"#5b8def","roughness":1}},{"type":"create_primitive","nodeId":"head","primitive":"box","label":"Head","transform":{"position":[0,2.45,0],"scale":[0.8,0.8,0.8]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"left_arm","primitive":"box","label":"Left Arm","transform":{"position":[-0.95,1.35,0],"scale":[0.35,1.2,0.35]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"right_arm","primitive":"box","label":"Right Arm","transform":{"position":[0.95,1.35,0],"scale":[0.35,1.2,0.35]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"left_leg","primitive":"box","label":"Left Leg","transform":{"position":[-0.28,0.35,0],"scale":[0.4,1.1,0.4]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"right_leg","primitive":"box","label":"Right Leg","transform":{"position":[0.28,0.35,0],"scale":[0.4,1.1,0.4]},"material":{"color":"#334155","roughness":1}}]}}',
    "EXAMPLE: user='draw a star'",
    '{"toolName":"generate_minecraft_ai3d_model","plan":{"summary":"A chunky extruded star badge.","operations":[{"type":"create_extrude","nodeId":"star_badge","preset":"star","depth":0.35,"label":"Star Badge","transform":{"position":[0,1.2,0],"scale":[0.9,0.9,0.35]},"material":{"color":"#f5c542","roughness":1}}]}}',
    "BAD EXAMPLE NOTES:",
    "Do not invent fields like children, geometry, dimensions, rotationEuler, textureUrl, bevel, points, parentId, or groupId.",
    "Do not omit transform.position or transform.scale on create operations."
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
  messages
}: {
  apiKey: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
}) {
  const response = await openRouterAi3DClient.post<OpenRouterTextResponse>(
    OPENROUTER_TEXT_ENDPOINT,
    {
      model: OPENROUTER_AI3D_MODEL,
      messages,
      temperature: 0.2,
      stream: false
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    }
  );

  return {
    traceId: getResponseHeader(response.headers, "x-request-id") ?? response.data.id ?? null,
    rawContent: readTextContent(response.data?.choices?.[0]?.message?.content)
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
    const systemPrompt = getSystemPrompt();
    const initialAttempt = await requestAi3DPlan({
      apiKey,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt
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
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: prompt
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
