const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

function readBooleanFlag(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  return fallback;
}

export function isPolyhavenProviderEnabled() {
  return readBooleanFlag(
    process.env.ASSET_PROVIDER_POLYHAVEN_ENABLED ??
      process.env.NEXT_PUBLIC_ASSET_PROVIDER_POLYHAVEN_ENABLED,
    true
  );
}

export function isPolyhavenAttributionEnabled() {
  return readBooleanFlag(process.env.POLYHAVEN_ATTRIBUTION_ENABLED, true);
}

export function getPolyhavenRequestIdentity() {
  return (
    process.env.POLYHAVEN_REQUEST_IDENTITY?.trim() ||
    "SceneCraftAI/1.0 (+https://scenecraft.ai)"
  );
}
