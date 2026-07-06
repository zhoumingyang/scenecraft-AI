import assert from "node:assert/strict";
import test from "node:test";

import assetsContracts from "../../../../lib/api/contracts/assets.ts";

test("remote image fetch request schema accepts HTTPS image URLs", () => {
  const parsed = assetsContracts.fetchRemoteImageRequestSchema.parse({
    url: "https://cdn.example.com/image.png"
  });

  assert.equal(parsed.url.href, "https://cdn.example.com/image.png");
});

test("remote image fetch request schema rejects missing and non-HTTPS URLs", () => {
  assert.throws(
    () => assetsContracts.fetchRemoteImageRequestSchema.parse({}),
    /Image URL is required/
  );
  assert.throws(
    () => assetsContracts.fetchRemoteImageRequestSchema.parse({ url: "http://example.com/a.png" }),
    /Only HTTPS image URLs/
  );
});
