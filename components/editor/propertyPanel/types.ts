import type { useI18n } from "@/lib/i18n";
import type {
  EditorApp,
  StudioScenePostProcessingState,
  StudioSceneState,
  StudioTransientEntityMetadata
} from "@/render/editor";
import type { AiMode, AiTextureSettings } from "@/stores/editorStore";
import type { TextureFieldKey } from "@/components/editor/propertyPanelSections";
import type { getEditorThemeTokens } from "@/components/editor/theme";
import type { PropertyPanelEntityRecord } from "./usePropertyPanelState";

export type Translate = ReturnType<typeof useI18n>["t"];
export type EditorThemeTokens = ReturnType<typeof getEditorThemeTokens>;

export type PropertyPanelContentProps = {
  app: EditorApp | null;
  aiMode: AiMode;
  aiTexture: AiTextureSettings | null;
  canIsolateCurrentEntity: boolean;
  canPreviewCurrentEntityInStudio: boolean;
  currentIsolatableEntityId: string | null;
  entityRecord: PropertyPanelEntityRecord | null;
  inspectorMode: "entity" | "ai";
  isCurrentEntityInStudio: boolean;
  isCurrentEntityIsolated: boolean;
  isCsgOperandMultiSelection: boolean;
  isMultiSelection: boolean;
  isPolyhavenEnabled: boolean;
  panelTitle: string;
  selectedEntityId: string | null;
  selectedEntityIds: string[];
  selectedCsgOperandEntityIds: string[];
  studioEntityMetadata: StudioTransientEntityMetadata | null;
  studioPostProcessingState: StudioScenePostProcessingState | null;
  studioScene: StudioSceneState | null;
  theme: EditorThemeTokens;
  t: Translate;
  onAiLibraryOpen: () => void;
  onAdvancedMaterialOpen: () => void;
  onMaterialLibraryOpen: () => void;
  onStudioEntryOpen: (entityId: string) => void;
  onTextureConfigOpen: (field: TextureFieldKey) => void;
};
