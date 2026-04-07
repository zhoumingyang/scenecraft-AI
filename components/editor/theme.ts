import type { EditorThemeMode } from "@/stores/editorStore";

type EditorThemeTokens = {
  rootTint: string;
  rootGlow: string;
  pillBorder: string;
  pillBg: string;
  pillText: string;
  pillShadow: string;
  panelBorder: string;
  panelBg: string;
  panelBgMuted: string;
  panelShadow: string;
  titleText: string;
  text: string;
  mutedText: string;
  sectionBorder: string;
  sectionBg: string;
  itemBg: string;
  itemHoverBg: string;
  itemSelectedBg: string;
  itemSelectedBorder: string;
  iconButtonBg: string;
  inputBg: string;
  menuBorder: string;
  menuBg: string;
  menuItemText: string;
  menuItemHoverBg: string;
  menuItemSelectedBg: string;
  menuItemDisabledText: string;
};

const editorThemes: Record<EditorThemeMode, EditorThemeTokens> = {
  dark: {
    rootTint: "linear-gradient(180deg, rgba(8,12,24,0.12), rgba(8,12,24,0.18))",
    rootGlow:
      "radial-gradient(circle at top left, rgba(97,145,255,0.12), transparent 32%), radial-gradient(circle at top right, rgba(72,215,255,0.08), transparent 26%)",
    pillBorder: "1px solid rgba(180,205,255,0.3)",
    pillBg: "rgba(8,12,24,0.72)",
    pillText: "rgba(234,242,255,0.96)",
    pillShadow: "0 12px 28px rgba(0,0,0,0.24)",
    panelBorder: "1px solid rgba(180,205,255,0.26)",
    panelBg: "rgba(8,12,24,0.78)",
    panelBgMuted: "rgba(255,255,255,0.03)",
    panelShadow: "0 18px 40px rgba(0,0,0,0.28)",
    titleText: "rgba(220,232,255,0.92)",
    text: "rgba(219,230,255,0.84)",
    mutedText: "rgba(170,188,225,0.74)",
    sectionBorder: "1px solid rgba(160,190,255,0.14)",
    sectionBg: "rgba(255,255,255,0.03)",
    itemBg: "rgba(255,255,255,0.03)",
    itemHoverBg: "rgba(115,170,255,0.18)",
    itemSelectedBg: "rgba(78,140,255,0.18)",
    itemSelectedBorder: "1px solid rgba(124,183,255,0.8)",
    iconButtonBg: "rgba(255,255,255,0.03)",
    inputBg: "rgba(255,255,255,0.04)",
    menuBorder: "1px solid rgba(150,190,255,0.24)",
    menuBg: "linear-gradient(160deg, rgba(16,24,44,0.96), rgba(7,11,22,0.94))",
    menuItemText: "rgba(232,241,255,0.92)",
    menuItemHoverBg: "rgba(115,170,255,0.18)",
    menuItemSelectedBg: "linear-gradient(135deg, rgba(110,170,255,0.35), rgba(88,150,255,0.2))",
    menuItemDisabledText: "rgba(232,241,255,0.45)"
  },
  light: {
    rootTint: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(240,246,255,0.24))",
    rootGlow:
      "radial-gradient(circle at top left, rgba(255,185,104,0.22), transparent 28%), radial-gradient(circle at top right, rgba(128,193,255,0.22), transparent 32%)",
    pillBorder: "1px solid rgba(128,159,202,0.34)",
    pillBg: "rgba(249,252,255,0.78)",
    pillText: "rgba(30,47,76,0.94)",
    pillShadow: "0 12px 28px rgba(120,146,186,0.18)",
    panelBorder: "1px solid rgba(125,156,204,0.28)",
    panelBg: "rgba(250,252,255,0.82)",
    panelBgMuted: "rgba(255,255,255,0.68)",
    panelShadow: "0 18px 40px rgba(106,131,168,0.18)",
    titleText: "rgba(46,63,95,0.92)",
    text: "rgba(56,76,108,0.88)",
    mutedText: "rgba(98,119,152,0.78)",
    sectionBorder: "1px solid rgba(140,167,206,0.22)",
    sectionBg: "rgba(255,255,255,0.72)",
    itemBg: "rgba(255,255,255,0.64)",
    itemHoverBg: "rgba(143,189,255,0.26)",
    itemSelectedBg: "rgba(126,174,255,0.24)",
    itemSelectedBorder: "1px solid rgba(96,147,235,0.62)",
    iconButtonBg: "rgba(255,255,255,0.66)",
    inputBg: "rgba(255,255,255,0.8)",
    menuBorder: "1px solid rgba(128,159,202,0.28)",
    menuBg: "linear-gradient(160deg, rgba(255,255,255,0.98), rgba(238,245,255,0.96))",
    menuItemText: "rgba(38,58,89,0.92)",
    menuItemHoverBg: "rgba(143,189,255,0.22)",
    menuItemSelectedBg:
      "linear-gradient(135deg, rgba(137,185,255,0.38), rgba(114,167,255,0.22))",
    menuItemDisabledText: "rgba(96,116,147,0.45)"
  }
};

export function getEditorThemeTokens(mode: EditorThemeMode) {
  return editorThemes[mode];
}
