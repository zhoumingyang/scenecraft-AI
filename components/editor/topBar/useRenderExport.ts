import { useEffect, useRef, useState } from "react";
import type { RenderExportProgressStatus } from "@/components/editor/renderExportProgressToast";
import { normalizeRenderExportImageDataUrl } from "@/components/editor/renderExportImageNormalization";
import {
  shouldIncludeGridHelperInRenderExport,
  shouldOfferAiRenderExportOptimization
} from "@/components/editor/renderExportMode";
import { optimizeRenderExportImage } from "@/frontend/api/ai";
import type { EditorApp, EditorViewportCaptureImageMetadata } from "@/render/editor";
import type { TopBarTranslate } from "./types";

const RENDER_EXPORT_MAX_IMAGE_BYTES = 700 * 1024;
const RENDER_EXPORT_MAX_DIMENSIONS = [1536, 1280, 1024, 960, 768, 640];
const RENDER_EXPORT_JPEG_QUALITIES = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42];

type UseRenderExportOptions = {
  app: EditorApp | null;
  confirm: (options: {
    message: string;
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmColor?: "primary" | "error";
  }) => Promise<boolean>;
  t: TopBarTranslate;
};

export function useRenderExport({
  app,
  confirm,
  t
}: UseRenderExportOptions) {
  const renderExportControllerRef = useRef<AbortController | null>(null);
  const [renderExportStatus, setRenderExportStatus] = useState<RenderExportProgressStatus>({
    active: false,
    progress: 0,
    message: ""
  });

  useEffect(() => {
    return () => {
      renderExportControllerRef.current?.abort();
    };
  }, []);

  const onExportRender = async () => {
    if (!app || renderExportStatus.active) return;

    const renderMode = app.getRenderMode();
    const canOptimizeWithAi = shouldOfferAiRenderExportOptimization(renderMode);
    const shouldOptimizeWithAi = canOptimizeWithAi
      ? await confirm({
          title: t("editor.export.aiOptimizeTitle"),
          message: t("editor.export.aiOptimizeMessage"),
          confirmLabel: t("editor.export.aiOptimizeConfirm"),
          cancelLabel: t("editor.export.aiOptimizeDirect")
        })
      : false;
    const controller = new AbortController();
    renderExportControllerRef.current = controller;
    setRenderExportStatus({
      active: true,
      progress: 0,
      message: t("editor.export.preparing")
    });

    try {
      const captureMetadataRef: { current: EditorViewportCaptureImageMetadata | null } = {
        current: null
      };
      const dataUrl = await app.captureViewportImageAsync("clean", {
        signal: controller.signal,
        includeGridHelper: shouldIncludeGridHelperInRenderExport(renderMode),
        ...(canOptimizeWithAi
          ? {
              image: {
                format: "compressed-jpeg" as const,
                maxBytes: RENDER_EXPORT_MAX_IMAGE_BYTES,
                maxDimensions: RENDER_EXPORT_MAX_DIMENSIONS,
                qualities: RENDER_EXPORT_JPEG_QUALITIES
              },
              onImageEncoded: (metadata: EditorViewportCaptureImageMetadata) => {
                captureMetadataRef.current = metadata;
              }
            }
          : {}),
        onProgress: (progress) => {
          setRenderExportStatus({
            active: true,
            progress: progress.progress,
            message: t("editor.export.rendering")
          });
        }
      });

      if (!canOptimizeWithAi || !shouldOptimizeWithAi) {
        downloadDataUrl(dataUrl, createRenderExportFileName(dataUrl));
        setRenderExportStatus({
          active: false,
          progress: 0,
          message: ""
        });
        return;
      }

      const captureMetadata = captureMetadataRef.current;
      if (!captureMetadata) {
        throw new Error("Compressed render export metadata was not captured.");
      }
      if (!captureMetadata.withinBudget) {
        throw new Error("Compressed render export image exceeded the AI upload budget.");
      }

      setRenderExportStatus({
        active: true,
        indeterminate: true,
        progress: 1,
        message: t("editor.export.aiOptimizing")
      });

      try {
        const optimized = await optimizeRenderExportImage(
          {
            imageDataUrl: dataUrl,
            width: captureMetadata.width,
            height: captureMetadata.height
          },
          { signal: controller.signal }
        );
        const normalizedImageDataUrl = await normalizeRenderExportImageDataUrl(
          optimized.imageDataUrl,
          captureMetadata.width,
          captureMetadata.height
        );
        downloadDataUrl(normalizedImageDataUrl, createRenderExportFileName(normalizedImageDataUrl, {
          aiOptimized: true
        }));
      } catch (optimizationError) {
        if (isRenderExportAbortError(optimizationError)) {
          throw optimizationError;
        }

        console.error("[editor] AI render export optimization failed.", optimizationError);
        downloadDataUrl(dataUrl, createRenderExportFileName(dataUrl));
      }

      setRenderExportStatus({
        active: false,
        progress: 0,
        message: ""
      });
    } catch (error) {
      if (!isRenderExportAbortError(error)) {
        console.error("[editor] Render export failed.", error);
      }
      setRenderExportStatus({
        active: false,
        progress: 0,
        message: ""
      });
    } finally {
      if (renderExportControllerRef.current === controller) {
        renderExportControllerRef.current = null;
      }
    }
  };

  const onCancelRenderExport = () => {
    renderExportControllerRef.current?.abort();
  };

  return {
    onCancelRenderExport,
    onExportRender,
    renderExportStatus
  };
}

function createRenderExportFileName(
  dataUrl: string,
  options: { aiOptimized?: boolean } = {}
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = options.aiOptimized ? "-ai" : "";
  return `scenecraft-render-${timestamp}${suffix}.${getDataUrlFileExtension(dataUrl)}`;
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getDataUrlFileExtension(dataUrl: string) {
  if (dataUrl.startsWith("data:image/png")) return "png";
  if (dataUrl.startsWith("data:image/webp")) return "webp";
  return "jpg";
}

function isRenderExportAbortError(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "CanceledError");
}
