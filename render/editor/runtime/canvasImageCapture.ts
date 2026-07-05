type CanvasBlobCaptureSource = {
  width?: number;
  height?: number;
  toBlob(callback: BlobCallback, type?: string, quality?: unknown): void;
};

type CanvasDataUrlReader = (blob: Blob) => Promise<string>;
type Canvas2DContextTarget = {
  drawImage(
    image: unknown,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ): void;
};
type ResizableCanvasTarget = CanvasBlobCaptureSource & {
  width: number;
  height: number;
  getContext(type: "2d"): Canvas2DContextTarget | null;
};

export type CanvasToPngDataUrlOptions = {
  readBlobAsDataUrl?: CanvasDataUrlReader;
};

export type CompressedImageCaptureMetadata = {
  dataUrl: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  byteSize: number;
  width: number;
  height: number;
  quality: number;
  maxBytes: number;
  withinBudget: boolean;
};

export type CanvasToCompressedImageDataUrlOptions = {
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
  maxBytes?: number;
  maxDimensions?: number[];
  qualities?: number[];
  readBlobAsDataUrl?: CanvasDataUrlReader;
  createCanvas?: (width: number, height: number) => ResizableCanvasTarget;
};

const DEFAULT_COMPRESSED_CAPTURE_MAX_BYTES = 700 * 1024;
const DEFAULT_COMPRESSED_CAPTURE_DIMENSIONS = [1536, 1280, 1024, 960, 768, 640];
const DEFAULT_COMPRESSED_CAPTURE_QUALITIES = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42];

export async function canvasToPngDataUrlAsync(
  canvas: CanvasBlobCaptureSource,
  options: CanvasToPngDataUrlOptions = {}
) {
  const blob = await canvasToBlobAsync(canvas, "image/png");
  const readBlobAsDataUrl = options.readBlobAsDataUrl ?? readBlobAsDataUrlAsync;
  return readBlobAsDataUrl(blob);
}

export async function canvasToCompressedImageDataUrlAsync(
  canvas: CanvasBlobCaptureSource,
  options: CanvasToCompressedImageDataUrlOptions = {}
): Promise<CompressedImageCaptureMetadata> {
  const sourceWidth = normalizePositiveInteger(canvas.width, 1);
  const sourceHeight = normalizePositiveInteger(canvas.height, 1);
  const mimeType = options.mimeType ?? "image/jpeg";
  const maxBytes = normalizePositiveInteger(
    options.maxBytes,
    DEFAULT_COMPRESSED_CAPTURE_MAX_BYTES
  );
  const maxDimensions = normalizeCandidateNumbers(
    options.maxDimensions,
    DEFAULT_COMPRESSED_CAPTURE_DIMENSIONS
  );
  const qualities = normalizeCandidateNumbers(
    options.qualities,
    DEFAULT_COMPRESSED_CAPTURE_QUALITIES
  );
  const readBlobAsDataUrl = options.readBlobAsDataUrl ?? readBlobAsDataUrlAsync;
  for (const maxDimension of maxDimensions) {
    const dimensions = fitDimensionsWithin(sourceWidth, sourceHeight, maxDimension);
    const targetCanvas = createTargetCanvas(canvas, dimensions.width, dimensions.height, options);

    for (const quality of qualities) {
      const blob = await canvasToBlobAsync(targetCanvas, mimeType, quality);
      const dataUrl = await readBlobAsDataUrl(blob);
      const byteSize = readBlobSize(blob, dataUrl);
      const result: CompressedImageCaptureMetadata = {
        dataUrl,
        mimeType,
        byteSize,
        width: dimensions.width,
        height: dimensions.height,
        quality,
        maxBytes,
        withinBudget: byteSize <= maxBytes
      };

      if (result.withinBudget) {
        return result;
      }
    }
  }

  throw new Error(`Unable to compress canvas capture below ${maxBytes} bytes.`);
}

function canvasToBlobAsync(canvas: CanvasBlobCaptureSource, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(`Unable to encode canvas capture as ${type}.`));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

function readBlobAsDataUrlAsync(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to read canvas capture as a data URL."));
        return;
      }
      resolve(reader.result);
    }, { once: true });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("Unable to read canvas capture as a data URL."));
    }, { once: true });
    reader.readAsDataURL(blob);
  });
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.round(value));
}

function normalizeCandidateNumbers(values: number[] | undefined, fallback: number[]) {
  const source = values?.length ? values : fallback;
  return source
    .map((value) => (typeof value === "number" && Number.isFinite(value) ? value : null))
    .filter((value): value is number => value !== null && value > 0);
}

function fitDimensionsWithin(width: number, height: number, maxDimension: number) {
  const largest = Math.max(width, height);
  if (largest <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / largest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

function createTargetCanvas(
  sourceCanvas: CanvasBlobCaptureSource,
  width: number,
  height: number,
  options: CanvasToCompressedImageDataUrlOptions
) {
  if (sourceCanvas.width === width && sourceCanvas.height === height) {
    return sourceCanvas;
  }

  const targetCanvas = options.createCanvas
    ? options.createCanvas(width, height)
    : createBrowserCanvas(width, height);
  const context = targetCanvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create a 2D canvas context for compressed capture.");
  }

  targetCanvas.width = width;
  targetCanvas.height = height;
  context.drawImage(
    sourceCanvas,
    0,
    0,
    normalizePositiveInteger(sourceCanvas.width, width),
    normalizePositiveInteger(sourceCanvas.height, height),
    0,
    0,
    width,
    height
  );
  return targetCanvas;
}

function createBrowserCanvas(width: number, height: number) {
  if (typeof document === "undefined") {
    throw new Error("A canvas factory is required outside the browser.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function readBlobSize(blob: Blob, dataUrl: string) {
  if (typeof blob.size === "number" && Number.isFinite(blob.size)) {
    return blob.size;
  }

  return Math.ceil((dataUrl.length * 3) / 4);
}
