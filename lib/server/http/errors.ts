export class ServerConfigurationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ServerConfigurationError";
  }
}

export function isServerConfigurationError(error: unknown): error is ServerConfigurationError {
  if (error instanceof ServerConfigurationError) {
    return true;
  }

  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    return cause ? isServerConfigurationError(cause) : false;
  }

  return false;
}

export function getServerErrorStatus(error: unknown, fallbackStatus: number) {
  return isServerConfigurationError(error) ? 500 : fallbackStatus;
}
