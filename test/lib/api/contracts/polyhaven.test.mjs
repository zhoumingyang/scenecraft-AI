import assert from "node:assert/strict";
import test from "node:test";

import polyhavenContracts from "../../../../lib/api/contracts/polyhaven.ts";

test("polyhaven asset list query schema validates type and falls back pagination", () => {
  const parsed = polyhavenContracts.listPolyhavenAssetsQuerySchema.parse({
    type: "texture",
    page: "not-a-number",
    pageSize: "-12",
    q: "wood",
    category: "floor"
  });

  assert.equal(parsed.assetType, "texture");
  assert.equal(parsed.page, 1);
  assert.equal(parsed.pageSize, 24);
  assert.equal(parsed.query, "wood");
  assert.equal(parsed.category, "floor");
});

test("polyhaven asset detail query schema rejects unsupported asset types", () => {
  assert.throws(
    () => polyhavenContracts.getPolyhavenAssetDetailQuerySchema.parse({ type: "sound" }),
    /Unsupported asset type/
  );
});

test("polyhaven category params schema validates route asset type", () => {
  assert.equal(
    polyhavenContracts.listPolyhavenCategoriesParamsSchema.parse({ type: "hdri" }).assetType,
    "hdri"
  );
  assert.throws(
    () => polyhavenContracts.listPolyhavenCategoriesParamsSchema.parse({ type: "video" }),
    /Unsupported asset type/
  );
});
