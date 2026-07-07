import assert from "node:assert/strict";
import test from "node:test";

import sharedContracts from "../../../../../lib/api/contracts/ai/shared.ts";

const { AI_PROMPT_MAX_LENGTH, promptSchema } = sharedContracts;

test("prompt schema accepts prompts up to the shared AI prompt limit", () => {
  const prompt = "a".repeat(AI_PROMPT_MAX_LENGTH);

  assert.equal(promptSchema.parse(prompt), prompt);
});

test("prompt schema rejects prompts over the shared AI prompt limit", () => {
  const prompt = "a".repeat(AI_PROMPT_MAX_LENGTH + 1);

  assert.throws(() => promptSchema.parse(prompt), /Prompt must be 4000 characters or fewer/);
});
