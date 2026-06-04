"use client";

import { useEffect } from "react";
import type { EditorStoreState } from "@/stores/editorStore";

type UseAiComposerLifecycleOptions = {
  ai3dErrorMessage: string | null;
  aiPanoramaErrorMessage: string | null;
  isComposerOpen: boolean;
  isStudioSceneActive: boolean;
  setAiComposerOpen: EditorStoreState["setAiComposerOpen"];
  setIsErrorToastOpen: (open: boolean) => void;
};

export function useAiComposerLifecycle({
  ai3dErrorMessage,
  aiPanoramaErrorMessage,
  isComposerOpen,
  isStudioSceneActive,
  setAiComposerOpen,
  setIsErrorToastOpen
}: UseAiComposerLifecycleOptions) {
  useEffect(() => {
    if (!ai3dErrorMessage && !aiPanoramaErrorMessage) return;
    setIsErrorToastOpen(true);
  }, [ai3dErrorMessage, aiPanoramaErrorMessage, setIsErrorToastOpen]);

  useEffect(() => {
    if (isStudioSceneActive && isComposerOpen) {
      setAiComposerOpen(false);
    }
  }, [isComposerOpen, isStudioSceneActive, setAiComposerOpen]);
}
