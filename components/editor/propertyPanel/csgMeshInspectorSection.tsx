"use client";

import type { ChangeEvent } from "react";
import { Button, Stack, Typography } from "@mui/material";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import { ColorField } from "@/components/common/propertyFieldControls";
import type { EditorApp, CsgMeshEntityModel } from "@/render/editor";
import type { EditorThemeTokens, Translate } from "./types";

const CSG_OPERATIONS = ["SUBTRACTION", "INTERSECTION", "ADDITION"] as const;
const MATERIAL_MODES = ["sourceParts", "single"] as const;

type CsgMeshInspectorSectionProps = {
  app: EditorApp | null;
  csgMesh: CsgMeshEntityModel;
  theme: EditorThemeTokens;
  t: Translate;
};

export function CsgMeshInspectorSection({
  app,
  csgMesh,
  theme,
  t
}: CsgMeshInspectorSectionProps) {
  const project = app?.projectModel ?? null;
  const patchCsg = (patch: Parameters<NonNullable<typeof app>["patchMeshCsg"]>[1]) => {
    void app?.patchMeshCsg(csgMesh.id, patch);
  };

  const updateSingleColor = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    patchCsg({ material: { color: event.target.value } });
  };

  return (
    <Stack spacing={0.9}>
      <PropertyPanelSection title={t("editor.properties.csg")}>
        <Stack spacing={0.8}>
          <Typography sx={{ fontSize: 11, color: theme.text }}>{t("editor.properties.csgOperation")}</Typography>
          <Stack direction="row" spacing={0.55}>
            {CSG_OPERATIONS.map((operation) => (
              <Button
                key={operation}
                size="small"
                variant={csgMesh.operation === operation ? "contained" : "outlined"}
                onClick={() => patchCsg({ operation })}
                sx={{ minHeight: 28, flex: 1, fontSize: 10, letterSpacing: 0 }}
              >
                {operation}
              </Button>
            ))}
          </Stack>
          <Typography sx={{ fontSize: 11, color: theme.text }}>{t("editor.properties.csgMaterialMode")}</Typography>
          <Stack direction="row" spacing={0.55}>
            {MATERIAL_MODES.map((materialMode) => (
              <Button
                key={materialMode}
                size="small"
                variant={csgMesh.materialMode === materialMode ? "contained" : "outlined"}
                onClick={() => patchCsg({ materialMode })}
                sx={{ minHeight: 28, flex: 1, fontSize: 10, letterSpacing: 0 }}
              >
                {materialMode}
              </Button>
            ))}
          </Stack>
          {csgMesh.materialMode === "single" ? (
            <ColorField
              compact
              label={t("editor.properties.color")}
              value={csgMesh.material.color}
              onChange={updateSingleColor}
            />
          ) : null}
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              void app?.releaseMeshCsg(csgMesh.id);
            }}
            sx={{
              minHeight: 30,
              border: theme.sectionBorder,
              borderRadius: 0.5,
              color: theme.pillText,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0
            }}
          >
            {t("editor.properties.csgRelease")}
          </Button>
        </Stack>
      </PropertyPanelSection>

      <PropertyPanelSection title={t("editor.properties.csgOperands")}>
        <Stack spacing={0.55}>
          {csgMesh.operandIds.map((operandId) => (
            <Stack key={operandId} spacing={0.45}>
              <Typography sx={{ fontSize: 11, color: theme.text }}>
                {project?.meshes.get(operandId)?.label || operandId}
              </Typography>
              {csgMesh.materialMode === "sourceParts" ? (
                <Stack direction="row" spacing={0.6} alignItems="center">
                  <ColorField
                    compact
                    value={
                      csgMesh.getMaterialPart(operandId)?.material?.color ||
                      project?.meshes.get(operandId)?.material.color ||
                      "#ffffff"
                    }
                    onChange={(event) =>
                      patchCsg({
                        materialPart: {
                          sourceEntityId: operandId,
                          material: { color: event.target.value }
                        }
                      })
                    }
                  />
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() =>
                      patchCsg({
                        materialPart: {
                          sourceEntityId: operandId,
                          material: null
                        }
                      })
                    }
                    sx={{ minHeight: 28, fontSize: 10, color: theme.text }}
                  >
                    {t("editor.properties.reset")}
                  </Button>
                </Stack>
              ) : null}
            </Stack>
          ))}
        </Stack>
      </PropertyPanelSection>
    </Stack>
  );
}
