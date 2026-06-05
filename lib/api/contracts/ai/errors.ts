import { z } from "zod";
import { mapValidationError } from "./shared";

export type ApiErrorResponse = {
  message: string;
};

export function getAiApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallbackMessage;
  }

  return mapValidationError(error, fallbackMessage);
}
