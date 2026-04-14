const DEFAULT_OPENROUTER_API_BASE_URL = "https://openrouter.ai/api";
const CLOUDFLARE_AI_GATEWAY_BASE_URL = "https://gateway.ai.cloudflare.com/v1";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getOpenRouterApiBaseUrl() {
  const explicitBaseUrl = readEnv("OPENROUTER_BASE_URL");
  if (explicitBaseUrl) {
    return trimTrailingSlash(explicitBaseUrl);
  }

  const accountId = readEnv("CLOUDFLARE_AI_GATEWAY_ACCOUNT_ID");
  const gatewayId = readEnv("CLOUDFLARE_AI_GATEWAY_ID");

  if (!accountId && !gatewayId) {
    return DEFAULT_OPENROUTER_API_BASE_URL;
  }

  if (!accountId || !gatewayId) {
    throw new Error(
      "Cloudflare AI Gateway is partially configured. Set both CLOUDFLARE_AI_GATEWAY_ACCOUNT_ID and CLOUDFLARE_AI_GATEWAY_ID, or remove both."
    );
  }

  return `${CLOUDFLARE_AI_GATEWAY_BASE_URL}/${accountId}/${gatewayId}/openrouter`;
}

export function getOpenRouterChatCompletionsEndpoint() {
  return `${getOpenRouterApiBaseUrl()}/v1/chat/completions`;
}

export function getOpenRouterHeaders(apiKey: string) {
  const cloudflareGatewayToken =
    readEnv("CLOUDFLARE_AI_GATEWAY_TOKEN") ?? readEnv("CF_AIG_TOKEN");

  return {
    Authorization: `Bearer ${apiKey}`,
    ...(cloudflareGatewayToken
      ? {
          "cf-aig-authorization": `Bearer ${cloudflareGatewayToken}`
        }
      : {})
  };
}
