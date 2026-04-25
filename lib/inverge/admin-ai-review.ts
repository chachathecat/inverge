import type { SecondExamAiInput, SecondExamAiOutput, SecondExamAiTask } from "@/lib/inverge/second-exam-ai";
import type { SecondExamAiValidationFailureCode } from "@/lib/inverge/second-exam-ai-validator";

export type AdminAiReviewStatus = "ok" | "fallback" | "failed" | "flagged";
export type AdminAiReviewScreen = "compare" | "rewrite" | "records";

export type AdminAiReviewItem = {
  id: string;
  createdAt: string;
  task: SecondExamAiTask;
  screen: AdminAiReviewScreen;
  examId: string;
  subjectId: string;
  provider: string;
  status: AdminAiReviewStatus;
  fallbackUsed: boolean;
  errorReason?: string;
  validationFailureCodes: SecondExamAiValidationFailureCode[];
  flagged: boolean;
  needsReview: boolean;
  ruleResult: {
    selectedGapId: string;
    selectedGapType: string;
    focusLabel: string;
    rewriteTarget: string;
    gapTitle?: string;
    gapSummary?: string;
    rewriteInstruction?: string;
    guidance?: string[];
    placeholder?: string;
    starter?: string;
  };
  aiOutput: {
    status: SecondExamAiOutput["status"];
    publicText: SecondExamAiOutput["publicText"];
    safetyFlags: string[];
    usedEvidenceIds: string[];
  };
  reviewerNote?: string;
  reviewedAt?: string;
};

export type AdminAiReviewListResponse = {
  items: AdminAiReviewItem[];
  summary: {
    totalCount: number;
    okCount: number;
    fallbackCount: number;
    failedCount: number;
    flaggedCount: number;
    needsReviewCount: number;
  };
};

export type RecordAdminAiReviewInput = {
  input: SecondExamAiInput;
  output: SecondExamAiOutput;
  meta: {
    provider: string;
    fallbackUsed: boolean;
    errorReason?: string;
  };
  validationFailureCodes?: SecondExamAiValidationFailureCode[];
};

export function getAdminAiReviewStatus(params: {
  fallbackUsed: boolean;
  errorReason?: string;
  validationFailureCodes?: SecondExamAiValidationFailureCode[];
}) {
  const failureCodes = params.validationFailureCodes ?? [];
  if (failureCodes.length > 0) return "flagged" satisfies AdminAiReviewStatus;
  if (params.errorReason || params.fallbackUsed) return "fallback" satisfies AdminAiReviewStatus;
  return "ok" satisfies AdminAiReviewStatus;
}

export function buildAdminAiReviewItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `ai-review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildAdminAiReviewItem({
  input,
  output,
  meta,
  validationFailureCodes = [],
}: RecordAdminAiReviewInput): AdminAiReviewItem {
  const status = getAdminAiReviewStatus({
    fallbackUsed: meta.fallbackUsed,
    errorReason: meta.errorReason,
    validationFailureCodes,
  });
  const flagged = status === "flagged" || output.internal.safetyFlags.length > 0;
  const needsReview = flagged || status === "fallback";

  return {
    id: buildAdminAiReviewItemId(),
    createdAt: new Date().toISOString(),
    task: input.task,
    screen: input.productContext.screen,
    examId: input.productContext.examId,
    subjectId: input.productContext.subjectId,
    provider: meta.provider,
    status,
    fallbackUsed: meta.fallbackUsed,
    errorReason: meta.errorReason,
    validationFailureCodes,
    flagged,
    needsReview,
    ruleResult: {
      selectedGapId: input.ruleResult.selectedGapId,
      selectedGapType: input.ruleResult.selectedGapType,
      focusLabel: input.ruleResult.focusLabel,
      rewriteTarget: input.ruleResult.rewriteTarget,
      gapTitle: input.existingSeed.gapTitle,
      gapSummary: input.existingSeed.gapSummary,
      rewriteInstruction: input.existingSeed.rewriteInstruction,
      guidance: input.existingSeed.guidance,
      placeholder: input.existingSeed.placeholder,
      starter: input.existingSeed.starter,
    },
    aiOutput: {
      status: output.status,
      publicText: output.publicText,
      safetyFlags: output.internal.safetyFlags,
      usedEvidenceIds: output.internal.usedEvidenceIds,
    },
  };
}

export function buildAdminAiReviewListResponse(items: AdminAiReviewItem[]): AdminAiReviewListResponse {
  return {
    items,
    summary: {
      totalCount: items.length,
      okCount: items.filter((item) => item.status === "ok").length,
      fallbackCount: items.filter((item) => item.status === "fallback").length,
      failedCount: items.filter((item) => item.status === "failed").length,
      flaggedCount: items.filter((item) => item.status === "flagged").length,
      needsReviewCount: items.filter((item) => item.needsReview).length,
    },
  };
}
