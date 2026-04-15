import type { Ai3DProvider } from "./types";
import { openRouterAi3DProvider } from "@/lib/ai/ai3d/providers/openrouter";

const DEFAULT_PROVIDER_KEY = "openrouter-freeform";

const providerRegistry = new Map<string, Ai3DProvider>([[openRouterAi3DProvider.key, openRouterAi3DProvider]]);

export function getAi3DProvider(key = DEFAULT_PROVIDER_KEY) {
  const provider = providerRegistry.get(key);

  if (!provider) {
    throw new Error(`Unknown AI 3D provider: ${key}`);
  }

  return provider;
}
