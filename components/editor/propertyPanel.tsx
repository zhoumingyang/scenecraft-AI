"use client";

import { useMemo, useState } from "react";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { useI18n } from "@/lib/i18n";
import { SCENE_NODE_ID } from "@/render/editor";
import { useEditorStore } from "@/stores/editorStore";
import {
  LightSettingsSection,
  MeshAppearanceSection,
  ModelAnimationSection,
  SceneSettingsSection,
  TextureConfigDialog,
  TextureFieldKey,
  TransformSection
} from "@/components/editor/propertyPanelSections";
import { getLightTypeLabel, getTextureDialogTitle } from "@/components/editor/propertyPanelSections/util";

const PANEL_WIDTH = 272;
const COLLAPSED_VISIBLE_WIDTH = 44;

export default function PropertyPanel() {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const selectedEntityId = useEditorStore((state) => state.selectedEntityId);
  const projectVersion = useEditorStore((state) => state.projectVersion);
  const [open, setOpen] = useState(true);
  const [activeTextureField, setActiveTextureField] = useState<TextureFieldKey | null>(null);

  const entityRecord = useMemo(() => {
    const project = app?.projectModel;
    if (!project || !selectedEntityId) return null;
    if (selectedEntityId === SCENE_NODE_ID) {
      return {
        kind: "scene" as const,
        envConfig: project.envConfig
      };
    }

    const record = project.getEntityById(selectedEntityId);
    if (!record) return null;

    return {
      ...record
    };
  }, [app, selectedEntityId, projectVersion]);

  const panelTitle = entityRecord
    ? entityRecord.kind === "scene"
      ? t("editor.sceneTree.scene")
      : entityRecord.kind === "model"
      ? t("editor.sceneTree.model")
      : entityRecord.kind === "mesh"
        ? t("editor.sceneTree.meshes")
        : getLightTypeLabel(entityRecord.item.lightType, t)
    : t("editor.properties.none");

  return (
    <Box
      sx={{
        position: "absolute",
        right: 0,
        top: 72,
        zIndex: 21,
        width: PANEL_WIDTH,
        maxWidth: `calc(100vw - 20px)`,
        height: "min(calc(100vh - 88px), 760px)",
        transform: open ? "translateX(0)" : `translateX(${PANEL_WIDTH - COLLAPSED_VISIBLE_WIDTH}px)`,
        transition: "transform 180ms ease"
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: "100%",
          borderRadius: "10px 0 0 10px",
          border: "1px solid rgba(180,205,255,0.26)",
          borderRight: 0,
          background: "rgba(8,12,24,0.78)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
          overflow: "visible"
        }}
      >
        <Box
          sx={{
            height: "100%",
            borderRadius: "10px 0 0 10px",
            overflow: "hidden",
            background: "rgba(8,12,24,0.78)"
          }}
        >
          <Stack spacing={1} sx={{ height: "100%", p: open ? 1.05 : 0.7 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <IconButton
                size="small"
                onClick={() => setOpen((value) => !value)}
                sx={{
                  color: "rgba(162,196,255,0.92)",
                  border: "1px solid rgba(180,205,255,0.18)",
                  background: "rgba(255,255,255,0.03)"
                }}
              >
                <TuneRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
              {open ? (
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "rgba(220,232,255,0.92)"
                  }}
                >
                  {t("editor.properties.title")}
                </Typography>
              ) : null}
            </Stack>

            {open ? (
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  maxHeight: "100%",
                  overflowY: "auto",
                  pr: 0.25
                }}
              >
                {!entityRecord ? (
                  <Stack
                    spacing={0.7}
                    justifyContent="center"
                    sx={{ height: "100%", minHeight: 180, color: "rgba(176,193,228,0.72)" }}
                  >
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                      {t("editor.properties.none")}
                    </Typography>
                    <Typography sx={{ fontSize: 12 }}>
                      {t("editor.properties.emptyHint")}
                    </Typography>
                  </Stack>
                ) : (
                  <Stack spacing={0.9}>
                    <Typography sx={{ px: 0.15, fontSize: 13, fontWeight: 600, color: "#eef5ff" }}>
                      {panelTitle}
                    </Typography>

                    {entityRecord.kind === "scene" ? (
                      <SceneSettingsSection envConfig={entityRecord.envConfig} />
                    ) : (
                      <TransformSection
                        entityId={entityRecord.item.id}
                        position={entityRecord.item.position}
                        quaternion={entityRecord.item.quaternion}
                        scaleValues={entityRecord.item.scale}
                      />
                    )}

                    {entityRecord.kind === "mesh" ? (
                      <MeshAppearanceSection
                        entityId={entityRecord.item.id}
                        material={entityRecord.item.material}
                        onTextureConfigOpen={setActiveTextureField}
                      />
                    ) : null}

                    {entityRecord.kind === "model" ? (
                      <ModelAnimationSection
                        entityId={entityRecord.item.id}
                        animations={entityRecord.item.animations}
                        activeAnimationId={entityRecord.item.activeAnimationId}
                        timeScale={entityRecord.item.animationTimeScale}
                        playbackState={entityRecord.item.animationPlaybackState}
                      />
                    ) : null}

                    {entityRecord.kind === "light" ? (
                      <LightSettingsSection
                        entityId={entityRecord.item.id}
                        lightType={entityRecord.item.lightType}
                        color={entityRecord.item.color}
                        angle={entityRecord.item.angle}
                        penumbra={entityRecord.item.penumbra}
                        intensity={entityRecord.item.intensity}
                        distance={entityRecord.item.distance}
                        decay={entityRecord.item.decay}
                        width={entityRecord.item.width}
                        height={entityRecord.item.height}
                      />
                    ) : null}
                  </Stack>
                )}
              </Box>
            ) : null}
          </Stack>
        </Box>

        {entityRecord?.kind === "mesh" && activeTextureField ? (
          <TextureConfigDialog
            open
            entityId={entityRecord.item.id}
            textureField={activeTextureField}
            title={getTextureDialogTitle(activeTextureField, t)}
            texture={entityRecord.item.material[activeTextureField]}
            onClose={() => setActiveTextureField(null)}
          />
        ) : null}
      </Box>
    </Box>
  );
}
