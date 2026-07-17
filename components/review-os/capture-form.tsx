"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  BiggestGap,
  BottomPrimaryAction,
  FailureAwareState,
  TrustEvidenceBar,
  V3ActionButton,
  V3ActionLink,
  V3QuietDisclosure,
} from "@/components/learner";
import { CognitiveLearningActionCard } from "@/components/review-os/cognitive-learning-action-card";
import {
  TrustEvidenceBar as LegacyTrustEvidenceBar,
  type TrustEvidenceBarProps as LegacyTrustEvidenceBarProps,
} from "@/components/review-os/trust-status-card";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildCaptureToNoteDraft } from "@/lib/capture/capture-to-note";
import {
  getDefaultSubject,
  getModeConfig,
  getModeLabel,
  normalizeSubjectForMode,
  type AppraisalMode,
} from "@/lib/review-os/appraisal";
import { clearReviewOsDraft, loadReviewOsDraft, saveReviewOsDraft, saveReviewOsLocalBetaNoteWithStatus } from "@/lib/review-os/browser-storage";
import { getCalculatorWorkflowForSubject, getCalculatorWorkflowHref } from "@/lib/review-os/calculator-workflow";
import { resolveCaptureConfirmationCopy } from "@/lib/review-os/capture-confirmation-copy";
import {
  advanceCaptureExtractionRequestRevision,
  clearUnchangedCaptureExtractionSemantics,
  isCurrentCaptureExtractionRequest,
  restoreLearnerEditedCaptureSemantics,
  snapshotCaptureExtractionSemantics,
  type CaptureExtractionRevisionEvent,
  type CaptureExtractionSemanticSnapshot,
} from "@/lib/review-os/capture-extraction-reconciliation";
import {
  CAPTURE_MEMORY_ONLY_SAVE_ERROR_EVIDENCE,
  buildCaptureCompletedEvidence,
  buildCaptureDedupeConflictEvidence,
  buildCapturePersistenceMetadata,
  buildDurableCapturePersistenceReceipt,
  resolvePendingCaptureSaveOperation,
  type CaptureSaveOperationBinding,
  type PendingCaptureSaveOperation,
} from "@/lib/review-os/capture-persistence-controller";
import { getCaptureSavePersistenceCopy, type CaptureSavePersistenceStatus } from "@/lib/review-os/capture-save-persistence";
import { buildCaptureNoteDisplayCopy, buildCaptureNoteSummary } from "@/lib/review-os/capture-note-display-copy";
import { buildCognitiveLearningActionUnit, type CognitiveLearningActionUnit } from "@/lib/review-os/cognitive-learning-actions";
import { applyDraftToConfirmedSubject, type ExtractionDraft, type ExtractionPipelineResult } from "@/lib/review-os/extraction";
import { extractFirstExamFiveChoicesFromText } from "@/lib/review-os/first-ox-engine";
import { pushLocalLearnerAnalyticsEvent } from "@/lib/review-os/local-analytics";
import { resolveReviewSchedule } from "@/lib/review-os/scheduling";
import { hasSecondWriteReferenceStep } from "@/lib/review-os/second-write-reference-step";
import type { FailureAwarePersistenceEvidence, FailureAwareStateEvidence } from "@/lib/review-os/failure-aware-state";
import type { TrustProvenanceEvidence, TrustProvenanceSourceKind } from "@/lib/review-os/trust-provenance";
import {
  CONFIDENCE_OPTIONS,
  getFirstSubjectTemplate,
  getSecondSubjectTemplate,
  MISTAKE_REASON_PRESETS,
  SECOND_TASK_PRESETS,
  type ConfidenceLevel,
  type SourceType,
} from "@/lib/review-os/types";

type ExtractionState = "idle" | "uploading" | "extracting" | "succeeded" | "failed" | "manual";

function CaptureActionButton({
  mode,
  variant,
  size,
  ...props
}: ButtonProps & { mode: AppraisalMode }) {
  if (mode === "second") {
    return (
      <V3ActionButton
        tone={variant === "ghost" ? "quiet" : variant === "outline" ? "secondary" : "primary"}
        {...props}
      />
    );
  }

  return <Button variant={variant} size={size} {...props} />;
}

const CAPTURE_TRUST_LAYER_COPY = "OCR과 AI 정리는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다.";

const V3_CAPTURE_TRUST_SOURCE_LABELS: Record<
  SourceType,
  TrustProvenanceSourceKind
> = {
  photo: "ocr_draft",
  image: "ocr_draft",
  pdf: "imported_text",
  text: "learner_text",
  manual: "manual_entry",
};

const LEGACY_CAPTURE_TRUST_SOURCE_LABELS: Record<
  SourceType,
  LegacyTrustEvidenceBarProps["source"]
> = {
  photo: "OCR 초안",
  image: "OCR 초안",
  pdf: "가져온 텍스트",
  text: "사용자 텍스트",
  manual: "수동 입력",
};

const CAPTURE_FLOW_STEPS = [
  {
    eyebrow: "1. 입력",
    label: "입력",
    now: "사진, PDF, 텍스트 중 한 가지 방식으로 시작합니다.",
    why: "처음에는 필요한 자료 하나만 고르면 됩니다.",
    result: "가져온 초안을 직접 확인하거나, 입력한 내용으로 빠르게 저장할 수 있습니다.",
  },
  {
    eyebrow: "2. OCR/텍스트 확인",
    label: "OCR/텍스트 확인",
    now: "가져온 초안을 읽고 틀린 부분을 직접 고칩니다.",
    why: "OCR/텍스트 초안은 저장 전에 직접 고칠 수 있습니다.",
    result: "확인한 내용에서 이번에 고칠 가장 큰 약점 1개를 정합니다.",
  },
  {
    eyebrow: "3. 가장 큰 약점",
    label: "가장 큰 약점",
    now: "이번 답안을 바꿀 가장 큰 약점 1개에 집중합니다.",
    why: "여러 약점을 나열하는 것보다 한 번에 하나를 고치는 편이 실행하기 쉽습니다.",
    result: "다시쓰기 또는 다음 행동을 마지막 저장 확인에 연결합니다.",
  },
  {
    eyebrow: "4. 오늘 계획 반영",
    label: "오늘 계획 반영",
    now: "저장 결과와 이어질 다음 행동을 확인합니다.",
    why: "저장 위치와 상태를 확인해야 기록을 안전하게 이어갈 수 있습니다.",
    result: "저장 상태에 따라 다시 시도하거나 오늘 계획·복습으로 이어갑니다.",
  },
] as const;

const SECOND_CAPTURE_FLOW_STEPS = [
  CAPTURE_FLOW_STEPS[0],
  CAPTURE_FLOW_STEPS[1],
  {
    eyebrow: "3. 회상·비교·수정",
    label: "회상·비교·수정",
    now: "참고자료 없이 회상하고 작성한 뒤 비교해 한 문단을 고칩니다.",
    why: "회상과 비교를 분리해야 실제로 보강할 약점을 찾을 수 있습니다.",
    result: "다시 쓴 문단과 다음 행동을 저장 전에 확인합니다.",
  },
  {
    eyebrow: "4. 저장·오늘 계획",
    label: "저장·오늘 계획",
    now: "저장할 내용과 저장 결과를 확인합니다.",
    why: "저장 상태를 확인해야 학습 흐름을 안전하게 이어갈 수 있습니다.",
    result: "저장 상태에 따라 다시 시도하거나 오늘 계획·복습으로 이어갑니다.",
  },
] as const;

const CAPTURE_STAGE_CONTEXT: Record<
  CaptureStage,
  { eyebrow: string; now: string; why: string; result: string }
> = {
  intake: CAPTURE_FLOW_STEPS[0],
  preview: CAPTURE_FLOW_STEPS[1],
  confirm: {
    eyebrow: "저장 전 확인",
    now: "저장할 핵심 내용과 다음 행동을 마지막으로 확인합니다.",
    why: "단계형 흐름에서는 저장 전에 바꿀 내용을 한 번 더 점검할 수 있습니다.",
    result: "확인한 기록을 저장하고 오늘 계획과 복습으로 이어갑니다.",
  },
  "second-issue-recall": {
    eyebrow: "세부 작업 1/6 · 쟁점 회상",
    now: "참고자료를 보기 전에 기억나는 쟁점부터 적습니다.",
    why: "먼저 회상해야 지금 스스로 설명할 수 있는 범위를 구분할 수 있습니다.",
    result: "떠올린 쟁점을 답안 목차로 정리합니다.",
  },
  "second-outline": {
    eyebrow: "세부 작업 2/6 · 목차 정리",
    now: "회상한 쟁점을 답안 목차 3줄로 정리합니다.",
    why: "짧은 구조를 먼저 세우면 답안의 누락과 순서를 확인하기 쉽습니다.",
    result: "목차를 바탕으로 내 답안을 작성합니다.",
  },
  "second-answer": {
    eyebrow: "세부 작업 3/6 · 내 답안 작성",
    now: "참고 정리를 보기 전에 내 답안을 먼저 작성합니다.",
    why: "작성 전 참고자료를 열지 않아야 실제 회상 수준을 확인할 수 있습니다.",
    result: "작성한 답안을 참고 정리와 비교합니다.",
  },
  "second-reference": {
    eyebrow: "세부 작업 4/6 · 참고 정리 비교",
    now: "내 답안을 작성한 뒤 참고 정리와 비교합니다.",
    why: "작성 이후의 비교는 내 답안에서 빠진 내용을 분명하게 보여 줍니다.",
    result: "이번에 고칠 가장 큰 약점 1개를 정합니다.",
  },
  "second-gap": {
    eyebrow: "세부 작업 5/6 · 가장 큰 약점",
    now: "비교 결과에서 가장 큰 약점 1개를 정합니다.",
    why: "한 번에 하나를 고르면 다음 답안에서 바로 실행할 수 있습니다.",
    result: "선택한 약점을 반영해 한 문단을 다시 씁니다.",
  },
  "second-rewrite": {
    eyebrow: "세부 작업 6/6 · 문단 다시쓰기",
    now: "가장 큰 약점 1개를 반영해 한 문단을 다시 씁니다.",
    why: "발견한 약점을 실제 문장으로 바꿔야 다음 답안에 남습니다.",
    result: "다시 쓴 문단과 다음 행동을 저장 전에 확인합니다.",
  },
  "saved-plan": CAPTURE_FLOW_STEPS[3],
};

const SECOND_WRITE_STAGE_POSITION: Partial<Record<CaptureStage, string>> = {
  "second-issue-recall": "1/6 · 쟁점 회상",
  "second-outline": "2/6 · 목차 정리",
  "second-answer": "3/6 · 내 답안 작성",
  "second-reference": "4/6 · 참고 정리 비교",
  "second-gap": "5/6 · 가장 큰 약점",
  "second-rewrite": "6/6 · 문단 다시쓰기",
  confirm: "저장 전 확인",
  "saved-plan": "저장 결과",
};

const SECOND_WRITE_FLOW_STEPS = [
  { stage: "second-issue-recall", position: 1, label: "쟁점 회상" },
  { stage: "second-outline", position: 2, label: "목차 정리" },
  { stage: "second-answer", position: 3, label: "내 답안" },
  { stage: "second-reference", position: 4, label: "참고 비교" },
  { stage: "second-gap", position: 5, label: "가장 큰 약점" },
  { stage: "second-rewrite", position: 6, label: "문단 다시쓰기" },
] as const;

const SECOND_PREVIEW_STAGE_CONTEXT = {
  eyebrow: "2. OCR/텍스트 확인",
  now: "가져온 초안을 읽고 틀린 부분을 직접 고칩니다.",
  why: "OCR/텍스트 초안은 저장 전에 직접 고칠 수 있습니다.",
  result: "확인한 내용을 닫고, 참고자료 없이 쟁점 회상부터 시작합니다.",
} as const;

const REWRITE_CONTEXT_STAGE_CONTEXT = {
  eyebrow: "세부 작업 · 문단 다시쓰기",
  now: "이전 답안의 가장 큰 약점을 반영해 한 문단을 다시 씁니다.",
  why: "발견한 약점을 실제 문장으로 바꿔야 다음 답안에 남습니다.",
  result: "다시 쓴 문단을 저장하고 오늘 계획과 복습으로 이어갑니다.",
} as const;

type SavedCaptureConfirmation = {
  itemId?: string;
  status?: CaptureSavePersistenceStatus;
  persistence?: "durable" | "local-beta";
  persistenceEvidence?: FailureAwarePersistenceEvidence | null;
  conflictEvidence?: Extract<FailureAwareStateEvidence, { kind: "conflict" }> | null;
  retryAction?: "quick" | "session";
  biggestGap: string;
  nextAction: string;
  todayPlanCandidate?: string;
  reviewQueueCandidate?: string;
  legalGroundingMessage?: string;
  learningAction: CognitiveLearningActionUnit;
};

type CaptureFormProps = {
  userId: string;
  mode: AppraisalMode;
  labelledBy?: string;
  initialPreferredSubjects?: string[];
  initialSubject?: string;
  workflow?: "default" | "second-write";
  rewriteContext?: {
    sourceItemId: string;
    sourceTitle: string;
    biggestGap: string;
    rewriteInstruction: string;
    referenceSummary: string;
    myAnswerSummary: string;
  } | null;
};

type DraftState = {
  subjectLabel: string;
  sourceType: SourceType;
  sourceLabel: string;
  problemTitle: string;
  problemIdentifier: string;
  rawQuestionText: string;
  correctAnswer: string;
  userAnswer: string;
  userReasonText: string;
  userReasonPreset: string;
  confidence: ConfidenceLevel;
  timeSpentSeconds: string;
  nextReviewDate: string;
  keyConcepts: string;
  coreFormula: string;
  comparisonPoint: string;
  missingIssue: string;
  weakStructurePoint: string;
  weakApplicationSentence: string;
  rewriteInstruction: string;
  referenceStructure: string;
  myAnswerSummary: string;
  rewriteParagraph: string;
  caseSummary: string;
  issueRecall: string;
  outlineDraft: string;
  productionBeforeComparison: boolean;
  referenceAnswerAddedAfterProduction: boolean;
  biggestGap: string;
  rawOcrText?: string;
  rawExtractionJson?: Record<string, unknown>;
  normalizedDraft?: ExtractionDraft;
  extractionNeedsReview?: boolean;
  capturePages?: PersistedCapturePage[];
  pageCount?: number;
  lowConfidenceFlag?: boolean;
  captureQualityIssue?: string;
  hasManualCorrection?: boolean;
  ocrConfirmedByLearner?: boolean;
};

type CaptureStage =
  | "intake"
  | "preview"
  | "confirm"
  | "second-issue-recall"
  | "second-outline"
  | "second-answer"
  | "second-reference"
  | "second-gap"
  | "second-rewrite"
  | "saved-plan";

type UploadedPage = {
  id: string;
  name: string;
  label: string;
  sourceType: "image" | "pdf";
  ocrText?: string;
  previewUrl?: string;
  lowConfidenceFlag?: boolean;
  captureQualityIssue?: string;
};
type PersistedCapturePage = Omit<UploadedPage, "previewUrl">;

const FIRST_STAGE_ERROR_REASON_OPTIONS = [
  "개념 부족",
  "선지 오독",
  "계산 실수",
  "시간 부족",
  "헷갈리는 개념과 혼동",
  "찍음/확신 부족",
] as const;

function getDefaultNextReviewDate(mode: AppraisalMode) {
  const schedule = resolveReviewSchedule({
    mode,
    isCorrect: false,
    confidence: "중간",
    mistakeType: "개념 혼동",
    hasWeakParagraph: mode === "second",
  });
  return schedule.nextReviewDate;
}

function firstDefaults(subject: string) {
  const template = getFirstSubjectTemplate(subject);
  return {
    concepts: template.keyConcepts,
    formula: template.coreFormula,
    comparison: template.comparisonPoint,
    reason: template.defaultReason,
  };
}

function secondDefaults(subject: string) {
  const template = getSecondSubjectTemplate(subject);
  return {
    structure: template.structure,
    issue: template.commonGaps[0] ?? "핵심 쟁점 누락",
    sentence: template.biggestGapGuidance,
    rewrite: template.rewriteGuidance,
    caseSummary: `${template.detailLine} ${template.structure}`,
  };
}

function firstLine(text: string, fallback: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)
    ?.slice(0, 64) ?? fallback;
}

function normalizeAnswerForCompare(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized === "-" || normalized === "–" || normalized === "—") return null;
  return normalized;
}

function isLikelyWrongAnswer(correctAnswer: string, userAnswer: string) {
  const normalizedCorrect = normalizeAnswerForCompare(correctAnswer);
  const normalizedUser = normalizeAnswerForCompare(userAnswer);
  if (!normalizedCorrect || !normalizedUser) return true;
  return normalizedCorrect !== normalizedUser;
}

function findField(text: string, labels: string[]) {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*[:：]\\s*([^\\n]+)`, "i"));
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function findParsedConfidence(text: string): ConfidenceLevel | "" {
  const value = findField(text, ["확신도", "확신", "confidence"]);
  if (value.includes("낮")) return "낮음";
  if (value.includes("높")) return "높음";
  if (value.includes("중")) return "중간";
  return "";
}

function findFirstMistakeReason(text: string) {
  return findField(text, ["틀린 이유", "오답 원인", "실수 원인", "mistake reason", "wrong reason"]);
}

function pickSubject(text: string, subjects: readonly string[], fallback: string) {
  return subjects.find((subject) => text.includes(subject)) ?? fallback;
}

function pickConcepts(text: string, fallback: string) {
  const words = text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2 && word.length <= 12);
  return Array.from(new Set(words)).slice(0, 3).join(", ") || fallback;
}

function hasValue(value: string) {
  return value.trim().length > 0;
}

function hasSecondModeLearnerProducedResponse(form: DraftState) {
  return [form.issueRecall, form.outlineDraft, form.userAnswer, form.rewriteParagraph].some((value) => value.trim().length >= 4);
}

function hasSecondModeReferenceStep(form: DraftState) {
  return hasSecondWriteReferenceStep(form);
}

function getMissingConfirmationFields(form: DraftState, mode: AppraisalMode) {
  if (mode === "first") {
    return [
      { key: "subject", label: "과목", ok: hasValue(form.subjectLabel) },
    ].filter((field) => !field.ok);
  }

  return [
    { key: "subject", label: "과목", ok: hasValue(form.subjectLabel) },
  ].filter((field) => !field.ok);
}
function inferSourceTypeFromAction(action: "camera" | "gallery" | "text" | "pdf"): SourceType {
  if (action === "pdf") return "pdf";
  if (action === "camera" || action === "gallery") return "photo";
  return "text";
}

function parseTimeSpentMinutes(value: string) {
  const match = value.trim().match(/\d+/);
  if (!match) return undefined;
  return Number(match[0]);
}

function getCaptureStep(stage: CaptureStage, mode: AppraisalMode) {
  if (stage === "intake") return 1;
  if (stage === "preview") return 2;
  if (stage === "saved-plan") return 4;
  if (stage === "confirm") return mode === "second" ? 4 : 3;
  if (stage.startsWith("second-")) return 3;
  return 4;
}

function getCaptureStageContext(
  stage: CaptureStage,
  mode: AppraisalMode,
  hasRewriteContext: boolean,
) {
  if (stage === "saved-plan") return CAPTURE_STAGE_CONTEXT[stage];
  if (hasRewriteContext && mode === "second") return REWRITE_CONTEXT_STAGE_CONTEXT;
  if (stage === "preview" && mode === "second") return SECOND_PREVIEW_STAGE_CONTEXT;
  return CAPTURE_STAGE_CONTEXT[stage];
}

function getSecondWriteStepNumber(stage: CaptureStage) {
  const index = SECOND_WRITE_FLOW_STEPS.findIndex((item) => item.stage === stage);
  return index < 0 ? null : index + 1;
}

function getPageBoundaryLabel(index: number) {
  return `[Page ${index + 1}]`;
}

function relabelPages(pages: UploadedPage[]): UploadedPage[] {
  return pages.map((page, index) => ({ ...page, label: `${index + 1}페이지 · ${page.name}` }));
}

function mergePageText(pages: UploadedPage[]) {
  return pages
    .map((page, index) => `${getPageBoundaryLabel(index)}\n${(page.ocrText ?? "").trim() || "직접 내용을 입력해 주세요."}`)
    .join("\n\n");
}

function hasLowConfidenceText(text: string) {
  return /\[unclear\]|흐림|판독|불명확|인식이 불안정/i.test(text);
}

function syncPageTextFromMergedText(pages: UploadedPage[], mergedText: string): UploadedPage[] {
  if (pages.length === 0) return pages;
  const boundaryRegex = /^\[Page\s+\d+\]\s*$/gim;
  const matches = Array.from(mergedText.matchAll(boundaryRegex));
  if (matches.length === 0) return pages;

  return pages.map((page, index) => {
    const match = matches[index];
    if (!match || match.index === undefined) return page;
    const start = match.index + match[0].length;
    const next = matches[index + 1];
    const end = next?.index ?? mergedText.length;
    const editedText = mergedText.slice(start, end).trim();
    return {
      ...page,
      ocrText: editedText || page.ocrText,
      lowConfidenceFlag: page.lowConfidenceFlag || hasLowConfidenceText(editedText),
      captureQualityIssue: page.captureQualityIssue ?? (hasLowConfidenceText(editedText) ? "low_confidence_ocr" : undefined),
    };
  });
}

function stripPreviewUrls(pages: UploadedPage[]): PersistedCapturePage[] {
  return pages.map((page) => ({
    id: page.id,
    name: page.name,
    label: page.label,
    sourceType: page.sourceType,
    ocrText: page.ocrText,
    lowConfidenceFlag: page.lowConfidenceFlag,
    captureQualityIssue: page.captureQualityIssue,
  }));
}

export function WrongAnswerCaptureForm({
  userId,
  mode,
  labelledBy = "capture-page-title",
  initialPreferredSubjects = [],
  initialSubject,
  workflow = "default",
  rewriteContext = null,
}: CaptureFormProps) {
  const router = useRouter();
  const config = getModeConfig(mode);
  const storageKey = { userId, feature: "capture-draft", entityId: mode };
  const resolvedInitialSubject =
    (initialSubject && (config.subjects as readonly string[]).includes(initialSubject) ? initialSubject : null) ??
    initialPreferredSubjects.find((subject) => (config.subjects as readonly string[]).includes(subject)) ??
    getDefaultSubject(mode);
  function createInitialDraftState(): DraftState {
    return {
      subjectLabel: resolvedInitialSubject,
      sourceType: "text",
      sourceLabel: "",
      problemTitle: rewriteContext?.sourceTitle ?? "",
      problemIdentifier: mode === "second" ? SECOND_TASK_PRESETS[0] : "",
      rawQuestionText: "",
      correctAnswer: rewriteContext?.referenceSummary ?? "",
      userAnswer: "",
      userReasonText:
        rewriteContext?.biggestGap ??
        (mode === "second" ? secondDefaults(resolvedInitialSubject).issue : firstDefaults(resolvedInitialSubject).reason),
      userReasonPreset: "",
      confidence: "중간",
      timeSpentSeconds: "",
      nextReviewDate: getDefaultNextReviewDate(mode),
      keyConcepts: firstDefaults(resolvedInitialSubject).concepts,
      coreFormula: firstDefaults(resolvedInitialSubject).formula,
      comparisonPoint: firstDefaults(resolvedInitialSubject).comparison,
      missingIssue: rewriteContext?.biggestGap ?? secondDefaults(resolvedInitialSubject).issue,
      weakStructurePoint: secondDefaults(resolvedInitialSubject).structure,
      weakApplicationSentence: secondDefaults(resolvedInitialSubject).sentence,
      rewriteInstruction: rewriteContext?.rewriteInstruction ?? secondDefaults(resolvedInitialSubject).rewrite,
      referenceStructure: secondDefaults(resolvedInitialSubject).structure,
      myAnswerSummary: rewriteContext?.myAnswerSummary ?? "",
      rewriteParagraph: "",
      caseSummary: secondDefaults(resolvedInitialSubject).caseSummary,
      issueRecall: "",
      outlineDraft: "",
      productionBeforeComparison: Boolean(rewriteContext),
      referenceAnswerAddedAfterProduction: Boolean(rewriteContext),
      biggestGap: rewriteContext?.biggestGap ?? secondDefaults(resolvedInitialSubject).issue,
      rawOcrText: "",
      rawExtractionJson: {},
      normalizedDraft: undefined,
      extractionNeedsReview: false,
      capturePages: [],
      pageCount: 0,
      lowConfidenceFlag: false,
      captureQualityIssue: "",
      hasManualCorrection: false,
      ocrConfirmedByLearner: false,
    };
  }
  const [form, setForm] = useState<DraftState>(() => {
    const saved = loadReviewOsDraft<DraftState>(storageKey);
    if (saved) {
      return {
        ...saved,
        subjectLabel: normalizeSubjectForMode(saved.subjectLabel, mode),
      };
    }
    return createInitialDraftState();
  });
  const secondWriteEnabled = mode === "second" && workflow === "second-write" && !rewriteContext;
  const getInitialStage = () => {
    if (rewriteContext && mode === "second") return "confirm" as const;
    if (secondWriteEnabled) return "second-issue-recall" as const;
    return "intake" as const;
  };
  const [stage, setStage] = useState<CaptureStage>(getInitialStage());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [savedConfirmation, setSavedConfirmation] = useState<SavedCaptureConfirmation | null>(null);
  const [extractionState, setExtractionState] = useState<ExtractionState>("idle");
  const [uploadedPages, setUploadedPages] = useState<UploadedPage[]>(() => form.capturePages ?? []);
  const pendingCaptureSaveRef = useRef<PendingCaptureSaveOperation | null>(null);
  const extractionEditRevisionRef = useRef(0);
  const extractionRequestRevisionRef = useRef(0);
  const formErrorRef = useRef<HTMLParagraphElement | null>(null);

  function beginExtractionRequest(event: Extract<CaptureExtractionRevisionEvent, "text_request" | "image_import">) {
    const requestRevision = advanceCaptureExtractionRequestRevision(
      extractionRequestRevisionRef.current,
      event,
    );
    extractionRequestRevisionRef.current = requestRevision;
    setExtracting(true);
    return requestRevision;
  }

  function invalidatePendingExtraction(event: Exclude<CaptureExtractionRevisionEvent, "text_request" | "image_import">) {
    extractionRequestRevisionRef.current = advanceCaptureExtractionRequestRevision(
      extractionRequestRevisionRef.current,
      event,
    );
    extractionEditRevisionRef.current += 1;
    setExtracting(false);
  }

  function requestIsCurrent(requestRevision: number) {
    return isCurrentCaptureExtractionRequest(
      requestRevision,
      extractionRequestRevisionRef.current,
    );
  }

  function openSavedPlanStage(confirmation: SavedCaptureConfirmation) {
    setSavedConfirmation(confirmation);
    setStage("saved-plan");
  }
  const secondModeHiddenFooterStages = new Set([
    "second-issue-recall",
    "second-outline",
    "second-answer",
    "second-reference",
    "second-gap",
  ]);
  const hideGlobalFooterActions = mode === "second" && secondModeHiddenFooterStages.has(stage);
  const currentCaptureStep = getCaptureStep(stage, mode);
  const currentSecondWriteStep = getSecondWriteStepNumber(stage);
  const currentCaptureFlowSteps = mode === "second" ? SECOND_CAPTURE_FLOW_STEPS : CAPTURE_FLOW_STEPS;
  const currentCaptureStageContext = getCaptureStageContext(stage, mode, Boolean(rewriteContext));
  const secondModeReferenceStepComplete = hasSecondModeReferenceStep(form);
  const captureStageHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const announcedCaptureStageRef = useRef<CaptureStage>(stage);
  useEffect(() => {
    if (announcedCaptureStageRef.current === stage) return;
    announcedCaptureStageRef.current = stage;
    if (stage === "saved-plan") return;
    const frame = window.requestAnimationFrame(() => {
      captureStageHeadingRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [stage]);
  useEffect(() => {
    if (!error) return;
    const frame = window.requestAnimationFrame(() => {
      formErrorRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [error]);
  useEffect(() => {
    if (!secondWriteEnabled) return;

    const nextStage =
      stage === "second-reference" && form.userAnswer.trim().length < 8
        ? "second-answer"
        : stage === "second-gap" && !secondModeReferenceStepComplete
          ? "second-reference"
          : stage === "second-rewrite" && form.biggestGap.trim().length < 4
            ? "second-gap"
            : null;

    if (!nextStage) return;

    const timeout = window.setTimeout(() => setStage(nextStage), 0);
    return () => window.clearTimeout(timeout);
  }, [secondWriteEnabled, stage, form.userAnswer, secondModeReferenceStepComplete, form.biggestGap]);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const missingConfirmationFields = getMissingConfirmationFields(form, mode);
  const ocrConfirmationPending = Boolean(form.lowConfidenceFlag && !form.ocrConfirmedByLearner);
  const needsOcrConfirmation = Boolean(form.extractionNeedsReview || missingConfirmationFields.length > 0 || ocrConfirmationPending);

  function persist(next: DraftState) {
    saveReviewOsDraft(storageKey, next);
    return next;
  }

  function resolveCaptureSaveOperation(source: DraftState) {
    const workFingerprint = JSON.stringify({
      mode,
      workflow,
      rewriteSourceItemId: rewriteContext?.sourceItemId ?? null,
      source,
      pages: uploadedPages.map((page) => ({
        id: page.id,
        name: page.name,
        label: page.label,
        sourceType: page.sourceType,
        ocrText: page.ocrText ?? null,
        lowConfidenceFlag: page.lowConfidenceFlag ?? false,
        captureQualityIssue: page.captureQualityIssue ?? null,
      })),
    });
    const pending = resolvePendingCaptureSaveOperation(
      pendingCaptureSaveRef.current,
      workFingerprint,
    );
    pendingCaptureSaveRef.current = pending;
    return pending.binding;
  }

  function settleCaptureSaveOperation(operation: CaptureSaveOperationBinding) {
    const pending = pendingCaptureSaveRef.current;
    if (
      pending?.binding.operationId === operation.operationId &&
      pending.binding.workRevisionId === operation.workRevisionId
    ) {
      pendingCaptureSaveRef.current = null;
    }
  }

  function update<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setSavedConfirmation(null);
    setForm((prev) => {
      const learnerEditedField = ![
        "lowConfidenceFlag",
        "captureQualityIssue",
        "rawExtractionJson",
        "normalizedDraft",
        "capturePages",
        "pageCount",
      ].includes(String(key));
      if (learnerEditedField) extractionEditRevisionRef.current += 1;
      return persist({
        ...prev,
        [key]: value,
        ocrConfirmedByLearner: mode === "first" && prev.lowConfidenceFlag && learnerEditedField ? true : prev.ocrConfirmedByLearner,
      });
    });
  }

  function updateSubject(value: string) {
    extractionEditRevisionRef.current += 1;
    setForm((prev) => {
      const first = firstDefaults(value);
      const second = secondDefaults(value);
      return persist({
        ...prev,
        subjectLabel: value,
        keyConcepts: mode === "first" ? first.concepts : prev.keyConcepts,
        coreFormula: mode === "first" ? first.formula : prev.coreFormula,
        comparisonPoint: mode === "first" ? first.comparison : prev.comparisonPoint,
        userReasonText: mode === "first" ? first.reason : second.issue,
        missingIssue: mode === "second" ? second.issue : prev.missingIssue,
        weakStructurePoint: mode === "second" ? second.structure : prev.weakStructurePoint,
        weakApplicationSentence: mode === "second" ? second.sentence : prev.weakApplicationSentence,
        rewriteInstruction: mode === "second" ? second.rewrite : prev.rewriteInstruction,
        referenceStructure: mode === "second" ? second.structure : prev.referenceStructure,
        caseSummary: mode === "second" ? second.caseSummary : prev.caseSummary,
      });
    });
  }

  function buildStructuredDraft(base: DraftState, sourceText = base.rawQuestionText) {
    const subject = pickSubject(sourceText, config.subjects, base.subjectLabel || resolvedInitialSubject);
    const first = firstDefaults(subject);
    const second = secondDefaults(subject);
    return mode === "first"
      ? {
          ...base,
          subjectLabel: subject,
          problemTitle: base.problemTitle || firstLine(sourceText, `${subject} 오답 기록`),
          sourceLabel: base.sourceLabel || findField(sourceText, ["출처", "source", "교재", "세트"]),
          correctAnswer: base.correctAnswer || findField(sourceText, ["정답", "답", "correct answer"]),
          userAnswer: base.userAnswer || findField(sourceText, ["내 답", "내가 고른 답", "선택", "user answer", "my answer"]),
          userReasonText: findFirstMistakeReason(sourceText) || base.userReasonText || first.reason,
          confidence: findParsedConfidence(sourceText) || base.confidence,
          timeSpentSeconds: base.timeSpentSeconds || findField(sourceText, ["소요시간", "풀이 시간", "time spent"]),
          keyConcepts: pickConcepts(sourceText, first.concepts),
          coreFormula: base.coreFormula || first.formula,
          comparisonPoint: base.comparisonPoint || (/무효|취소/.test(sourceText) ? "무효·취소 구분 기준 10초 확인" : first.comparison),
          nextReviewDate: base.nextReviewDate || getDefaultNextReviewDate(mode),
        }
      : {
          ...base,
          subjectLabel: subject,
          problemTitle: base.problemTitle || firstLine(sourceText, `${subject} 답안 비교`),
          rawQuestionText: sourceText || base.rawQuestionText,
          correctAnswer: base.correctAnswer || findField(sourceText, ["강의/교재 정리", "해설", "reference"]),
          userAnswer: base.userAnswer || findField(sourceText, ["내 답안", "답안", "my answer"]),
          caseSummary: base.caseSummary || firstLine(sourceText, second.caseSummary),
          referenceStructure: base.referenceStructure || second.structure,
          myAnswerSummary: base.myAnswerSummary || (base.userAnswer ? firstLine(base.userAnswer, "내 답안 요약") : ""),
          missingIssue: base.missingIssue || second.issue,
          weakStructurePoint: base.weakStructurePoint || second.structure,
          weakApplicationSentence: base.weakApplicationSentence || second.sentence,
          rewriteInstruction: base.rewriteInstruction || second.rewrite,
          userReasonText: base.userReasonText || second.issue,
          productionBeforeComparison: true,
          nextReviewDate: base.nextReviewDate || getDefaultNextReviewDate(mode),
        };
  }

  function rebuildLatestLearnerDraftAfterStaleExtraction(
    base: DraftState,
    requestSemanticSnapshot: CaptureExtractionSemanticSnapshot,
  ): DraftState {
    const latestText = base.rawQuestionText;
    const cleared = clearUnchangedCaptureExtractionSemantics(
      base,
      requestSemanticSnapshot,
      mode,
    );
    const rebuilt = buildStructuredDraft(
      {
        ...cleared,
        rawExtractionJson: {},
        normalizedDraft: undefined,
        extractionNeedsReview: true,
      },
      latestText,
    );
    const reconciled = restoreLearnerEditedCaptureSemantics(
      base,
      requestSemanticSnapshot,
      rebuilt,
      mode,
    );
    return {
      ...reconciled,
      rawQuestionText: latestText,
      rawOcrText: base.rawOcrText || latestText,
      rawExtractionJson: {},
      normalizedDraft: undefined,
      extractionNeedsReview: true,
      hasManualCorrection: base.hasManualCorrection,
      ocrConfirmedByLearner: base.ocrConfirmedByLearner,
    };
  }

  function applyExtraction(base: DraftState, extraction: ExtractionPipelineResult): DraftState {
    const draft = extraction.normalized_draft;
    const subjectLabel = applyDraftToConfirmedSubject(mode, draft.subject_guess);
    if (mode === "second") {
      const second = draft as Extract<ExtractionDraft, { case_title: string }>;
      return {
        ...base,
        subjectLabel,
        sourceType: base.sourceType,
        problemTitle: second.case_title !== "unknown" ? second.case_title : base.problemTitle,
        rawQuestionText: extraction.raw_ocr_text || base.rawQuestionText,
        correctAnswer: second.reference_outline !== "unknown" ? second.reference_outline : base.correctAnswer,
        userAnswer: base.userAnswer,
        userReasonText: second.missing_issue !== "unknown" ? second.missing_issue : base.userReasonText,
        missingIssue: second.missing_issue !== "unknown" ? second.missing_issue : base.missingIssue,
        weakStructurePoint: second.weak_structure_point !== "unknown" ? second.weak_structure_point : base.weakStructurePoint,
        weakApplicationSentence: second.weak_sentence !== "unknown" ? second.weak_sentence : base.weakApplicationSentence,
        rewriteInstruction: second.rewrite_instruction !== "unknown" ? second.rewrite_instruction : base.rewriteInstruction,
        referenceStructure: second.reference_outline !== "unknown" ? second.reference_outline : base.referenceStructure,
        myAnswerSummary: second.user_answer_summary !== "unknown" ? second.user_answer_summary : base.myAnswerSummary,
        caseSummary: second.case_summary !== "unknown" ? second.case_summary : base.caseSummary,
        nextReviewDate: second.review_date_suggestion || base.nextReviewDate,
        rawOcrText: extraction.raw_ocr_text,
        rawExtractionJson: extraction.raw_extraction_json,
        normalizedDraft: extraction.normalized_draft,
        extractionNeedsReview: extraction.normalized_draft.needs_review,
        productionBeforeComparison: true,
      };
    }

    const first = draft as Extract<ExtractionDraft, { problem_title: string }>;
    return {
      ...base,
      subjectLabel,
      sourceType: base.sourceType,
      sourceLabel: first.source_label !== "unknown" ? first.source_label : base.sourceLabel,
      problemTitle: first.problem_title !== "unknown" ? first.problem_title : base.problemTitle,
      rawQuestionText: extraction.raw_ocr_text || base.rawQuestionText,
      correctAnswer: first.correct_answer !== "unknown" ? first.correct_answer : base.correctAnswer,
      userAnswer: first.user_answer !== "unknown" ? first.user_answer : base.userAnswer,
      userReasonText: first.wrong_reason_candidate !== "unknown" ? first.wrong_reason_candidate : base.userReasonText,
      keyConcepts: first.key_concepts.length > 0 ? first.key_concepts.join(", ") : base.keyConcepts,
      coreFormula: first.core_formula !== "unknown" ? first.core_formula : base.coreFormula,
      comparisonPoint: first.comparison_point !== "unknown" ? first.comparison_point : base.comparisonPoint,
      nextReviewDate: first.review_date_suggestion || base.nextReviewDate,
      rawOcrText: extraction.raw_ocr_text,
      rawExtractionJson: extraction.raw_extraction_json,
      normalizedDraft: extraction.normalized_draft,
      extractionNeedsReview: extraction.normalized_draft.needs_review,
    };
  }

  async function generateStructuredDraft(sourceText = form.rawQuestionText) {
    const text = sourceText.trim();
    if (!text) {
      setForm((prev) => persist(buildStructuredDraft(prev, sourceText)));
      setStage("preview");
      return;
    }
    const requestRevision = beginExtractionRequest("text_request");
    const requestEditRevision = extractionEditRevisionRef.current;
    const requestSemanticSnapshot = snapshotCaptureExtractionSemantics(form, mode);

    setExtractError("");
    setExtractionState("extracting");
    try {
      const body = new FormData();
      body.append("mode", mode);
      body.append("text", text);
      body.append("source_label", form.sourceLabel);
      const response = await fetch("/api/inverge/ocr", { method: "POST", body });
      const extraction = (await response.json()) as ({ ok?: boolean; error?: string } & ExtractionPipelineResult);
      if (!requestIsCurrent(requestRevision)) return;
      if (!response.ok || !extraction.ok) {
        const learnerEditedDuringRequest = extractionEditRevisionRef.current !== requestEditRevision;
        setForm((prev) => {
          return persist(
            learnerEditedDuringRequest
              ? rebuildLatestLearnerDraftAfterStaleExtraction(prev, requestSemanticSnapshot)
              : buildStructuredDraft(prev, text),
          );
        });
        setStage("preview");
        setExtractionState("failed");
        setExtractError("텍스트 추출에 실패했습니다. 직접 붙여넣거나 다시 시도해 주세요.");
        setTimeout(() => {
          textAreaRef.current?.focus();
        }, 0);
        return;
      }
      const learnerEditedDuringRequest = extractionEditRevisionRef.current !== requestEditRevision;
      setForm((prev) => {
        return persist(
          learnerEditedDuringRequest
            ? rebuildLatestLearnerDraftAfterStaleExtraction(prev, requestSemanticSnapshot)
            : applyExtraction(prev, extraction),
        );
      });
      setExtractionState(learnerEditedDuringRequest ? "manual" : "succeeded");
      setExtractError(
        learnerEditedDuringRequest
          ? "추출 중 입력이 수정되어 최신 내용을 유지했습니다. 저장 전 항목을 다시 확인해 주세요."
          : "",
      );
      setStage("preview");
    } catch {
      if (!requestIsCurrent(requestRevision)) return;
      const learnerEditedDuringRequest = extractionEditRevisionRef.current !== requestEditRevision;
      setForm((prev) => {
        return persist(
          learnerEditedDuringRequest
            ? rebuildLatestLearnerDraftAfterStaleExtraction(prev, requestSemanticSnapshot)
            : buildStructuredDraft(prev, text),
        );
      });
      setStage("preview");
      setExtractionState("failed");
      setExtractError("텍스트 추출에 실패했습니다. 직접 붙여넣거나 다시 시도해 주세요.");
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 0);
    } finally {
      if (requestIsCurrent(requestRevision)) setExtracting(false);
    }
  }

  function preserveLatestLearnerImageWorkAfterStaleExtraction(
    requestSemanticSnapshot: CaptureExtractionSemanticSnapshot,
  ) {
    setForm((prev) =>
      persist({
        ...rebuildLatestLearnerDraftAfterStaleExtraction(prev, requestSemanticSnapshot),
        sourceType: prev.sourceType,
        sourceLabel: prev.sourceLabel,
        capturePages: prev.capturePages,
        pageCount: prev.pageCount,
        lowConfidenceFlag: true,
        captureQualityIssue: "edited_during_extraction",
        extractionNeedsReview: true,
      }),
    );
    setExtractionState("manual");
    setExtractError("추출 중 입력이 수정되어 최신 내용을 유지했습니다. 저장 전 항목을 다시 확인해 주세요.");
    setStage("preview");
  }

  async function handleImageImport(fileList: FileList) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    extractionEditRevisionRef.current += 1;
    const requestRevision = beginExtractionRequest("image_import");
    const requestEditRevision = extractionEditRevisionRef.current;
    const requestSemanticSnapshot = snapshotCaptureExtractionSemantics(form, mode);
    const initialPages = relabelPages(
      files.map((file, index) => ({
        id: `${Date.now()}-${index}-${file.name}`,
        name: file.name || `${index + 1}페이지`,
        label: `${index + 1}페이지 · ${file.name || "촬영 이미지"}`,
        sourceType: "image" as const,
        previewUrl: URL.createObjectURL(file),
        ocrText: "OCR 초안을 만드는 중입니다.",
      })),
    );
    setExtractError("");
    setExtractionState("uploading");
    setUploadedPages(initialPages);
    setForm((prev) =>
      persist({
        ...clearUnchangedCaptureExtractionSemantics(
          prev,
          requestSemanticSnapshot,
          mode,
        ),
        sourceType: inferSourceTypeFromAction("gallery"),
        sourceLabel: initialPages.map((page) => page.label).join(" / "),
        rawQuestionText: "",
        rawOcrText: "",
        rawExtractionJson: {},
        normalizedDraft: undefined,
        extractionNeedsReview: true,
        capturePages: stripPreviewUrls(initialPages),
        pageCount: initialPages.length,
        lowConfidenceFlag: false,
        captureQualityIssue: "",
        hasManualCorrection: false,
        ocrConfirmedByLearner: false,
      }),
    );
    try {
      const body = new FormData();
      body.append("mode", mode);
      for (const file of files) body.append("images", file);
      setExtractionState("extracting");
      const response = await fetch("/api/inverge/ocr", { method: "POST", body });
      const result = (await response.json()) as ({
        ok?: boolean;
        text?: string;
        extractedText?: string;
        error?: string;
        pages?: Array<{ pageNumber?: number; name?: string; text?: string }>;
      } & ExtractionPipelineResult);
      if (!requestIsCurrent(requestRevision)) return;
      const learnerEditedDuringRequest = extractionEditRevisionRef.current !== requestEditRevision;
      if (learnerEditedDuringRequest) {
        preserveLatestLearnerImageWorkAfterStaleExtraction(requestSemanticSnapshot);
        return;
      }
      const sourceLabel = initialPages.map((page) => page.label).join(" / ");
      if (!response.ok || !result.ok) {
        const fallbackPages = initialPages.map((page) => ({
          ...page,
          ocrText: "직접 내용을 입력해 주세요.",
          lowConfidenceFlag: true,
          captureQualityIssue: "ocr_failed_manual_fallback",
          ocrConfirmedByLearner: false,
        }));
        const mergedFallback = mergePageText(fallbackPages);
        setUploadedPages(fallbackPages);
        setForm((prev) =>
          persist(
            {
              ...prev,
              sourceType: inferSourceTypeFromAction("gallery"),
              sourceLabel,
              rawQuestionText: mergedFallback,
              rawOcrText: mergedFallback,
              capturePages: stripPreviewUrls(fallbackPages),
              pageCount: fallbackPages.length,
              lowConfidenceFlag: true,
              captureQualityIssue: "ocr_failed_manual_fallback",
              ocrConfirmedByLearner: false,
              extractionNeedsReview: true,
            },
          ),
        );
        setStage("preview");
        setExtractionState("failed");
        setExtractError("인식이 불안정합니다. 중요한 숫자/단어를 확인해 주세요. 직접 붙여넣거나 다시 찍기로 계속할 수 있습니다.");
        setTimeout(() => {
          textAreaRef.current?.focus();
        }, 0);
        return;
      }
      const pageTexts = result.pages?.length
        ? result.pages.map((page) => page.text ?? "")
        : files.map((_, index) => {
            const boundary = new RegExp(`\\[Page\\s+${index + 1}\\]\\s*([\\s\\S]*?)(?=\\n\\n\\[Page\\s+${index + 2}\\]|$)`, "i");
            return (result.text ?? result.extractedText ?? "").match(boundary)?.[1]?.trim() ?? (files.length === 1 ? result.text ?? result.extractedText ?? "" : "");
          });
      const pagesWithText = initialPages.map((page, index) => {
        const text = pageTexts[index]?.trim() || "직접 내용을 입력해 주세요.";
        const lowConfidenceFlag = hasLowConfidenceText(text);
        return {
          ...page,
          name: result.pages?.[index]?.name || page.name,
          ocrText: text,
          lowConfidenceFlag,
          captureQualityIssue: lowConfidenceFlag ? "low_confidence_ocr" : undefined,
        };
      });
      const extractedText = mergePageText(pagesWithText);
      const lowConfidenceFlag = pagesWithText.some((page) => page.lowConfidenceFlag);
      setUploadedPages(relabelPages(pagesWithText));
      setForm((prev) => {
        const learnerText = prev.hasManualCorrection && prev.rawQuestionText.trim()
          ? prev.rawQuestionText
          : extractedText;
        const base: DraftState = {
          ...prev,
          sourceType: inferSourceTypeFromAction("gallery"),
          sourceLabel,
          rawQuestionText: learnerText,
          rawOcrText: prev.hasManualCorrection && prev.rawOcrText?.trim() ? prev.rawOcrText : extractedText,
          capturePages: stripPreviewUrls(pagesWithText),
          pageCount: pagesWithText.length,
          lowConfidenceFlag,
          captureQualityIssue: lowConfidenceFlag ? "low_confidence_ocr" : "",
          ocrConfirmedByLearner: prev.hasManualCorrection ? prev.ocrConfirmedByLearner : false,
        };
        const structured = result.normalized_draft
          ? applyExtraction(base, result)
          : buildStructuredDraft(base, learnerText);
        return persist({
          ...structured,
          rawQuestionText: learnerText,
          rawOcrText: base.rawOcrText,
          hasManualCorrection: prev.hasManualCorrection,
          ocrConfirmedByLearner: base.ocrConfirmedByLearner,
          capturePages: stripPreviewUrls(relabelPages(pagesWithText)),
          pageCount: pagesWithText.length,
          lowConfidenceFlag,
          captureQualityIssue: lowConfidenceFlag ? "low_confidence_ocr" : "",
        });
      });
      setExtractionState(lowConfidenceFlag ? "manual" : "succeeded");
      setExtractError(
        lowConfidenceFlag
          ? "인식이 불안정합니다. 중요한 숫자/단어를 확인해 주세요."
          : "",
      );
      setStage("preview");
    } catch {
      if (!requestIsCurrent(requestRevision)) return;
      const learnerEditedDuringRequest = extractionEditRevisionRef.current !== requestEditRevision;
      if (learnerEditedDuringRequest) {
        preserveLatestLearnerImageWorkAfterStaleExtraction(requestSemanticSnapshot);
        return;
      }
      const fallbackPages = initialPages.map((page) => ({
        ...page,
        ocrText: "직접 내용을 입력해 주세요.",
        lowConfidenceFlag: true,
        captureQualityIssue: "ocr_failed_manual_fallback",
      }));
      const mergedFallback = mergePageText(fallbackPages);
      setUploadedPages(fallbackPages);
      setForm((prev) =>
        persist(
          {
            ...prev,
            sourceType: inferSourceTypeFromAction("gallery"),
            sourceLabel: fallbackPages.map((page) => page.label).join(" / "),
            rawQuestionText: mergedFallback,
            rawOcrText: mergedFallback,
            capturePages: stripPreviewUrls(fallbackPages),
            pageCount: fallbackPages.length,
            lowConfidenceFlag: true,
            captureQualityIssue: "ocr_failed_manual_fallback",
            ocrConfirmedByLearner: false,
            extractionNeedsReview: true,
          },
        ),
      );
      setStage("preview");
      setExtractionState("failed");
      setExtractError("인식이 불안정합니다. 중요한 숫자/단어를 확인해 주세요. 직접 붙여넣거나 다시 찍기로 계속할 수 있습니다.");
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 0);
    } finally {
      if (requestIsCurrent(requestRevision)) setExtracting(false);
    }
  }

  function handlePdfImport(file: File) {
    const requestSemanticSnapshot = snapshotCaptureExtractionSemantics(form, mode);
    invalidatePendingExtraction("pdf_import");
    const pdfPage = relabelPages([{
      id: `pdf-${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      label: `1페이지 · ${file.name}`,
      sourceType: "pdf" as const,
      ocrText: "PDF 내용은 직접 붙여넣어 주세요.",
      lowConfidenceFlag: true,
      captureQualityIssue: "pdf_manual_text_fallback",
    }]);
    const mergedText = mergePageText(pdfPage);
    setUploadedPages(pdfPage);
    setForm((prev) =>
      persist({
        ...clearUnchangedCaptureExtractionSemantics(
          prev,
          requestSemanticSnapshot,
          mode,
        ),
        sourceType: inferSourceTypeFromAction("pdf"),
        sourceLabel: pdfPage.map((page) => page.label).join(" / "),
        rawQuestionText: mergedText,
        rawOcrText: mergedText,
        rawExtractionJson: {},
        normalizedDraft: undefined,
        extractionNeedsReview: true,
        capturePages: stripPreviewUrls(pdfPage),
        pageCount: 1,
        lowConfidenceFlag: true,
        captureQualityIssue: "pdf_manual_text_fallback",
        hasManualCorrection: false,
        ocrConfirmedByLearner: false,
      }),
    );
    setExtractionState("manual");
    setExtractError("현재 PDF는 내용 확인 후 직접 붙여넣을 수 있습니다.");
    setTimeout(() => {
      textAreaRef.current?.focus();
      textAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  function continueAfterExtractionReview() {
    setForm((prev) =>
      persist({
        ...prev,
        extractionNeedsReview: false,
        ocrConfirmedByLearner: true,
      }),
    );
    setExtractError("");
    setStage(mode === "second" ? "second-issue-recall" : "confirm");
  }

  function resetDraft() {
    invalidatePendingExtraction("reset");
    uploadedPages.forEach((page) => {
      if (page.previewUrl) URL.revokeObjectURL(page.previewUrl);
    });
    clearReviewOsDraft(storageKey);
    pendingCaptureSaveRef.current = null;
    setStage(getInitialStage());
    setError("");
    setExtractError("");
    setExtractionState("idle");
    setUploadedPages([]);
    setForm(createInitialDraftState());
  }
  function syncPageLabels(
    nextPages: UploadedPage[],
    revisionEvent: Extract<CaptureExtractionRevisionEvent, "remove_page" | "move_page">,
  ) {
    invalidatePendingExtraction(revisionEvent);
    const relabeled = relabelPages(nextPages);
    const mergedText = mergePageText(relabeled);
    const lowConfidenceFlag = relabeled.some((page) => page.lowConfidenceFlag || hasLowConfidenceText(page.ocrText ?? ""));
    setUploadedPages(relabeled);
    setForm((prev) =>
      persist({
        ...prev,
        sourceLabel: relabeled.map((page) => page.label).join(" / "),
        rawQuestionText: mergedText,
        rawOcrText: mergedText,
        capturePages: stripPreviewUrls(relabeled),
        pageCount: relabeled.length,
        lowConfidenceFlag,
        captureQualityIssue: lowConfidenceFlag ? "low_confidence_ocr" : prev.captureQualityIssue,
        hasManualCorrection: true,
        ocrConfirmedByLearner: true,
      }),
    );
    setExtractionState("manual");
    setExtractError("페이지 구성을 직접 변경했습니다. 현재 순서와 내용을 저장 전에 다시 확인해 주세요.");
  }
  function removePage(index: number) {
    const page = uploadedPages[index];
    if (page?.previewUrl) URL.revokeObjectURL(page.previewUrl);
    const synced = syncPageTextFromMergedText(uploadedPages, form.rawQuestionText);
    syncPageLabels(synced.filter((_, idx) => idx !== index), "remove_page");
  }
  function movePage(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= uploadedPages.length) return;
    const synced = syncPageTextFromMergedText(uploadedPages, form.rawQuestionText);
    const next = [...synced];
    [next[index], next[target]] = [next[target], next[index]];
    syncPageLabels(next, "move_page");
  }

  function getCaptureConfirmationCopy(source: DraftState) {
    return resolveCaptureConfirmationCopy({
      mode,
      subjectLabel: source.subjectLabel,
      rawQuestionText: source.rawQuestionText,
      rawAnswerText: source.rawOcrText,
      userAnswer: source.userAnswer,
      issueRecall: source.issueRecall,
      outlineDraft: source.outlineDraft,
      rewriteParagraph: source.rewriteParagraph,
      myAnswerSummary: source.myAnswerSummary,
      userReasonText: source.userReasonText,
      userReasonPreset: source.userReasonPreset,
      biggestGap: source.biggestGap,
      missingIssue: source.missingIssue,
      comparisonPoint: source.comparisonPoint,
      rewriteInstruction: source.rewriteInstruction,
      problemTitle: source.problemTitle,
      caseSummary: source.caseSummary,
    });
  }

  function normalizeCaptureSourceType(sourceType: SourceType) {
    return sourceType === "image" || sourceType === "photo" ? "photo" : sourceType === "pdf" ? "pdf" : "text";
  }

  async function buildLearnerNoteFoundation(source: DraftState) {
    const learnerText = getLearnerCaptureContent(source) || source.rawQuestionText || source.userAnswer || source.biggestGap;

    return buildCaptureToNoteDraft({
      examMode: mode,
      subject: source.subjectLabel || getDefaultSubject(mode),
      sourceType: normalizeCaptureSourceType(source.sourceType),
      editableText: learnerText,
      problemSummary: source.problemTitle || source.caseSummary || source.sourceLabel,
      confidence: source.confidence,
      timeSpentMin: parseTimeSpentMinutes(source.timeSpentSeconds),
      conceptKeyCandidates: source.keyConcepts.split(",").map((item) => item.trim()).filter(Boolean),
    });
  }

  function buildSaveConfirmation(input: {
    itemId?: string;
    status: CaptureSavePersistenceStatus;
    retryAction?: "quick" | "session";
    persistenceEvidence?: FailureAwarePersistenceEvidence | null;
    conflictEvidence?: Extract<FailureAwareStateEvidence, { kind: "conflict" }> | null;
    copy: ReturnType<typeof getCaptureConfirmationCopy>;
    foundationDraft: Awaited<ReturnType<typeof buildLearnerNoteFoundation>>;
  }): SavedCaptureConfirmation {
    return {
      itemId: input.itemId,
      status: input.status,
      retryAction: input.retryAction,
      persistenceEvidence: input.persistenceEvidence,
      conflictEvidence: input.conflictEvidence,
      ...input.copy,
      todayPlanCandidate: input.foundationDraft.todayPlanCandidate.title,
      reviewQueueCandidate: input.foundationDraft.reviewQueueCandidate.reviewReason,
      legalGroundingMessage: input.foundationDraft.legalGroundingHint?.learnerSafeMessage,
      learningAction: input.foundationDraft.cognitiveLearningAction,
    };
  }

  async function saveLocalCaptureConfirmation(
    source: DraftState,
    retryAction: "quick" | "session" = "session",
  ) {
    const copy = getCaptureConfirmationCopy(source);
    const foundationDraft = await buildLearnerNoteFoundation(source);
    const sourceType = normalizeCaptureSourceType(source.sourceType);
    const localSave = saveReviewOsLocalBetaNoteWithStatus({
      mode,
      subjectLabel: source.subjectLabel || getDefaultSubject(mode),
      sourceType,
      problemTitle: source.problemTitle || `${source.subjectLabel || getDefaultSubject(mode)} 입력 캡처`,
      biggestGap: copy.biggestGap,
      nextAction: copy.nextAction,
    });
    if (!localSave.savedToBrowser) {
      openSavedPlanStage(buildSaveConfirmation({ itemId: localSave.note.id, status: "save_failed", retryAction, copy, foundationDraft }));
      return false;
    }
    openSavedPlanStage(buildSaveConfirmation({
      itemId: localSave.note.id,
      status: "local_fallback_saved",
      copy,
      foundationDraft,
    }));
    pushLocalLearnerAnalyticsEvent({
      event: "capture_saved",
      surface: "capture",
      route: "/app/capture",
      mode,
      subject: source.subjectLabel || getDefaultSubject(mode),
      sourceType: source.sourceType === "image" ? "photo" : source.sourceType,
      status: "saved",
      createdFromCapture: true,
      nextTaskType: mode === "second" ? "rewrite" : "retry",
    });
    return true;
  }

  function getLearnerCaptureContent(source: DraftState) {
    return [source.rawQuestionText, source.userAnswer, source.issueRecall, source.outlineDraft, source.rewriteParagraph, source.myAnswerSummary, source.userReasonText, source.biggestGap, source.missingIssue, source.comparisonPoint]
      .map((value) => value.trim())
      .find(Boolean) ?? "";
  }

  function hasLearnerCaptureContent(source: DraftState) {
    return Boolean(getLearnerCaptureContent(source) || uploadedPages.length > 0);
  }

  async function saveQuickCaptureFromIntake() {
    const learnerText = getLearnerCaptureContent(form);
    if (!learnerText && uploadedPages.length === 0) return;
    setSubmitting(true);
    setError("");
    const sourceText = form.rawQuestionText.trim() || learnerText;
    const structured = buildStructuredDraft(
      {
        ...form,
        rawQuestionText: sourceText || form.rawQuestionText,
        rawOcrText: form.rawOcrText || sourceText || form.rawQuestionText,
        userAnswer: form.userAnswer || (mode === "second" ? learnerText : form.userAnswer),
        issueRecall: form.issueRecall || (mode === "second" ? firstLine(learnerText, "오늘 입력 회상") : form.issueRecall),
        productionBeforeComparison: mode === "second" ? true : form.productionBeforeComparison,
        referenceAnswerAddedAfterProduction: mode === "second" ? form.referenceAnswerAddedAfterProduction : form.referenceAnswerAddedAfterProduction,
        correctAnswer: form.correctAnswer || "-",
      },
      sourceText || form.rawQuestionText,
    );
    const copy = getCaptureConfirmationCopy(structured);
    const foundationDraft = await buildLearnerNoteFoundation(structured);
    const operation = resolveCaptureSaveOperation(structured);
    setForm(persist(structured));
    try {
      const response = await fetch("/api/os/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examName: getModeLabel(mode),
          subjectLabel: structured.subjectLabel || getDefaultSubject(mode),
          sourceType: structured.sourceType,
          sourceLabel: structured.sourceLabel || undefined,
          problemTitle: structured.problemTitle || firstLine(structured.rawQuestionText, `${structured.subjectLabel || getDefaultSubject(mode)} 입력 기록`),
          problemIdentifier: structured.problemIdentifier || undefined,
          rawQuestionText: structured.rawQuestionText || undefined,
          rawAnswerText: mode === "second" ? structured.userAnswer || structured.rawQuestionText : undefined,
          correctAnswer: structured.correctAnswer || "-",
          userAnswer: structured.userAnswer || structured.rawQuestionText || "-",
          userReasonText: copy.biggestGap,
          userReasonPreset: structured.userReasonPreset || undefined,
          confidence: structured.confidence,
          timeSpentSeconds: parseTimeSpentMinutes(structured.timeSpentSeconds) ? parseTimeSpentMinutes(structured.timeSpentSeconds)! * 60 : undefined,
          nextReviewDate: structured.nextReviewDate || undefined,
          keyConcepts: structured.keyConcepts.split(",").map((item) => item.trim()).filter(Boolean),
          coreFormula: structured.coreFormula || undefined,
          comparisonPoint: mode === "first" ? copy.nextAction : undefined,
          missingIssue: mode === "second" ? copy.biggestGap : undefined,
          weakStructurePoint: structured.weakStructurePoint || undefined,
          weakApplicationSentence: structured.weakApplicationSentence || undefined,
          rewriteInstruction: mode === "second" ? copy.nextAction : structured.rewriteInstruction || undefined,
          referenceStructure: structured.referenceStructure || undefined,
          myAnswerSummary: structured.myAnswerSummary || firstLine(structured.userAnswer || structured.rawQuestionText, "내 답안 요약"),
          caseSummary: structured.caseSummary || undefined,
          issueRecall: structured.issueRecall || undefined,
          outlineDraft: structured.outlineDraft || undefined,
          productionBeforeComparison: mode === "second" ? true : undefined,
          referenceAnswerAddedAfterProduction: mode === "second" ? structured.referenceAnswerAddedAfterProduction : undefined,
          biggestGap: mode === "second" ? copy.biggestGap : undefined,
          rewriteCompleted: false,
          captureIntent: "save",
          createdFromCapture: true,
          extractionPayload: {
            raw_ocr_text: structured.rawOcrText || structured.rawQuestionText || "",
            raw_extraction_json: structured.rawExtractionJson ?? {},
            normalized_draft: structured.normalizedDraft ?? null,
            user_confirmed_fields: {
              sourceType: structured.sourceType,
              subject: structured.subjectLabel,
              examMode: mode,
              biggest_gap: mode === "second" ? copy.biggestGap : null,
              issue_recall: structured.issueRecall || null,
              production_before_comparison: mode === "second" ? true : null,
              local_beta_confirmation_available: true,
              ...buildCapturePersistenceMetadata(operation),
            },
          },
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        deduped?: boolean;
        item?: { id: string; updatedAt?: string; rawPayload?: Record<string, unknown> };
        error?: string;
      };
      if (!response.ok || !result.ok || !result.item) {
        await saveLocalCaptureConfirmation(structured, "quick");
        return;
      }
      const persistenceEvidence = buildDurableCapturePersistenceReceipt(result.item, operation);
      if (!persistenceEvidence) {
        const conflictEvidence = result.deduped
          ? buildCaptureDedupeConflictEvidence(result.item, operation)
          : null;
        openSavedPlanStage(buildSaveConfirmation({
          itemId: result.item.id,
          status: "save_failed",
          retryAction: "quick",
          conflictEvidence,
          copy,
          foundationDraft,
        }));
        return;
      }
      settleCaptureSaveOperation(operation);
      clearReviewOsDraft(storageKey);
      pushLocalLearnerAnalyticsEvent({
        event: "capture_saved",
        surface: "capture",
        route: "/app/capture",
        mode,
        subject: structured.subjectLabel || getDefaultSubject(mode),
        sourceType: structured.sourceType === "image" ? "photo" : structured.sourceType,
        status: "saved",
        createdFromCapture: true,
        nextTaskType: mode === "second" ? "rewrite" : "retry",
      });
      openSavedPlanStage(buildSaveConfirmation({
        itemId: result.item.id,
        status: "durable_saved",
        persistenceEvidence,
        copy,
        foundationDraft,
      }));
    } catch {
      await saveLocalCaptureConfirmation(structured, "quick");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveCaptureAfterConfirmation(destination: "session" | "first-ox" = "session") {
    setSubmitting(true);
    setError("");

    try {
      if (form.extractionNeedsReview) {
        setStage("preview");
        setError("추출 중 수정된 최신 입력을 확인한 뒤 다시 진행해 주세요.");
        return;
      }
      if (destination === "first-ox") {
        if (form.lowConfidenceFlag && !form.ocrConfirmedByLearner) {
          setError("OCR 확인 필요: 숫자/용어를 직접 확인하거나 수정한 뒤 O/X 연습으로 나눌 수 있습니다.");
          return;
        }
        if (!form.correctAnswer.trim() || !form.userAnswer.trim()) {
          setError("O/X 저장에는 정답/내 답 한 가지만 확인해 주세요.");
          return;
        }
      }
      if (mode === "first" && destination === "first-ox" && isLikelyWrongAnswer(form.correctAnswer, form.userAnswer)) {
        if (!form.userReasonPreset.trim() && !form.userReasonText.trim()) {
          setError("1차 O/X 저장에는 오답 원인 한 가지만 확인해 주세요.");
          return;
        }
        if (!form.comparisonPoint.trim()) {
          setError("O/X 저장에는 회상 한 문장 한 가지만 확인해 주세요.");
          return;
        }
      }
      if (mode === "second" && !rewriteContext) {
        if (!hasSecondModeLearnerProducedResponse(form)) {
          setError("2차 저장 전에는 쟁점·목차·답안 중 하나를 직접 적어 주세요.");
          return;
        }
        if (!form.productionBeforeComparison) {
          setError("강의/교재 정리 확인 전, 내 답안 또는 회상 내용을 먼저 남겨 주세요.");
          return;
        }
        if (!hasSecondModeReferenceStep(form)) {
          setError("강의/교재 정리 비교 또는 확인 보류를 선택한 뒤 저장해 주세요.");
          return;
        }
        if (stage !== "confirm") {
          setStage("confirm");
          setError("마지막 확인 화면에서 저장해 주세요.");
          return;
        }
      }

      if (missingConfirmationFields.length > 0) {
        const firstMissing = missingConfirmationFields[0]?.label;
        setError(firstMissing ? `저장 전에 ${firstMissing} 한 가지만 확인해 주세요.` : "OCR 확인 필요: 추출 초안을 다시 확인한 뒤 저장해 주세요.");
        return;
      }

      const foundationDraft = await buildLearnerNoteFoundation(form);
      const operation = resolveCaptureSaveOperation(form);
      const response = await fetch("/api/os/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examName: getModeLabel(mode),
          subjectLabel: form.subjectLabel || getDefaultSubject(mode),
          sourceType: form.sourceType,
          sourceLabel: form.sourceLabel || undefined,
          problemTitle: form.problemTitle || undefined,
          problemIdentifier: form.problemIdentifier || undefined,
          rawQuestionText: form.rawQuestionText || undefined,
          rawAnswerText: mode === "second" ? form.userAnswer : undefined,
          rewriteParagraph: mode === "second" ? form.rewriteParagraph || undefined : undefined,
          correctAnswer: form.correctAnswer || "-",
          userAnswer: form.userAnswer || "-",
          userReasonText: form.userReasonText || undefined,
          userReasonPreset: form.userReasonPreset || undefined,
          confidence: form.confidence,
          timeSpentSeconds: parseTimeSpentMinutes(form.timeSpentSeconds) ? parseTimeSpentMinutes(form.timeSpentSeconds)! * 60 : undefined,
          nextReviewDate: form.nextReviewDate || undefined,
          keyConcepts: form.keyConcepts.split(",").map((item) => item.trim()).filter(Boolean),
          coreFormula: form.coreFormula || undefined,
          comparisonPoint: form.comparisonPoint || undefined,
          missingIssue: form.missingIssue || undefined,
          weakStructurePoint: form.weakStructurePoint || undefined,
          weakApplicationSentence: form.weakApplicationSentence || undefined,
          rewriteInstruction: form.rewriteInstruction || undefined,
          referenceStructure: form.referenceStructure || undefined,
          myAnswerSummary: form.myAnswerSummary || undefined,
          caseSummary: form.caseSummary || undefined,
          extractionPayload: {
            raw_ocr_text: form.rawOcrText || form.rawQuestionText || "",
            raw_extraction_json: form.rawExtractionJson ?? {},
            normalized_draft: form.normalizedDraft ?? null,
            user_confirmed_fields: {
              subjectLabel: form.subjectLabel,
              correctAnswer: form.correctAnswer,
              userAnswer: form.userAnswer,
              userReasonText: form.userReasonText,
              userReasonPreset: form.userReasonPreset,
              nextReviewDate: form.nextReviewDate,
              timeSpentMinutes: parseTimeSpentMinutes(form.timeSpentSeconds) ?? null,
              problemTitle: form.problemTitle,
              rewrite_source_item_id: rewriteContext?.sourceItemId ?? null,
              rewrite_source_gap: rewriteContext?.biggestGap ?? null,
              rewrite_instruction: form.rewriteInstruction || rewriteContext?.rewriteInstruction || null,
              rewrite_paragraph: mode === "second" ? form.rewriteParagraph || null : null,
              rewrite_completed: mode === "second" ? form.rewriteParagraph.trim().length >= 8 : Boolean(rewriteContext),
              issue_recall: form.issueRecall || null,
              outline_draft: form.outlineDraft || null,
              production_before_comparison: mode === "second" ? form.productionBeforeComparison : null,
              produced_answer_before_reference: mode === "second" ? form.productionBeforeComparison : null,
              reference_answer_added_after_production:
                mode === "second" ? form.referenceAnswerAddedAfterProduction : null,
              biggest_gap: mode === "second" ? form.biggestGap || form.missingIssue || null : null,
              pageCount: form.pageCount ?? uploadedPages.length,
              sourceType: form.sourceType,
              subject: form.subjectLabel,
              examMode: mode,
              lowConfidenceFlag: Boolean(form.lowConfidenceFlag),
              captureQualityIssue: form.captureQualityIssue || null,
              hasManualCorrection: Boolean(form.hasManualCorrection),
              ocrConfirmedByLearner: Boolean(form.ocrConfirmedByLearner),
              ...buildCapturePersistenceMetadata(operation),
            },
          },
          issueRecall: form.issueRecall || undefined,
          outlineDraft: form.outlineDraft || undefined,
          productionBeforeComparison: mode === "second" ? form.productionBeforeComparison : undefined,
          referenceAnswerAddedAfterProduction: mode === "second" ? form.referenceAnswerAddedAfterProduction : undefined,
          biggestGap: mode === "second" ? form.biggestGap || form.missingIssue || undefined : undefined,
          rewriteSourceItemId: rewriteContext?.sourceItemId ?? undefined,
          rewriteSourceGap: rewriteContext?.biggestGap ?? undefined,
          rewriteCompleted: mode === "second" ? form.rewriteParagraph.trim().length >= 8 : Boolean(rewriteContext),
          captureIntent: "save",
          createdFromCapture: true,
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        deduped?: boolean;
        item?: {
          id: string;
          examName?: string;
          updatedAt?: string;
          rawPayload?: Record<string, unknown>;
        };
        error?: string;
        message?: string;
        errorCode?: string;
      };
      if (!response.ok || !result.ok || !result.item) {
        if (destination === "session") {
          await saveLocalCaptureConfirmation(form, "session");
          return;
        }
        setError("정리하지 못했습니다. 내용을 조금 더 확인한 뒤 다시 시도해 주세요.");
        return;
      }
      const persistenceEvidence = buildDurableCapturePersistenceReceipt(result.item, operation);
      if (!persistenceEvidence) {
        const conflictEvidence = result.deduped
          ? buildCaptureDedupeConflictEvidence(result.item, operation)
          : null;
        openSavedPlanStage(buildSaveConfirmation({
          itemId: result.item.id,
          status: "save_failed",
          retryAction: "session",
          conflictEvidence,
          copy: getCaptureConfirmationCopy(form),
          foundationDraft,
        }));
        return;
      }
      settleCaptureSaveOperation(operation);
      clearReviewOsDraft(storageKey);
      pushLocalLearnerAnalyticsEvent({
        event: "capture_saved",
        surface: "capture",
        route: "/app/capture",
        mode,
        subject: form.subjectLabel || getDefaultSubject(mode),
        sourceType: form.sourceType === "image" ? "photo" : form.sourceType,
        status: "saved",
        createdFromCapture: true,
        nextTaskType: destination === "first-ox" && mode === "first" ? "first_ox" : mode === "second" ? "rewrite" : "retry",
      });
      if (destination === "first-ox" && mode === "first") {
        router.push(`/app/first/ox?sourceItemId=${encodeURIComponent(result.item.id)}&mode=first`);
        router.refresh();
        return;
      }
      openSavedPlanStage(buildSaveConfirmation({
        itemId: result.item.id,
        status: "durable_saved",
        persistenceEvidence,
        copy: getCaptureConfirmationCopy(form),
        foundationDraft,
      }));
    } catch {
      if (destination === "session") {
        await saveLocalCaptureConfirmation(form, "session");
        return;
      }
      setError("정리하지 못했습니다. 내용을 조금 더 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveCaptureAfterConfirmation("session");
  }

  const firstOxChoiceExtraction = mode === "first" ? extractFirstExamFiveChoicesFromText(form.rawQuestionText, form.subjectLabel) : null;
  const canBridgeToFirstOx = firstOxChoiceExtraction?.status === "detected" && firstOxChoiceExtraction.choices.length === 5;
  const canQuickSaveCapture = hasLearnerCaptureContent(form);

  const footerSecondary =
    submitting || stage === "intake" ? null : (
      <details className="max-w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-3 py-2">
        <summary className="flex min-h-11 cursor-pointer items-center whitespace-nowrap text-xs font-medium text-[color:var(--muted)]">다른 작업</summary>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <CaptureActionButton mode={mode} type="button" variant="outline" onClick={resetDraft} className="w-full sm:w-auto">
            {mode === "second" ? "다시 쓰기" : "다시 풀기"}
          </CaptureActionButton>
          <CaptureActionButton mode={mode} type="button" variant="ghost" onClick={resetDraft} className="w-full sm:w-auto">
            나중에 하기
          </CaptureActionButton>
        </div>
      </details>
    );

  return (
    <form
      className="space-y-4 overflow-x-hidden pb-28 sm:space-y-6 sm:pb-0"
      onSubmit={handleSubmit}
      aria-labelledby={labelledBy}
      data-s224v-surface-fragment="capture-form"
      data-s224v-secondary-diagnostics="quiet-disclosure"
      data-s224v-primary-cta-count-above-fold="1"
      data-s232e-capture-flow={secondWriteEnabled ? "second-write" : "four-stage"}
      data-s232e-capture-step={currentCaptureStep}
      data-s232e-capture-stage={stage}
    >
      {secondWriteEnabled ? (
        <section
          className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-3 sm:p-4"
          aria-label="다시쓰기 6단계 진행"
          data-s232e-second-write-progress
        >
          <p
            className="v3-type-label text-[var(--color-text-secondary)]"
            data-s232e-second-write-position={stage}
          >
            다시쓰기 진행 · {SECOND_WRITE_STAGE_POSITION[stage] ?? "현재 작업"}
          </p>
          <ol
            className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-2"
            aria-label="다시쓰기 6단계 흐름"
            data-s232e-second-write-stage-list
          >
            {SECOND_WRITE_FLOW_STEPS.map((item) => {
              const isCurrent = currentSecondWriteStep === item.position;
              const isComplete =
                (currentSecondWriteStep !== null && item.position < currentSecondWriteStep) ||
                stage === "confirm" ||
                stage === "saved-plan";
              return (
                <li
                  key={item.stage}
                  className={`min-w-0 rounded-[var(--v3-radius-control)] border px-2 py-2 text-center ${
                    isCurrent
                      ? "border-[var(--color-border-focus)] bg-[var(--color-background-brand)] text-[var(--color-text-inverse)]"
                      : isComplete
                        ? "border-[var(--color-border-stable)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)]"
                        : "border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-secondary)]"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                  data-s232e-second-write-progress-step={item.position}
                  data-s232e-second-write-stage={item.stage}
                >
                  <span className="v3-type-label-strong block tabular-nums" aria-hidden="true">
                    {item.position}/6
                  </span>
                  <span className="v3-type-caption ko-keep mt-1 block">{item.label}</span>
                </li>
              );
            })}
          </ol>
        </section>
      ) : (
        <>
          <CaptureProgressPill current={currentCaptureStep} total={4} mode={mode} />
          <ol
            className="sr-only grid-cols-2 gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-2 text-xs text-[color:var(--muted)] sm:not-sr-only sm:grid sm:grid-cols-4 sm:p-3"
            data-capture-stage-flow
            data-s224v-stage-indicator="compact"
            aria-label="Capture 4단계 흐름"
          >
            {currentCaptureFlowSteps.map((item, index) => {
              const step = index + 1;
              return (
                <li
                  key={item.label}
                  className={`flex min-h-12 items-center gap-2 rounded-[var(--radius-sm)] px-2 py-2 leading-tight sm:min-h-0 sm:px-3 ${
                    currentCaptureStep === step
                      ? "bg-[color:var(--brand-050)] text-[color:var(--foreground-strong)]"
                      : "bg-[color:var(--surface-soft)]"
                  }`}
                  aria-current={currentCaptureStep === step ? "step" : undefined}
                  data-capture-stage={step}
                >
                  <span
                    className="v3-type-label-strong inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] tabular-nums"
                    aria-hidden="true"
                  >
                    {String(step).padStart(2, "0")}
                  </span>
                  <span className="v3-type-caption ko-keep text-left">{item.label}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <section
        className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-3 sm:p-5"
        aria-labelledby="capture-stage-current-title"
        data-capture-stage-context
        data-capture-stage-current={currentCaptureStep}
        data-capture-controller-stage={stage}
      >
        <p className="v3-type-caption text-[var(--color-text-brand)]">
          지금 할 일 · {currentCaptureStageContext.eyebrow}
        </p>
        <h2
          id="capture-stage-current-title"
          ref={captureStageHeadingRef}
          tabIndex={-1}
          className="v3-type-section ko-keep mt-2 text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-border-focus)]"
        >
          {currentCaptureStageContext.now}
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3" data-capture-stage-explanation>
          <div>
            <dt className="v3-type-caption text-[var(--color-text-secondary)]">왜 필요한가</dt>
            <dd className="v3-type-label ko-keep mt-1 text-[var(--color-text-primary)]">{currentCaptureStageContext.why}</dd>
          </div>
          <div>
            <dt className="v3-type-caption text-[var(--color-text-secondary)]">다음 결과</dt>
            <dd className="v3-type-label ko-keep mt-1 text-[var(--color-text-primary)]">{currentCaptureStageContext.result}</dd>
          </div>
        </dl>
      </section>

      {submitting && !savedConfirmation ? (
        <section
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-5"
          data-capture-persistence-state="saving"
        >
          <p className="v3-type-label-strong text-[var(--color-text-secondary)]">저장 중</p>
          <h2 className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">현재 입력을 저장하고 있습니다.</h2>
          <p className="v3-type-body ko-keep mt-3 text-[var(--color-text-primary)]">
            입력은 이 화면의 작업 메모리에 남아 있으며, 저장 완료 영수증은 아직 확인되지 않았습니다.
          </p>
        </section>
      ) : null}

      <fieldset
        className="contents"
        disabled={submitting}
        data-capture-work-lock={submitting ? "locked" : "editable"}
      >
        {savedConfirmation ? (
          <SavedCaptureConfirmationPanel
          mode={mode}
          subject={form.subjectLabel}
          confirmation={savedConfirmation}
          onBack={() => {
            setSavedConfirmation(null);
            setStage(savedConfirmation.retryAction === "quick" ? "intake" : "confirm");
          }}
          onReset={() => {
            setSavedConfirmation(null);
            resetDraft();
          }}
          />
        ) : rewriteContext && mode === "second" ? (
          <>
          <RewriteContextPanel
            title={rewriteContext.sourceTitle}
            biggestGap={rewriteContext.biggestGap}
            rewriteInstruction={rewriteContext.rewriteInstruction}
            referenceSummary={rewriteContext.referenceSummary}
            myAnswerSummary={rewriteContext.myAnswerSummary}
          />
          <RewriteParagraphPanel form={form} update={update} />
          </>
        ) : secondWriteEnabled ? (
          <>
          <section className="rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-4">
            <div className="flex flex-wrap items-center gap-2 v3-type-label text-[var(--color-text-secondary)]">
              <span>과목: {form.subjectLabel}</span>
              <details className="quiet-disclosure inline-block" data-s224v-secondary-diagnostics>
                <summary className="inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-primary)] underline underline-offset-4">과목 바꾸기</summary>
                <div className="mt-2 min-w-64">
                  <SubjectSelect
                    mode={mode}
                    subjectLabel={config.subjectLabel}
                    subjects={config.subjects}
                    value={form.subjectLabel}
                    onChange={updateSubject}
                  />
                </div>
              </details>
            </div>
          </section>
          {stage === "second-issue-recall" ? (
            <SecondIssueRecallPanel
              subject={form.subjectLabel}
              issueRecall={form.issueRecall}
              onChange={(value) => update("issueRecall", value)}
              onNext={() => setStage("second-outline")}
            />
          ) : null}
          {stage === "second-outline" ? (
            <SecondOutlinePanel
              subject={form.subjectLabel}
              outlineDraft={form.outlineDraft}
              onChange={(value) => update("outlineDraft", value)}
              onNext={() => setStage("second-answer")}
            />
          ) : null}
          {stage === "second-answer" ? (
            <SecondAnswerPanel
              subject={form.subjectLabel}
              answer={form.userAnswer}
              onChange={(value) => {
                update("userAnswer", value);
                update("myAnswerSummary", firstLine(value, form.myAnswerSummary || "내 답안 요약"));
              }}
              onNext={() => { if (form.userAnswer.trim().length >= 8) { update("productionBeforeComparison", true); setStage("second-reference"); } }}
            />
          ) : null}
          {stage === "second-reference" ? (
            <SecondReferencePanel
              reference={form.correctAnswer}
              onChange={(value) => update("correctAnswer", value)}
              onNext={() => { update("referenceAnswerAddedAfterProduction", true); setStage("second-gap"); }}
            />
          ) : null}
          {stage === "second-gap" ? (
            <SecondGapPanel
              subject={form.subjectLabel}
              biggestGap={form.biggestGap}
              onChange={(value) => {
                update("biggestGap", value);
                update("missingIssue", value);
                update("userReasonText", value);
              }}
              onNext={() => setStage("second-rewrite")}
            />
          ) : null}
          {stage === "second-rewrite" ? (
            <SecondGapRewritePanel form={form} subject={form.subjectLabel} update={update} onBack={() => setStage("second-gap")} />
          ) : null}
          </>
        ) : (
          <>
          {mode === "first" || stage === "intake" ? (
          <IntakePanel
            form={form}
            mode={mode}
            config={config}
            extracting={extracting}
            extractError={extractError}
            extractionState={extractionState}
            uploadedPages={uploadedPages}
            onRemovePage={removePage}
            onMovePage={movePage}
            needsOcrConfirmation={needsOcrConfirmation}
            missingConfirmationFields={missingConfirmationFields.map((field) => field.label)}
            update={update}
            updateSubject={updateSubject}
            onImage={handleImageImport}
            onPdf={handlePdfImport}
            onGenerate={() => generateStructuredDraft()}
            onQuickSave={saveQuickCaptureFromIntake}
            canQuickSave={canQuickSaveCapture}
            saving={submitting}
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            pdfInputRef={pdfInputRef}
            textAreaRef={textAreaRef}
          />
          ) : null}

          {mode === "first" ? (
            <section className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4">
              <p className="text-xs font-medium text-[color:var(--muted)]">선택 연습</p>
              <h3 className="mt-1 text-base font-semibold text-[color:var(--foreground-strong)]">5개 선지를 O/X로 나눌 수 있습니다.</h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted-strong)]">입력 내용을 먼저 확인한 뒤 선택하면 됩니다.</p>
              {!canBridgeToFirstOx ? (
                <p className="mt-3 rounded-[var(--radius-md)] bg-[color:var(--surfaceQuiet)] px-3 py-2 text-sm text-[color:var(--muted-strong)]">선지 5개를 확실히 찾지 못했습니다. 직접 확인 후 O/X로 나눌 수 있습니다.</p>
              ) : null}
              <Button type="button" variant="outline" className="mt-4 w-full sm:w-auto" disabled={submitting || !canBridgeToFirstOx} onClick={() => { void saveCaptureAfterConfirmation("first-ox"); }}>
                O/X 연습으로 나누기
              </Button>
            </section>
          ) : null}

          {(mode === "first" ? stage !== "intake" : stage === "preview") ? (
            <ExtractionPreview
              form={form}
              mode={mode}
              uploadedPages={uploadedPages}
              needsOcrConfirmation={needsOcrConfirmation}
              missingConfirmationFields={missingConfirmationFields.map((field) => field.label)}
              extractError={extractError}
              onEdit={continueAfterExtractionReview}
              onRegenerate={() => generateStructuredDraft()}
              onRawOcrChange={(value) => {
                update("rawQuestionText", value);
                update("rawOcrText", value);
                update("hasManualCorrection", true);
                update("ocrConfirmedByLearner", true);
                update("lowConfidenceFlag", form.lowConfidenceFlag || hasLowConfidenceText(value));
              }}
            />
          ) : null}

          {stage === "confirm" ? (
            <ConfirmPanel form={form} mode={mode} config={config} update={update} updateSubject={updateSubject} />
          ) : null}
          {mode === "second" && stage === "second-issue-recall" ? (
            <SecondIssueRecallPanel
              subject={form.subjectLabel}
              issueRecall={form.issueRecall}
              onChange={(value) => update("issueRecall", value)}
              onNext={() => setStage("second-outline")}
            />
          ) : null}
          {mode === "second" && stage === "second-outline" ? (
            <SecondOutlinePanel
              subject={form.subjectLabel}
              outlineDraft={form.outlineDraft}
              onChange={(value) => update("outlineDraft", value)}
              onNext={() => setStage("second-answer")}
            />
          ) : null}
          {mode === "second" && stage === "second-answer" ? (
            <SecondAnswerPanel
              subject={form.subjectLabel}
              answer={form.userAnswer}
              onChange={(value) => {
                update("userAnswer", value);
                update("myAnswerSummary", firstLine(value, form.myAnswerSummary || "내 답안 요약"));
              }}
              onNext={() => { if (form.userAnswer.trim().length >= 8) { update("productionBeforeComparison", true); setStage("second-reference"); } }}
            />
          ) : null}
          {mode === "second" && stage === "second-reference" ? (
            <SecondReferencePanel reference={form.correctAnswer} onChange={(value) => update("correctAnswer", value)} onNext={() => { update("referenceAnswerAddedAfterProduction", true); setStage("second-gap"); }} />
          ) : null}
          {mode === "second" && stage === "second-gap" ? (
            <SecondGapPanel
              subject={form.subjectLabel}
              biggestGap={form.biggestGap}
              onChange={(value) => {
                update("biggestGap", value);
                update("missingIssue", value);
                update("userReasonText", value);
              }}
              onNext={() => setStage("second-rewrite")}
            />
          ) : null}
          {mode === "second" && stage === "second-rewrite" ? (
            <SecondGapRewritePanel form={form} subject={form.subjectLabel} update={update} onBack={() => setStage("second-gap")} />
          ) : null}
          </>
        )}
      {error ? (
        <p
          ref={formErrorRef}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          tabIndex={-1}
          className={mode === "second" ? "v3-type-compact ko-keep rounded-[var(--v3-radius-control)] border border-[var(--color-border-risk)] bg-[var(--color-background-risk)] px-4 py-3 text-[var(--color-text-risk)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]" : "text-sm text-[color:var(--status-red)]"}
          data-testid={mode === "second" ? "second-write-error" : "capture-form-error"}
        >
          {error}
        </p>
      ) : null}

      {!savedConfirmation && !hideGlobalFooterActions && currentCaptureStep !== 1 ? (
        <BottomPrimaryAction secondary={footerSecondary}>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          {rewriteContext && mode === "second" ? (
            <CaptureActionButton mode={mode} type="submit" disabled={submitting || !form.rewriteParagraph.trim()} className="w-full sm:w-auto">
              {submitting ? "저장 중" : "문단 다시쓰기 저장"}
            </CaptureActionButton>
          ) : stage === "preview" ? (
            <CaptureActionButton
              mode={mode}
              type="button"
              disabled={submitting}
              onClick={continueAfterExtractionReview}
              className="w-full sm:w-auto"
            >
              {mode === "second" ? "쟁점 회상부터 진행" : "확인하고 저장하기"}
            </CaptureActionButton>
          ) : stage === "intake" ? null : mode === "second" && stage === "second-rewrite" && !rewriteContext ? (
            <CaptureActionButton
              mode={mode}
              type="button"
              disabled={submitting}
              onClick={() => setStage("confirm")}
              className="w-full sm:w-auto"
              data-s232e-second-write-primary-action="6"
            >
              마지막 확인으로 이동
            </CaptureActionButton>
          ) : (
            <CaptureActionButton
              mode={mode}
              type="submit"
              disabled={submitting || (mode === "second" && stage !== "second-rewrite" && stage !== "confirm")}
              data-testid={mode === "second" && stage === "second-rewrite" && !rewriteContext ? "second-write-submit" : undefined}
              className="w-full sm:w-auto"
            >
              {submitting ? "저장 중" : "저장하고 오늘 계획에 반영"}
            </CaptureActionButton>
          )}
        </div>
        </BottomPrimaryAction>
      ) : null}
      </fieldset>
    </form>
  );
}

function CaptureProgressPill({ current, total, mode }: { current: number; total: number; mode: AppraisalMode }) {
  const safeTotal = Math.max(total, 1);
  const safeCurrent = Math.min(Math.max(current, 0), safeTotal);
  return (
    <div
      className="hidden max-w-full flex-wrap items-center justify-between gap-2 rounded-full border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs text-[color:var(--muted)] sm:flex sm:max-w-md"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeTotal}
      aria-valuenow={safeCurrent}
      aria-label="Capture 진행"
    >
      <span>{mode === "second" ? "2차 캡처" : "1차 캡처"}</span>
      <span className="tabular-nums">단계 {safeCurrent}/{safeTotal}</span>
    </div>
  );
}

type FieldProps = {
  form: DraftState;
  mode: AppraisalMode;
  update: <K extends keyof DraftState>(key: K, value: DraftState[K]) => void;
};

function SavedCaptureConfirmationPanel({
  mode,
  subject,
  confirmation,
  onBack,
  onReset,
}: {
  mode: AppraisalMode;
  subject: string;
  confirmation: SavedCaptureConfirmation;
  onBack: () => void;
  onReset: () => void;
}) {
  const encodedSubject = encodeURIComponent(normalizeSubjectForMode(subject, mode));
  const persistenceStatus = confirmation.status ?? (confirmation.persistence === "durable" ? "durable_saved" : "local_fallback_saved");
  const persistenceCopy = getCaptureSavePersistenceCopy(persistenceStatus);
  const saveFailed = persistenceStatus === "save_failed";
  const completedEvidence = confirmation.persistenceEvidence
    ? buildCaptureCompletedEvidence(confirmation.persistenceEvidence)
    : null;

  if (confirmation.conflictEvidence) {
    return (
      <section
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        data-testid="capture-save-confirmation"
        data-capture-dedupe-conflict
        data-capture-receipt-bound="false"
      >
        <FailureAwareState
          evidence={confirmation.conflictEvidence}
          action={{
            kind: "link",
            label: "학습 노트에서 기존 기록 확인",
            href: `/app/notes?mode=${mode}&subject=${encodedSubject}`,
          }}
          focusHeadingOnChange
          testId="capture-persistence-conflict-state"
        />
      </section>
    );
  }

  if (saveFailed) {
    return (
      <section
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        data-testid="capture-save-confirmation"
        data-capture-persistence-failure
        data-capture-receipt-bound="false"
      >
        <FailureAwareState
          evidence={CAPTURE_MEMORY_ONLY_SAVE_ERROR_EVIDENCE}
          action={{ kind: "button", label: "입력 확인 후 다시 저장하기", onAction: onBack }}
          focusHeadingOnChange
          testId="capture-persistence-error-state"
        />
      </section>
    );
  }

  if (persistenceStatus === "local_fallback_saved") {
    return (
      <section
        className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] p-5 sm:p-6"
        aria-live="polite"
        data-testid="capture-save-confirmation"
        data-capture-local-summary
        data-capture-receipt-bound="false"
      >
        <p className="v3-type-label-strong text-[var(--color-text-attention)]">계정 저장 미확인 · 브라우저 요약 보관</p>
        <h2 className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">
          약점과 다음 행동 요약만 이 브라우저에 임시 저장되었습니다.
        </h2>
        <p className="v3-type-body ko-keep mt-3 text-[var(--color-text-primary)]">
          원문 입력은 이 작성 화면에 그대로 남아 있습니다. 자동 동기화는 등록되지 않았으므로 입력을 확인한 뒤 계정 저장을 다시 시도해 주세요.
        </p>
        <dl className="mt-5 grid gap-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-4">
          <PreviewLine label="브라우저에 남긴 약점 요약" value={confirmation.biggestGap} legacy={mode === "first"} />
          <PreviewLine label="브라우저에 남긴 다음 행동" value={confirmation.nextAction} legacy={mode === "first"} />
          <PreviewLine label="저장 범위" value={persistenceCopy.statusLabel} legacy={mode === "first"} />
        </dl>
        <CaptureActionButton mode={mode} type="button" className="mt-5 w-full sm:w-auto" onClick={onBack}>
          입력 확인 후 계정 저장 다시 시도
        </CaptureActionButton>
      </section>
    );
  }

  if (!completedEvidence) {
    return (
      <section
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        data-testid="capture-save-confirmation"
        data-capture-persistence-failure
        data-capture-receipt-bound="false"
      >
        <FailureAwareState
          evidence={CAPTURE_MEMORY_ONLY_SAVE_ERROR_EVIDENCE}
          action={{ kind: "button", label: "입력 확인 후 다시 저장하기", onAction: onBack }}
          focusHeadingOnChange
          testId="capture-persistence-error-state"
        />
      </section>
    );
  }

  return (
    <section
      className={
        mode === "second"
          ? "rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-5 sm:p-6"
          : "rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5 sm:p-6"
      }
      data-testid="capture-save-confirmation"
      data-capture-plan-reflection-stage
      data-capture-persistence-status={persistenceStatus}
      data-capture-receipt-bound="true"
    >
      <FailureAwareState
        evidence={completedEvidence}
        action={{
          kind: "link",
          label: "오늘 할 일로 이동",
          href: `/app?mode=${mode}&subject=${encodedSubject}`,
        }}
        focusHeadingOnChange={false}
        testId="capture-persistence-completed-state"
      />

      <p className="v3-type-caption mt-5 text-[var(--color-text-brand)]">4. 오늘 계획 반영 · {persistenceCopy.eyebrow}</p>
      <h3 className="v3-type-section ko-keep mt-2 text-[var(--color-text-primary)]">이 저장 기록에서 이어갈 내용</h3>
      {mode === "second" ? (
        <div className="mt-5 space-y-3">
          <BiggestGap
            headingId="capture-saved-biggest-gap"
            gap={confirmation.biggestGap}
            evidence={`다음 행동 · ${confirmation.nextAction}`}
            type="MissingLink"
          />
          <div className="grid gap-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-4">
            <PreviewLine label="다음 행동 1개" value={confirmation.nextAction} />
            <PreviewLine label="학습 노트 저장 상태" value={persistenceCopy.statusLabel} />
            <PreviewLine label="오늘 계획에 반영" value={confirmation.todayPlanCandidate ?? confirmation.nextAction} />
            <PreviewLine label="복습에 남길 내용" value={confirmation.reviewQueueCandidate ?? confirmation.biggestGap} />
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-4">
          <PreviewLine label="가장 큰 약점 1개" value={confirmation.biggestGap} legacy />
          <PreviewLine label="다음 행동 1개" value={confirmation.nextAction} legacy />
          <PreviewLine label="학습 노트 저장 상태" value={persistenceCopy.statusLabel} legacy />
          <PreviewLine label="오늘 계획에 반영" value={confirmation.todayPlanCandidate ?? confirmation.nextAction} legacy />
          <PreviewLine label="복습에 남길 내용" value={confirmation.reviewQueueCandidate ?? confirmation.biggestGap} legacy />
        </div>
      )}
      <div className="mt-3">
        <CognitiveLearningActionCard
          unit={confirmation.learningAction}
          compact
          presentation={mode === "second" ? "v3" : "legacy"}
        />
      </div>
      <p className="mt-3 text-xs leading-5 text-[color:var(--muted)]">
        학습 노트에 저장되고 오늘 계획과 복습으로 이어집니다.
      </p>
      <p className="mt-3 text-xs leading-5 text-[color:var(--muted)]">{persistenceCopy.description}</p>

      {mode === "second" ? (
        <V3QuietDisclosure summary="다른 저장 위치 또는 새 기록" className="mt-5">
          <div className="grid gap-2 sm:grid-cols-3">
            <V3ActionLink href={`/app/notes?mode=${mode}&subject=${encodedSubject}`} tone="secondary" fullWidth>
              학습 노트에서 보기
            </V3ActionLink>
            <V3ActionLink href={`/app/review?mode=${mode}&subject=${encodedSubject}`} tone="secondary" fullWidth>
              복습으로 이어가기
            </V3ActionLink>
            <CaptureActionButton mode={mode} type="button" variant="ghost" className="w-full" onClick={onReset}>
              하나 더 올리기
            </CaptureActionButton>
          </div>
        </V3QuietDisclosure>
      ) : (
        <details className="quiet-disclosure mt-5 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
          <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-medium text-[color:var(--foreground-strong)]">
            다른 저장 위치 또는 새 기록
          </summary>
          <div className="grid gap-2 border-t border-[color:var(--border-subtle)] p-4 sm:grid-cols-3">
            <Link
              href={`/app/notes?mode=${mode}&subject=${encodedSubject}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--border-subtle)] px-4 py-2 text-sm font-medium text-[color:var(--foreground-strong)]"
            >
              학습 노트에서 보기
            </Link>
            <Link
              href={`/app/review?mode=${mode}&subject=${encodedSubject}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--border-subtle)] px-4 py-2 text-sm font-medium text-[color:var(--foreground-strong)]"
            >
              복습으로 이어가기
            </Link>
            <CaptureActionButton mode={mode} type="button" variant="ghost" className="w-full" onClick={onReset}>
              하나 더 올리기
            </CaptureActionButton>
          </div>
        </details>
      )}
    </section>
  );
}

function SubjectSelect({
  mode,
  subjectLabel,
  subjects,
  value,
  onChange,
}: {
  mode: AppraisalMode;
  subjectLabel: string;
  subjects: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (mode === "second") {
    return (
      <label className="block space-y-2">
        <span className="v3-type-label-strong text-[var(--color-text-primary)]">{subjectLabel}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="form-control min-h-11 rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)]"
        >
          {subjects.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }

  return (
    <div className="space-y-2">
      <span className="text-sm text-[color:var(--foreground-strong)]">{subjectLabel}</span>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label={subjectLabel}>
        {subjects.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`min-h-11 rounded-[var(--radius-md)] border px-3 py-2 text-left text-xs font-medium transition ${
              option === value
                ? "border-[color:var(--foreground-strong)] bg-[color:var(--foreground-strong)] text-white"
                : "border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] text-[color:var(--foreground-strong)] hover:bg-[color:var(--surface-soft)]"
            }`}
            aria-pressed={option === value}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function IntakePanel({
  form,
  mode,
  config,
  extracting,
  extractError,
  update,
  updateSubject,
  needsOcrConfirmation,
  missingConfirmationFields,
  extractionState,
  uploadedPages,
  onRemovePage,
  onMovePage,
  onImage,
  onPdf,
  onGenerate,
  onQuickSave,
  canQuickSave,
  saving,
  cameraInputRef,
  galleryInputRef,
  pdfInputRef,
  textAreaRef,
}: FieldProps & {
  config: ReturnType<typeof getModeConfig>;
  extracting: boolean;
  extractError: string;
  updateSubject: (value: string) => void;
  needsOcrConfirmation: boolean;
  missingConfirmationFields: string[];
  extractionState: ExtractionState;
  uploadedPages: UploadedPage[];
  onRemovePage: (index: number) => void;
  onMovePage: (index: number, direction: "up" | "down") => void;
  onImage: (fileList: FileList) => void;
  onPdf: (file: File) => void;
  onGenerate: () => void | Promise<void>;
  onQuickSave: () => void | Promise<void>;
  canQuickSave: boolean;
  saving: boolean;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  pdfInputRef: React.RefObject<HTMLInputElement | null>;
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const calculatorWorkflow = form.lowConfidenceFlag && !form.ocrConfirmedByLearner ? null : getCalculatorWorkflowForSubject(form.subjectLabel);
  const [selectedInputMethod, setSelectedInputMethod] = useState<SourceType | null>(() => {
    if (form.rawQuestionText.trim() || uploadedPages.length > 0 || form.sourceLabel.trim()) return form.sourceType;
    return null;
  });
  const hasActiveInput =
    Boolean(selectedInputMethod) ||
    form.rawQuestionText.trim().length > 0 ||
    uploadedPages.length > 0 ||
    extractionState !== "idle";
  const extractionStateLabel: Record<ExtractionState, string> = {
    idle: "입력 대기",
    uploading: "불러오는 중",
    extracting: "OCR 초안 생성 중",
    succeeded: "초안 준비됨",
    failed: "확인 필요",
    manual: "수동 입력 기록",
  };
  const trustEvidence: TrustProvenanceEvidence =
    extractionState === "uploading" ||
    extractionState === "extracting" ||
    extractionState === "failed"
      ? { kind: "unavailable", evidenceAvailable: false }
      : needsOcrConfirmation
        ? { kind: "review_requirement", reviewRequired: true }
        : form.ocrConfirmedByLearner || form.hasManualCorrection
          ? { kind: "learner_confirmation", learnerConfirmed: true }
          : { kind: "review_requirement", reviewRequired: true };

  return (
    <section
      className={
        mode === "second"
          ? "rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-4 sm:p-6"
          : "operating-surface p-3 sm:p-6"
      }
    >
      <div className="space-y-1 sm:space-y-2">
        <p className={mode === "second" ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-caption font-medium text-[color:var(--muted)]"}>1. 입력</p>
        <h2 className={mode === "second" ? "v3-type-section ko-keep text-[var(--color-text-primary)]" : "v3-type-section ko-keep text-[color:var(--foreground-strong)]"}>입력 방식 선택</h2>
        <p className={mode === "second" ? "v3-type-body ko-keep text-[var(--color-text-secondary)]" : "ko-keep text-body text-[color:var(--muted)]"}>사진, PDF, 텍스트 중 하나로 시작하세요.</p>
      </div>

      {mode === "second" ? (
        <div className="mt-4 space-y-3" data-capture-input-options data-s224v-secondary-input-options="quiet">
          <CaptureActionButton
            mode={mode}
            type="button"
            variant={hasActiveInput ? "outline" : undefined}
            className={`${hasActiveInput ? "" : "primary-action"} min-h-[var(--control-height)] w-full justify-center rounded-[var(--v3-radius-control)]`}
            onClick={() => {
              const sourceType = inferSourceTypeFromAction("camera");
              setSelectedInputMethod(sourceType);
              update("sourceType", sourceType);
              cameraInputRef.current?.click();
            }}
            data-s226-capture-primary-action
          >
            답안 사진 찍기
          </CaptureActionButton>
          <V3QuietDisclosure
            summary="다른 입력 방식"
            helper="이미 텍스트나 PDF가 있을 때만 선택하세요."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <CaptureActionButton
                mode={mode}
                type="button"
                variant="outline"
                className="min-h-[var(--control-height)] w-full"
                onClick={() => {
                  const sourceType = inferSourceTypeFromAction("text");
                  setSelectedInputMethod(sourceType);
                  update("sourceType", sourceType);
                  window.setTimeout(() => {
                    textAreaRef.current?.focus();
                    textAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }, 0);
                }}
              >
                텍스트 붙여넣기
              </CaptureActionButton>
              <CaptureActionButton
                mode={mode}
                type="button"
                variant="outline"
                className="min-h-[var(--control-height)] w-full"
                onClick={() => {
                  const sourceType = inferSourceTypeFromAction("pdf");
                  setSelectedInputMethod(sourceType);
                  update("sourceType", sourceType);
                  pdfInputRef.current?.click();
                }}
              >
                PDF 선택
              </CaptureActionButton>
            </div>
          </V3QuietDisclosure>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:mt-5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]" data-capture-input-options data-s224v-secondary-input-options="quiet">
          <CaptureActionButton
            mode={mode}
            type="button"
            className="primary-action min-h-16 w-full flex-col items-start justify-center gap-2 px-5 text-left sm:min-h-24"
            onClick={() => {
              const sourceType = inferSourceTypeFromAction("camera");
              setSelectedInputMethod(sourceType);
              update("sourceType", sourceType);
              cameraInputRef.current?.click();
            }}
            data-s226-capture-primary-action
          >
            사진 찍기
          </CaptureActionButton>
          <CaptureActionButton
            mode={mode}
            type="button"
            variant="outline"
            className="secondary-action min-h-16 w-full flex-col items-start justify-center gap-2 px-5 text-left sm:min-h-24"
            onClick={() => {
              const sourceType = inferSourceTypeFromAction("text");
              setSelectedInputMethod(sourceType);
              update("sourceType", sourceType);
              window.setTimeout(() => {
                textAreaRef.current?.focus();
                textAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 0);
            }}
          >
            텍스트 붙여넣기
          </CaptureActionButton>
          <CaptureActionButton
            mode={mode}
            type="button"
            variant="outline"
            className="min-h-16 w-full flex-col items-start justify-center gap-2 px-5 text-left text-[color:var(--muted)] sm:min-h-24"
            onClick={() => {
              const sourceType = inferSourceTypeFromAction("pdf");
              setSelectedInputMethod(sourceType);
              update("sourceType", sourceType);
              pdfInputRef.current?.click();
            }}
          >
            PDF 선택
          </CaptureActionButton>
        </div>
      )}
      <details
        className={mode === "second" ? "quiet-disclosure mt-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)]" : "quiet-disclosure mt-3 rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface)]"}
        data-s224v-secondary-diagnostics
        data-s232e-capture-optional-inputs
      >
        <summary className={mode === "second" ? "v3-type-label-strong flex min-h-11 cursor-pointer list-none items-center px-3 py-2 text-[var(--color-text-primary)]" : "cursor-pointer list-none px-3 py-2 text-xs font-medium text-[color:var(--ink-muted)]"}>촬영 품질과 앨범 업로드</summary>
        <div className={mode === "second" ? "border-t border-[var(--color-border-default)] px-3 py-3" : "border-t border-[color:var(--border-hairline)] px-3 py-3"}>
          <p className={mode === "second" ? "v3-type-caption ko-keep text-[var(--color-text-secondary)]" : "text-xs leading-5 text-[color:var(--muted)]"}>촬영하거나 업로드한 뒤 OCR 초안을 직접 확인합니다.</p>
          <CaptureActionButton mode={mode} type="button" variant="outline" className="mt-3 w-full sm:w-auto" onClick={() => { const sourceType = inferSourceTypeFromAction("gallery"); setSelectedInputMethod(sourceType); update("sourceType", sourceType); galleryInputRef.current?.click(); }}>
            앨범에서 선택
          </CaptureActionButton>
          <ul className={mode === "second" ? "v3-type-caption ko-keep mt-3 list-disc space-y-1 pl-5 text-[var(--color-text-secondary)]" : "mt-3 list-disc space-y-1 pl-5 text-xs text-[color:var(--muted)]"}>
            <li>한 페이지씩 정면으로 찍기</li>
            <li>흔들리면 다시 찍기</li>
          </ul>
        </div>
      </details>
      <div className="mt-3">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.currentTarget.files) onImage(event.currentTarget.files);
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => event.currentTarget.files && onImage(event.currentTarget.files)}
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) onPdf(file);
          }}
        />
      </div>
      {hasActiveInput ? (
        <>
      <div className="mt-4" data-trust-layer="capture-intake">
        {mode === "second" ? (
          <TrustEvidenceBar
            evidence={trustEvidence}
            sources={[V3_CAPTURE_TRUST_SOURCE_LABELS[form.sourceType]]}
            summary={CAPTURE_TRUST_LAYER_COPY}
            detail="OCR·가져온 텍스트는 저장 전 직접 수정할 수 있으며 정답 판정이나 결과 확정을 제공하지 않습니다."
            saveStatus="아직 계정 저장 영수증이 확인되지 않았습니다."
            showSaveStatus={false}
          />
        ) : (
          <LegacyTrustEvidenceBar
            source={LEGACY_CAPTURE_TRUST_SOURCE_LABELS[form.sourceType]}
            confidence={needsOcrConfirmation ? "확인 필요" : "안정"}
            learnerConfirmed={Boolean(form.ocrConfirmedByLearner || form.hasManualCorrection)}
            evidenceUnavailable={
              extractionState === "uploading" ||
              extractionState === "extracting" ||
              extractionState === "failed"
            }
            officialStatus="공식 채점 아님"
            editable
            note={CAPTURE_TRUST_LAYER_COPY}
          />
        )}
      </div>
      <details
        className={mode === "second"
          ? `quiet-disclosure mt-3 rounded-[var(--v3-radius-control)] border ${extractionState === "failed" ? "border-[var(--color-border-risk)] bg-[var(--color-background-risk)]" : "border-[var(--color-border-default)] bg-[var(--color-background-subtle)]"}`
          : `quiet-disclosure mt-3 rounded-[var(--radius-md)] border ${extractionState === "failed" ? "border-[color:var(--status-red)] bg-[color:var(--status-red-soft)]" : "border-[color:var(--border-hairline)] bg-[color:var(--surface)]"}`}
        open={extractionState === "failed"}
        data-capture-ocr-status-disclosure
        data-s224v-secondary-diagnostics
      >
        <summary className={mode === "second" ? "v3-type-label-strong flex min-h-11 cursor-pointer list-none items-center px-3 py-2 text-[var(--color-text-primary)]" : "cursor-pointer list-none px-3 py-2 text-xs font-medium text-[color:var(--muted)]"}>
          OCR 상태 · {extractionStateLabel[extractionState]}
        </summary>
        <p className={mode === "second" ? "v3-type-compact ko-keep border-t border-[var(--color-border-default)] px-3 py-3 text-[var(--color-text-primary)]" : "border-t border-[color:var(--border-hairline)] px-3 py-3 text-sm text-[color:var(--foreground-strong)]"}>
          {{
            idle: "사진을 찍거나 텍스트를 붙여넣어 시작하세요.",
            uploading: "사진을 불러오는 중입니다.",
            extracting: "OCR 초안을 만드는 중입니다.",
            succeeded: "초안이 준비되었습니다. 아래 입력을 확인해 주세요.",
            failed: "사진을 읽지 못했습니다. 텍스트로 계속할 수 있습니다.",
            manual: "파일을 기록했습니다. 내용은 직접 확인해 주세요.",
          }[extractionState]}
        </p>
      </details>
      <label className="mt-4 block space-y-2">
        <span className={mode === "second" ? "v3-type-label-strong text-[var(--color-text-primary)]" : "text-sm text-[color:var(--foreground-strong)]"}>
          오늘 공부한 내용 또는 내 답안
        </span>
        <Textarea
          ref={textAreaRef}
          value={form.rawQuestionText}
          onChange={(event) => {
            const value = event.target.value;
            update("rawQuestionText", value);
            update("rawOcrText", value);
            update("hasManualCorrection", true);
            update("ocrConfirmedByLearner", true);
            update("lowConfidenceFlag", form.lowConfidenceFlag || hasLowConfidenceText(value));
          }}
          onFocus={() => { if (uploadedPages.length === 0 && !form.sourceLabel) update("sourceType", inferSourceTypeFromAction("text")); }}
          placeholder={
            mode === "second"
              ? "권장: 사례 메모, 강의/교재 정리, 내 답안을 텍스트로 붙여넣으세요. 예: 강의/교재 정리: ... / 내 답안: ..."
              : "권장: 문제와 정답, 내가 고른 답을 텍스트로 붙여넣으세요. 예: 정답: 3 / 내 답: 2"
          }
          className={mode === "second" ? "min-h-56 rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] leading-7 transition-colors focus-visible:border-[var(--color-border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2" : "min-h-56 border-[color:var(--border-hairline)] bg-[color:var(--bg-surface)] text-[color:var(--foreground-strong)] leading-7 transition-colors focus-visible:border-[color:var(--accent-deep)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"}
        />
      </label>
      <p className={mode === "second" ? "v3-type-caption ko-keep mt-1 text-[var(--color-text-secondary)]" : "mt-1 text-xs leading-5 text-[color:var(--muted)]"}>학습 노트 원문은 비공개로 보관되며, 파생 학습 신호는 개인 추천 개선에만 사용됩니다.</p>
      <details className={mode === "second" ? "quiet-disclosure mt-4 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)]" : "quiet-disclosure mt-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]"} data-capture-subject-selector={mode} data-s224v-secondary-diagnostics>
        <summary className={mode === "second" ? "v3-type-label-strong flex min-h-11 cursor-pointer list-none items-center px-4 py-3 text-[var(--color-text-primary)]" : "cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]"}>과목 확인</summary>
        <div className={mode === "second" ? "border-t border-[var(--color-border-default)] px-4 py-3" : "border-t border-[color:var(--border-subtle)] px-4 py-3"}>
          <SubjectSelect
            mode={mode}
            subjectLabel={config.subjectLabel}
            subjects={config.subjects}
            value={form.subjectLabel}
            onChange={updateSubject}
          />
        </div>
      </details>
      <div
        className={
          mode === "second"
            ? "mt-4 rounded-[var(--v3-radius-panel)] border border-[var(--color-border-focus)] bg-[var(--color-background-brand-soft)] p-4"
            : "sticky bottom-3 z-30 mt-3 rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3 shadow-[var(--shadow-soft)] sm:bottom-5 sm:p-4"
        }
        data-testid="capture-save-action-bar"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={mode === "second" ? "v3-type-label-strong ko-keep text-[var(--color-text-primary)]" : "ko-keep text-sm font-medium text-[color:var(--foreground-strong)]"}>입력 내용을 먼저 확인합니다.</p>
            <p className={mode === "second" ? "v3-type-caption ko-keep mt-1 text-[var(--color-text-secondary)]" : "ko-keep mt-1 text-xs leading-5 text-[color:var(--muted)]"}>다음 단계에서 OCR/텍스트 초안을 보고 수정한 뒤 가장 큰 약점 1개를 정리합니다.</p>
            <button
              type="button"
              onClick={onQuickSave}
              disabled={!canQuickSave || saving || extracting}
              className={mode === "second" ? "v3-type-caption mt-2 min-h-11 text-[var(--color-text-secondary)] underline underline-offset-4 transition hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50" : "mt-2 text-xs font-medium text-[color:var(--muted)] underline underline-offset-4 transition hover:text-[color:var(--foreground-strong)] disabled:cursor-not-allowed disabled:opacity-50"}
            >
              {saving ? "저장 중" : "빠르게 저장"}
            </button>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <CaptureActionButton
              mode={mode}
              type="button"
              onClick={onGenerate}
              disabled={!canQuickSave || saving || extracting}
              className="primary-action min-h-12 w-full shrink-0 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="capture-save-primary"
              data-s224v-dominant-primary-action
              data-s225x-dominant-primary-after-input
            >
              {extracting ? "입력 내용 확인 중" : "입력 내용 확인하기"}
            </CaptureActionButton>
          </div>
        </div>
      </div>
      {form.sourceType === "pdf" ? <p className={mode === "second" ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-xs text-[color:var(--muted)]"}>선택한 PDF의 내용은 아래 텍스트 입력에서 직접 확인해 주세요.</p> : null}
      {uploadedPages.length > 0 ? (
        <div className={mode === "second" ? "border-y border-[var(--color-border-default)] py-4" : "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3"}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className={mode === "second" ? "v3-type-label-strong text-[var(--color-text-primary)]" : "text-xs font-medium text-[color:var(--muted)]"}>페이지 순서 확인</p>
              <p className={mode === "second" ? "v3-type-caption ko-keep mt-1 text-[var(--color-text-secondary)]" : "mt-1 text-xs leading-5 text-[color:var(--muted)]"}>여러 장 답안지는 순서가 중요합니다. 저장 전 페이지 순서와 OCR 내용을 확인해 주세요.</p>
            </div>
            <CaptureActionButton mode={mode} type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => cameraInputRef.current?.click()}>
              다시 찍기
            </CaptureActionButton>
          </div>
          <ul className={mode === "second" ? "mt-3 divide-y divide-[var(--color-border-default)]" : "mt-3 space-y-2"}>
            {uploadedPages.map((page, index) => (
              <li key={page.id} className={mode === "second" ? "py-3 first:pt-0 last:pb-0" : "rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] p-3 text-sm"}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className={mode === "second" ? "v3-type-compact break-words text-[var(--color-text-primary)]" : "break-words font-medium text-[color:var(--foreground-strong)]"}>{page.label}</span>
                  <div className={mode === "second" ? "flex flex-wrap gap-2" : "grid grid-cols-3 gap-2 sm:flex"}>
                    <CaptureActionButton mode={mode} type="button" variant="outline" className="min-h-11 px-3 text-xs" onClick={() => onMovePage(index, "up")} disabled={index === 0} aria-label={`${page.label} 위로 이동`}>위로</CaptureActionButton>
                    <CaptureActionButton mode={mode} type="button" variant="outline" className="min-h-11 px-3 text-xs" onClick={() => onMovePage(index, "down")} disabled={index === uploadedPages.length - 1} aria-label={`${page.label} 아래로 이동`}>아래로</CaptureActionButton>
                    <CaptureActionButton mode={mode} type="button" variant="outline" className="min-h-11 px-3 text-xs" onClick={() => onRemovePage(index)} aria-label={`${page.label} 제거`}>제거</CaptureActionButton>
                  </div>
                </div>
                <details className={mode === "second" ? "quiet-disclosure mt-2 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)]" : "quiet-disclosure mt-2 rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface)]"} data-s224v-secondary-diagnostics>
                  <summary className={mode === "second" ? "v3-type-label-strong flex min-h-11 cursor-pointer list-none items-center px-3 py-2 text-[var(--color-text-primary)]" : "cursor-pointer list-none px-3 py-2 text-xs text-[color:var(--muted)]"}>미리보기</summary>
                  <div className={mode === "second" ? "border-t border-[var(--color-border-default)] px-3 py-3" : "border-t border-[color:var(--border-hairline)] px-3 py-3"}>
                    {page.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local blob preview keeps mobile capture lightweight without uploading raw pages.
                      <img src={page.previewUrl} alt={`${page.label} 미리보기`} className={mode === "second" ? "max-h-64 w-full rounded-[var(--v3-radius-control)] object-contain" : "max-h-64 w-full rounded-[var(--radius-sm)] object-contain"} />
                    ) : null}
                    <p className={mode === "second" ? "v3-type-caption ko-keep mt-2 whitespace-pre-wrap break-words text-[var(--color-text-secondary)]" : "mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[color:var(--muted)]"}>{page.ocrText || "내용은 아래 OCR 편집창에서 확인해 주세요."}</p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {mode === "first" ? (
        <p className="mt-2 text-xs leading-6 text-[color:var(--muted)]">
          최소 입력: 정답, 내 답, 틀린 이유를 한 줄로 남겨도 됩니다. 예: 정답: 3 / 내 답: 2 / 이유: 선지 오독
        </p>
      ) : null}
      <details className={mode === "second" ? "quiet-disclosure mt-4 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)]" : "quiet-disclosure mt-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]"} data-s224v-secondary-diagnostics>
        <summary className={mode === "second" ? "v3-type-label-strong flex min-h-11 cursor-pointer list-none items-center px-4 py-3 text-[var(--color-text-primary)]" : "cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]"}>선택 정보</summary>
        <div className={mode === "second" ? "space-y-4 border-t border-[var(--color-border-default)] px-4 py-3" : "grid gap-3 border-t border-[color:var(--border-subtle)] px-4 py-3 sm:grid-cols-3"}>
        <label className="space-y-2">
          <span className={mode === "second" ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-xs text-[color:var(--muted)]"}>소요 시간</span>
          <input value={form.timeSpentSeconds} onChange={(event) => update("timeSpentSeconds", event.target.value)} className="form-control" placeholder="예: 45분" />
        </label>
        <label className="space-y-2">
          <span className={mode === "second" ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-xs text-[color:var(--muted)]"}>자신감</span>
          <select value={form.confidence} onChange={(event) => update("confidence", event.target.value as ConfidenceLevel)} className="form-control">
            {CONFIDENCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="space-y-2">
          <span className={mode === "second" ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-xs text-[color:var(--muted)]"}>메모</span>
          <input value={form.sourceLabel} onChange={(event) => update("sourceLabel", event.target.value)} className="form-control" placeholder="선택 입력" />
        </label>
        </div>
      </details>
      <details className={mode === "second" ? "quiet-disclosure mt-4 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)]" : "quiet-disclosure mt-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]"} data-s224v-secondary-diagnostics>
        <summary className={mode === "second" ? "v3-type-label-strong flex min-h-11 cursor-pointer list-none items-center px-4 py-3 text-[var(--color-text-primary)]" : "cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]"}>첨부 상태</summary>
        <div className={mode === "second" ? "v3-type-caption ko-keep border-t border-[var(--color-border-default)] px-4 py-3 text-[var(--color-text-secondary)]" : "border-t border-[color:var(--border-subtle)] px-4 py-3"}>
          {form.sourceLabel ? <p className={mode === "second" ? undefined : "text-sm text-[color:var(--muted)]"}>보관한 파일: {form.sourceLabel}</p> : null}
          {uploadedPages.length > 0 ? <p className={mode === "second" ? "mt-2" : "mt-2 text-sm text-[color:var(--muted)]"}>페이지 순서: {uploadedPages.map((page) => page.label).join(" / ")}</p> : null}
          {form.sourceType === "pdf" ? (
                <p className={mode === "second" ? "mt-2" : "mt-2 text-sm text-[color:var(--muted)]"}>현재 PDF는 내용 확인 후 직접 붙여넣을 수 있습니다.</p>
          ) : null}
        </div>
      </details>
      <p className={mode === "second" ? "v3-type-caption ko-keep mt-3 text-[var(--color-text-secondary)]" : "mt-3 text-caption leading-5 text-[color:var(--muted)]"}>오늘은 이 작업 하나만 먼저 합니다.</p>
      {form.lowConfidenceFlag ? (
        <p role="status" aria-live="polite" className={mode === "second" ? "v3-type-compact ko-keep mt-4 rounded-[var(--v3-radius-control)] border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] px-4 py-3 text-[var(--color-text-primary)]" : "mt-4 rounded-[var(--radius-md)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--foreground-strong)]"}>
          인식이 불안정합니다. 중요한 숫자/단어를 확인해 주세요. 확인 또는 수정 후 O/X·계산형 정리를 진행할 수 있습니다.
        </p>
      ) : null}
      {calculatorWorkflow ? (
        <details className={mode === "second" ? "quiet-disclosure mt-4 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)]" : "quiet-disclosure mt-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]"} data-s224v-secondary-diagnostics>
          <summary className={mode === "second" ? "v3-type-label-strong flex min-h-11 cursor-pointer list-none items-center px-4 py-3 text-[var(--color-text-primary)]" : "cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]"}>계산기 루틴 선택</summary>
          <div className={mode === "second" ? "flex flex-col gap-3 border-t border-[var(--color-border-default)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between" : "flex flex-col gap-3 border-t border-[color:var(--border-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"}>
            <p className={mode === "second" ? "v3-type-compact ko-keep text-[var(--color-text-primary)]" : "text-sm leading-6 text-[color:var(--foreground-strong)]"}>
              {calculatorWorkflow.subject} 계산형 기록이면 fx-9860GIII 손타건 루틴을 함께 확인할 수 있습니다.
            </p>
            {mode === "second" ? (
              <V3ActionLink href={getCalculatorWorkflowHref(calculatorWorkflow)} tone="secondary">
                루틴 보기
              </V3ActionLink>
            ) : (
              <Link
                href={getCalculatorWorkflowHref(calculatorWorkflow)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-4 py-2 text-sm font-medium text-[color:var(--foreground-strong)]"
              >
                루틴 보기
              </Link>
            )}
          </div>
        </details>
      ) : null}
      {needsOcrConfirmation ? (
        <p role="status" aria-live="polite" className={mode === "second" ? "v3-type-compact ko-keep mt-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] px-4 py-3 text-[var(--color-text-primary)]" : "mt-3 rounded-[var(--radius-md)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--foreground-strong)]"}>
          OCR 확인 필요{missingConfirmationFields.length > 0 ? `: ${missingConfirmationFields.join(", ")}` : ""}. 저장 전에 필수 항목을 확인해 주세요.
        </p>
      ) : null}
      {extractError ? <p role="alert" aria-live="assertive" aria-atomic="true" className={mode === "second" ? "v3-type-compact ko-keep mt-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-risk)] bg-[var(--color-background-risk)] px-4 py-3 text-[var(--color-text-risk)]" : "mt-3 text-sm leading-6 text-[color:var(--cue-risk)]"}>{extractError}</p> : null}
      {mode === "second" ? (
        <details className="quiet-disclosure mt-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)]" data-s224v-secondary-diagnostics>
          <summary className="v3-type-label-strong flex min-h-11 cursor-pointer list-none items-center px-3 py-2 text-[var(--color-text-primary)]">저장 전 캡처 품질 체크</summary>
          <ul className="v3-type-caption ko-keep list-disc space-y-1 border-t border-[var(--color-border-default)] px-3 py-3 pl-8 text-[var(--color-text-secondary)]">
            <li>글자가 선명한가</li>
            <li>페이지 순서가 맞는가</li>
            <li>문제번호가 보이는가</li>
            <li>계산/답/단위가 보이는가</li>
            <li>끝/이하여백 표시가 있는가</li>
          </ul>
        </details>
      ) : null}
        </>
      ) : null}
    </section>
  );
}

function ExtractionPreview({
  form,
  mode,
  uploadedPages,
  needsOcrConfirmation,
  missingConfirmationFields,
  extractError,
  onEdit,
  onRegenerate,
  onRawOcrChange,
}: {
  form: DraftState;
  mode: AppraisalMode;
  uploadedPages: UploadedPage[];
  needsOcrConfirmation: boolean;
  missingConfirmationFields: string[];
  extractError: string;
  onEdit: () => void;
  onRegenerate: () => void;
  onRawOcrChange: (value: string) => void;
}) {
  if (mode === "second") {
    const previewEvidence: TrustProvenanceEvidence = needsOcrConfirmation
      ? { kind: "review_requirement", reviewRequired: true }
      : form.ocrConfirmedByLearner || form.hasManualCorrection
        ? { kind: "learner_confirmation", learnerConfirmed: true }
        : { kind: "review_requirement", reviewRequired: true };

    return (
      <section
        className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-4 sm:p-5"
        data-v3-capture-extraction-preview
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="v3-type-caption text-[var(--color-text-secondary)]">2. 근거 확인</p>
            <h3 className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">추출된 원문을 먼저 확인합니다.</h3>
            <p className="v3-type-body ko-keep mt-2 text-[var(--color-text-secondary)]">틀린 글자만 바로잡으면 다음 단계에서 가장 큰 약점 하나를 정리합니다.</p>
          </div>
          <V3ActionButton type="button" tone="secondary" onClick={onRegenerate}>
            다시 만들기
          </V3ActionButton>
        </div>

        <div className="mt-4" data-trust-layer="capture-preview">
          <TrustEvidenceBar
            evidence={previewEvidence}
            sources={[V3_CAPTURE_TRUST_SOURCE_LABELS[form.sourceType]]}
            summary={CAPTURE_TRUST_LAYER_COPY}
            detail="추출 원문과 구조화 초안은 저장 전 직접 수정할 수 있으며 정답 판정이나 결과 확정을 제공하지 않습니다."
            saveStatus="아직 계정 저장 영수증이 확인되지 않았습니다."
            showSaveStatus={false}
          />
        </div>

        {needsOcrConfirmation ? (
          <p
            role="status"
            aria-live="polite"
            className="v3-type-compact ko-keep mt-4 rounded-[var(--v3-radius-control)] border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] px-4 py-3 text-[var(--color-text-primary)]"
          >
            확인이 필요한 초안입니다.
            {missingConfirmationFields.length > 0 ? ` 확인 필요: ${missingConfirmationFields.join(", ")}` : ""}
          </p>
        ) : null}
        {extractError ? (
          <p
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="v3-type-compact ko-keep mt-4 rounded-[var(--v3-radius-control)] border border-[var(--color-border-risk)] bg-[var(--color-background-risk)] px-4 py-3 text-[var(--color-text-risk)]"
          >
            {extractError}
          </p>
        ) : null}

        <div className="mt-5 border-y border-[var(--color-border-default)] py-4">
          <p className="v3-type-label-strong text-[var(--color-text-primary)]">OCR 결과 확인 · 편집 가능</p>
          {uploadedPages.length > 0 ? (
            <p className="v3-type-caption ko-keep mt-1 break-words text-[var(--color-text-secondary)]">페이지 라벨: {uploadedPages.map((page) => page.label).join(" / ")}</p>
          ) : null}
          <Textarea
            value={form.rawQuestionText}
            onChange={(event) => onRawOcrChange(event.target.value)}
            placeholder="OCR 결과를 확인하고 바로 수정하세요."
            className="mt-3 min-h-44 rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] leading-7 focus-visible:border-[var(--color-border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"
          />
          <p className="v3-type-caption ko-keep mt-2 text-[var(--color-text-secondary)]">수정 내용은 이 기기 초안에 자동 저장됩니다.</p>
        </div>

        <div className="mt-5 space-y-3">
          <BiggestGap
            gap={form.biggestGap || form.missingIssue || "가장 큰 약점 1개를 확인해 주세요."}
            evidence={`다음 행동 · ${form.rewriteInstruction || "확인 필요"}`}
            type="MissingLink"
          />
          <V3QuietDisclosure summary="추출된 세부 정보" helper="저장 전 직접 확인하고 수정할 수 있습니다.">
            <div className="divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
              <PreviewLine label="과목" value={form.subjectLabel} />
              <PreviewLine label="주제/사례 요약" value={form.caseSummary || "확인 필요"} />
              <PreviewLine label="확신/복습 시점" value={`${form.confidence} · ${form.nextReviewDate}`} />
              <PreviewLine label="누락 논점 후보" value={form.missingIssue} />
              <PreviewLine label="구조 약점" value={form.weakStructurePoint} />
              <PreviewLine label="페이지 라벨" value={form.sourceLabel || "없음"} />
            </div>
          </V3QuietDisclosure>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-caption text-[color:var(--muted)]">Step 2. 확인 · Step 3. 정리</p>
          <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">텍스트를 확인한 뒤 노트로 정리합니다</h3>
        </div>
        <div className="flex gap-2">
          <CaptureActionButton mode={mode} type="button" variant="outline" onClick={onRegenerate}>
            다시 만들기
          </CaptureActionButton>
          <CaptureActionButton mode={mode} type="button" variant="outline" onClick={onEdit}>
            필드 확인
          </CaptureActionButton>
        </div>
      </div>
      {needsOcrConfirmation ? (
        <p className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--foreground-strong)]">
          확인이 필요한 초안입니다.
          {missingConfirmationFields.length > 0 ? ` 확인 필요: ${missingConfirmationFields.join(", ")}` : ""}
        </p>
      ) : null}
      <div className="mt-5 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-4">
        <p className="text-xs font-medium text-[color:var(--muted)]">OCR 결과 확인 (편집 가능 · 자동 저장)</p>
        {uploadedPages.length > 0 ? (
          <p className="mt-1 text-xs text-[color:var(--muted)]">페이지 라벨: {uploadedPages.map((page) => page.label).join(" / ")}</p>
        ) : null}
        <Textarea
          value={form.rawQuestionText}
          onChange={(event) => onRawOcrChange(event.target.value)}
          placeholder="OCR 결과를 확인하고 바로 수정하세요."
          className="mt-3 min-h-44 border-[color:var(--border-hairline)] bg-[color:var(--bg-surface)] text-[color:var(--foreground-strong)] leading-7"
        />
        <p className="mt-2 text-xs text-[color:var(--muted)]">수정 내용은 이 기기 초안에 자동 저장됩니다.</p>
      </div>
      <div className="mt-5 grid gap-3">
        <PreviewLine label="과목" value={form.subjectLabel} legacy />
        <PreviewLine label="주제/사례 요약" value={form.problemTitle || form.caseSummary} legacy />
        <PreviewLine label="가장 큰 약점" value={form.userReasonText || "확인 필요"} legacy />
        <PreviewLine label="다음 행동" value={form.comparisonPoint || "확인 필요"} legacy />
        <PreviewLine label="확신/복습 시점" value={`${form.confidence} · ${form.nextReviewDate}`} legacy />
        <PreviewLine label="실수 원인 추정" value={form.userReasonPreset || form.userReasonText} legacy />
        <PreviewLine label="핵심 개념" value={form.keyConcepts} legacy />
        <PreviewLine label="유사/재시도 행동" value={form.comparisonPoint} legacy />
        <PreviewLine label="페이지 라벨" value={form.sourceLabel || "없음"} legacy />
      </div>
    </section>
  );
}

function ConfirmPanel({
  form,
  mode,
  config,
  update,
  updateSubject,
}: FieldProps & {
  config: ReturnType<typeof getModeConfig>;
  updateSubject: (value: string) => void;
}) {
  const captureSummary = buildCaptureNoteSummary({
    examMode: mode,
    subject: form.subjectLabel,
    sourceType: form.sourceType === "image" ? "photo" : form.sourceType,
    capturedTextStatus: form.hasManualCorrection || !form.extractionNeedsReview ? "user_confirmed" : "draft",
    oneBiggestGap: mode === "second" ? form.biggestGap || form.missingIssue : form.userReasonText || form.userReasonPreset,
    nextAction: mode === "second" ? form.rewriteInstruction : form.comparisonPoint,
    nextTaskType: mode === "second" ? "rewrite" : "O/X",
    confidence: form.confidence,
    timeSpentMinutes: parseTimeSpentMinutes(form.timeSpentSeconds),
    derivedSignals: ["capture_note", "review_queue_candidate", "today_plan_candidate"],
  });
  const captureCopy = buildCaptureNoteDisplayCopy(captureSummary);
  const cognitiveLearningPreview = buildCognitiveLearningActionUnit({
    mode,
    subjectLabel: captureSummary.subject,
    biggestGap: captureSummary.oneBiggestGap,
    nextAction: captureSummary.nextAction,
    nextTaskType: captureSummary.nextTaskType,
  });

  return (
    <section className={mode === "second" ? "rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-4 sm:p-5" : "rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 sm:p-5"}>
      <p className={mode === "second" ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-caption text-[color:var(--muted)]"}>Step 3. 저장하고 오늘 계획에 반영</p>
      <h3 className={mode === "second" ? "v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]" : "mt-1 text-title text-[color:var(--foreground-strong)]"}>AI가 이렇게 읽었습니다. 틀린 부분만 고쳐 주세요.</h3>
      <p className={mode === "second" ? "v3-type-body ko-keep mt-2 text-[var(--color-text-secondary)]" : "mt-2 text-sm leading-6 text-[color:var(--muted)]"}>이미 읽은 값은 다시 입력하지 않아도 됩니다. 부족한 항목이 있으면 그 항목만 정확히 알려드립니다.</p>
      {mode === "second" ? (
        <div className="mt-4 space-y-3" data-testid="capture-note-summary">
          <BiggestGap
            gap={captureCopy.gapLabel.replace("가장 큰 약점: ", "")}
            evidence={`다음 행동 · ${captureCopy.nextActionLabel.replace("다음 행동: ", "")}`}
            type="MissingLink"
          />
          <div className="divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)] py-1">
            <PreviewLine label="상태" value={`${captureSummary.capturedTextStatus === "draft" ? "OCR 초안" : "직접 확인됨"} · 아직 저장 전`} />
            <PreviewLine label="과목/입력" value={`${captureSummary.subject} · ${captureSummary.sourceType}`} />
            <PreviewLine label="오늘 할 일" value={captureCopy.todayPlanCta} />
            <PreviewLine label="복습 선택" value={captureCopy.retryOrRewriteCta} />
          </div>
        </div>
      ) : (
      <div className="mt-4 grid gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-4" data-testid="capture-note-summary">
        <PreviewLine label="상태" value={`${captureSummary.capturedTextStatus === "draft" ? "OCR 초안" : "직접 확인됨"} · 아직 저장 전`} legacy />
        <PreviewLine label="과목/입력" value={`${captureSummary.subject} · ${captureSummary.sourceType}`} legacy />
        <PreviewLine label="가장 큰 약점" value={captureCopy.gapLabel.replace("가장 큰 약점: ", "")} legacy />
        <PreviewLine label="다음 행동" value={captureCopy.nextActionLabel.replace("다음 행동: ", "")} legacy />
        <PreviewLine label="오늘 할 일" value={captureCopy.todayPlanCta} legacy />
        <PreviewLine label="복습 선택" value={captureCopy.retryOrRewriteCta} legacy />
      </div>
      )}
      <div className="mt-3">
        {mode === "second" ? (
          <details className="quiet-disclosure rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-4" data-s224v-secondary-diagnostics>
            <summary className="v3-type-label-strong inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-primary)]">복습·오늘 계획 단서 보기</summary>
            <dl className="mt-3 divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
              <div className="py-3"><dt className="v3-type-caption text-[var(--color-text-secondary)]">인출 확인</dt><dd className="v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)]">{cognitiveLearningPreview.retrievalCheck.prompt}</dd></div>
              <div className="py-3"><dt className="v3-type-caption text-[var(--color-text-secondary)]">내일 복습</dt><dd className="v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)]">{cognitiveLearningPreview.continuation.reviewQueueCandidate}</dd></div>
            </dl>
          </details>
        ) : (
          <CognitiveLearningActionCard
            unit={cognitiveLearningPreview}
            compact
            presentation="legacy"
          />
        )}
      </div>
      <div className={mode === "second" ? "mt-5 space-y-4 border-y border-[var(--color-border-default)] py-4" : "mt-5 grid gap-4 lg:grid-cols-2"}>
        <SubjectSelect mode={mode} subjectLabel={config.subjectLabel} subjects={config.subjects} value={form.subjectLabel} onChange={updateSubject} />
        <label className="space-y-2">
          <span className={mode === "second" ? "v3-type-label-strong text-[var(--color-text-primary)]" : "text-sm text-[color:var(--foreground-strong)]"}>{mode === "second" ? "작업 단계" : "회차 / 번호"}</span>
          {mode === "second" ? (
            <select
              value={form.problemIdentifier}
              onChange={(event) => update("problemIdentifier", event.target.value)}
              className="form-control"
            >
              {SECOND_TASK_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={form.problemIdentifier}
              onChange={(event) => update("problemIdentifier", event.target.value)}
              className="form-control"
              placeholder="예: 2024 기출 / 12번"
            />
          )}
        </label>
      </div>

      {mode === "first" ? <FirstConfirmFields form={form} mode={mode} update={update} /> : <SecondConfirmFields form={form} mode={mode} update={update} />}

      <div className={mode === "second" ? "mt-5 space-y-4 border-y border-[var(--color-border-default)] py-4" : "mt-5 grid gap-4 lg:grid-cols-2"}>
        {mode === "second" ? (
          <label className="space-y-2">
            <span className="v3-type-label-strong text-[var(--color-text-primary)]">분류</span>
            <select
              value={form.userReasonPreset}
              onChange={(event) => update("userReasonPreset", event.target.value)}
              className="form-control"
            >
              <option value="">선택 안 함</option>
              {MISTAKE_REASON_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="space-y-2">
          <span className={mode === "second" ? "v3-type-label-strong text-[var(--color-text-primary)]" : "text-sm text-[color:var(--foreground-strong)]"}>확신 정도</span>
          <select
            value={form.confidence}
            onChange={(event) => update("confidence", event.target.value as ConfidenceLevel)}
            className="form-control"
          >
            {CONFIDENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className={mode === "second" ? "v3-type-label-strong text-[var(--color-text-primary)]" : "text-sm text-[color:var(--foreground-strong)]"}>다음 복습 시점</span>
          <input
            type="date"
            value={form.nextReviewDate}
            onChange={(event) => update("nextReviewDate", event.target.value)}
            className="form-control"
          />
        </label>
      </div>

      <details className={mode === "second" ? "quiet-disclosure mt-5 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-4" : "quiet-disclosure mt-5 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-4"} data-s224v-secondary-diagnostics>
        <summary className={mode === "second" ? "v3-type-label-strong inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-primary)]" : "cursor-pointer text-sm font-medium text-[color:var(--foreground-strong)]"}>저장될 원문 보기</summary>
        <Textarea
          value={form.rawQuestionText}
          onChange={(event) => update("rawQuestionText", event.target.value)}
          className={mode === "second" ? "mt-4 min-h-36 rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] leading-7" : "mt-4 min-h-36 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"}
        />
      </details>
    </section>
  );
}

function FirstConfirmFields(props: FieldProps) {
  const { form, update } = props;
  const subjectTemplate = getFirstSubjectTemplate(form.subjectLabel);
  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">문제 제목</span>
          <input
            value={form.problemTitle}
            onChange={(event) => update("problemTitle", event.target.value)}
            className="form-control"
            placeholder="예: 민법 총칙 12번"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">출처/세트 (선택)</span>
          <input
            value={form.sourceLabel}
            onChange={(event) => update("sourceLabel", event.target.value)}
            className="form-control"
            placeholder="예: 기출, 모의, 학습 노트"
          />
        </label>
      </div>
      <section className="rounded-[var(--radius-md)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] px-4 py-3">
        <p className="text-sm font-medium text-[color:var(--foreground-strong)]">이 과목은 먼저 이 기준으로 확인합니다.</p>
        <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
          {subjectTemplate.checkpoints.join(" · ")}
        </p>
        <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">해설 전에 이 기준 중 하나를 떠올립니다.</p>
        <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{subjectTemplate.fixedCondition}</p>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">정답 <span className="text-xs text-[color:var(--muted)]">(O/X 저장 때 필요)</span></span>
          <input
            value={form.correctAnswer}
            onChange={(event) => update("correctAnswer", event.target.value)}
            className="form-control"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">내가 고른 답</span>
          <input
            value={form.userAnswer}
            onChange={(event) => update("userAnswer", event.target.value)}
            className="form-control"
          />
        </label>
      </div>
      <label className="space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">실수 원인 분류 (1차)</span>
        <span className="text-xs text-[color:var(--muted)]">이 선택이 다시 볼 목록을 만드는 기준이 됩니다.</span>
        <select
          value={form.userReasonPreset}
          onChange={(event) => update("userReasonPreset", event.target.value)}
          className="form-control"
        >
          <option value="">필수 선택</option>
          {FIRST_STAGE_ERROR_REASON_OPTIONS.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">회상 한 문장 (해설 전)</span>
        <Textarea
          value={form.comparisonPoint}
          onChange={(event) => update("comparisonPoint", event.target.value)}
          className="min-h-32 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
          placeholder={subjectTemplate.retrievalHint}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">왜 틀렸는지</span>
        <Textarea
          value={form.userReasonText}
          onChange={(event) => update("userReasonText", event.target.value)}
          className="min-h-32 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
        />
      </label>
    </div>
  );
}

function SecondConfirmFields(props: FieldProps) {
  const { form, update } = props;
  return (
    <div className="mt-5 space-y-4 border-y border-[var(--color-border-default)] py-4">
      <label className="block space-y-2">
        <span className="v3-type-label-strong text-[var(--color-text-primary)]">보강할 논점 1개</span>
        <Textarea
          value={form.userReasonText}
          onChange={(event) => {
            update("userReasonText", event.target.value);
            update("missingIssue", event.target.value);
          }}
          className="min-h-32 rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] leading-7"
        />
      </label>
      <div className="space-y-4">
        <label className="space-y-2">
          <span className="v3-type-label-strong text-[var(--color-text-primary)]">내 답안 요약</span>
          <input
            value={form.myAnswerSummary}
            onChange={(event) => update("myAnswerSummary", event.target.value)}
            className="form-control"
          />
        </label>
        <label className="space-y-2">
          <span className="v3-type-label-strong text-[var(--color-text-primary)]">rewrite 지시</span>
          <input
            value={form.rewriteInstruction}
            onChange={(event) => update("rewriteInstruction", event.target.value)}
            className="form-control"
          />
        </label>
      </div>
    </div>
  );
}

function SecondIssueRecallPanel({
  subject,
  issueRecall,
  onChange,
  onNext,
}: {
  subject: string;
  issueRecall: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  const template = getSecondSubjectTemplate(subject);
  return (
    <section
      className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-focus)] bg-[var(--color-background-brand-soft)] p-4 sm:p-5"
      aria-labelledby="second-write-step-1-title"
      data-s232e-second-write-panel="1"
    >
      <p className="v3-type-caption text-[var(--color-text-brand)]" data-controller-label="Step 1. 쟁점 회상">다시쓰기 · 1/6 · 쟁점 회상</p>
      <h3 id="second-write-step-1-title" className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">강의/교재 정리 보기 전, 쟁점 1개만 적으세요.</h3>
      <details className="quiet-disclosure mt-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-3" data-s224v-secondary-diagnostics><summary className="v3-type-caption inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-secondary)]">왜 이 순서인가요?</summary><p className="v3-type-label ko-keep mt-2 text-[var(--color-text-secondary)]">완벽히 쓰지 말고, 지금 떠오르는 문장만 적으세요. 이 과목은 먼저 이 구조로 답안을 잡습니다. {template.structure}</p></details>
      <label className="mt-4 block space-y-2">
        <span className="v3-type-label text-[var(--color-text-primary)]">쟁점 회상</span>
        <Textarea
          value={issueRecall}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-44 rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] leading-7"
          placeholder={template.issueRecallPlaceholder}
        />
      </label>
      <V3ActionButton type="button" className="mt-4" disabled={issueRecall.trim().length < 8} onClick={onNext} data-s232e-second-write-primary-action="1">
        다음: 목차 작성
      </V3ActionButton>
    </section>
  );
}

function SecondOutlinePanel({
  subject,
  outlineDraft,
  onChange,
  onNext,
}: {
  subject: string;
  outlineDraft: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  const template = getSecondSubjectTemplate(subject);
  return (
    <section
      className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-focus)] bg-[var(--color-background-brand-soft)] p-4 sm:p-5"
      aria-labelledby="second-write-step-2-title"
      data-s232e-second-write-panel="2"
    >
      <p className="v3-type-caption text-[var(--color-text-brand)]" data-controller-label="Step 2. 목차 작성">다시쓰기 · 2/6 · 목차 정리</p>
      <h3 id="second-write-step-2-title" className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">전체 답안보다 목차 3줄이 먼저입니다.</h3>
      <details className="quiet-disclosure mt-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-3" data-s224v-secondary-diagnostics><summary className="v3-type-caption inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-secondary)]">왜 이 순서인가요?</summary><p className="v3-type-label ko-keep mt-2 text-[var(--color-text-secondary)]">강의/교재 정리를 보기 전에 이 체크포인트 중 3개를 떠올립니다: {template.checklist.slice(0, 3).join(", ")}</p></details>
      <label className="mt-4 block space-y-2">
        <span className="v3-type-label text-[var(--color-text-primary)]">목차 초안</span>
        <Textarea
          value={outlineDraft}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-44 rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] leading-7"
          placeholder={template.outlinePlaceholder}
        />
      </label>
      <V3ActionButton type="button" className="mt-4" disabled={outlineDraft.trim().length < 8} onClick={onNext} data-s232e-second-write-primary-action="2">
        다음: 내 답안 작성
      </V3ActionButton>
    </section>
  );
}

function SecondAnswerPanel({
  subject,
  answer,
  onChange,
  onNext,
}: {
  subject: string;
  answer: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  const templates: Record<string, string> = {
    감정평가실무: "문제 요구:\n계산 근거:\n결론:",
    감정평가이론: "정의:\n논거:\n사례 적용:\n결론:",
    "감정평가 및 보상법규": "법적 성질:\n처분성/권리구제:\n요건:\n조문/법리:\n사안 포섭:\n사안 해결:",
  };
  return (
    <section
      className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-4 sm:p-5"
      aria-labelledby="second-write-step-3-title"
      data-s232e-second-write-panel="3"
    >
      <p className="v3-type-caption text-[var(--color-text-brand)]" data-controller-label="Step 3. 내 답안 작성">다시쓰기 · 3/6 · 내 답안 작성</p>
      <h3 id="second-write-step-3-title" className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">비교는 작성 이후에 합니다.</h3>
      <details className="quiet-disclosure mt-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-3" data-s224v-secondary-diagnostics><summary className="v3-type-caption inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-secondary)]">왜 이 순서인가요?</summary><p className="v3-type-label ko-keep mt-2 text-[var(--color-text-secondary)]">완벽히 쓰지 말고, 지금 떠오르는 문장만 적으세요.</p></details>
      <label className="mt-4 block space-y-2">
        <span className="v3-type-label text-[var(--color-text-primary)]">내 답안</span>
        <Textarea
          value={answer}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-56 rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] leading-7"
          placeholder={templates[subject] ?? "핵심 문장 1개:\n근거:\n결론:"}
        />
      </label>
      <V3ActionButton type="button" className="mt-4" disabled={answer.trim().length < 8} onClick={onNext} data-s232e-second-write-primary-action="3">
        다음: 강의/교재 정리 입력
      </V3ActionButton>
    </section>
  );
}

function SecondReferencePanel({
  reference,
  onChange,
  onNext,
}: {
  reference: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <section
      className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-4 sm:p-5"
      aria-labelledby="second-write-step-4-title"
      data-s232e-second-write-panel="4"
    >
      <p className="v3-type-caption text-[var(--color-text-brand)]" data-controller-label="Step 4. 강의/교재 정리 입력">다시쓰기 · 4/6 · 참고 정리 비교</p>
      <h3 id="second-write-step-4-title" className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">작성한 뒤에만 강의/교재 정리를 봅니다.</h3>
      <details className="quiet-disclosure mt-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-3" data-s224v-secondary-diagnostics><summary className="v3-type-caption inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-secondary)]">왜 이 순서인가요?</summary><p className="v3-type-label ko-keep mt-2 text-[var(--color-text-secondary)]">비교는 작성 이후에 합니다.</p></details>
      <label className="mt-4 block space-y-2">
        <span className="v3-type-label text-[var(--color-text-primary)]">강의/교재 정리 요약</span>
        <Textarea
          value={reference}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-56 rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] leading-7"
        />
      </label>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <V3ActionButton type="button" disabled={reference.trim().length < 4} onClick={onNext} data-s232e-second-write-primary-action="4">
          다음: 가장 큰 약점 1개
        </V3ActionButton>
        <V3ActionButton type="button" tone="quiet" onClick={onNext} data-s232e-second-write-secondary-action="defer-reference">
          강의/교재 정리는 나중에 확인
        </V3ActionButton>
      </div>
    </section>
  );
}

function SecondGapPanel({
  subject,
  biggestGap,
  onChange,
  onNext,
}: {
  subject: string;
  biggestGap: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  const template = getSecondSubjectTemplate(subject);
  return (
    <section
      className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] p-4 sm:p-5"
      aria-labelledby="second-write-step-5-title"
      data-s232e-second-write-panel="5"
    >
      <p className="v3-type-caption text-[var(--color-text-brand)]" data-controller-label="Step 5. 가장 큰 약점 1개">다시쓰기 · 5/6 · 가장 큰 약점</p>
      <h3 id="second-write-step-5-title" className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">오늘은 가장 큰 약점 1개만 고칩니다.</h3>
      <details className="quiet-disclosure mt-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-3" data-s224v-secondary-diagnostics><summary className="v3-type-caption inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-secondary)]">왜 이 순서인가요?</summary><p className="v3-type-label ko-keep mt-2 text-[var(--color-text-secondary)]">{template.biggestGapGuidance}</p></details>
      <div className="mt-4">
        <BiggestGap
          gap={biggestGap.trim() || template.commonGaps[0]}
          evidence="비교 결과에서 다음 문단을 바꿀 약점 하나만 남깁니다."
          type="MissingLink"
          density="Compact"
        />
      </div>
      <label className="mt-4 block space-y-2">
        <span className="v3-type-label text-[var(--color-text-primary)]">보강할 논점 1개</span>
        <Textarea
          value={biggestGap}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-32 rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] leading-7"
          placeholder={template.commonGaps[0]}
        />
      </label>
      <V3ActionButton type="button" className="mt-4" disabled={biggestGap.trim().length < 4} onClick={onNext} data-s232e-second-write-primary-action="5">
        다음: 문단 다시쓰기
      </V3ActionButton>
    </section>
  );
}

function SecondGapRewritePanel({
  form,
  subject,
  update,
  onBack,
}: {
  form: DraftState;
  subject: string;
  update: <K extends keyof DraftState>(key: K, value: DraftState[K]) => void;
  onBack: () => void;
}) {
  const template = getSecondSubjectTemplate(subject);
  return (
    <section
      className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] p-4 sm:p-5"
      aria-labelledby="second-write-step-6-title"
      data-s232e-second-write-panel="6"
    >
      <p className="v3-type-caption text-[var(--color-text-brand)]" data-controller-label="Step 6. 문단 다시쓰기">다시쓰기 · 6/6 · 문단 다시쓰기</p>
      <h3 id="second-write-step-6-title" className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">한 문단만 다시 씁니다.</h3>
      <details className="quiet-disclosure mt-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-3" data-s224v-secondary-diagnostics><summary className="v3-type-caption inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-secondary)]">왜 이 순서인가요?</summary><p className="v3-type-label ko-keep mt-2 text-[var(--color-text-secondary)]">{template.rewriteGuidance}</p></details>
      <div className="mt-4 space-y-4">
        <details className="quiet-disclosure rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-3" data-s224v-secondary-diagnostics>
          <summary className="v3-type-caption inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-secondary)]">처음 쓴 답안 보기</summary>
          <p className="v3-type-label mt-2 whitespace-pre-wrap text-[var(--color-text-primary)]">{form.userAnswer || "아직 작성된 답안이 없습니다."}</p>
        </details>
        <label className="block space-y-2">
          <span className="v3-type-label text-[var(--color-text-primary)]">다시 쓴 문단</span>
          <Textarea
            value={form.rewriteParagraph}
            onChange={(event) => {
              update("rewriteParagraph", event.target.value);
            }}
            data-testid="second-write-final-textarea"
            className="min-h-56 rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] leading-7"
            placeholder="누락 논점 1개를 반영해 문단을 다시 작성하세요."
          />
        </label>
      </div>
      <details className="quiet-disclosure mt-4 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-3" data-s224v-secondary-diagnostics>
        <summary className="v3-type-caption inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-secondary)]">세부 입력 보기 (선택)</summary>
        <div className="mt-3 space-y-3">
          <label className="block space-y-2">
            <span className="v3-type-label text-[var(--color-text-primary)]">보강할 논점 1개</span>
            <Textarea
              value={form.userReasonText}
              onChange={(event) => {
                update("userReasonText", event.target.value);
                update("missingIssue", event.target.value);
              }}
              className="min-h-28 rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] leading-7"
            />
          </label>
          <label className="space-y-2">
            <span className="v3-type-label text-[var(--color-text-primary)]">rewrite 지시</span>
            <input
              value={form.rewriteInstruction}
              onChange={(event) => update("rewriteInstruction", event.target.value)}
              className="form-control"
            />
          </label>
          <button type="button" onClick={onBack} className="text-xs text-[color:var(--muted)] underline-offset-2 hover:underline">
            이전 단계로 돌아가기
          </button>
        </div>
      </details>
    </section>
  );
}

function RewriteContextPanel({
  title,
  biggestGap,
  rewriteInstruction,
  referenceSummary,
  myAnswerSummary,
}: {
  title: string;
  biggestGap: string;
  rewriteInstruction: string;
  referenceSummary: string;
  myAnswerSummary: string;
}) {
  return (
    <section className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] p-4 sm:p-5">
      <p className="v3-type-caption text-[var(--color-text-attention)]">문단 다시쓰기 컨텍스트</p>
      <h3 className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">{title}</h3>
      <div className="mt-4 space-y-3">
        <BiggestGap gap={biggestGap} evidence={`다시쓰기 지시 · ${rewriteInstruction}`} type="MissingLink" />
      </div>
      <V3QuietDisclosure summary="비교 요약 펼쳐서 보기" className="mt-3">
        <div className="grid gap-3 lg:grid-cols-2">
          <PreviewLine label="강의/교재 정리 요약" value={referenceSummary} />
          <PreviewLine label="내 답안 요약" value={myAnswerSummary} />
        </div>
      </V3QuietDisclosure>
      <p className="v3-type-body ko-keep mt-4 text-[var(--color-text-secondary)]">
        전체 답안이 아니라 한 문단만 다시 씁니다. 위 약점 1개만 반영해 짧고 정확하게 작성하세요.
      </p>
    </section>
  );
}

function RewriteParagraphPanel({
  form,
  update,
}: {
  form: DraftState;
  update: <K extends keyof DraftState>(key: K, value: DraftState[K]) => void;
}) {
  return (
    <section className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-4 sm:p-5">
      <p className="v3-type-caption text-[var(--color-text-secondary)]">실행 입력</p>
      <h3 className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">보강 문단을 바로 작성합니다</h3>
      <p className="v3-type-body ko-keep mt-2 text-[var(--color-text-secondary)]">하나의 약점만 보강한 문단으로 저장하면 다음 복습 일정이 자동 연결됩니다.</p>
      <label className="mt-4 block space-y-2">
        <span className="v3-type-label text-[var(--color-text-primary)]">다시 쓴 문단</span>
        <Textarea
          value={form.rewriteParagraph}
          onChange={(event) => {
            update("rewriteParagraph", event.target.value);
          }}
          className="min-h-64 rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] leading-7"
          placeholder="누락 논점 1개를 반영해 문단을 다시 작성하세요."
        />
      </label>
      <label className="mt-4 block space-y-2">
        <span className="v3-type-label text-[var(--color-text-primary)]">보강할 논점 1개</span>
        <input
          value={form.userReasonText}
          onChange={(event) => {
            update("userReasonText", event.target.value);
            update("missingIssue", event.target.value);
          }}
          className="form-control"
        />
      </label>
    </section>
  );
}

function PreviewLine({ label, value, legacy = false }: { label: string; value?: string; legacy?: boolean }) {
  return (
    <div className={legacy ? "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3" : "border-b border-[var(--color-border-default)] py-3 last:border-b-0"}>
      <p className={legacy ? "text-caption text-[color:var(--muted)]" : "v3-type-caption text-[var(--color-text-secondary)]"}>{label}</p>
      <p className={legacy ? "mt-1 text-sm leading-6 text-[color:var(--foreground-strong)]" : "v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)]"}>{value?.trim() ? value : "확인 필요"}</p>
    </div>
  );
}
