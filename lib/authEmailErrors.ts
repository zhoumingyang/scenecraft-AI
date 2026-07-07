export type ResendFailureStatus = number | "unknown";

export function getResendSendFailureMessage(status: ResendFailureStatus) {
  if (status === "unknown") {
    return "Resend send failed.";
  }

  return `Resend send failed with status ${status}.`;
}
