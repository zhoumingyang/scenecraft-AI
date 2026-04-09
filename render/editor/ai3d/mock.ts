import type { Ai3DPlan } from "./plan";

function createHumanoidPlan(): Ai3DPlan {
  return {
    summary: "Minecraft-style humanoid blockout built from 8 box-heavy primitives.",
    operations: [
      {
        type: "create_primitive",
        nodeId: "head",
        primitive: "box",
        label: "Head",
        transform: {
          position: [0, 2.42, 0],
          scale: [0.52, 0.52, 0.52]
        },
        material: {
          color: "#f0c7a1",
          roughness: 1
        }
      },
      {
        type: "create_primitive",
        nodeId: "torso",
        primitive: "box",
        label: "Torso",
        transform: {
          position: [0, 1.55, 0],
          scale: [0.72, 1.1, 0.38]
        },
        material: {
          color: "#6d8cff",
          roughness: 1
        }
      },
      {
        type: "create_primitive",
        nodeId: "hip",
        primitive: "box",
        label: "Hip",
        transform: {
          position: [0, 0.92, 0],
          scale: [0.74, 0.32, 0.4]
        },
        material: {
          color: "#2f3d63",
          roughness: 1
        }
      },
      {
        type: "create_primitive",
        nodeId: "arm_left",
        primitive: "box",
        label: "Left Arm",
        transform: {
          position: [-0.74, 1.58, 0],
          scale: [0.22, 1.02, 0.22]
        },
        material: {
          color: "#f0c7a1",
          roughness: 1
        }
      },
      {
        type: "create_primitive",
        nodeId: "arm_right",
        primitive: "box",
        label: "Right Arm",
        transform: {
          position: [0.74, 1.58, 0],
          scale: [0.22, 1.02, 0.22]
        },
        material: {
          color: "#f0c7a1",
          roughness: 1
        }
      },
      {
        type: "create_primitive",
        nodeId: "leg_left",
        primitive: "box",
        label: "Left Leg",
        transform: {
          position: [-0.22, 0.22, 0],
          scale: [0.24, 1.12, 0.24]
        },
        material: {
          color: "#45567a",
          roughness: 1
        }
      },
      {
        type: "create_primitive",
        nodeId: "leg_right",
        primitive: "box",
        label: "Right Leg",
        transform: {
          position: [0.22, 0.22, 0],
          scale: [0.24, 1.12, 0.24]
        },
        material: {
          color: "#45567a",
          roughness: 1
        }
      },
      {
        type: "create_primitive",
        nodeId: "feet",
        primitive: "box",
        label: "Feet",
        transform: {
          position: [0, -0.38, 0.04],
          scale: [0.72, 0.16, 0.34]
        },
        material: {
          color: "#2b2f38",
          roughness: 1
        }
      }
    ]
  };
}

function createChairPlan(): Ai3DPlan {
  return {
    summary: "Minecraft-style chair blockout built from 6 box-heavy primitives.",
    operations: [
      {
        type: "create_primitive",
        nodeId: "seat",
        primitive: "box",
        label: "Seat",
        transform: {
          position: [0, 0.9, 0],
          scale: [1.1, 0.18, 1.1]
        },
        material: {
          color: "#aa7b50"
        }
      },
      {
        type: "create_primitive",
        nodeId: "back",
        primitive: "box",
        label: "Back",
        transform: {
          position: [0, 1.72, -0.46],
          scale: [1.1, 1.4, 0.18]
        },
        material: {
          color: "#aa7b50"
        }
      },
      {
        type: "create_primitive",
        nodeId: "leg_fl",
        primitive: "box",
        transform: {
          position: [-0.42, 0.34, 0.42],
          scale: [0.14, 0.68, 0.14]
        },
        material: {
          color: "#5f4630"
        }
      },
      {
        type: "create_primitive",
        nodeId: "leg_fr",
        primitive: "box",
        transform: {
          position: [0.42, 0.34, 0.42],
          scale: [0.14, 0.68, 0.14]
        },
        material: {
          color: "#5f4630"
        }
      },
      {
        type: "create_primitive",
        nodeId: "leg_bl",
        primitive: "box",
        transform: {
          position: [-0.42, 0.34, -0.42],
          scale: [0.14, 0.68, 0.14]
        },
        material: {
          color: "#5f4630"
        }
      },
      {
        type: "create_primitive",
        nodeId: "leg_br",
        primitive: "box",
        transform: {
          position: [0.42, 0.34, -0.42],
          scale: [0.14, 0.68, 0.14]
        },
        material: {
          color: "#5f4630"
        }
      }
    ]
  };
}

function createTreePlan(): Ai3DPlan {
  return {
    summary: "Minecraft-style tree blockout built from 5 box-heavy primitives.",
    operations: [
      {
        type: "create_primitive",
        nodeId: "trunk",
        primitive: "box",
        label: "Trunk",
        transform: {
          position: [0, 0.92, 0],
          scale: [0.36, 1.4, 0.36]
        },
        material: {
          color: "#6c4c31"
        }
      },
      {
        type: "create_primitive",
        nodeId: "crown_low",
        primitive: "box",
        transform: {
          position: [0, 2.05, 0],
          scale: [1.28, 0.72, 1.28]
        },
        material: {
          color: "#70a857"
        }
      },
      {
        type: "create_primitive",
        nodeId: "crown_left",
        primitive: "box",
        transform: {
          position: [-0.62, 2.56, 0],
          scale: [0.52, 0.52, 0.9]
        },
        material: {
          color: "#5f954a"
        }
      },
      {
        type: "create_primitive",
        nodeId: "crown_right",
        primitive: "box",
        transform: {
          position: [0.62, 2.56, 0],
          scale: [0.52, 0.52, 0.9]
        },
        material: {
          color: "#5f954a"
        }
      },
      {
        type: "create_primitive",
        nodeId: "crown_top",
        primitive: "box",
        transform: {
          position: [0, 3.08, 0],
          scale: [0.84, 0.52, 0.84]
        },
        material: {
          color: "#4b7d3c"
        }
      }
    ]
  };
}

function createFallbackPlan(): Ai3DPlan {
  return {
    summary: "Minecraft-style placeholder blockout built from 1 box primitive.",
    operations: [
      {
        type: "create_primitive",
        nodeId: "placeholder",
        primitive: "box",
        label: "Placeholder",
        transform: {
          position: [0, 0.8, 0],
          scale: [1, 1, 1]
        },
        material: {
          color: "#8aa8ff"
        }
      }
    ]
  };
}

function createStarPlan(): Ai3DPlan {
  return {
    summary: "Simple custom star built from an extruded shape mesh.",
    operations: [
      {
        type: "create_extrude",
        nodeId: "star",
        preset: "star",
        label: "Star",
        depth: 0.26,
        transform: {
          position: [0, 1.2, 0],
          scale: [0.72, 0.72, 0.4]
        },
        material: {
          color: "#ffd54d",
          roughness: 0.85,
          metalness: 0.08
        }
      }
    ]
  };
}

function createHeartPlan(): Ai3DPlan {
  return {
    summary: "Simple custom heart built from an extruded shape mesh.",
    operations: [
      {
        type: "create_extrude",
        nodeId: "heart",
        preset: "heart",
        label: "Heart",
        depth: 0.22,
        transform: {
          position: [0, 1.2, 0],
          scale: [0.85, 0.85, 0.35]
        },
        material: {
          color: "#ff5f87",
          roughness: 0.92
        }
      }
    ]
  };
}

export function createMockAi3DPlan(prompt: string): Ai3DPlan {
  const normalized = prompt.trim().toLowerCase();

  if (normalized.includes("human") || normalized.includes("person")) {
    return createHumanoidPlan();
  }

  if (normalized.includes("chair")) {
    return createChairPlan();
  }

  if (normalized.includes("tree")) {
    return createTreePlan();
  }

  if (normalized.includes("star")) {
    return createStarPlan();
  }

  if (normalized.includes("heart")) {
    return createHeartPlan();
  }

  return createFallbackPlan();
}
