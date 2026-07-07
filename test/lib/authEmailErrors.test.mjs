import assert from "node:assert/strict";
import test from "node:test";

import { getResendSendFailureMessage } from "../../lib/authEmailErrors.ts";

test("Resend failure messages exclude provider payload details", () => {
  const message = getResendSendFailureMessage(422);

  assert.equal(message, "Resend send failed with status 422.");
  assert.doesNotMatch(message, /DATABASE_URL/);
  assert.doesNotMatch(message, /invalid_api_key/);
});

test("Resend failure messages handle missing response status generically", () => {
  assert.equal(getResendSendFailureMessage("unknown"), "Resend send failed.");
});
