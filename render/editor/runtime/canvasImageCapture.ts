type CanvasBlobCaptureSource = {
  toBlob(callback: BlobCallback, type?: string, quality?: unknown): void;
};

type CanvasDataUrlReader = (blob: Blob) => Promise<string>;

export type CanvasToPngDataUrlOptions = {
  readBlobAsDataUrl?: CanvasDataUrlReader;
};

export async function canvasToPngDataUrlAsync(
  canvas: CanvasBlobCaptureSource,
  options: CanvasToPngDataUrlOptions = {}
) {
  const blob = await canvasToBlobAsync(canvas);
  const readBlobAsDataUrl = options.readBlobAsDataUrl ?? readBlobAsDataUrlAsync;
  return readBlobAsDataUrl(blob);
}

function canvasToBlobAsync(canvas: CanvasBlobCaptureSource) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to encode canvas capture as PNG."));
        return;
      }
      resolve(blob);
    }, "image/png");
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
