"use client";

import { Box, ClickAwayListener, Paper, Popper, Stack, Typography } from "@mui/material";
import type { EditorMeshListItem } from "@/render/editor";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useI18n } from "@/lib/i18n";
import { useEditorStore } from "@/stores/editorStore";

type AiImageApplyMeshPanelProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  meshItems: EditorMeshListItem[];
  onApply: (meshId: string) => void;
  onClose: () => void;
};

export default function AiImageApplyMeshPanel({
  anchorEl,
  open,
  meshItems,
  onApply,
  onClose
}: AiImageApplyMeshPanelProps) {
  const { t } = useI18n();
  const app = useEditorStore((state) => state.app);
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  return (
    <Popper open={open} anchorEl={anchorEl} placement="left-start" sx={{ zIndex: 1600 }}>
      <ClickAwayListener onClickAway={onClose}>
        <Paper
          elevation={0}
          onMouseLeave={() => app?.setOutlineEntity(null)}
          sx={{
            width: 218,
            maxHeight: 220,
            overflowY: "auto",
            borderRadius: 1,
            border: theme.panelBorder,
            background: theme.panelBg,
            backdropFilter: "blur(10px)",
            boxShadow: theme.panelShadow,
            p: 1,
            mr: 1
          }}
        >
          <Stack spacing={0.8}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: theme.titleText }}>
              {t("editor.ai.applyToMesh")}
            </Typography>
            {meshItems.length > 0 ? (
              meshItems.map((meshItem) => (
                <Box
                  key={meshItem.id}
                  role="button"
                  tabIndex={0}
                  onMouseEnter={() => app?.setOutlineEntity(meshItem.id)}
                  onMouseLeave={() => app?.setOutlineEntity(null)}
                  onClick={() => onApply(meshItem.id)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onApply(meshItem.id);
                  }}
                  sx={{
                    borderRadius: 1,
                    border: theme.sectionBorder,
                    background: theme.itemBg,
                    px: 1,
                    py: 0.85,
                    fontSize: 12,
                    color: theme.text,
                    cursor: "pointer",
                    transition: "background-color 140ms ease, border-color 140ms ease",
                    "&:hover, &:focus-visible": {
                      outline: "none",
                      background: theme.itemHoverBg,
                      border: theme.itemSelectedBorder
                    }
                  }}
                >
                  {meshItem.label}
                </Box>
              ))
            ) : (
              <Typography sx={{ fontSize: 11, color: theme.mutedText }}>
                {t("editor.ai.applyMeshEmpty")}
              </Typography>
            )}
          </Stack>
        </Paper>
      </ClickAwayListener>
    </Popper>
  );
}
