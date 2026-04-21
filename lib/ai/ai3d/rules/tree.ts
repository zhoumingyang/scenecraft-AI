import { z } from "zod";
import type { Ai3DPlan } from "@/render/editor/ai3d/plan";
import type { Ai3DRuleDefinition } from "./types";

const TREE_PALETTES = {
  oak: {
    trunk: "#7a5232",
    branch: "#6a472b",
    leafPrimary: "#5f8f44",
    leafSecondary: "#79a85a"
  },
  pine: {
    trunk: "#6f5535",
    branch: "#5c452c",
    leafPrimary: "#3c7046",
    leafSecondary: "#4f855a"
  },
  spring: {
    trunk: "#7b5639",
    branch: "#694633",
    leafPrimary: "#8dbf64",
    leafSecondary: "#b6d97e"
  },
  autumn: {
    trunk: "#6e4a30",
    branch: "#5b3c28",
    leafPrimary: "#d68b44",
    leafSecondary: "#c7563b"
  }
} as const;

const TREE_CANOPY_STYLES = ["rounded", "layered", "cone"] as const;

export const treeRuleParamsSchema = z
  .object({
    trunkHeightScale: z.number().finite().min(0.85).max(1.45),
    trunkThicknessScale: z.number().finite().min(0.8).max(1.3),
    trunkLean: z.number().finite().min(-0.22).max(0.22),
    branchCount: z.number().int().min(2).max(5),
    branchLengthScale: z.number().finite().min(0.7).max(1.3),
    branchLift: z.number().finite().min(0.25).max(0.9),
    canopyWidthScale: z.number().finite().min(0.8).max(1.5),
    canopyHeightScale: z.number().finite().min(0.7).max(1.35),
    canopyClusterCount: z.number().int().min(2).max(5),
    canopySpread: z.number().finite().min(0.18).max(0.9),
    canopyOffsetX: z.number().finite().min(-0.42).max(0.42),
    canopyOffsetZ: z.number().finite().min(-0.32).max(0.32),
    canopyStyle: z.enum(TREE_CANOPY_STYLES),
    rootFlare: z.number().finite().min(0.8).max(1.3),
    asymmetry: z.number().finite().min(0).max(0.45),
    palette: z.enum(
      Object.keys(TREE_PALETTES) as [keyof typeof TREE_PALETTES, ...Array<keyof typeof TREE_PALETTES>]
    )
  })
  .strict();

export type TreeRuleParams = z.infer<typeof treeRuleParamsSchema>;

function quatFromAxisAngle(
  axis: [number, number, number],
  radians: number
): [number, number, number, number] {
  const half = radians / 2;
  const sinHalf = Math.sin(half);
  return [axis[0] * sinHalf, axis[1] * sinHalf, axis[2] * sinHalf, Math.cos(half)];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeVector([x, y, z]: [number, number, number]) {
  const length = Math.hypot(x, y, z);

  if (length <= 1e-6) {
    return [0, 1, 0] as [number, number, number];
  }

  return [x / length, y / length, z / length] as [number, number, number];
}

function quatFromUnitVectors(
  from: [number, number, number],
  to: [number, number, number]
): [number, number, number, number] {
  const f = normalizeVector(from);
  const t = normalizeVector(to);
  const dot = f[0] * t[0] + f[1] * t[1] + f[2] * t[2];

  if (dot < -0.999999) {
    return quatFromAxisAngle([1, 0, 0], Math.PI);
  }

  const cross: [number, number, number] = [
    f[1] * t[2] - f[2] * t[1],
    f[2] * t[0] - f[0] * t[2],
    f[0] * t[1] - f[1] * t[0]
  ];
  const w = 1 + dot;
  const length = Math.hypot(cross[0], cross[1], cross[2], w);

  if (length <= 1e-6) {
    return [0, 0, 0, 1];
  }

  return [cross[0] / length, cross[1] / length, cross[2] / length, w / length];
}

function buildTreePlan({
  intent,
  params
}: {
  intent: { subjectLabel: string; styleBias: string };
  params: TreeRuleParams;
}): Ai3DPlan {
  const palette = TREE_PALETTES[params.palette];
  const trunkHeight = 1.9 * params.trunkHeightScale;
  const trunkRadius = 0.22 * params.trunkThicknessScale;
  const trunkCenterY = trunkHeight / 2;
  const canopyBaseY = trunkHeight + 0.45;
  const canopyWidth = 1.3 * params.canopyWidthScale;
  const canopyHeight = 1.1 * params.canopyHeightScale;
  const rootWidth = trunkRadius * 2.6 * params.rootFlare;
  const branchBaseRadius = trunkRadius * 0.52;
  const branchLength = 0.95 * params.branchLengthScale;
  const canopyCenterX = params.trunkLean * 0.24 + params.canopyOffsetX;
  const canopyCenterZ = params.canopyOffsetZ;

  const operations: Ai3DPlan["operations"] = [
    {
      type: "create_primitive",
      nodeId: "trunk",
      primitive: "cylinder",
      label: "Trunk",
      transform: {
        position: [params.trunkLean * 0.24, trunkCenterY, 0],
        quaternion: quatFromAxisAngle([0, 0, 1], params.trunkLean),
        scale: [trunkRadius, trunkHeight, trunkRadius]
      },
      material: { color: palette.trunk, roughness: 1 }
    },
    {
      type: "create_primitive",
      nodeId: "root_flare",
      primitive: "capsule",
      label: "Root Flare",
      transform: {
        position: [params.trunkLean * 0.08, 0.18, 0],
        scale: [rootWidth, 0.34, rootWidth]
      },
      material: { color: palette.branch, roughness: 1 }
    }
  ];

  for (let index = 0; index < params.branchCount; index += 1) {
    const progress = params.branchCount === 1 ? 0.5 : index / (params.branchCount - 1);
    const side = index % 2 === 0 ? -1 : 1;
    const asymmetryOffset = side * params.asymmetry * (0.14 + progress * 0.24);
    const branchBaseY = trunkHeight * (0.5 + progress * 0.2);
    const start: [number, number, number] = [params.trunkLean * 0.12, branchBaseY, 0];
    const lateralReach = side * (0.42 + progress * 0.16 + asymmetryOffset) * params.branchLengthScale;
    const upwardReach = branchLength * params.branchLift * (0.62 - progress * 0.12);
    const depthReach =
      (index % 3 === 0 ? 1 : index % 3 === 1 ? -1 : 0.35) * (0.08 + params.asymmetry * 0.18);
    const end: [number, number, number] = [
      start[0] + lateralReach,
      start[1] + upwardReach,
      depthReach
    ];
    const direction: [number, number, number] = [
      end[0] - start[0],
      end[1] - start[1],
      end[2] - start[2]
    ];
    const midpoint: [number, number, number] = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
      (start[2] + end[2]) / 2
    ];
    const branchScaleY = branchLength * (1 - progress * 0.12);
    const branchScaleX = branchBaseRadius * (1 - progress * 0.1);

    operations.push({
      type: "create_primitive",
      nodeId: `branch_${index + 1}`,
      primitive: "cylinder",
      label: `Branch ${index + 1}`,
      transform: {
        position: midpoint,
        quaternion: quatFromUnitVectors([0, 1, 0], direction),
        scale: [branchScaleX, branchScaleY, branchScaleX]
      },
      material: { color: palette.branch, roughness: 1 }
    });
  }

  const canopyClusterCount = params.canopyClusterCount;
  const canopySpread = params.canopySpread;

  const pushCanopyCluster = ({
    nodeId,
    label,
    position,
    scale,
    color
  }: {
    nodeId: string;
    label: string;
    position: [number, number, number];
    scale: [number, number, number];
    color: string;
  }) => {
    operations.push({
      type: "create_primitive",
      nodeId,
      primitive: "sphere",
      label,
      transform: {
        position,
        scale
      },
      material: { color, roughness: 1 }
    });
  };

  if (params.canopyStyle === "rounded") {
    pushCanopyCluster({
      nodeId: "canopy_main",
      label: "Canopy Main",
      position: [canopyCenterX, canopyBaseY + canopyHeight * 0.18, canopyCenterZ],
      scale: [canopyWidth * 0.84, canopyHeight * 0.86, canopyWidth * 0.78],
      color: palette.leafPrimary
    });

    for (let index = 0; index < canopyClusterCount - 1; index += 1) {
      const progress = canopyClusterCount === 2 ? 0.5 : index / Math.max(canopyClusterCount - 2, 1);
      const side = index % 2 === 0 ? -1 : 1;
      const ring = Math.floor(index / 2);
      const xOffset = side * canopySpread * (0.34 + progress * 0.18);
      const yOffset = canopyHeight * (-0.06 + ring * 0.12 + progress * 0.08);
      const zOffset = ((index % 3) - 1) * canopySpread * 0.18 + params.asymmetry * side * 0.1;

      pushCanopyCluster({
        nodeId: `canopy_cluster_${index + 1}`,
        label: `Canopy Cluster ${index + 1}`,
        position: [canopyCenterX + xOffset, canopyBaseY + yOffset, canopyCenterZ + zOffset],
        scale: [
          canopyWidth * (0.44 + progress * 0.08),
          canopyHeight * (0.42 + ring * 0.08),
          canopyWidth * (0.38 + progress * 0.1)
        ],
        color: index % 2 === 0 ? palette.leafSecondary : palette.leafPrimary
      });
    }
  } else if (params.canopyStyle === "layered") {
    pushCanopyCluster({
      nodeId: "canopy_lower",
      label: "Canopy Lower",
      position: [canopyCenterX, canopyBaseY - 0.08, canopyCenterZ],
      scale: [canopyWidth * 0.96, canopyHeight * 0.52, canopyWidth * 0.84],
      color: palette.leafPrimary
    });
    pushCanopyCluster({
      nodeId: "canopy_upper",
      label: "Canopy Upper",
      position: [
        canopyCenterX + params.asymmetry * 0.22,
        canopyBaseY + canopyHeight * 0.34,
        canopyCenterZ
      ],
      scale: [canopyWidth * 0.62, canopyHeight * 0.46, canopyWidth * 0.58],
      color: palette.leafSecondary
    });

    for (let index = 0; index < canopyClusterCount - 2; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const progress = canopyClusterCount <= 3 ? 0.5 : index / (canopyClusterCount - 3);
      pushCanopyCluster({
        nodeId: `canopy_layer_${index + 1}`,
        label: `Canopy Layer ${index + 1}`,
        position: [
          canopyCenterX + side * canopySpread * (0.24 + progress * 0.22),
          canopyBaseY + canopyHeight * (0.06 + progress * 0.16),
          canopyCenterZ + side * canopySpread * 0.08
        ],
        scale: [
          canopyWidth * (0.34 + progress * 0.08),
          canopyHeight * (0.24 + progress * 0.08),
          canopyWidth * (0.3 + progress * 0.08)
        ],
        color: index % 2 === 0 ? palette.leafSecondary : palette.leafPrimary
      });
    }
  } else {
    operations.push(
      {
        type: "create_primitive",
        nodeId: "canopy_core",
        primitive: "cone",
        label: "Canopy Core",
        transform: {
          position: [canopyCenterX, canopyBaseY + canopyHeight * 0.2, canopyCenterZ],
          scale: [canopyWidth * 0.72, canopyHeight, canopyWidth * 0.72]
        },
        material: { color: palette.leafPrimary, roughness: 1 }
      },
      {
        type: "create_primitive",
        nodeId: "canopy_fill",
        primitive: "sphere",
        label: "Canopy Fill",
        transform: {
          position: [canopyCenterX, canopyBaseY + canopyHeight * 0.02, canopyCenterZ],
          scale: [canopyWidth * 0.76, canopyHeight * 0.44, canopyWidth * 0.76]
        },
        material: { color: palette.leafSecondary, roughness: 1 }
      }
    );

    for (let index = 0; index < canopyClusterCount - 2; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      pushCanopyCluster({
        nodeId: `canopy_flank_${index + 1}`,
        label: `Canopy Flank ${index + 1}`,
        position: [
          canopyCenterX + side * canopySpread * (0.18 + index * 0.08),
          canopyBaseY + canopyHeight * (0.12 + index * 0.06),
          canopyCenterZ + side * canopySpread * 0.06
        ],
        scale: [
          canopyWidth * (0.26 + index * 0.04),
          canopyHeight * (0.18 + index * 0.03),
          canopyWidth * (0.24 + index * 0.04)
        ],
        color: palette.leafSecondary
      });
    }
  }

  if (intent.styleBias === "chunky") {
    operations.push({
      type: "set_transform",
      nodeId: "trunk",
      transform: {
        scale: [trunkRadius * 1.12, trunkHeight, trunkRadius * 1.12]
      }
    });
  }

  return {
    summary: `A stylized low-poly tree sketch of ${intent.subjectLabel} built from a rule-based growth scaffold.`,
    operations
  };
}

export function validateTreeRuleParams(value: unknown) {
  const parsed = treeRuleParamsSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid tree rule params.");
  }

  return parsed.data;
}

export function createTreeRuleVariant(
  params: TreeRuleParams,
  variationSeed: string | null | undefined
) {
  if (!variationSeed) {
    return params;
  }

  const hash = Array.from(variationSeed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const jitter = (offset: number) => (((hash * (offset + 3)) % 101) / 100 - 0.5) * 2;

  return validateTreeRuleParams({
    ...params,
    trunkLean: clamp(params.trunkLean + jitter(1) * 0.08, -0.22, 0.22),
    branchCount: clamp(params.branchCount + (jitter(2) > 0.35 ? 1 : jitter(2) < -0.35 ? -1 : 0), 2, 5),
    branchLengthScale: clamp(params.branchLengthScale + jitter(3) * 0.12, 0.7, 1.3),
    branchLift: clamp(params.branchLift + jitter(4) * 0.08, 0.25, 0.9),
    canopyWidthScale: clamp(params.canopyWidthScale + jitter(5) * 0.14, 0.8, 1.5),
    canopyHeightScale: clamp(params.canopyHeightScale + jitter(6) * 0.12, 0.7, 1.35),
    canopyClusterCount: clamp(
      params.canopyClusterCount + (jitter(7) > 0.2 ? 1 : jitter(7) < -0.2 ? -1 : 0),
      2,
      5
    ),
    canopySpread: clamp(params.canopySpread + Math.abs(jitter(8)) * 0.18, 0.18, 0.9),
    canopyOffsetX: clamp(params.canopyOffsetX + jitter(9) * 0.16, -0.42, 0.42),
    canopyOffsetZ: clamp(params.canopyOffsetZ + jitter(10) * 0.12, -0.32, 0.32),
    asymmetry: clamp(params.asymmetry + Math.abs(jitter(11)) * 0.12, 0, 0.45)
  });
}

export function inferTreeRuleParamsFromPlan(plan: Ai3DPlan): TreeRuleParams {
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

  const trunk = nodes.get("trunk");
  const branchNodes = Array.from(nodes.values()).filter((node) => node.nodeId.startsWith("branch_"));
  const canopyNodes = Array.from(nodes.values()).filter((node) => node.nodeId.startsWith("canopy_"));
  const trunkScale = trunk?.transform.scale ?? [0.22, 1.9, 0.22];
  const trunkPosition = trunk?.transform.position ?? [0, 0.95, 0];
  const palette =
    trunk?.material?.color
      ? (Object.entries(TREE_PALETTES).find(([, colors]) => colors.trunk === trunk.material?.color)?.[0] ?? "oak")
      : "oak";

  const canopyStyle =
    nodes.has("canopy_core") ? "cone" : nodes.has("canopy_upper") ? "layered" : "rounded";

  return validateTreeRuleParams({
    trunkHeightScale: trunk ? trunkScale[1] / 1.9 : 1,
    trunkThicknessScale: trunk ? trunkScale[0] / 0.22 : 1,
    trunkLean:
      trunk && trunkPosition[1] !== 0 ? trunkPosition[0] / Math.max(trunkPosition[1], 0.25) : 0,
    branchCount: Math.max(2, Math.min(5, branchNodes.length || 3)),
    branchLengthScale:
      branchNodes.length > 0
        ? branchNodes.reduce((sum, node) => sum + (node.transform.scale?.[1] ?? 0.95), 0) /
          branchNodes.length /
          0.95
        : 1,
    branchLift: 0.6,
    canopyWidthScale:
      canopyNodes.length > 0
        ? canopyNodes.reduce((sum, node) => sum + (node.transform.scale?.[0] ?? 1.3), 0) /
          canopyNodes.length /
          1.3
        : 1,
    canopyHeightScale:
      canopyNodes.length > 0
        ? canopyNodes.reduce((sum, node) => sum + (node.transform.scale?.[1] ?? 1.1), 0) /
          canopyNodes.length /
          1.1
        : 1,
    canopyClusterCount: Math.max(2, Math.min(5, canopyNodes.length || 2)),
    canopySpread:
      canopyNodes.length > 1
        ? clamp(
            canopyNodes.reduce((sum, node) => sum + Math.abs(node.transform.position?.[0] ?? 0), 0) /
              canopyNodes.length /
              0.8,
            0.18,
            0.9
          )
        : 0.32,
    canopyOffsetX:
      canopyNodes.length > 0
        ? clamp(
            canopyNodes.reduce((sum, node) => sum + (node.transform.position?.[0] ?? 0), 0) /
              canopyNodes.length,
            -0.42,
            0.42
          )
        : 0,
    canopyOffsetZ:
      canopyNodes.length > 0
        ? clamp(
            canopyNodes.reduce((sum, node) => sum + (node.transform.position?.[2] ?? 0), 0) /
              canopyNodes.length,
            -0.32,
            0.32
          )
        : 0,
    canopyStyle,
    rootFlare: nodes.has("root_flare")
      ? ((nodes.get("root_flare")?.transform.scale?.[0] ?? 0.22 * 2.6) / (0.22 * 2.6))
      : 1,
    asymmetry:
      branchNodes.length > 0
        ? Math.min(
            0.45,
            branchNodes.reduce((sum, node) => sum + Math.abs(node.transform.position?.[0] ?? 0), 0) /
              branchNodes.length /
              2
          )
        : 0.18,
    palette
  });
}

export const treeGrowthRule: Ai3DRuleDefinition<TreeRuleParams> = {
  key: "tree_growth",
  archetype: "tree",
  validateParams: validateTreeRuleParams,
  buildPlan: ({ prompt, intent, params }) =>
    buildTreePlan({
      intent: {
        subjectLabel: intent.subjectLabel || prompt,
        styleBias: intent.styleBias
      },
      params
    })
};
