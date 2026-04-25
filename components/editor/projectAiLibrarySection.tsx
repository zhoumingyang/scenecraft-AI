"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import FormatPaintRoundedIcon from "@mui/icons-material/FormatPaintRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import AiImageApplyMeshPanel from "@/components/editor/aiImageApplyMeshPanel";
import { useI18n } from "@/lib/i18n";
import type { EditorThemeTokens } from "@/components/editor/theme";
import type { EditorMeshListItem, ProjectAiLibraryJSON } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";

type ProjectAiLibrarySectionProps = {
  library: ProjectAiLibraryJSON;
  theme: EditorThemeTokens;
  onViewImage: (imageUrl: string) => void;
};

export default function ProjectAiLibrarySection({
  library,
  theme,
  onViewImage
}: ProjectAiLibrarySectionProps) {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const projectVersion = useEditorStore((state) => state.projectVersion);
  const recordAiResultAppliedToMesh = useEditorStore((state) => state.recordAiResultAppliedToMesh);
  const [applyPanel, setApplyPanel] = useState<{
    imageUrl: string;
    anchorEl: HTMLElement | null;
  } | null>(null);
  const meshItems = useMemo<EditorMeshListItem[]>(() => app?.getMeshList() ?? [], [app, projectVersion]);

  useEffect(() => {
    if (meshItems.length > 0) {
      return;
    }

    setApplyPanel(null);
  }, [meshItems]);

  if (library.imageGenerations.length === 0) {
    return (
      <PropertyPanelSection title={t("editor.project.aiLibraryTitle")}>
        <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
          {t("editor.project.aiLibraryEmpty")}
        </Typography>
      </PropertyPanelSection>
    );
  }

  const handleApply = (meshId: string) => {
    if (!app || !applyPanel?.imageUrl) {
      return;
    }

    app.updateMeshMaterial(meshId, {
      diffuseMap: {
        url: applyPanel.imageUrl
      }
    });
    recordAiResultAppliedToMesh(applyPanel.imageUrl, meshId);
    app.setOutlineEntity(null);
    setApplyPanel(null);
  };

  return (
    <PropertyPanelSection title={t("editor.project.aiLibraryTitle")}>
      <Stack spacing={1}>
        {library.imageGenerations.map((generation) => (
          <Box
            key={generation.id}
            sx={{
              p: 1,
              borderRadius: 1,
              border: theme.sectionBorder,
              background: theme.sectionBg
            }}
          >
            <Stack spacing={0.9}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: theme.titleText }}>
                {generation.prompt}
              </Typography>
              <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
                {generation.model}
                {" · "}
                {generation.imageSize ?? "default"}
                {" · "}
                seed {generation.seed ?? "-"}
              </Typography>
              <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
                {new Date(generation.createdAt).toLocaleString()}
              </Typography>
              {generation.referenceImages && generation.referenceImages.length > 0 ? (
                <Stack direction="row" spacing={0.6} sx={{ flexWrap: "wrap" }}>
                  {generation.referenceImages.map((image) => (
                    <Box
                      key={image.assetId}
                      component="img"
                      src={image.url}
                      alt={image.originalName ?? generation.prompt}
                      sx={{ width: 56, height: 56, borderRadius: 1, objectFit: "cover" }}
                    />
                  ))}
                </Stack>
              ) : null}
              <Stack direction="row" spacing={0.8} sx={{ flexWrap: "wrap" }}>
                {generation.results.map((result) => (
                  <Box key={result.id} sx={{ width: 104 }}>
                    <Box
                      component="img"
                      src={result.url}
                      alt={generation.prompt}
                      sx={{
                        width: "100%",
                        height: 88,
                        borderRadius: 1,
                        objectFit: "cover",
                        border: theme.sectionBorder
                      }}
                    />
                    <Stack direction="row" justifyContent="flex-end" spacing={0.4} sx={{ pt: 0.4 }}>
                      <Tooltip title={t("editor.ai.viewResult")}>
                        <IconButton
                          size="small"
                          onClick={() => onViewImage(result.url)}
                          sx={{
                            color: theme.pillText,
                            border: theme.sectionBorder,
                            background: theme.itemBg
                          }}
                        >
                          <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("editor.ai.applyResult")}>
                        <IconButton
                          size="small"
                          onClick={(event) =>
                            setApplyPanel({
                              imageUrl: result.url,
                              anchorEl: event.currentTarget
                            })
                          }
                          sx={{
                            color: theme.pillText,
                            border: theme.sectionBorder,
                            background: theme.itemBg
                          }}
                        >
                          <FormatPaintRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>
      <AiImageApplyMeshPanel
        anchorEl={applyPanel?.anchorEl ?? null}
        open={Boolean(applyPanel?.anchorEl)}
        meshItems={meshItems}
        onApply={handleApply}
        onClose={() => {
          app?.setOutlineEntity(null);
          setApplyPanel(null);
        }}
      />
    </PropertyPanelSection>
  );
}
