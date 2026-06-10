export type HomeEffectViewportSize = {
  width: number;
  height: number;
};

type HostSizeSource = {
  getBoundingClientRect: () => Pick<DOMRectReadOnly, "width" | "height">;
};

export function getHomeEffectViewportSize(host: HostSizeSource): HomeEffectViewportSize | null {
  const rect = host.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return null;
  }

  return { width, height };
}
