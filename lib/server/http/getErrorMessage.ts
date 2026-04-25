export function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;

    if (cause instanceof Error && cause.message.trim()) {
      return `${error.message}\nCause: ${cause.message}`;
    }

    if (typeof cause === "object" && cause && "message" in cause) {
      const causeMessage = (cause as { message?: unknown }).message;
      if (typeof causeMessage === "string" && causeMessage.trim()) {
        return `${error.message}\nCause: ${causeMessage}`;
      }
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  return fallbackMessage;
}
