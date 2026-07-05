export type RenderExportImageNormalizationOptions = {
  createCanvas?: (width: number, height: number) => HTMLCanvasElement;
  imageFactory?: () => HTMLImageElement;
  outputQuality?: number;
};

export async function normalizeRenderExportImageDataUrl(
  imageDataUrl: string,
  targetWidth: number,
  targetHeight: number,
  options: RenderExportImageNormalizationOptions = {}
) {
  const width = normalizeDimension(targetWidth, "width");
  const height = normalizeDimension(targetHeight, "height");
  const image = await loadImage(imageDataUrl, options.imageFactory ?? createBrowserImage);
  const canvas = options.createCanvas
    ? options.createCanvas(width, height)
    : createBrowserCanvas(width, height);
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to normalize render export image.");
  }

  const sourceWidth = normalizeDimension(image.naturalWidth || image.width, "source width");
  const sourceHeight = normalizeDimension(image.naturalHeight || image.height, "source height");
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = width / height;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (sourceAspect > targetAspect) {
    sw = Math.round(sourceHeight * targetAspect);
    sx = Math.round((sourceWidth - sw) / 2);
  } else if (sourceAspect < targetAspect) {
    sh = Math.round(sourceWidth / targetAspect);
    sy = Math.round((sourceHeight - sh) / 2);
  }

  context.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", options.outputQuality ?? 0.9);
}

function loadImage(imageDataUrl: string, imageFactory: () => HTMLImageElement) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = imageFactory();
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error("Unable to load render export image.")), {
      once: true
    });
    image.src = imageDataUrl;
  });
}

function createBrowserImage() {
  return new Image();
}

function createBrowserCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function normalizeDimension(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Render export ${label} must be a positive number.`);
  }

  return Math.max(1, Math.round(value));
}
