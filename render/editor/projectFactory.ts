import type { EditorProjectJSON } from "./typings";

function createUuid() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `uuid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultEditorProjectJSON(): EditorProjectJSON {
  const projectId = createUuid();

  return {
    id: projectId,
    model: [],
    mesh: [],
    light: [
      {
        id: createUuid(),
        type: 1,
        color: "#ffffff",
        intensity: 0.55,
        position: [0, 0, 0],
        quaternion: [0, 0, 0, 1],
        scale: [1, 1, 1]
      },
      {
        id: createUuid(),
        type: 2,
        color: "#ffffff",
        intensity: 1.1,
        position: [6, 10, 4],
        quaternion: [0, 0, 0, 1],
        scale: [1, 1, 1]
      }
    ],
    camera: {
      type: 1,
      fov: 60,
      position: [10, 10, 10],
      quaternion: [0, 0, 0, 1],
      scale: [1, 1, 1]
    }
  };
}
