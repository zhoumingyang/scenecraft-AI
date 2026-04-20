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
    const asymmetryOffset = side * params.asymmetry * (0.2 + progress * 0.4);
    const branchY = trunkHeight * (0.48 + progress * 0.24);
    const branchX = params.trunkLean * 0.18 + side * (0.34 + progress * 0.12 + asymmetryOffset);
    const branchZ = index === params.branchCount - 1 && params.branchCount > 3 ? 0.12 : 0;
    const branchTilt = side * (0.55 + progress * 0.16);
    const branchScaleY = branchLength * (1 - progress * 0.12);
    const branchScaleX = branchBaseRadius * (1 - progress * 0.1);

    operations.push({
      type: "create_primitive",
      nodeId: `branch_${index + 1}`,
      primitive: "cylinder",
      label: `Branch ${index + 1}`,
      transform: {
        position: [branchX, branchY, branchZ],
        quaternion: quatFromAxisAngle([0, 0, 1], branchTilt * params.branchLift),
        scale: [branchScaleX, branchScaleY, branchScaleX]
      },
      material: { color: palette.branch, roughness: 1 }
    });
  }

  if (params.canopyStyle === "rounded") {
    operations.push(
      {
        type: "create_primitive",
        nodeId: "canopy_main",
        primitive: "sphere",
        label: "Canopy Main",
        transform: {
          position: [params.trunkLean * 0.26, canopyBaseY + canopyHeight * 0.16, 0],
          scale: [canopyWidth, canopyHeight, canopyWidth * 0.92]
        },
        material: { color: palette.leafPrimary, roughness: 1 }
      },
      {
        type: "create_primitive",
        nodeId: "canopy_side",
        primitive: "sphere",
        label: "Canopy Accent",
        transform: {
          position: [params.trunkLean * 0.18 + params.asymmetry * 0.55, canopyBaseY - 0.04, 0.04],
          scale: [canopyWidth * 0.72, canopyHeight * 0.72, canopyWidth * 0.62]
        },
        material: { color: palette.leafSecondary, roughness: 1 }
      }
    );
  } else if (params.canopyStyle === "layered") {
    operations.push(
      {
        type: "create_primitive",
        nodeId: "canopy_lower",
        primitive: "sphere",
        label: "Canopy Lower",
        transform: {
          position: [params.trunkLean * 0.22, canopyBaseY - 0.1, 0],
          scale: [canopyWidth, canopyHeight * 0.55, canopyWidth * 0.88]
        },
        material: { color: palette.leafPrimary, roughness: 1 }
      },
      {
        type: "create_primitive",
        nodeId: "canopy_upper",
        primitive: "sphere",
        label: "Canopy Upper",
        transform: {
          position: [params.trunkLean * 0.3 + params.asymmetry * 0.35, canopyBaseY + canopyHeight * 0.34, 0],
          scale: [canopyWidth * 0.72, canopyHeight * 0.52, canopyWidth * 0.68]
        },
        material: { color: palette.leafSecondary, roughness: 1 }
      }
    );
  } else {
    operations.push(
      {
        type: "create_primitive",
        nodeId: "canopy_core",
        primitive: "cone",
        label: "Canopy Core",
        transform: {
          position: [params.trunkLean * 0.2, canopyBaseY + canopyHeight * 0.2, 0],
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
          position: [params.trunkLean * 0.16, canopyBaseY + canopyHeight * 0.02, 0],
          scale: [canopyWidth * 0.76, canopyHeight * 0.44, canopyWidth * 0.76]
        },
        material: { color: palette.leafSecondary, roughness: 1 }
      }
    );
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
