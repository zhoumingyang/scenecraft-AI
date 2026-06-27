import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const transformSectionPath = resolve(
  __dirname,
  "../../../../components/editor/propertyPanelSections/transformSection.tsx"
);

test("transform scale sliders allow scale values up to 20", () => {
  const source = readFileSync(transformSectionPath, "utf8");
  const scaleSliderMatch = source.match(
    /<AxisSliderGroup\s+label=""[\s\S]*?values=\{scaleValues\}[\s\S]*?max=\{(\d+)\}/
  );

  assert.ok(scaleSliderMatch, "expected transform scale AxisSliderGroup to be configured");
  assert.equal(Number(scaleSliderMatch[1]), 20);
});

test("transform scale uniform mode is enabled by default", () => {
  const source = readFileSync(transformSectionPath, "utf8");
  const uniformScaleStateMatch = source.match(
    /const \[isUniformScaleEnabled,\s*setIsUniformScaleEnabled\] = useState\((true|false)\)/
  );

  assert.ok(uniformScaleStateMatch, "expected transform uniform scale state to be initialized");
  assert.equal(uniformScaleStateMatch[1], "true");
});
