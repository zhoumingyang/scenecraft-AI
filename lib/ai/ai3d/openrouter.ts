import axios from "axios";
import { createHttpClient, getResponseHeader } from "@/lib/http/axios";
import type {
  Ai3DCreateExtrudeOperation,
  Ai3DCreatePrimitiveOperation,
  Ai3DCreateShapeOperation,
  Ai3DCreateTubeOperation,
  Ai3DOperation,
  Ai3DPlan,
  Ai3DPrimitiveType
} from "@/render/editor/ai3d/plan";

const OPENROUTER_TEXT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_AI3D_MODEL = "moonshotai/kimi-k2.5";
const openRouterAi3DClient = createHttpClient({
  timeout: 90_000
});

const AI3D_TOOL_NAME = "generate_minecraft_ai3d_model" as const;
const AI3D_PRIMITIVE_TYPES = new Set<Ai3DPrimitiveType>([
  "box",
  "sphere",
  "cylinder",
  "capsule",
  "cone",
  "torus",
  "plane"
]);
const SHAPE_PRESETS = new Set(["star", "heart"]);
const TUBE_PRESETS = new Set(["arc", "wave", "loop"]);

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

type Ai3DToolCall = {
  toolName: typeof AI3D_TOOL_NAME;
  plan: Ai3DPlan;
};

function getSystemPrompt() {
  return [
    "You are a 3D blockout planning model for a browser editor.",
    "Convert the user's request into a concise Minecraft-style sketch model plan.",
    "Return only valid JSON with this exact shape:",
    '{"toolName":"generate_minecraft_ai3d_model","plan":{"summary":"...","operations":[...]}}',
    "Do not return markdown, code fences, prose, or explanations.",
    "The plan must be box-heavy and align with Minecraft aesthetics.",
    "Use at most 16 create operations.",
    "Prefer create_primitive with primitive=box unless another primitive is clearly necessary.",
    "Allowed operation types: create_primitive, create_shape, create_extrude, create_tube, set_transform, set_material.",
    "Allowed primitives: box, sphere, cylinder, capsule, cone, torus, plane.",
    "Allowed shape presets: star, heart.",
    "Allowed tube presets: arc, wave, loop.",
    "Each created node must have a unique nodeId using lowercase snake_case.",
    "Every create operation should include a transform.position and transform.scale.",
    "Keep materials simple with flat Minecraft-like colors.",
    "Do not generate textures, nested structures, or unsupported fields.",
    "The plan must be immediately executable by the editor as a rough voxel-like blockout."
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

function isFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateVector(value: unknown, fieldName: string) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(isFiniteNumber)) {
    throw new Error(`${fieldName} must be a numeric [x, y, z] tuple.`);
  }
}

function validateQuaternion(value: unknown, fieldName: string) {
  if (!Array.isArray(value) || value.length !== 4 || !value.every(isFiniteNumber)) {
    throw new Error(`${fieldName} must be a numeric [x, y, z, w] tuple.`);
  }
}

function validateTransform(transform: unknown, fieldName: string) {
  if (!transform || typeof transform !== "object") {
    throw new Error(`${fieldName} must be an object.`);
  }

  const payload = transform as Record<string, unknown>;

  if ("position" in payload && payload.position !== undefined) {
    validateVector(payload.position, `${fieldName}.position`);
  }
  if ("scale" in payload && payload.scale !== undefined) {
    validateVector(payload.scale, `${fieldName}.scale`);
  }
  if ("quaternion" in payload && payload.quaternion !== undefined) {
    validateQuaternion(payload.quaternion, `${fieldName}.quaternion`);
  }
}

function validateMaterial(material: unknown, fieldName: string) {
  if (!material || typeof material !== "object") {
    throw new Error(`${fieldName} must be an object.`);
  }
}

function validateCreatePrimitiveOperation(operation: Record<string, unknown>) {
  if (!AI3D_PRIMITIVE_TYPES.has(operation.primitive as Ai3DPrimitiveType)) {
    throw new Error(`Unsupported primitive: ${String(operation.primitive)}.`);
  }

  if (operation.transform === undefined) {
    throw new Error("create_primitive requires operation.transform.");
  }

  validateTransform(operation.transform, "operation.transform");
  const transform = operation.transform as Record<string, unknown>;

  if (transform.position === undefined || transform.scale === undefined) {
    throw new Error("create_primitive requires transform.position and transform.scale.");
  }

  if (operation.material !== undefined) {
    validateMaterial(operation.material, "operation.material");
  }
}

function validateCreateShapeLikeOperation(
  operation: Record<string, unknown>,
  type: "create_shape" | "create_extrude" | "create_tube"
) {
  const preset = operation.preset;
  const presetSet = type === "create_tube" ? TUBE_PRESETS : SHAPE_PRESETS;

  if (typeof preset !== "string" || !presetSet.has(preset)) {
    throw new Error(`Unsupported ${type} preset: ${String(preset)}.`);
  }

  if (operation.transform === undefined) {
    throw new Error(`${type} requires operation.transform.`);
  }

  validateTransform(operation.transform, "operation.transform");
  const transform = operation.transform as Record<string, unknown>;

  if (transform.position === undefined || transform.scale === undefined) {
    throw new Error(`${type} requires transform.position and transform.scale.`);
  }

  if (operation.material !== undefined) {
    validateMaterial(operation.material, "operation.material");
  }
}

function validateOperation(operation: unknown, index: number): Ai3DOperation {
  if (!operation || typeof operation !== "object") {
    throw new Error(`Operation ${index + 1} must be an object.`);
  }

  const payload = operation as Record<string, unknown>;
  const type = payload.type;
  const nodeId = payload.nodeId;

  if (typeof type !== "string") {
    throw new Error(`Operation ${index + 1} is missing a type.`);
  }

  if (typeof nodeId !== "string" || !nodeId.trim()) {
    throw new Error(`Operation ${index + 1} is missing a nodeId.`);
  }

  if (payload.label !== undefined && typeof payload.label !== "string") {
    throw new Error(`Operation ${index + 1} label must be a string.`);
  }

  switch (type) {
    case "create_primitive":
      validateCreatePrimitiveOperation(payload);
      return payload as unknown as Ai3DCreatePrimitiveOperation;
    case "create_shape":
      validateCreateShapeLikeOperation(payload, "create_shape");
      return payload as unknown as Ai3DCreateShapeOperation;
    case "create_extrude":
      validateCreateShapeLikeOperation(payload, "create_extrude");
      return payload as unknown as Ai3DCreateExtrudeOperation;
    case "create_tube":
      validateCreateShapeLikeOperation(payload, "create_tube");
      return payload as unknown as Ai3DCreateTubeOperation;
    case "set_transform":
      validateTransform(payload.transform, "operation.transform");
      return payload as unknown as Ai3DOperation;
    case "set_material":
      validateMaterial(payload.material, "operation.material");
      return payload as unknown as Ai3DOperation;
    default:
      throw new Error(`Unsupported AI 3D operation type: ${type}.`);
  }
}

function parseAi3DToolCall(raw: string): Ai3DToolCall {
  const parsed = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>;
  const toolName = parsed.toolName;
  const plan = parsed.plan;

  if (toolName !== AI3D_TOOL_NAME) {
    throw new Error(`OpenRouter returned an unexpected tool name: ${String(toolName)}.`);
  }

  if (!plan || typeof plan !== "object") {
    throw new Error("OpenRouter did not return a valid AI 3D plan.");
  }

  const planPayload = plan as Record<string, unknown>;
  const summary = typeof planPayload.summary === "string" ? planPayload.summary.trim() : "";
  const operationsRaw = Array.isArray(planPayload.operations) ? planPayload.operations : null;

  if (!summary) {
    throw new Error("AI 3D plan summary is required.");
  }

  if (!operationsRaw || operationsRaw.length === 0) {
    throw new Error("AI 3D plan must contain at least one operation.");
  }

  const operations = operationsRaw.map(validateOperation);
  const createOperationCount = operations.filter((operation) =>
    operation.type === "create_primitive" ||
    operation.type === "create_shape" ||
    operation.type === "create_extrude" ||
    operation.type === "create_tube"
  ).length;

  if (createOperationCount > 16) {
    throw new Error("AI 3D plan must contain at most 16 create operations.");
  }

  return {
    toolName: AI3D_TOOL_NAME,
    plan: {
      summary,
      operations
    }
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
    const response = await openRouterAi3DClient.post<OpenRouterTextResponse>(
      OPENROUTER_TEXT_ENDPOINT,
      {
        model: OPENROUTER_AI3D_MODEL,
        messages: [
          {
            role: "system",
            content: getSystemPrompt()
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        stream: false
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }
    );

    const traceId = getResponseHeader(response.headers, "x-request-id") ?? response.data.id ?? null;
    const rawContent = readTextContent(response.data?.choices?.[0]?.message?.content);
    const result = parseAi3DToolCall(rawContent);

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
