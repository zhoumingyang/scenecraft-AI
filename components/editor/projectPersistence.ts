import type { UploadedProjectAsset } from "@/lib/api/contracts/assets";
import type { EditorApp, EditorProjectJSON, ResolvedTextureSchema } from "@/render/editor";

const TEXTURE_FIELDS = [
  "diffuseMap",
  "metalnessMap",
  "roughnessMap",
  "normalMap",
  "aoMap",
  "emissiveMap"
] as const;

export function createClientUuid(prefix = "asset") {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function syncEditorProjectSearchParam(projectId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);

  if (projectId) {
    url.searchParams.set("projectId", projectId);
  } else {
    url.searchParams.delete("projectId");
  }

  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export async function dataUrlToFile(dataUrl: string, fileName: string, fallbackMimeType = "image/png") {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const mimeType = blob.type || fallbackMimeType;
  return new File([blob], fileName, { type: mimeType });
}

export async function readImageDimensions(dataUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight
      });
    };
    image.onerror = () => reject(new Error("Failed to read image dimensions."));
    image.src = dataUrl;
  });
}

export function applyUploadedAssetToProjectSnapshot(
  snapshot: EditorProjectJSON,
  sourceUrl: string,
  uploadedAsset: UploadedProjectAsset
) {
  if (snapshot.envConfig?.panoUrl === sourceUrl) {
    snapshot.envConfig = {
      ...snapshot.envConfig,
      panoAssetName: uploadedAsset.originalName,
      panoUrl: uploadedAsset.url,
      panoAssetId: uploadedAsset.assetId
    };
  }

  if (snapshot.envConfig?.ground?.material) {
    let nextMaterial = snapshot.envConfig.ground.material;
    let changed = false;

    TEXTURE_FIELDS.forEach((field) => {
      const texture = nextMaterial[field];
      if (!texture || texture.url !== sourceUrl) {
        return;
      }

      nextMaterial = {
        ...nextMaterial,
        [field]: {
          ...texture,
          url: uploadedAsset.url,
          assetId: uploadedAsset.assetId
        }
      };
      changed = true;
    });

    if (changed) {
      snapshot.envConfig = {
        ...snapshot.envConfig,
        ground: {
          ...snapshot.envConfig.ground,
          material: nextMaterial
        }
      };
    }
  }

  snapshot.model = snapshot.model?.map((model) =>
    model.source === sourceUrl
      ? {
          ...model,
          source: uploadedAsset.url,
          sourceAssetId: uploadedAsset.assetId
        }
      : model
  );

  snapshot.mesh = snapshot.mesh?.map((mesh) => {
    if (!mesh.material) {
      return mesh;
    }

    let nextMaterial = mesh.material;
    let changed = false;

    TEXTURE_FIELDS.forEach((field) => {
      const texture = nextMaterial[field];
      if (!texture || texture.url !== sourceUrl) {
        return;
      }

      nextMaterial = {
        ...nextMaterial,
        [field]: {
          ...texture,
          url: uploadedAsset.url,
          assetId: uploadedAsset.assetId
        }
      };
      changed = true;
    });

    return changed
      ? {
          ...mesh,
          material: nextMaterial
        }
      : mesh;
  });
}

export function projectSnapshotUsesSourceUrl(snapshot: EditorProjectJSON, sourceUrl: string) {
  if (snapshot.envConfig?.panoUrl === sourceUrl) {
    return true;
  }

  if (snapshot.model?.some((model) => model.source === sourceUrl)) {
    return true;
  }

  if (
    TEXTURE_FIELDS.some((field) => snapshot.envConfig?.ground?.material?.[field]?.url === sourceUrl)
  ) {
    return true;
  }

  return (
    snapshot.mesh?.some((mesh) =>
      TEXTURE_FIELDS.some((field) => mesh.material?.[field]?.url === sourceUrl)
    ) ?? false
  );
}

function createClearedTexture(texture: ResolvedTextureSchema): ResolvedTextureSchema {
  return {
    ...texture,
    assetId: "",
    url: "",
    externalSource: null
  };
}

export function clearProjectTextureReferencesByUrl(app: EditorApp, sourceUrl: string) {
  const project = app.projectModel;
  if (!project || !sourceUrl) {
    return false;
  }

  let cleared = false;
  const groundPatch: Partial<Record<(typeof TEXTURE_FIELDS)[number], ResolvedTextureSchema>> = {};

  TEXTURE_FIELDS.forEach((field) => {
    const texture = project.envConfig.ground.material[field];
    if (texture.url === sourceUrl) {
      groundPatch[field] = createClearedTexture(texture);
    }
  });

  if (Object.keys(groundPatch).length > 0) {
    app.updateGroundMaterial(groundPatch);
    cleared = true;
  }

  project.meshes.forEach((mesh) => {
    const meshPatch: Partial<Record<(typeof TEXTURE_FIELDS)[number], ResolvedTextureSchema>> = {};

    TEXTURE_FIELDS.forEach((field) => {
      const texture = mesh.material[field];
      if (texture.url === sourceUrl) {
        meshPatch[field] = createClearedTexture(texture);
      }
    });

    if (Object.keys(meshPatch).length > 0) {
      app.updateMeshMaterial(mesh.id, meshPatch);
      cleared = true;
    }
  });

  return cleared;
}
