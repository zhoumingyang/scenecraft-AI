import { AI3D_TOOL_NAME, AI3D_PRIMITIVE_TYPES, AI3D_SHAPE_PRESETS, AI3D_TUBE_PRESETS } from "@/render/editor/ai3d/plan";
import type { Ai3DIntent } from "@/lib/ai/ai3d/intent";

const HUMAN_EXAMPLE = `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"A stylized low-poly human with segmented limbs and simple facial features.","operations":[{"type":"create_primitive","nodeId":"torso","primitive":"capsule","label":"Torso","transform":{"position":[0,1.52,0],"scale":[0.8,1.18,0.5]},"material":{"color":"#5b8def","roughness":1}},{"type":"create_primitive","nodeId":"pelvis","primitive":"box","label":"Pelvis","transform":{"position":[0,0.82,0],"scale":[0.62,0.34,0.4]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"head","primitive":"sphere","label":"Head","transform":{"position":[0,2.5,0],"scale":[0.62,0.72,0.62]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"nose","primitive":"cone","label":"Nose","transform":{"position":[0.3,2.46,0],"scale":[0.08,0.14,0.08]},"material":{"color":"#e8b38d","roughness":1}},{"type":"create_primitive","nodeId":"left_eye","primitive":"sphere","label":"Left Eye","transform":{"position":[0.22,2.58,0.14],"scale":[0.06,0.06,0.06]},"material":{"color":"#111827","roughness":0.9}},{"type":"create_primitive","nodeId":"right_eye","primitive":"sphere","label":"Right Eye","transform":{"position":[0.22,2.58,-0.14],"scale":[0.06,0.06,0.06]},"material":{"color":"#111827","roughness":0.9}},{"type":"create_primitive","nodeId":"mouth","primitive":"capsule","label":"Mouth","transform":{"position":[0.26,2.34,0],"scale":[0.05,0.14,0.22]},"material":{"color":"#c26a5a","roughness":1}},{"type":"create_primitive","nodeId":"left_upper_arm","primitive":"cylinder","label":"Left Upper Arm","transform":{"position":[-0.84,1.74,0],"scale":[0.18,0.56,0.18]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"left_lower_arm","primitive":"cylinder","label":"Left Lower Arm","transform":{"position":[-1.08,1.15,0],"scale":[0.16,0.5,0.16]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"right_upper_arm","primitive":"cylinder","label":"Right Upper Arm","transform":{"position":[0.84,1.74,0],"scale":[0.18,0.56,0.18]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"right_lower_arm","primitive":"cylinder","label":"Right Lower Arm","transform":{"position":[1.08,1.15,0],"scale":[0.16,0.5,0.16]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"left_hand","primitive":"sphere","label":"Left Hand","transform":{"position":[-1.16,0.72,0],"scale":[0.12,0.12,0.12]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"right_hand","primitive":"sphere","label":"Right Hand","transform":{"position":[1.16,0.72,0],"scale":[0.12,0.12,0.12]},"material":{"color":"#f2c29b","roughness":1}},{"type":"create_primitive","nodeId":"left_upper_leg","primitive":"cylinder","label":"Left Upper Leg","transform":{"position":[-0.22,0.34,0],"scale":[0.22,0.64,0.22]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"left_lower_leg","primitive":"cylinder","label":"Left Lower Leg","transform":{"position":[-0.22,-0.42,0],"scale":[0.2,0.62,0.2]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"right_upper_leg","primitive":"cylinder","label":"Right Upper Leg","transform":{"position":[0.22,0.34,0],"scale":[0.22,0.64,0.22]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"right_lower_leg","primitive":"cylinder","label":"Right Lower Leg","transform":{"position":[0.22,-0.42,0],"scale":[0.2,0.62,0.2]},"material":{"color":"#334155","roughness":1}},{"type":"create_primitive","nodeId":"left_foot","primitive":"box","label":"Left Foot","transform":{"position":[-0.22,-0.92,0.14],"scale":[0.18,0.08,0.32]},"material":{"color":"#1f2937","roughness":1}},{"type":"create_primitive","nodeId":"right_foot","primitive":"box","label":"Right Foot","transform":{"position":[0.22,-0.92,0.14],"scale":[0.18,0.08,0.32]},"material":{"color":"#1f2937","roughness":1}}]}}`;
const SNAKE_EXAMPLE = `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"A stylized snake with a curved tube body and a simple head.","operations":[{"type":"create_tube","nodeId":"body","preset":"snake","radius":0.16,"tubularSegments":72,"radialSegments":10,"label":"Body","transform":{"position":[0,0.9,0],"scale":[1.2,0.72,0.9]},"material":{"color":"#4f8a41","roughness":1}},{"type":"create_primitive","nodeId":"head","primitive":"capsule","label":"Head","transform":{"position":[1.22,1.05,0.04],"scale":[0.34,0.24,0.28]},"material":{"color":"#5f9a4f","roughness":1}},{"type":"create_primitive","nodeId":"left_eye","primitive":"sphere","label":"Left Eye","transform":{"position":[1.33,1.12,0.1],"scale":[0.05,0.05,0.05]},"material":{"color":"#101010","roughness":0.8}},{"type":"create_primitive","nodeId":"right_eye","primitive":"sphere","label":"Right Eye","transform":{"position":[1.33,1.12,-0.02],"scale":[0.05,0.05,0.05]},"material":{"color":"#101010","roughness":0.8}}]}}`;
const FISH_EXAMPLE = `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"A compact low-poly fish with a rounded body and fin silhouettes.","operations":[{"type":"create_primitive","nodeId":"body","primitive":"capsule","label":"Body","transform":{"position":[0,1.1,0],"scale":[1.15,0.52,0.48]},"material":{"color":"#5bb6d9","roughness":1}},{"type":"create_extrude","nodeId":"tail_fin","preset":"fin","depth":0.18,"label":"Tail Fin","transform":{"position":[-1.02,1.1,0],"scale":[0.55,0.62,0.18]},"material":{"color":"#4a9fc0","roughness":1}},{"type":"create_extrude","nodeId":"top_fin","preset":"fin","depth":0.16,"label":"Top Fin","transform":{"position":[-0.05,1.42,0],"scale":[0.34,0.42,0.16]},"material":{"color":"#72c8e4","roughness":1}}]}}`;
const STAR_EXAMPLE = `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"A clean extruded star badge.","operations":[{"type":"create_extrude","nodeId":"star_badge","preset":"star","depth":0.35,"label":"Star Badge","transform":{"position":[0,1.2,0],"scale":[0.9,0.9,0.35]},"material":{"color":"#f5c542","roughness":1}}]}}`;
const WAND_EXAMPLE = `{"toolName":"${AI3D_TOOL_NAME}","plan":{"summary":"A simple magic wand with a star tip and a readable handle.","operations":[{"type":"create_primitive","nodeId":"handle","primitive":"cylinder","label":"Handle","transform":{"position":[0,1.1,0],"scale":[0.08,0.9,0.08]},"material":{"color":"#7c5a3a","roughness":1}},{"type":"create_extrude","nodeId":"star_tip","preset":"star","depth":0.2,"label":"Star Tip","transform":{"position":[0,2.08,0],"scale":[0.36,0.36,0.2]},"material":{"color":"#f6c94c","roughness":1}},{"type":"create_primitive","nodeId":"accent_ring","primitive":"torus","label":"Accent Ring","transform":{"position":[0,1.82,0],"scale":[0.16,0.04,0.16]},"material":{"color":"#d9d4ff","roughness":0.95}}]}}`;

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
    `Archetype: ${intent.archetype}.`,
    `Assembly strategy: ${intent.assemblyStrategy}.`,
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

export function getPlanSystemPrompt(intent: Ai3DIntent) {
  return [getDslCorePrompt(), getCategoryModulePrompt(intent), ...(getFewShotExamples(intent) ?? [])].join(" ");
}

export function getHumanoidTemplateParamsSystemPrompt() {
  return [
    "You are selecting parameters for a predefined humanoid low-poly sketch template.",
    "You must not invent geometry or output a DSL plan.",
    "Return only one valid JSON object with this exact shape:",
    '{"bodyStyle":"adult|heroic|chibi","headScale":1,"torsoHeightScale":1,"torsoWidthScale":1,"armLengthScale":1,"legLengthScale":1,"limbThicknessScale":1,"shoulderWidthScale":1,"stanceWidth":0.28,"palette":"blue_slate|olive_khaki|rose_cream|mono_dark","faceStyle":"minimal|friendly","optionalFeatures":["eyes","mouth","nose"]}',
    "Use the template to produce a readable standing humanoid.",
    "Keep all numeric values within the implied range around 1.0 and keep stanceWidth between 0.18 and 0.48.",
    "Choose bodyStyle chibi only when the prompt or style strongly implies a cute oversized-head character.",
    "Always include eyes and mouth unless the prompt clearly suggests a faceless character.",
    "Never return markdown, comments, prose, or fields outside the schema."
  ].join(" ");
}

export function getHumanoidTemplateReviewSystemPrompt() {
  return [
    "You are correcting parameters for a predefined humanoid low-poly sketch template.",
    "You will receive the prompt, resolved intent, current template parameters, and diagnostics.",
    "Return only one corrected parameter JSON object with the same shape.",
    "If diagnostics include problem codes, change at least one relevant parameter.",
    "Fix proportions, stance width, limb thickness, or palette only when diagnostics indicate a clear issue.",
    "Preserve the same subject identity and keep the humanoid template structure."
  ].join(" ");
}

export function getHumanoidTemplateOptimizeSystemPrompt() {
  return [
    "You are optimizing parameters for a predefined humanoid low-poly sketch template using screenshots and diagnostics.",
    "Return only one corrected parameter JSON object with the same shape.",
    "If there are problem codes or visible silhouette issues, return parameters that differ from the current parameters.",
    "Focus on proportions, silhouette, limb placement impression, stance width, and head-to-body balance.",
    "Do not output a DSL plan and do not change away from the humanoid template."
  ].join(" ");
}

export function getTreeRuleParamsSystemPrompt() {
  return [
    "You are selecting parameters for a predefined rule-based low-poly tree generator.",
    "You must not output a DSL plan.",
    "Return only one valid JSON object with this exact shape:",
    '{"trunkHeightScale":1,"trunkThicknessScale":1,"trunkLean":0,"branchCount":3,"branchLengthScale":1,"branchLift":0.6,"canopyWidthScale":1,"canopyHeightScale":1,"canopyStyle":"rounded|layered|cone","rootFlare":1,"asymmetry":0.18,"palette":"oak|pine|spring|autumn"}',
    "Use rounded or layered canopies for broadleaf trees and cone for conifer-like trees.",
    "Keep branchCount between 2 and 5 and keep trunkLean between -0.22 and 0.22.",
    "Prefer slight asymmetry for natural-looking trees unless the prompt strongly suggests a highly graphic icon.",
    "Never return markdown, comments, prose, or fields outside the schema."
  ].join(" ");
}

export function getTreeRuleReviewSystemPrompt() {
  return [
    "You are correcting parameters for a predefined low-poly tree rule generator.",
    "You will receive the prompt, resolved intent, current generated plan, and diagnostics.",
    "Return only one corrected parameter JSON object with the same shape.",
    "If diagnostics include problem codes, change at least one relevant parameter.",
    "Fix trunk proportion, branch count, canopy distribution, lean, or palette only when diagnostics indicate a clear issue.",
    "Preserve the same tree identity and stay within the rule-based generator."
  ].join(" ");
}

export function getTreeRuleOptimizeSystemPrompt() {
  return [
    "You are optimizing parameters for a predefined low-poly tree rule generator using screenshots and diagnostics.",
    "Return only one corrected parameter JSON object with the same shape.",
    "If there are problem codes or visible silhouette issues, return parameters that differ from the current parameters.",
    "Focus on trunk-to-canopy balance, canopy clustering, upward growth, and grounding.",
    "Do not output a DSL plan and do not change away from the tree rule generator."
  ].join(" ");
}

export function getIntentSystemPrompt() {
  return [
    "You are an AI 3D intent normalizer for a browser editor.",
    "You read a user's natural-language prompt plus optional structured hints and optional reference images.",
    "Infer a single modeling intent that will help a second model build a readable stylized low-poly sketch.",
    "Return only one valid JSON object with this exact shape:",
    '{"subjectType":"character|animal|prop|icon|abstract","archetype":"humanoid|quadruped|fish|bird|tree|plant|rock|abstract_curve|freeform_object","assemblyStrategy":"template_first|rule_first|freeform_first","subjectLabel":"short noun phrase","primarySilhouette":"short silhouette description","keyParts":["part"],"secondaryParts":["part"],"geometryBias":["primitive|tube|extrude|shape"],"detailBudget":"low|medium|high","pose":"standing|sitting|flying|coiled|static","symmetry":"symmetric|asymmetric","styleBias":"stylized|cute|clean|chunky","negativeConstraints":["constraint"]}',
    "Choose exactly one subjectType.",
    "Choose exactly one archetype that best matches the object's structure.",
    "Choose exactly one assemblyStrategy.",
    "Use template_first for strongly structured forms such as humanoids, quadrupeds, fish, and birds.",
    "Use rule_first for growth-like or layered forms such as trees and plants.",
    "Use freeform_first for rocks, abstract curves, and miscellaneous weak-topology objects.",
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

export function getReviewSystemPrompt(intent: Ai3DIntent) {
  return [
    getDslCorePrompt(),
    `You are reviewing a generated plan for a ${intent.subjectType} with archetype ${intent.archetype} and strategy ${intent.assemblyStrategy}.`,
    "You will receive the original prompt, the resolved intent, the current plan, and diagnostics.",
    "Return a complete replacement plan only when the current plan clearly misses key parts, overuses generic primitives, chooses the wrong geometry family, feels too mannequin-like, or wastes budget on low-value detail.",
    "If you revise the plan, keep the same subject and stay faithful to the prompt.",
    "Do not add unnecessary detail."
  ].join(" ");
}

export function getOptimizeSystemPrompt(intent: Ai3DIntent) {
  return [
    getDslCorePrompt(),
    `You are optimizing a rendered ${intent.subjectType} plan using screenshots and diagnostics. The resolved archetype is ${intent.archetype} and the current strategy is ${intent.assemblyStrategy}.`,
    "The screenshots are isolated front, side, and top views of the current generated model.",
    "First identify the three most serious visual problems internally, then fix only those issues in the replacement plan.",
    "Focus on wrong proportions, weak silhouette, missing key parts, bad geometry choice, floating parts, messy layout, or awkward primitive stacking.",
    "Do not drift away from the subject."
  ].join(" ");
}

export function readReferenceImageNote(images: string[]) {
  return images.length > 0
    ? "Reference images are provided. Use them for silhouette, proportion, and part-read cues only."
    : "No reference images were provided.";
}
