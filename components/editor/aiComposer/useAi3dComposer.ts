"use client";

import { generateAi3D, optimizeAi3D } from "@/frontend/api/ai";
import type { Ai3DIntentInput, Ai3DPlanDiagnostics } from "@/lib/ai/ai3d/intent";
import { getApiErrorMessage } from "@/lib/http/axios";
import { AI3D_TOOL_NAME } from "@/render/editor/ai3d/constants/plan";
import type { EditorApp } from "@/render/editor";
import type { Ai3DPlan } from "@/render/editor/ai3d/plan";

type Ai3dState = {
  prompt: string;
  intentDraft: Partial<Ai3DIntentInput>;
  isGenerating: boolean;
  isOptimizing: boolean;
  errorMessage: string | null;
  previewStatus: "idle" | "ready";
  plan: Ai3DPlan | null;
  originalPlan: Ai3DPlan | null;
  optimizedPlan: Ai3DPlan | null;
  previewVariant: "original" | "optimized";
  lastDiagnostics: Ai3DPlanDiagnostics | null;
};

type Params = {
  app: EditorApp | null;
  ai3d: Ai3dState;
  setAi3dState: (payload: Partial<Ai3dState>) => void;
  setAiInspectorMode: (mode: "entity" | "ai") => void;
  t: (key: any, params?: Record<string, string | number>) => string;
};

export function useAi3dComposer({ app, ai3d, setAi3dState, setAiInspectorMode, t }: Params) {
  const isAi3dBusy = ai3d.isGenerating || ai3d.isOptimizing;
  const hasAi3dPreview = ai3d.previewStatus === "ready" && Boolean(ai3d.plan);
  const canShowOriginal =
    ai3d.previewVariant === "optimized" && Boolean(ai3d.originalPlan) && Boolean(ai3d.optimizedPlan);
  const canShowOptimized =
    ai3d.previewVariant === "original" && Boolean(ai3d.optimizedPlan) && Boolean(ai3d.originalPlan);
  const ai3dCreateCount = ai3d.plan
    ? ai3d.plan.operations.filter((item) => item.type.startsWith("create_")).length
    : 0;

  const handleAi3dSubmit = async () => {
    const trimmedPrompt = ai3d.prompt.trim();
    if (!trimmedPrompt || isAi3dBusy) return;

    setAi3dState({
      isGenerating: true,
      errorMessage: null
    });

    try {
      const payload = await generateAi3D({
        prompt: trimmedPrompt,
        intent: ai3d.intentDraft
      });

      if (payload.toolName !== AI3D_TOOL_NAME) {
        throw new Error(t("editor.ai3d.generateFailed"));
      }

      app?.previewAi3DPlan(payload.plan);
      setAi3dState({
        isGenerating: false,
        errorMessage: null,
        previewStatus: "ready",
        plan: payload.plan,
        originalPlan: payload.plan,
        optimizedPlan: null,
        previewVariant: "original",
        lastDiagnostics: payload.diagnostics
      });
    } catch (error) {
      setAi3dState({
        isGenerating: false,
        errorMessage: getApiErrorMessage(error, t("editor.ai3d.generateFailed"))
      });
    }
  };

  const handleAi3dOptimize = async () => {
    const trimmedPrompt = ai3d.prompt.trim();
    if (!trimmedPrompt || !ai3d.plan || !app || isAi3dBusy) return;

    setAi3dState({
      isOptimizing: true,
      errorMessage: null
    });

    try {
      const images = app.captureAi3DPreviewImages();
      const payload = await optimizeAi3D({
        prompt: trimmedPrompt,
        plan: ai3d.plan,
        images,
        intent: ai3d.intentDraft,
        diagnostics: ai3d.lastDiagnostics ?? undefined
      });

      if (payload.toolName !== AI3D_TOOL_NAME) {
        throw new Error(t("editor.ai3d.optimizeFailed"));
      }

      app.previewAi3DPlan(payload.plan);
      setAi3dState({
        isOptimizing: false,
        errorMessage: null,
        previewStatus: "ready",
        plan: payload.plan,
        optimizedPlan: payload.plan,
        previewVariant: "optimized",
        lastDiagnostics: payload.diagnostics
      });
    } catch (error) {
      setAi3dState({
        isOptimizing: false,
        errorMessage: getApiErrorMessage(error, t("editor.ai3d.optimizeFailed"))
      });
    }
  };

  const handleAi3dShowOriginal = () => {
    if (!ai3d.originalPlan || !app) return;
    app.previewAi3DPlan(ai3d.originalPlan);
    setAi3dState({
      plan: ai3d.originalPlan,
      previewVariant: "original",
      lastDiagnostics: null
    });
  };

  const handleAi3dShowOptimized = () => {
    if (!ai3d.optimizedPlan || !app) return;
    app.previewAi3DPlan(ai3d.optimizedPlan);
    setAi3dState({
      plan: ai3d.optimizedPlan,
      previewVariant: "optimized"
    });
  };

  const handleAi3dDiscard = () => {
    app?.clearAi3DPreview();
    setAi3dState({
      isGenerating: false,
      isOptimizing: false,
      errorMessage: null,
      previewStatus: "idle",
      plan: null,
      originalPlan: null,
      optimizedPlan: null,
      previewVariant: "original",
      lastDiagnostics: null
    });
  };

  const handleAi3dApply = async () => {
    if (!ai3d.plan || !app || isAi3dBusy) return;

    setAi3dState({
      isGenerating: true,
      errorMessage: null
    });

    try {
      await app.applyAi3DPlan(ai3d.plan);
      setAi3dState({
        isGenerating: false,
        isOptimizing: false,
        errorMessage: null,
        previewStatus: "idle",
        plan: null,
        originalPlan: null,
        optimizedPlan: null,
        previewVariant: "original",
        lastDiagnostics: null
      });
      setAiInspectorMode("entity");
    } catch (error) {
      setAi3dState({
        isGenerating: false,
        errorMessage: getApiErrorMessage(error, t("editor.ai3d.applyFailed"))
      });
    }
  };

  return {
    isAi3dBusy,
    hasAi3dPreview,
    canShowOriginal,
    canShowOptimized,
    ai3dCreateCount,
    handleAi3dSubmit,
    handleAi3dOptimize,
    handleAi3dShowOriginal,
    handleAi3dShowOptimized,
    handleAi3dDiscard,
    handleAi3dApply
  };
}
