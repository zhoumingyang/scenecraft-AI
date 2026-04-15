import type { Ai3DIntent, Ai3DIntentInput, Ai3DPlanDiagnostics } from "@/lib/ai/ai3d/intent";
import type { Ai3DPlan } from "@/render/editor/ai3d/plan";

export type Ai3DStructuredResult<T> = {
  result: T;
  traceId: string | null;
};

export type Ai3DGenerateContext = {
  apiKey: string;
  prompt: string;
  intent?: Partial<Ai3DIntentInput>;
  referenceImages: string[];
};

export type Ai3DOptimizeContext = {
  apiKey: string;
  prompt: string;
  plan: Ai3DPlan;
  images: string[];
  intent?: Partial<Ai3DIntentInput>;
  diagnostics?: Ai3DPlanDiagnostics;
};

export type Ai3DResolveIntentContext = {
  apiKey: string;
  prompt: string;
  intent?: Partial<Ai3DIntentInput>;
  referenceImages: string[];
  diagnostics?: Ai3DPlanDiagnostics;
};

export type Ai3DGeneratePlanContext = {
  apiKey: string;
  prompt: string;
  intent: Ai3DIntent;
  referenceImages: string[];
};

export type Ai3DReviewPlanContext = {
  apiKey: string;
  prompt: string;
  intent: Ai3DIntent;
  plan: Ai3DPlan;
  diagnostics: Ai3DPlanDiagnostics;
};

export type Ai3DOptimizePlanContext = {
  apiKey: string;
  prompt: string;
  intent: Ai3DIntent;
  plan: Ai3DPlan;
  images: string[];
  diagnostics: Ai3DPlanDiagnostics;
};

export type Ai3DProvider = {
  key: string;
  resolveIntent: (context: Ai3DResolveIntentContext) => Promise<Ai3DStructuredResult<Ai3DIntent>>;
  generatePlan: (context: Ai3DGeneratePlanContext) => Promise<Ai3DStructuredResult<Ai3DPlan>>;
  reviewPlan: (context: Ai3DReviewPlanContext) => Promise<Ai3DStructuredResult<Ai3DPlan>>;
  optimizePlan: (context: Ai3DOptimizePlanContext) => Promise<Ai3DStructuredResult<Ai3DPlan>>;
  toErrorMessage: (error: unknown, fallbackPrefix: string) => string;
};
