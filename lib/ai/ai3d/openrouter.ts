import axios from "axios";
import {
  getOpenRouterChatCompletionsEndpoint,
  getOpenRouterHeaders
} from "@/lib/ai/openrouter/config";
import {
  getAi3DPlanDiagnostics,
  shouldAcceptAi3DPlanCandidate,
  validateAi3DIntent,
  type Ai3DIntent,
  type Ai3DIntentInput,
  type Ai3DPlanDiagnostics
} from "@/lib/ai/ai3d/intent";
import { createHttpClient, getResponseHeader } from "@/lib/http/axios";
import {
  AI3D_TOOL_NAME,
  AI3D_PRIMITIVE_TYPES,
  AI3D_SHAPE_PRESETS,
  AI3D_TUBE_PRESETS,
  type Ai3DPlan,
  validateAi3DToolCall
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

type StructuredResult<T> = {
  result: T;
  traceId: string | null;
};

const HUMAN_EXAMPLE = `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"A stylized low-poly human with segmented limbs and simple facial features.","operations":[{"type":"create_primitive","nodeId":"torso","primitive":"capsule","label":"Torso","transform":{"position":[0,1.52,0],"scale":[0.8,1.18,0.5]},"material":{"color":"#5b8def","roughness":1}},{"type":"create_primitive","nodeId":"pelvis","primitive":"box","label":"Pelvis","transform":{"position":[0,0.82,0],"scale":[0.62,0.34,0.4]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"head","primitive":"sphere","label":"Head","transform":{"position":[0,2.5,0],"scale":[0.62,0.72,0.62]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"nose","primitive":"cone","label":"Nose","transform":{"position":[0.3,2.46,0],"scale":[0.08,0.14,0.08]},"material":{"color":"#e8b38d","roughness":1}},{"type":"create_primitive","nodeId":"left_eye","primitive":"sphere","label":"Left Eye","transform":{"position":[0.22,2.58,0.14],"scale":[0.06,0.06,0.06]},"material":{"color":"#111827","roughness":0.9}},{"type":"create_primitive","nodeId":"right_eye","primitive":"sphere","label":"Right Eye","transform":{"position":[0.22,2.58,-0.14],"scale":[0.06,0.06,0.06]},"material":{"color":"#111827","roughness":0.9}},{"type":"create_primitive","nodeId":"mouth","primitive":"capsule","label":"Mouth","transform":{"position":[0.26,2.34,0],"scale":[0.05,0.14,0.22]},"material":{"color":"#c26a5a","roughness":1}},{"type":"create_primitive","nodeId":"left_upper_arm","primitive":"cylinder","label":"Left Upper Arm","transform":{"position":[-0.84,1.74,0],"scale":[0.18,0.56,0.18]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"left_lower_arm","primitive":"cylinder","label":"Left Lower Arm","transform":{"position":[-1.08,1.15,0],"scale":[0.16,0.5,0.16]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"right_upper_arm","primitive":"cylinder","label":"Right Upper Arm","transform":{"position":[0.84,1.74,0],"scale":[0.18,0.56,0.18]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"right_lower_arm","primitive":"cylinder","label":"Right Lower Arm","transform":{"position":[1.08,1.15,0],"scale":[0.16,0.5,0.16]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"left_hand","primitive":"sphere","label":"Left Hand","transform":{"position":[-1.16,0.72,0],"scale":[0.12,0.12,0.12]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"right_hand","primitive":"sphere","label":"Right Hand","transform":{"position":[1.16,0.72,0],"scale":[0.12,0.12,0.12]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"left_upper_leg","primitive":"cylinder","label":"Left Upper Leg","transform":{"position":[-0.22,0.34,0],"scale":[0.22,0.64,0.22]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"left_lower_leg","primitive":"cylinder","label":"Left Lower Leg","transform":{"position":[-0.22,-0.42,0],"scale":[0.2,0.62,0.2]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"right_upper_leg","primitive":"cylinder","label":"Right Upper Leg","transform":{"position":[0.22,0.34,0],"scale":[0.22,0.64,0.22]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"right_lower_leg","primitive":"cylinder","label":"Right Lower Leg","transform":{"position":[0.22,-0.42,0],"scale":[0.2,0.62,0.2]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"left_foot","primitive":"box","label":"Left Foot","transform":{"position":[-0.22,-0.92,0.14],"scale":[0.18,0.08,0.32]},"material":{"color":"#1f2937","roughness":1}},{"type":"create_primitive","nodeId":"right_foot","primitive":"box","label":"Right Foot","transform":{"position":[0.22,-0.92,0.14],"scale":[0.18,0.08,0.32]},"material":{"color":"#1f2937","roughness":1}}]}}`;
const SNAKE_EXAMPLE = `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"A stylized snake with a curved tube body and a simple head.","operations":[{"type":"create_tube","nodeId":"body","preset":"snake","radius":0.16,"tubularSegments":72,"radialSegments":10,"label":"Body","transform":{"position":[0,0.9,0],"scale":[1.2,0.72,0.9]},"material":{"color":"#4f8a41","roughness":1}},{"type":"create_primitive","nodeId":"head","primitive":"capsule","label":"Head","transform":{"position":[1.22,1.05,0.04],"scale":[0.34,0.24,0.28]},"material":{"color":"#5f9a4f","roughness":1}},{"type":"create_primitive","nodeId":"left_eye","primitive":"sphere","label":"Left Eye","transform":{"position":[1.33,1.12,0.1],"scale":[0.05,0.05,0.05]},"material":{"color":"#101010","roughness":0.8}},{"type":"create_primitive","nodeId":"right_eye","primitive":"sphere","label":"Right Eye","transform":{"position":[1.33,1.12,-0.02],"scale":[0.05,0.05,0.05]},"material":{"color":"#101010","roughness":0.8}}]}}`;
const FISH_EXAMPLE = `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"A compact low-poly fish with a rounded body and fin silhouettes.","operations":[{"type":"create_primitive","nodeId":"body","primitive":"capsule","label":"Body","transform":{"position":[0,1.1,0],"scale":[1.15,0.52,0.48]},"material":{"color":"#5bb6d9","roughness":1}},{"type":"create_extrude","nodeId":"tail_fin","preset":"fin","depth":0.18,"label":"Tail Fin","transform":{"position":[-1.02,1.1,0],"scale":[0.55,0.62,0.18]},"material":{"color":"#4a9fc0","roughness":1}},{"type":"create_extrude","nodeId":"top_fin","preset":"fin","depth":0.16,"label":"Top Fin","transform":{"position":[-0.05,1.42,0],"scale":[0.34,0.42,0.16]},"material":{"color":"#72c8e4","roughness":1}}]}}`;
const STAR_EXAMPLE = `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"A clean extruded star badge.","operations":[{"type":"create_extrude","nodeId":"star_badge","preset":"star","depth":0.35,"label":"Star Badge","transform":{"position":[0,1.2,0],"scale":[0.9,0.9,0.35]},"material":{"color":"#f5c542","roughness":1}}]}}`;
const WAND_EXAMPLE = `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"A simple magic wand with a star tip and a readable handle.","operations":[{"type":"create_primitive","nodeId":"handle","primitive":"cylinder","label":"Handle","transform":{"position":[0,1.1,0],"scale":[0.08,0.9,0.08]},"material":{"color":"#7c5a3a","roughness":1}},{"type":"create_extrude","nodeId":"star_tip","preset":"star","depth":0.2,"label":"Star Tip","transform":{"position":[0,2.08,0],"scale":[0.36,0.36,0.2]},"material":{"color":"#f6c94c","roughness":1}},{"type":"create_primitive","nodeId":"accent_ring","primitive":"torus","label":"Accent Ring","transform":{"position":[0,1.82,0],"scale":[0.16,0.04,0.16]},"material":{"color":"#d9d4ff","roughness":0.95}}]}}`;

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

  throw new Error("OpenRouter did not return a valid JSON object for the AI 3D pipeline.");
}

function parseJsonWithValidator<T>(raw: string, validate: (value: unknown) => T) {
  return validate(JSON.parse(extractJsonObject(raw)));
}

function parseAi3DToolCall(raw: string) {
  return parseJsonWithValidator(raw, validateAi3DToolCall);
}

function parseAi3DIntent(raw: string) {
  return parseJsonWithValidator(raw, validateAi3DIntent);
}

function buildTextAndImagesContent(text: string, images: string[]): OpenRouterRequestContent {
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

function buildIntentHintSummary(intent?: Partial<Ai3DIntentInput>, diagnostics?: Ai3DPlanDiagnostics) {
  const sections: string[] = [];

  if (intent && Object.keys(intent).length > 0) {
    sections.push(`Structured intent hints: ${JSON.stringify(intent)}`);
  }

  if (diagnostics) {
    sections.push(`Existing plan diagnostics: ${JSON.stringify(diagnostics)}`);
  }

  return sections.join("\n");
}

function getDslCorePrompt() {
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
    "You author an executable DSL, not explanations.",
    "Return only one valid JSON object with this exact shape:",
    `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"short text","operations":[...]}}`,
    "Never return markdown, prose, comments, or code fences.",
    "The editor executes operations exactly as written.",
    "The result must stay readable, clean, and stylized low-poly.",
    "Use at most 32 create operations total.",
    "Keep materials flat and simple with clear silhouette-first forms.",
    "Do not use unsupported fields, nesting, parenting, textures, maps, or metadata.",
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
    "Never invent fields like children, geometry, dimensions, rotationEuler, textureUrl, bevel, points, parentId, or groupId.",
    "Never omit transform.position or transform.scale on create operations."
  ].join(" ");
}

function getCategoryModulePrompt(intent: Ai3DIntent) {
  const shared = [
    `Subject type: ${intent.subjectType}.`,
    `Subject label: ${intent.subjectLabel}.`,
    `Primary silhouette: ${intent.primarySilhouette}.`,
    `Key parts: ${intent.keyParts.join(", ")}.`,
    intent.secondaryParts.length > 0 ? `Secondary parts: ${intent.secondaryParts.join(", ")}.` : "",
    `Detail budget: ${intent.detailBudget}.`,
    `Pose: ${intent.pose}.`,
    `Symmetry: ${intent.symmetry}.`,
    `Style bias: ${intent.styleBias}.`,
    `Preferred geometry bias: ${intent.geometryBias.join(", ")}.`,
    intent.negativeConstraints.length > 0
      ? `Negative constraints: ${intent.negativeConstraints.join(", ")}.`
      : ""
  ];

  const categoryRules: Record<Ai3DIntent["subjectType"], string[]> = {
    character: [
      "Prioritize head, torso, pelvis, and the largest readable limb masses before small extras.",
      "When budget allows, split arms and legs into upper and lower segments.",
      "Feet are more important than finger-like detail.",
      "Avoid mannequin-like stiffness by adding a few readable face or accessory cues."
    ],
    animal: [
      "Prioritize body silhouette, head read, limbs, and the most recognizable animal-specific parts first.",
      "For fish, birds, wings, fins, tails, and ears, use shape or extrude operations when that reads better.",
      "Do not spend budget on tiny texture-like detail."
    ],
    prop: [
      "Prioritize the main mass and the one or two features that make the prop recognizable.",
      "Avoid over-decorating before the silhouette reads clearly.",
      "Use extrude or shape for badges, star tips, fins, and thin profile-driven parts."
    ],
    icon: [
      "This is a silhouette-driven subject.",
      "Prefer create_extrude or create_shape over primitive stacking for the main read.",
      "Keep the construction very clean and centered."
    ],
    abstract: [
      "If the form is curved, looping, or flowing, prefer create_tube for the main body.",
      "Do not build the primary curve from many short box or cylinder segments.",
      "Keep the shape bold and readable."
    ]
  };

  return [...shared, ...categoryRules[intent.subjectType]].filter(Boolean).join(" ");
}

function getFewShotExamples(intent: Ai3DIntent) {
  switch (intent.subjectType) {
    case "character":
      return [`EXAMPLE character: ${HUMAN_EXAMPLE}`];
    case "animal":
      return [`EXAMPLE animal: ${FISH_EXAMPLE}`];
    case "prop":
      return [`EXAMPLE prop: ${WAND_EXAMPLE}`];
    case "icon":
      return [`EXAMPLE icon: ${STAR_EXAMPLE}`];
    case "abstract":
      return [`EXAMPLE abstract: ${SNAKE_EXAMPLE}`];
  }
}

function getPlanSystemPrompt(intent: Ai3DIntent) {
  return [getDslCorePrompt(), getCategoryModulePrompt(intent), ...getFewShotExamples(intent)].join(" ");
}

function getIntentSystemPrompt() {
  return [
    "You are an AI 3D intent normalizer for a browser editor.",
    "You read a user's natural-language prompt plus optional structured hints and optional reference images.",
    "Infer a single modeling intent that will help a second model build a readable stylized low-poly sketch.",
    "Return only one valid JSON object with this exact shape:",
    '{"subjectType":"character|animal|prop|icon|abstract","subjectLabel":"short noun phrase","primarySilhouette":"short silhouette description","keyParts":["part"],"secondaryParts":["part"],"geometryBias":["primitive|tube|extrude|shape"],"detailBudget":"low|medium|high","pose":"standing|sitting|flying|coiled|static","symmetry":"symmetric|asymmetric","styleBias":"stylized|cute|clean|chunky","negativeConstraints":["constraint"]}',
    "Choose exactly one subjectType.",
    "Use the structured intent hints whenever they are helpful, but correct them if they clearly conflict with the prompt or reference images.",
    "keyParts must list the highest-value readable forms first.",
    "secondaryParts should stay optional and low priority.",
    "geometryBias should list 1 to 4 recommended geometry families.",
    "If the subject is curved or snake-like, include tube in geometryBias.",
    "If the subject is a badge, symbol, wing, fin, or other thin silhouette-driven object, include extrude or shape.",
    "negativeConstraints should include what the planner should avoid, such as overly tiny detail, mannequin stiffness, or wrong geometry usage.",
    "Never return markdown, comments, or prose."
  ].join(" ");
}

function getReviewSystemPrompt(intent: Ai3DIntent) {
  return [
    getDslCorePrompt(),
    `You are reviewing a generated plan for a ${intent.subjectType}.`,
    "You will receive the original prompt, the resolved intent, the current plan, and diagnostics.",
    "Return a complete replacement plan only when the current plan clearly misses key parts, overuses generic primitives, chooses the wrong geometry family, feels too mannequin-like, or wastes budget on low-value detail.",
    "If you revise the plan, keep the same subject and stay faithful to the prompt.",
    "Do not add unnecessary detail."
  ].join(" ");
}

function getOptimizeSystemPrompt(intent: Ai3DIntent) {
  return [
    getDslCorePrompt(),
    `You are optimizing a rendered ${intent.subjectType} plan using screenshots and diagnostics.`,
    "The screenshots are isolated front, side, and top views of the current generated model.",
    "First identify the three most serious visual problems internally, then fix only those issues in the replacement plan.",
    "Focus on wrong proportions, weak silhouette, missing key parts, bad geometry choice, floating parts, messy layout, or awkward primitive stacking.",
    "Do not drift away from the subject."
  ].join(" ");
}

function readReferenceImageNote(images: string[]) {
  return images.length > 0
    ? "Reference images are provided. Use them for silhouette, proportion, and part-read cues only."
    : "No reference images were provided.";
}

async function requestStructuredResponse({
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

async function completeStructuredJson<T>({
  apiKey,
  systemPrompt,
  userContent,
  parser
}: {
  apiKey: string;
  systemPrompt: string;
  userContent: OpenRouterRequestContent;
  parser: (raw: string) => T;
}): Promise<StructuredResult<T>> {
  const initialAttempt = await requestStructuredResponse({
    apiKey,
    model: OPENROUTER_AI3D_MODEL,
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

  try {
    return {
      result: parser(initialAttempt.rawContent),
      traceId
    };
  } catch (validationError) {
    const repairReason =
      validationError instanceof Error
        ? validationError.message
        : "The previous response did not satisfy the required JSON schema.";
    const repairAttempt = await requestStructuredResponse({
      apiKey,
      model: OPENROUTER_AI3D_MODEL,
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
            "Return only one corrected JSON object with the same required shape.",
            `Validation error: ${repairReason}`
          ].join(" ")
        }
      ]
    });

    traceId = repairAttempt.traceId ?? traceId;

    return {
      result: parser(repairAttempt.rawContent),
      traceId
    };
  }
}

async function resolveAi3DIntent({
  apiKey,
  prompt,
  intent,
  referenceImages,
  diagnostics
}: {
  apiKey: string;
  prompt: string;
  intent?: Partial<Ai3DIntentInput>;
  referenceImages: string[];
  diagnostics?: Ai3DPlanDiagnostics;
}) {
  const hintSummary = buildIntentHintSummary(intent, diagnostics);
  const text = [
    `Original prompt: ${prompt}`,
    readReferenceImageNote(referenceImages),
    hintSummary
  ]
    .filter(Boolean)
    .join("\n");

  return completeStructuredJson({
    apiKey,
    systemPrompt: getIntentSystemPrompt(),
    userContent: buildTextAndImagesContent(text, referenceImages),
    parser: parseAi3DIntent
  });
}

async function requestAi3DPlan({
  apiKey,
  prompt,
  intent,
  referenceImages
}: {
  apiKey: string;
  prompt: string;
  intent: Ai3DIntent;
  referenceImages: string[];
}) {
  const text = [
    `Original prompt: ${prompt}`,
    `Resolved intent JSON: ${JSON.stringify(intent)}`,
    readReferenceImageNote(referenceImages),
    "Build the best executable low-poly plan for this intent."
  ].join("\n");

  return completeStructuredJson({
    apiKey,
    systemPrompt: getPlanSystemPrompt(intent),
    userContent: buildTextAndImagesContent(text, referenceImages),
    parser: parseAi3DToolCall
  });
}

async function reviewAi3DPlan({
  apiKey,
  prompt,
  intent,
  plan,
  diagnostics
}: {
  apiKey: string;
  prompt: string;
  intent: Ai3DIntent;
  plan: Ai3DPlan;
  diagnostics: Ai3DPlanDiagnostics;
}) {
  const text = [
    `Original prompt: ${prompt}`,
    `Resolved intent JSON: ${JSON.stringify(intent)}`,
    `Current plan JSON: ${JSON.stringify({ toolName: AI3D_TOOL_NAME, plan })}`,
    `Current diagnostics JSON: ${JSON.stringify(diagnostics)}`,
    "If the current plan already satisfies the intent, you may return the same plan unchanged.",
    "Otherwise return a stronger complete replacement plan."
  ].join("\n");

  return completeStructuredJson({
    apiKey,
    systemPrompt: getReviewSystemPrompt(intent),
    userContent: text,
    parser: parseAi3DToolCall
  });
}

async function optimizeAi3DPlan({
  apiKey,
  prompt,
  intent,
  plan,
  images,
  diagnostics
}: {
  apiKey: string;
  prompt: string;
  intent: Ai3DIntent;
  plan: Ai3DPlan;
  images: string[];
  diagnostics: Ai3DPlanDiagnostics;
}) {
  const text = [
    `Original prompt: ${prompt}`,
    `Resolved intent JSON: ${JSON.stringify(intent)}`,
    `Current plan JSON: ${JSON.stringify({ toolName: AI3D_TOOL_NAME, plan })}`,
    `Current diagnostics JSON: ${JSON.stringify(diagnostics)}`,
    "Optimize the result using the screenshots and diagnostics.",
    "Fix only the highest-impact visual issues while preserving subject identity."
  ].join("\n");

  return completeStructuredJson({
    apiKey,
    systemPrompt: getOptimizeSystemPrompt(intent),
    userContent: buildTextAndImagesContent(text, images),
    parser: parseAi3DToolCall
  });
}

function toAi3DErrorMessage(error: unknown, fallbackPrefix: string) {
  if (axios.isAxiosError<OpenRouterTextResponse>(error)) {
    const traceId =
      getResponseHeader(error.response?.headers, "x-request-id") ?? error.response?.data?.id ?? null;
    const status = error.response?.status ?? "unknown";
    const message = error.response?.data?.error?.message || `${fallbackPrefix} failed with status ${status}.`;
    return traceId ? `${message} (trace: ${traceId})` : message;
  }

  if (error instanceof SyntaxError) {
    return "OpenRouter returned invalid JSON for the AI 3D pipeline.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return `${fallbackPrefix} failed.`;
}

function toError(message: string) {
  return new Error(message);
}

export async function generateAi3DPlanWithOpenRouter({
  apiKey,
  prompt,
  intent,
  referenceImages = []
}: {
  apiKey: string;
  prompt: string;
  intent?: Partial<Ai3DIntentInput>;
  referenceImages?: string[];
}) {
  try {
    const intentResult = await resolveAi3DIntent({
      apiKey,
      prompt,
      intent,
      referenceImages
    });
    const planResult = await requestAi3DPlan({
      apiKey,
      prompt,
      intent: intentResult.result,
      referenceImages
    });

    let finalPlan = planResult.result.plan;
    let finalDiagnostics = getAi3DPlanDiagnostics({
      plan: finalPlan,
      intent: intentResult.result
    });
    let traceId = planResult.traceId ?? intentResult.traceId;

    if (finalDiagnostics.missingKeyParts.length > 0 || finalDiagnostics.warnings.length > 0) {
      try {
        const reviewResult = await reviewAi3DPlan({
          apiKey,
          prompt,
          intent: intentResult.result,
          plan: finalPlan,
          diagnostics: finalDiagnostics
        });
        const reviewedDiagnostics = getAi3DPlanDiagnostics({
          plan: reviewResult.result.plan,
          intent: intentResult.result
        });

        if (
          shouldAcceptAi3DPlanCandidate({
            baseline: finalDiagnostics,
            candidate: reviewedDiagnostics
          })
        ) {
          finalPlan = reviewResult.result.plan;
          finalDiagnostics = reviewedDiagnostics;
          traceId = reviewResult.traceId ?? traceId;
        }
      } catch {
        // Keep the initial plan if the review pass fails.
      }
    }

    return {
      toolName: AI3D_TOOL_NAME,
      plan: finalPlan,
      intent: intentResult.result,
      diagnostics: finalDiagnostics,
      traceId
    };
  } catch (error) {
    throw toError(toAi3DErrorMessage(error, "OpenRouter AI 3D generation"));
  }
}

export async function optimizeAi3DPlanWithOpenRouter({
  apiKey,
  prompt,
  plan,
  images,
  intent,
  diagnostics
}: {
  apiKey: string;
  prompt: string;
  plan: Ai3DPlan;
  images: string[];
  intent?: Partial<Ai3DIntentInput>;
  diagnostics?: Ai3DPlanDiagnostics;
}) {
  try {
    const intentResult = await resolveAi3DIntent({
      apiKey,
      prompt,
      intent,
      referenceImages: [],
      diagnostics
    });
    const baselineDiagnostics =
      diagnostics ??
      getAi3DPlanDiagnostics({
        plan,
        intent: intentResult.result
      });
    const optimizeResult = await optimizeAi3DPlan({
      apiKey,
      prompt,
      intent: intentResult.result,
      plan,
      images,
      diagnostics: baselineDiagnostics
    });
    const candidateDiagnostics = getAi3DPlanDiagnostics({
      plan: optimizeResult.result.plan,
      intent: intentResult.result
    });
    const accepted = shouldAcceptAi3DPlanCandidate({
      baseline: baselineDiagnostics,
      candidate: candidateDiagnostics
    });

    return {
      toolName: AI3D_TOOL_NAME,
      plan: accepted ? optimizeResult.result.plan : plan,
      intent: intentResult.result,
      diagnostics: accepted ? candidateDiagnostics : baselineDiagnostics,
      traceId: optimizeResult.traceId ?? intentResult.traceId
    };
  } catch (error) {
    throw toError(toAi3DErrorMessage(error, "OpenRouter AI 3D optimization"));
  }
}

export type { Ai3DPlanDiagnostics };
