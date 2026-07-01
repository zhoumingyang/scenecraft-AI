import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("exposes path trace advanced settings from the scene panel", () => {
  const sceneSettingsSection = readFileSync(
    join(process.cwd(), "components/editor/propertyPanelSections/sceneSettingsSection.tsx"),
    "utf8"
  );
  const enMessages = readFileSync(join(process.cwd(), "lib/i18n/en.ts"), "utf8");
  const zhMessages = readFileSync(join(process.cwd(), "lib/i18n/zh.ts"), "utf8");

  assert.match(sceneSettingsSection, /TuneRoundedIcon/);
  assert.match(sceneSettingsSection, /<Popover/);
  assert.match(sceneSettingsSection, /pathTraceInteractiveSamples/);
  assert.match(sceneSettingsSection, /pathTraceInteractiveRenderScale/);
  assert.match(enMessages, /editor\.properties\.pathTraceAdvancedSettings/);
  assert.match(zhMessages, /editor\.properties\.pathTraceAdvancedSettings/);
});
