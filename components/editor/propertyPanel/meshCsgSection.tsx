"use client";

import { useState } from "react";
import { Alert, Button, Stack } from "@mui/material";
import type { MeshCsgOperation } from "@/render/editor";
import PropertyPanelSection from "@/components/common/propertyPanelSection";
import type { EditorApp } from "@/render/editor";
import type { EditorThemeTokens, Translate } from "./types";

const CSG_OPERATIONS: MeshCsgOperation[] = ["SUBTRACTION", "INTERSECTION", "ADDITION"];

type MeshCsgSectionProps = {
  app: EditorApp | null;
  selectedMeshEntityIds: string[];
  theme: EditorThemeTokens;
  t: Translate;
};

export function MeshCsgSection({
  app,
  selectedMeshEntityIds,
  theme,
  t
}: MeshCsgSectionProps) {
  const [pendingOperation, setPendingOperation] = useState<MeshCsgOperation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const disabled = !app || selectedMeshEntityIds.length < 2 || pendingOperation !== null;

  const applyOperation = async (operation: MeshCsgOperation) => {
    if (!app || pendingOperation) return;
    setPendingOperation(operation);
    setErrorMessage(null);
    try {
      await app.applyMeshCsg(operation);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("editor.properties.csgFailed"));
    } finally {
      setPendingOperation(null);
    }
  };

  return (
    <PropertyPanelSection title={t("editor.properties.csg")}>
      <Stack spacing={0.8}>
        {CSG_OPERATIONS.map((operation) => (
          <Button
            key={operation}
            size="small"
            variant="outlined"
            disabled={disabled}
            onClick={() => {
              void applyOperation(operation);
            }}
            sx={{
              minHeight: 30,
              justifyContent: "center",
              borderRadius: 0.5,
              border: theme.sectionBorder,
              color: theme.pillText,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0,
              "&:hover": {
                borderColor: theme.pillText,
                background: theme.iconButtonBg
              }
            }}
          >
            {pendingOperation === operation ? t("editor.properties.csgApplying") : operation}
          </Button>
        ))}
        {errorMessage ? (
          <Alert severity="error" variant="outlined" sx={{ py: 0.15, fontSize: 11 }}>
            {errorMessage}
          </Alert>
        ) : null}
      </Stack>
    </PropertyPanelSection>
  );
}
