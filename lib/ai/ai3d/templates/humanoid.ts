import { z } from "zod";
import type { Ai3DPlan } from "@/render/editor/ai3d/plan";
import type { Ai3DTemplateDefinition } from "./types";

const HUMANOID_PALETTES = {
  blue_slate: {
    skin: "#f2c29b",
    body: "#5b8def",
    lower: "#334155",
    accent: "#1f2937",
    mouth: "#c26a5a",
    feature: "#111827"
  },
  olive_khaki: {
    skin: "#d7a57a",
    body: "#6f8f4c",
    lower: "#6b5b3f",
    accent: "#2a2f27",
    mouth: "#a76657",
    feature: "#141718"
  },
  rose_cream: {
    skin: "#f1c6b1",
    body: "#cf7d8a",
    lower: "#7a3f53",
    accent: "#33232b",
    mouth: "#b96467",
    feature: "#171314"
  },
  mono_dark: {
    skin: "#d0ab86",
    body: "#5b6472",
    lower: "#242a33",
    accent: "#0f1720",
    mouth: "#9c5f57",
    feature: "#080b0d"
  }
} as const;

const HUMANOID_BODY_STYLES = ["adult", "heroic", "chibi"] as const;
const HUMANOID_FACE_STYLES = ["minimal", "friendly"] as const;
const HUMANOID_OPTIONAL_FEATURES = ["eyes", "mouth", "nose"] as const;

export const humanoidTemplateParamsSchema = z
  .object({
    bodyStyle: z.enum(HUMANOID_BODY_STYLES),
    headScale: z.number().finite().min(0.85).max(1.4),
    torsoHeightScale: z.number().finite().min(0.8).max(1.3),
    torsoWidthScale: z.number().finite().min(0.8).max(1.25),
    armLengthScale: z.number().finite().min(0.8).max(1.25),
    legLengthScale: z.number().finite().min(0.8).max(1.35),
    limbThicknessScale: z.number().finite().min(0.8).max(1.25),
    shoulderWidthScale: z.number().finite().min(0.9).max(1.3),
    stanceWidth: z.number().finite().min(0.18).max(0.48),
    palette: z.enum(Object.keys(HUMANOID_PALETTES) as [keyof typeof HUMANOID_PALETTES, ...Array<keyof typeof HUMANOID_PALETTES>]),
    faceStyle: z.enum(HUMANOID_FACE_STYLES),
    optionalFeatures: z.array(z.enum(HUMANOID_OPTIONAL_FEATURES)).max(3)
  })
  .strict();

export type HumanoidTemplateParams = z.infer<typeof humanoidTemplateParamsSchema>;

function quatFromAxisAngle(axis: [number, number, number], radians: number): [number, number, number, number] {
  const half = radians / 2;
  const sinHalf = Math.sin(half);
  return [axis[0] * sinHalf, axis[1] * sinHalf, axis[2] * sinHalf, Math.cos(half)];
}

function buildHumanoidPlan({
  intent,
  params
}: {
  intent: { styleBias: string; pose: string; subjectLabel: string };
  params: HumanoidTemplateParams;
}): Ai3DPlan {
  const palette = HUMANOID_PALETTES[params.palette];
  const isChibi = params.bodyStyle === "chibi";
  const headWidth = 0.6 * params.headScale * (isChibi ? 1.08 : 1);
  const headHeight = 0.72 * params.headScale * (isChibi ? 1.1 : 1);
  const torsoHeight = 1.16 * params.torsoHeightScale * (isChibi ? 0.82 : 1);
  const torsoWidth = 0.78 * params.torsoWidthScale * (intent.styleBias === "chunky" ? 1.06 : 1);
  const torsoDepth = 0.5 * params.torsoWidthScale;
  const pelvisHeight = 0.34 * (isChibi ? 1.06 : 1);
  const pelvisWidth = torsoWidth * 0.82;
  const pelvisDepth = torsoDepth * 0.9;
  const upperLegHeight = 0.7 * params.legLengthScale * (isChibi ? 0.84 : 1);
  const lowerLegHeight = 0.66 * params.legLengthScale * (isChibi ? 0.82 : 1);
  const upperArmHeight = 0.56 * params.armLengthScale * (isChibi ? 0.9 : 1);
  const lowerArmHeight = 0.5 * params.armLengthScale * (isChibi ? 0.88 : 1);
  const limbThickness = 0.18 * params.limbThicknessScale * (intent.styleBias === "chunky" ? 1.08 : 1);
  const handRadius = 0.12 * params.limbThicknessScale;
  const footHeight = 0.08 * params.limbThicknessScale;
  const footDepth = 0.32 * (isChibi ? 1.08 : 1);
  const shoulderHalfWidth = (torsoWidth * params.shoulderWidthScale) / 2 + limbThickness * 0.25;
  const hipHalfWidth = Math.max(params.stanceWidth, pelvisWidth * 0.35);

  const footY = footHeight / 2;
  const lowerLegY = footHeight + lowerLegHeight / 2;
  const upperLegY = footHeight + lowerLegHeight + upperLegHeight / 2;
  const pelvisY = footHeight + lowerLegHeight + upperLegHeight + pelvisHeight / 2;
  const torsoY = pelvisY + pelvisHeight / 2 + torsoHeight / 2 + 0.12;
  const neckHeight = 0.12;
  const headY = torsoY + torsoHeight / 2 + neckHeight + headHeight / 2;
  const shoulderY = torsoY + torsoHeight * 0.3;

  const operations: Ai3DPlan["operations"] = [
    {
      type: "create_primitive",
      nodeId: "torso",
      primitive: "capsule",
      label: "Torso",
      transform: {
        position: [0, torsoY, 0],
        scale: [torsoWidth, torsoHeight, torsoDepth]
      },
      material: { color: palette.body, roughness: 1 }
    },
    {
      type: "create_primitive",
      nodeId: "pelvis",
      primitive: "box",
      label: "Pelvis",
      transform: {
        position: [0, pelvisY, 0],
        scale: [pelvisWidth, pelvisHeight, pelvisDepth]
      },
      material: { color: palette.lower, roughness: 1 }
    },
    {
      type: "create_primitive",
      nodeId: "head",
      primitive: "sphere",
      label: "Head",
      transform: {
        position: [0, headY, 0],
        scale: [headWidth, headHeight, headWidth]
      },
      material: { color: palette.skin, roughness: 1 }
    },
    {
      type: "create_primitive",
      nodeId: "neck",
      primitive: "cylinder",
      label: "Neck",
      transform: {
        position: [0, torsoY + torsoHeight / 2 + neckHeight / 2 - 0.01, 0],
        scale: [0.12, neckHeight, 0.12]
      },
      material: { color: palette.skin, roughness: 1 }
    }
  ];

  if (params.optionalFeatures.includes("nose")) {
    operations.push({
      type: "create_primitive",
      nodeId: "nose",
      primitive: "cone",
      label: "Nose",
      transform: {
        position: [0, headY - headHeight * 0.06, headWidth * 0.42],
        quaternion: quatFromAxisAngle([1, 0, 0], Math.PI / 2),
        scale: [0.08, 0.12, 0.08]
      },
      material: { color: palette.skin, roughness: 1 }
    });
  }

  if (params.optionalFeatures.includes("eyes")) {
    operations.push(
      {
        type: "create_primitive",
        nodeId: "left_eye",
        primitive: "sphere",
        label: "Left Eye",
        transform: {
          position: [-headWidth * 0.18, headY + headHeight * 0.1, headWidth * 0.36],
          scale: [0.06, 0.06, 0.06]
        },
        material: { color: palette.feature, roughness: 0.9 }
      },
      {
        type: "create_primitive",
        nodeId: "right_eye",
        primitive: "sphere",
        label: "Right Eye",
        transform: {
          position: [headWidth * 0.18, headY + headHeight * 0.1, headWidth * 0.36],
          scale: [0.06, 0.06, 0.06]
        },
        material: { color: palette.feature, roughness: 0.9 }
      }
    );
  }

  if (params.optionalFeatures.includes("mouth")) {
    operations.push({
      type: "create_primitive",
      nodeId: "mouth",
      primitive: "capsule",
      label: "Mouth",
      transform: {
        position: [0, headY - headHeight * 0.2, headWidth * 0.34],
        quaternion: quatFromAxisAngle([0, 0, 1], Math.PI / 2),
        scale: [0.05, params.faceStyle === "friendly" ? 0.2 : 0.14, 0.05]
      },
      material: { color: palette.mouth, roughness: 1 }
    });
  }

  const armMaterial = { color: palette.skin, roughness: 1 };
  const legMaterial = { color: palette.lower, roughness: 1 };

  ([
    ["left", -1],
    ["right", 1]
  ] as const).forEach(([side, direction]) => {
    const x = shoulderHalfWidth * direction;
    const hipX = hipHalfWidth * direction;

    operations.push(
      {
        type: "create_primitive",
        nodeId: `${side}_upper_arm`,
        primitive: "cylinder",
        label: `${side === "left" ? "Left" : "Right"} Upper Arm`,
        transform: {
          position: [x, shoulderY - upperArmHeight / 2, 0],
          scale: [limbThickness, upperArmHeight, limbThickness]
        },
        material: armMaterial
      },
      {
        type: "create_primitive",
        nodeId: `${side}_lower_arm`,
        primitive: "cylinder",
        label: `${side === "left" ? "Left" : "Right"} Lower Arm`,
        transform: {
          position: [x, shoulderY - upperArmHeight - lowerArmHeight / 2, 0],
          scale: [limbThickness * 0.92, lowerArmHeight, limbThickness * 0.92]
        },
        material: armMaterial
      },
      {
        type: "create_primitive",
        nodeId: `${side}_hand`,
        primitive: "sphere",
        label: `${side === "left" ? "Left" : "Right"} Hand`,
        transform: {
          position: [x, shoulderY - upperArmHeight - lowerArmHeight - handRadius, 0],
          scale: [handRadius * 2, handRadius * 2, handRadius * 2]
        },
        material: armMaterial
      },
      {
        type: "create_primitive",
        nodeId: `${side}_upper_leg`,
        primitive: "cylinder",
        label: `${side === "left" ? "Left" : "Right"} Upper Leg`,
        transform: {
          position: [hipX, upperLegY, 0],
          scale: [limbThickness * 1.08, upperLegHeight, limbThickness * 1.08]
        },
        material: legMaterial
      },
      {
        type: "create_primitive",
        nodeId: `${side}_lower_leg`,
        primitive: "cylinder",
        label: `${side === "left" ? "Left" : "Right"} Lower Leg`,
        transform: {
          position: [hipX, lowerLegY, 0],
          scale: [limbThickness, lowerLegHeight, limbThickness]
        },
        material: legMaterial
      },
      {
        type: "create_primitive",
        nodeId: `${side}_foot`,
        primitive: "box",
        label: `${side === "left" ? "Left" : "Right"} Foot`,
        transform: {
          position: [hipX, footY, footDepth * 0.18],
          scale: [limbThickness * 1.15, footHeight, footDepth]
        },
        material: { color: palette.accent, roughness: 1 }
      }
    );
  });

  return {
    summary: `A stylized humanoid sketch of ${intent.subjectLabel} built from a stable template.`,
    operations
  };
}

export function validateHumanoidTemplateParams(value: unknown) {
  const parsed = humanoidTemplateParamsSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid humanoid template params.");
  }

  const dedupedFeatures = Array.from(new Set(parsed.data.optionalFeatures));

  return {
    ...parsed.data,
    optionalFeatures: dedupedFeatures.length > 0 ? dedupedFeatures : ["eyes", "mouth"]
  } satisfies HumanoidTemplateParams;
}

export function inferHumanoidTemplateParamsFromPlan(plan: Ai3DPlan): HumanoidTemplateParams {
  const createOperations = plan.operations.filter(
    (operation) =>
      operation.type === "create_primitive" ||
      operation.type === "create_shape" ||
      operation.type === "create_extrude" ||
      operation.type === "create_tube"
  );
  const nodes = new Map(
    createOperations.map((operation) => [operation.nodeId, operation] as const)
  );

  const torso = nodes.get("torso");
  const head = nodes.get("head");
  const leftUpperArm = nodes.get("left_upper_arm");
  const leftUpperLeg = nodes.get("left_upper_leg");
  const leftFoot = nodes.get("left_foot");
  const torsoColor = torso?.material?.color;
  const torsoScale = torso?.transform.scale ?? [0.78, 1.16, 0.5];
  const headScale = head?.transform.scale ?? [0.6, 0.72, 0.6];
  const leftUpperArmScale = leftUpperArm?.transform.scale ?? [0.18, 0.56, 0.18];
  const leftUpperArmPosition = leftUpperArm?.transform.position ?? [-0.84, 1.74, 0];
  const leftUpperLegScale = leftUpperLeg?.transform.scale ?? [0.22, 0.7, 0.22];
  const leftFootPosition = leftFoot?.transform.position ?? [-0.28, 0.04, 0.08];

  const palette = torsoColor
    ? (Object.entries(HUMANOID_PALETTES).find(([, colors]) => colors.body === torsoColor)?.[0] ??
      "blue_slate")
    : "blue_slate";

  return validateHumanoidTemplateParams({
    bodyStyle:
      head && torso && headScale[1] / Math.max(torsoScale[1], 0.01) > 0.82
        ? "chibi"
        : "adult",
    headScale: head ? headScale[0] / 0.6 : 1,
    torsoHeightScale: torso ? torsoScale[1] / 1.16 : 1,
    torsoWidthScale: torso ? torsoScale[0] / 0.78 : 1,
    armLengthScale: leftUpperArm ? leftUpperArmScale[1] / 0.56 : 1,
    legLengthScale: leftUpperLeg ? leftUpperLegScale[1] / 0.7 : 1,
    limbThicknessScale: leftUpperArm ? leftUpperArmScale[0] / 0.18 : 1,
    shoulderWidthScale:
      torso && leftUpperArm
        ? Math.max(0.9, Math.min(1.3, Math.abs(leftUpperArmPosition[0]) / (torsoScale[0] / 2 + 0.045)))
        : 1,
    stanceWidth:
      leftFoot && torso ? Math.max(0.18, Math.min(0.48, Math.abs(leftFootPosition[0]))) : 0.28,
    palette,
    faceStyle: nodes.has("mouth") ? "friendly" : "minimal",
    optionalFeatures: ["eyes", "mouth", nodes.has("nose") ? "nose" : null].filter(Boolean)
  });
}

export const humanoidBaseTemplate: Ai3DTemplateDefinition<HumanoidTemplateParams> = {
  key: "humanoid_base",
  archetype: "humanoid",
  validateParams: validateHumanoidTemplateParams,
  buildPlan: ({ prompt, intent, params }) =>
    buildHumanoidPlan({
      intent: {
        styleBias: intent.styleBias,
        pose: intent.pose,
        subjectLabel: intent.subjectLabel || prompt
      },
      params
    })
};
