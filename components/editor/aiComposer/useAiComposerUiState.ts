"use client";

import { useMemo, useState } from "react";
import type { AiComposerStoreState } from "./useAiComposerStoreState";

type UseAiComposerUiStateOptions = Pick<AiComposerStoreState, "theme">;

export function useAiComposerUiState({
  theme
}: UseAiComposerUiStateOptions) {
  const [isErrorToastOpen, setIsErrorToastOpen] = useState(false);

  const utilityIconButtonSx = useMemo(
    () =>
      ({
        color: theme.pillText,
        background: theme.iconButtonBg,
        border: theme.sectionBorder,
        "&:hover": {
          background: theme.itemHoverBg
        },
        "&.Mui-disabled": {
          color: theme.mutedText,
          background: theme.itemBg,
          border: theme.sectionBorder
        }
      }) as const,
    [theme]
  );

  return {
    isErrorToastOpen,
    setIsErrorToastOpen,
    utilityIconButtonSx
  };
}
