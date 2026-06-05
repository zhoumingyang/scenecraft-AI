import { Tab, Tabs } from "@mui/material";
import type { EditorThemeTokens } from "@/components/editor/theme";
import type { ProjectAiAssetKindJSON } from "@/render/editor";
import type { AiAssetTab } from "./types";

export function ProjectAiLibraryTabs({
  activeTab,
  getAssetKindLabel,
  getTabCount,
  onChange,
  t,
  theme,
  visibleTabs
}: {
  activeTab: AiAssetTab;
  getAssetKindLabel: (kind: ProjectAiAssetKindJSON) => string;
  getTabCount: (tab: AiAssetTab) => number;
  onChange: (tab: AiAssetTab) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  theme: EditorThemeTokens;
  visibleTabs: ProjectAiAssetKindJSON[];
}) {
  return (
    <Tabs
      value={activeTab}
      onChange={(_, value: AiAssetTab) => onChange(value)}
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        minHeight: 36,
        mb: 1.4,
        borderBottom: theme.sectionBorder,
        "& .MuiTab-root": {
          minHeight: 36,
          px: 1.2,
          color: theme.text,
          fontSize: 12,
          fontWeight: 700,
          textTransform: "none"
        },
        "& .Mui-selected": {
          color: theme.titleText
        },
        "& .MuiTabs-indicator": {
          background: theme.titleText
        }
      }}
    >
      <Tab value="all" label={`${t("editor.project.aiLibraryAll")} (${getTabCount("all")})`} />
      {visibleTabs.map((kind) => (
        <Tab key={kind} value={kind} label={`${getAssetKindLabel(kind)} (${getTabCount(kind)})`} />
      ))}
    </Tabs>
  );
}
