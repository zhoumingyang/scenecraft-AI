"use client";

import { Box, Stack, Typography } from "@mui/material";
import { getEditorThemeTokens } from "@/components/editor/theme";
import { useEditorStore } from "@/stores/editorStore";

type PropertyPanelSectionProps = {
  title: string;
  children: React.ReactNode;
};

export default function PropertyPanelSection({
  title,
  children
}: PropertyPanelSectionProps) {
  const editorThemeMode = useEditorStore((state) => state.editorThemeMode);
  const theme = getEditorThemeTokens(editorThemeMode);

  return (
    <Box
      sx={{
        borderRadius: 0.5,
        border: theme.sectionBorder,
        background: theme.sectionBg
      }}
    >
      <Stack spacing={1.25} sx={{ p: 1.4 }}>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: theme.mutedText
          }}
        >
          {title}
        </Typography>
        {children}
      </Stack>
    </Box>
  );
}
