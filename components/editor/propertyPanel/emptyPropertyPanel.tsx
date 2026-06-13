import { Stack, Typography } from "@mui/material";
import type { PropertyPanelContentProps } from "./types";

export function EmptyPropertyPanel({
  theme,
  t
}: Pick<PropertyPanelContentProps, "theme" | "t">) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      sx={{ height: "100%", minHeight: 180, color: theme.mutedText, textAlign: "center" }}
    >
      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
        {t("editor.properties.none")}
      </Typography>
    </Stack>
  );
}
