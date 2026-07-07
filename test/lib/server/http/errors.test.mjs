import assert from "node:assert/strict";
import test from "node:test";

import {
  ServerConfigurationError,
  getServerErrorStatus,
  isServerConfigurationError
} from "../../../../lib/server/http/errors.ts";

test("server configuration errors map to HTTP 500 without message matching", () => {
  const error = new ServerConfigurationError("Persistence is unavailable.");

  assert.equal(isServerConfigurationError(error), true);
  assert.equal(getServerErrorStatus(error, 400), 500);
});

test("wrapped server configuration errors still map to HTTP 500", () => {
  const error = new Error("Project save failed.", {
    cause: new ServerConfigurationError("Storage is unavailable.")
  });

  assert.equal(isServerConfigurationError(error), true);
  assert.equal(getServerErrorStatus(error, 400), 500);
});

test("ordinary errors keep the route fallback status", () => {
  const error = new Error("Snapshot id must match the project id in the URL.");

  assert.equal(isServerConfigurationError(error), false);
  assert.equal(getServerErrorStatus(error, 400), 400);
});
