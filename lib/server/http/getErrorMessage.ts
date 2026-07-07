export function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    if (error.message.trim()) {
      return error.message;
    }
  }

  return fallbackMessage;
}
