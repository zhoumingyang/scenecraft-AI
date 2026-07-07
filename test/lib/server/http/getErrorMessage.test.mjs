import assert from "node:assert/strict";
import test from "node:test";

import { getErrorMessage } from "../../../../lib/server/http/getErrorMessage.ts";

test("getErrorMessage does not expose nested cause messages in client responses", () => {
  const error = new Error("Failed to load projects.", {
    cause: new Error("connection failed for DATABASE_URL=postgres://secret@example.test/db")
  });

  const message = getErrorMessage(error, "Fallback message.");

  assert.equal(message, "Failed to load projects.");
  assert.doesNotMatch(message, /DATABASE_URL/);
  assert.doesNotMatch(message, /postgres:\/\/secret/);
});

test("getErrorMessage does not expose object cause message fields", () => {
  const error = new Error("Failed to prepare asset upload.", {
    cause: { message: "BLOB_READ_WRITE_TOKEN missing from private config" }
  });

  const message = getErrorMessage(error, "Fallback message.");

  assert.equal(message, "Failed to prepare asset upload.");
  assert.doesNotMatch(message, /BLOB_READ_WRITE_TOKEN/);
});
