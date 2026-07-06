import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const THEME_CONTEXT_URL = new URL(
  "../../../components/editor/editorThemeContext.tsx",
  import.meta.url
);
const EDITOR_CANVAS_VIEW_SOURCE = readFileSync(
  new URL("../../../components/editorCanvasView.tsx", import.meta.url),
  "utf8"
);
const TOP_BAR_SOURCE = readFileSync(
  new URL("../../../components/editor/topBar.tsx", import.meta.url),
  "utf8"
);

test("editor theme tokens are provided through context instead of TopBar prop drilling", () => {
  assert.equal(existsSync(THEME_CONTEXT_URL), true);
  const themeContextSource = readFileSync(THEME_CONTEXT_URL, "utf8");

  assert.match(themeContextSource, /createContext/);
  assert.match(themeContextSource, /EditorThemeProvider/);
  assert.match(themeContextSource, /useEditorTheme/);
  assert.match(themeContextSource, /getEditorThemeTokens/);
  assert.match(EDITOR_CANVAS_VIEW_SOURCE, /<EditorThemeProvider>/);
  assert.match(TOP_BAR_SOURCE, /useEditorTheme\(\)/);
  assert.doesNotMatch(TOP_BAR_SOURCE, /getEditorThemeTokens/);
  assert.doesNotMatch(TOP_BAR_SOURCE, /theme=\\{theme\\}/);
});
