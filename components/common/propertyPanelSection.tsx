"use client";

import { Box, Stack, Typography } from "@mui/material";

type PropertyPanelSectionProps = {
  title: string;
  children: React.ReactNode;
};

export default function PropertyPanelSection({
  title,
  children
}: PropertyPanelSectionProps) {
  return (
    <Box
      sx={{
        borderRadius: 1.5,
        border: "1px solid rgba(160,190,255,0.14)",
        background: "rgba(255,255,255,0.03)"
      }}
    >
      <Stack spacing={1.25} sx={{ p: 1.4 }}>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(210,225,255,0.7)"
          }}
        >
          {title}
        </Typography>
        {children}
      </Stack>
    </Box>
  );
}
