"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BottomPrimaryAction, LearnerProgressBar } from "@/components/learner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getDefaultSubject,
  getModeConfig,
  getModeLabel,
  normalizeSubjectForMode,
  type AppraisalMode,
} from "@/lib/review-os/appraisal";
import { clearReviewOsDraft, loadReviewOsDraft, saveReviewOsDraft } from "@/lib/review-os/browser-storage";
import { getCalculatorWorkflowForSubject } from "@/lib/review-os/calculator-workflow";
import { applyDraftToConfirmedSubject, type ExtractionDraft, type ExtractionPipelineResult } from "@/lib/review-os/extraction";
import { resolveReviewSchedule } from "@/lib/review-os/scheduling";
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

type CaptureFormProps = {
  userId: string;
  mode: AppraisalMode;
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
};
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

function getMissingConfirmationFields(form: DraftState, mode: AppraisalMode) {
  if (mode === "first") {
    return [
      { key: "subject", label: "과목", ok: hasValue(form.subjectLabel) },
      { key: "title", label: "문제 제목/출처", ok: hasValue(form.problemTitle) || hasValue(form.problemIdentifier) || hasValue(form.sourceLabel) },
      { key: "correct", label: "정답", ok: hasValue(form.correctAnswer) },
      { key: "user", label: "내 답", ok: hasValue(form.userAnswer) },
      { key: "reason", label: "오답 원인", ok: hasValue(form.userReasonText) || hasValue(form.userReasonPreset) },
      { key: "retrieval", label: "회상 한 문장", ok: hasValue(form.comparisonPoint) },
    ].filter((field) => !field.ok);
  }

  return [
    { key: "subject", label: "과목", ok: hasValue(form.subjectLabel) },
    { key: "recall", label: "쟁점 회상/목차", ok: hasValue(form.issueRecall) || hasValue(form.outlineDraft) },
    { key: "reference", label: "기준 답안", ok: hasValue(form.correctAnswer) },
    { key: "user", label: "내 답안", ok: hasValue(form.userAnswer) },
    { key: "gap", label: "가장 큰 간극 1개", ok: hasValue(form.biggestGap) || hasValue(form.missingIssue) || hasValue(form.userReasonText) },
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

function getCaptureStep(stage: string) {
  if (stage === "intake") return 1;
  if (stage === "preview") return 2;
  if (stage === "confirm" || stage.startsWith("second-")) return 3;
  return 4;
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
  const [form, setForm] = useState<DraftState>(() => {
    const saved = loadReviewOsDraft<DraftState>(storageKey);
    if (saved) {
      return {
        ...saved,
        subjectLabel: normalizeSubjectForMode(saved.subjectLabel, mode),
      };
    }
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
        productionBeforeComparison: mode === "second",
        referenceAnswerAddedAfterProduction: mode === "second",
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
      };
  });
  const secondWriteEnabled = mode === "second" && workflow === "second-write" && !rewriteContext;
  const getInitialStage = () => {
    if (rewriteContext && mode === "second") return "confirm" as const;
    if (secondWriteEnabled) return "second-issue-recall" as const;
    return "intake" as const;
  };
  const [stage, setStage] = useState<
    | "intake"
    | "preview"
    | "confirm"
    | "second-issue-recall"
    | "second-outline"
    | "second-answer"
    | "second-reference"
    | "second-gap"
    | "second-rewrite"
  >(getInitialStage());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extractionState, setExtractionState] = useState<ExtractionState>("idle");
  const [uploadedPages, setUploadedPages] = useState<UploadedPage[]>(() => form.capturePages ?? []);
  const secondModeHiddenFooterStages = new Set([
    "second-issue-recall",
    "second-outline",
    "second-answer",
    "second-reference",
    "second-gap",
  ]);
  const hideGlobalFooterActions = mode === "second" && secondModeHiddenFooterStages.has(stage);
  const currentCaptureStep = getCaptureStep(stage);
  useEffect(() => {
    if (!secondWriteEnabled) return;

    const nextStage =
      stage === "second-reference" && form.userAnswer.trim().length < 8
        ? "second-answer"
        : stage === "second-gap" && form.correctAnswer.trim().length < 8
          ? "second-reference"
          : stage === "second-rewrite" && form.biggestGap.trim().length < 4
            ? "second-gap"
            : null;

    if (!nextStage) return;

    const timeout = window.setTimeout(() => setStage(nextStage), 0);
    return () => window.clearTimeout(timeout);
  }, [secondWriteEnabled, stage, form.userAnswer, form.correctAnswer, form.biggestGap]);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const missingConfirmationFields = getMissingConfirmationFields(form, mode);
  const needsOcrConfirmation = Boolean(form.extractionNeedsReview || missingConfirmationFields.length > 0 || form.lowConfidenceFlag);

  function persist(next: DraftState) {
    saveReviewOsDraft(storageKey, next);
    return next;
  }

  function update<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setForm((prev) => persist({ ...prev, [key]: value }));
  }

  function updateSubject(value: string) {
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
          correctAnswer: base.correctAnswer || findField(sourceText, ["정답", "답", "correct answer"]),
          userAnswer: base.userAnswer || findField(sourceText, ["내 답", "선택", "my answer"]),
          userReasonText: base.userReasonText || first.reason,
          keyConcepts: pickConcepts(sourceText, first.concepts),
          coreFormula: base.coreFormula || first.formula,
          comparisonPoint: base.comparisonPoint || first.comparison,
          nextReviewDate: base.nextReviewDate || getDefaultNextReviewDate(mode),
        }
      : {
          ...base,
          subjectLabel: subject,
          problemTitle: base.problemTitle || firstLine(sourceText, `${subject} 답안 비교`),
          rawQuestionText: sourceText || base.rawQuestionText,
          correctAnswer: base.correctAnswer || findField(sourceText, ["기준 답안", "모범답안", "해설", "reference"]),
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
      const next = buildStructuredDraft(form, sourceText);
      setForm(persist(next));
      setStage("preview");
      return;
    }

    setExtracting(true);
    setExtractError("");
    setExtractionState("extracting");
    try {
      const body = new FormData();
      body.append("mode", mode);
      body.append("text", text);
      body.append("source_label", form.sourceLabel);
      const response = await fetch("/api/inverge/ocr", { method: "POST", body });
      const extraction = (await response.json()) as ({ ok?: boolean; error?: string } & ExtractionPipelineResult);
      if (!response.ok || !extraction.ok) {
        const fallback = buildStructuredDraft(form, text);
        setForm(persist(fallback));
        setStage("preview");
        setExtractionState("failed");
        setExtractError("텍스트 추출에 실패했습니다. 직접 붙여넣거나 다시 시도해 주세요.");
        setTimeout(() => {
          textAreaRef.current?.focus();
        }, 0);
        return;
      }
      setForm(persist(applyExtraction(form, extraction)));
      setExtractionState("succeeded");
      setStage("preview");
    } catch {
      const fallback = buildStructuredDraft(form, text);
      setForm(persist(fallback));
      setStage("preview");
      setExtractionState("failed");
      setExtractError("텍스트 추출에 실패했습니다. 직접 붙여넣거나 다시 시도해 주세요.");
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 0);
    } finally {
      setExtracting(false);
    }
  }

  async function handleImageImport(fileList: FileList) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
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
    setExtracting(true);
    setExtractError("");
    setExtractionState("uploading");
    setUploadedPages(initialPages);
    setForm((prev) =>
      persist({
        ...prev,
        sourceType: inferSourceTypeFromAction("gallery"),
        sourceLabel: initialPages.map((page) => page.label).join(" / "),
        capturePages: stripPreviewUrls(initialPages),
        pageCount: initialPages.length,
        hasManualCorrection: false,
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
      const sourceLabel = initialPages.map((page) => page.label).join(" / ");
      if (!response.ok || !result.ok) {
        const fallbackPages = initialPages.map((page) => ({
          ...page,
          ocrText: "직접 내용을 입력해 주세요.",
          lowConfidenceFlag: true,
          captureQualityIssue: "ocr_failed_manual_fallback",
        }));
        const mergedFallback = mergePageText(fallbackPages);
        const fallback: DraftState = {
          ...form,
          sourceType: inferSourceTypeFromAction("gallery"),
          sourceLabel,
          rawQuestionText: mergedFallback,
          rawOcrText: mergedFallback,
          capturePages: stripPreviewUrls(fallbackPages),
          pageCount: fallbackPages.length,
          lowConfidenceFlag: true,
          captureQualityIssue: "ocr_failed_manual_fallback",
        };
        setUploadedPages(fallbackPages);
        setForm(persist(fallback));
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
      // Draft preservation invariant: rawQuestionText: extractedText || form.rawQuestionText
      const base: DraftState = {
        ...form,
        sourceType: inferSourceTypeFromAction("gallery"),
        sourceLabel,
        rawQuestionText: extractedText,
        rawOcrText: extractedText,
        capturePages: stripPreviewUrls(pagesWithText),
        pageCount: pagesWithText.length,
        lowConfidenceFlag,
        captureQualityIssue: lowConfidenceFlag ? "low_confidence_ocr" : "",
        hasManualCorrection: false,
      };
      setUploadedPages(relabelPages(pagesWithText));
      const structured = result.normalized_draft ? applyExtraction(base, result) : buildStructuredDraft(base, extractedText);
      setForm(persist({
        ...structured,
        capturePages: stripPreviewUrls(relabelPages(pagesWithText)),
        pageCount: pagesWithText.length,
        lowConfidenceFlag,
        captureQualityIssue: lowConfidenceFlag ? "low_confidence_ocr" : "",
      }));
      setExtractionState(lowConfidenceFlag ? "manual" : "succeeded");
      setExtractError(lowConfidenceFlag ? "인식이 불안정합니다. 중요한 숫자/단어를 확인해 주세요." : "");
      setStage("preview");
    } catch {
      const fallbackPages = initialPages.map((page) => ({
        ...page,
        ocrText: "직접 내용을 입력해 주세요.",
        lowConfidenceFlag: true,
        captureQualityIssue: "ocr_failed_manual_fallback",
      }));
      const mergedFallback = mergePageText(fallbackPages);
      const fallback: DraftState = {
        ...form,
        sourceType: inferSourceTypeFromAction("gallery"),
        sourceLabel: fallbackPages.map((page) => page.label).join(" / "),
        rawQuestionText: mergedFallback,
        rawOcrText: mergedFallback,
        capturePages: stripPreviewUrls(fallbackPages),
        pageCount: fallbackPages.length,
        lowConfidenceFlag: true,
        captureQualityIssue: "ocr_failed_manual_fallback",
      };
      setUploadedPages(fallbackPages);
      setForm(persist(fallback));
      setStage("preview");
      setExtractionState("failed");
      setExtractError("인식이 불안정합니다. 중요한 숫자/단어를 확인해 주세요. 직접 붙여넣거나 다시 찍기로 계속할 수 있습니다.");
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 0);
    } finally {
      setExtracting(false);
    }
  }

  function handlePdfImport(file: File) {
    const pdfPage = relabelPages([{
      id: `${Date.now()}-pdf-${file.name}`,
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
        ...prev,
        sourceType: inferSourceTypeFromAction("pdf"),
        sourceLabel: pdfPage.map((page) => page.label).join(" / "),
        rawQuestionText: prev.rawQuestionText.trim() || mergedText,
        rawOcrText: prev.rawOcrText || mergedText,
        capturePages: stripPreviewUrls(pdfPage),
        pageCount: 1,
        lowConfidenceFlag: true,
        captureQualityIssue: "pdf_manual_text_fallback",
      }),
    );
    setExtractionState("manual");
    setExtractError("현재 PDF는 파일명만 기록됩니다. 내용은 직접 붙여넣어 주세요.");
    setTimeout(() => {
      textAreaRef.current?.focus();
      textAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  function resetDraft() {
    uploadedPages.forEach((page) => {
      if (page.previewUrl) URL.revokeObjectURL(page.previewUrl);
    });
    clearReviewOsDraft(storageKey);
    setStage(getInitialStage());
    setError("");
    setExtractError("");
    setExtractionState("idle");
    setUploadedPages([]);
  }
  function syncPageLabels(nextPages: UploadedPage[]) {
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
      }),
    );
  }
  function removePage(index: number) {
    const page = uploadedPages[index];
    if (page?.previewUrl) URL.revokeObjectURL(page.previewUrl);
    const synced = syncPageTextFromMergedText(uploadedPages, form.rawQuestionText);
    syncPageLabels(synced.filter((_, idx) => idx !== index));
  }
  function movePage(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= uploadedPages.length) return;
    const synced = syncPageTextFromMergedText(uploadedPages, form.rawQuestionText);
    const next = [...synced];
    [next[index], next[target]] = [next[target], next[index]];
    syncPageLabels(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (mode === "first" && isLikelyWrongAnswer(form.correctAnswer, form.userAnswer)) {
        if (!form.userReasonPreset.trim()) {
          setError("1차 오답은 실수 원인을 먼저 선택해 주세요.");
          return;
        }
        if (!form.comparisonPoint.trim()) {
          setError("해설 보기 전에 근거를 한 문장으로 먼저 회상해 주세요.");
          return;
        }
      }
      if (missingConfirmationFields.length > 0) {
        const firstMissing = missingConfirmationFields[0]?.label;
        setError(firstMissing ? `저장 전에 ${firstMissing} 한 가지만 확인해 주세요.` : "OCR 확인 필요: 추출 초안을 다시 확인한 뒤 저장해 주세요.");
        return;
      }
      if (mode === "second" && !rewriteContext) {
        if (form.issueRecall.trim().length < 8) {
          setError("기준 답안 보기 전에 쟁점 회상을 먼저 적어주세요.");
          return;
        }
        if (form.outlineDraft.trim().length < 8) {
          setError("전체 답안보다 목차를 먼저 잡아주세요.");
          return;
        }
        if (form.userAnswer.trim().length < 8) {
          setError("내 답안을 먼저 작성해 주세요.");
          return;
        }
        if (form.correctAnswer.trim().length < 8) {
          setError("작성 이후 기준답안/해설을 입력해 주세요.");
          return;
        }
      }

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
      const result = (await response.json()) as { ok?: boolean; item?: { id: string }; error?: string; message?: string; errorCode?: string };
      if (!response.ok || !result.ok || !result.item) {
        if (result.error === "usage-limit") {
          setError("무료 체험 또는 코어 한도에 도달했습니다. 업그레이드 또는 지원팀 문의를 진행해 주세요.");
          return;
        }
        if (result.errorCode === "BILLING_REQUIRED") {
          setError("유료 플랜이 아직 준비되지 않았습니다. 지원팀에 문의해 주세요.");
          return;
        }
        setError("정리하지 못했습니다. 내용을 조금 더 확인한 뒤 다시 시도해 주세요.");
        return;
      }
      clearReviewOsDraft(storageKey);
      router.push(`/app/session?mode=${mode}&savedCapture=1&itemId=${result.item.id}`);
      router.refresh();
    } catch {
      setError("정리하지 못했습니다. 내용을 조금 더 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6 overflow-x-hidden pb-28 sm:pb-0" onSubmit={handleSubmit}>
      <LearnerProgressBar current={currentCaptureStep} total={4} label="오늘 한 것 올리기" helper="1. 입력 → 2. 확인 → 3. 정리 → 4. 저장" />
      {rewriteContext && mode === "second" ? (
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
          <section className="rounded-[var(--radius-md)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted)]">
              <span>과목: {form.subjectLabel}</span>
              <details className="inline-block">
                <summary className="cursor-pointer text-sm text-[color:var(--foreground-strong)] underline underline-offset-2">과목 바꾸기</summary>
                <div className="mt-2 min-w-64">
                  <SubjectSelect
                    subjectLabel={config.subjectLabel}
                    subjects={config.subjects}
                    value={form.subjectLabel}
                    onChange={updateSubject}
                    className="form-control w-full"
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
              onNext={() => { if (form.userAnswer.trim().length >= 8) setStage("second-reference"); }}
            />
          ) : null}
          {stage === "second-reference" ? (
            <SecondReferencePanel
              reference={form.correctAnswer}
              onChange={(value) => update("correctAnswer", value)}
              onNext={() => { if (form.correctAnswer.trim().length >= 8) setStage("second-gap"); }}
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
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            pdfInputRef={pdfInputRef}
            textAreaRef={textAreaRef}
          />

          {stage !== "intake" ? (
            <ExtractionPreview
              form={form}
              mode={mode}
              uploadedPages={uploadedPages}
              needsOcrConfirmation={needsOcrConfirmation}
              missingConfirmationFields={missingConfirmationFields.map((field) => field.label)}
              onEdit={() => setStage(mode === "second" ? "second-answer" : "confirm")}
              onRegenerate={() => generateStructuredDraft()}
              onRawOcrChange={(value) => {
                update("rawQuestionText", value);
                update("rawOcrText", value);
                update("hasManualCorrection", true);
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
              onNext={() => { if (form.userAnswer.trim().length >= 8) setStage("second-reference"); }}
            />
          ) : null}
          {mode === "second" && stage === "second-reference" ? (
            <SecondReferencePanel reference={form.correctAnswer} onChange={(value) => update("correctAnswer", value)} onNext={() => { if (form.correctAnswer.trim().length >= 8) setStage("second-gap"); }} />
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
        <p className="text-sm text-[color:var(--status-red)]" data-testid={mode === "second" ? "second-write-error" : "capture-form-error"}>
          {error}
        </p>
      ) : null}

      {!hideGlobalFooterActions ? (
        <BottomPrimaryAction secondary={
          <details className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium text-[color:var(--muted)]">다른 선택</summary>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={resetDraft} className="w-full sm:w-auto">
                {mode === "second" ? "다시 쓰기" : "다시 풀기"}
              </Button>
              <Button type="button" variant="ghost" onClick={resetDraft} className="w-full sm:w-auto">
                나중에 하기
              </Button>
            </div>
          </details>
        }>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          {rewriteContext && mode === "second" ? (
            <Button type="submit" disabled={submitting || !form.rewriteParagraph.trim()} className="w-full sm:w-auto">
              {submitting ? "저장 중" : "문단 다시쓰기 저장"}
            </Button>
          ) : stage === "preview" ? (
            <Button
              type="button"
              onClick={() => setStage(mode === "second" ? "second-issue-recall" : "confirm")}
              className="w-full sm:w-auto"
            >
              {mode === "second" ? "쟁점 회상부터 시작" : "확인하고 저장하기"}
            </Button>
          ) : stage === "intake" ? null : (
            <Button
              type="submit"
              disabled={submitting || (mode === "second" && stage !== "second-rewrite" && stage !== "confirm")}
              data-testid={mode === "second" && stage === "second-rewrite" && !rewriteContext ? "second-write-submit" : undefined}
              className="w-full sm:w-auto"
            >
              {submitting ? "저장 중" : "저장하고 오늘 계획에 반영"}
            </Button>
          )}
        </div>
        </BottomPrimaryAction>
      ) : null}
    </form>
  );
}

type FieldProps = {
  form: DraftState;
  mode: AppraisalMode;
  update: <K extends keyof DraftState>(key: K, value: DraftState[K]) => void;
};

function SubjectSelect({
  subjectLabel,
  subjects,
  value,
  onChange,
  className = "form-control",
}: {
  subjectLabel: string;
  subjects: readonly string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-[color:var(--foreground-strong)]">{subjectLabel}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={className}>
        {subjects.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
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
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  pdfInputRef: React.RefObject<HTMLInputElement | null>;
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const calculatorWorkflow = form.lowConfidenceFlag ? null : getCalculatorWorkflowForSubject(form.subjectLabel);
  const extractionStateLabel: Record<ExtractionState, string> = {
    idle: "입력 대기",
    uploading: "불러오는 중",
    extracting: "OCR 초안 생성 중",
    succeeded: "초안 준비됨",
    failed: "확인 필요",
    manual: "수동 입력 기록",
  };

  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] p-4 sm:p-6">
      <p className="text-caption text-[color:var(--brand-700)]">Step 1. 오늘 한 것 올리기</p>
      <div className="mt-2 flex flex-col gap-4">
        <div className="max-w-[62ch]">
          <h3 className="text-title text-[color:var(--foreground-strong)]">
            {mode === "second" ? "오늘 학습한 내용을 노트 초안으로 정리합니다" : "오늘 학습한 내용을 오답노트 초안으로 정리합니다"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            {mode === "second"
              ? "사진은 초안 추출용입니다. OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요."
              : "사진은 초안 추출용입니다. OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요."}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-elevated)] p-5 sm:p-6">
          <p className="text-caption text-[color:var(--ink-muted)]">오늘의 입력</p>
          <p className="mt-1 text-xs text-[color:var(--ink-muted)]">캡처 유형 · photo / pdf / text</p>
          <h4 className="mt-2 text-base font-semibold text-[color:var(--ink-primary)]">오늘 한 것 올리기</h4>
          <p className="mt-1 text-sm leading-6 text-[color:var(--ink-muted)]">사진, PDF, 텍스트를 올리면 한 가지 간극과 다음 행동으로 정리합니다.</p>
          <p className="mt-2 rounded-[var(--radius-sm)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] px-3 py-2 text-xs leading-5 text-[color:var(--foreground-strong)]">여러 장 답안지는 순서가 중요합니다. 저장 전 페이지 순서와 OCR 내용을 확인해 주세요.</p>
          <p className="mt-1 text-xs leading-6 text-[color:var(--ink-muted)]">노트 원문은 비공개로 보관되며, 파생 학습 신호는 개인 추천 개선에만 사용됩니다.</p>
          <div className="mt-4">
            <Button type="button" className="w-full sm:w-auto bg-[color:var(--accent-deep)] transition-colors hover:bg-[color:var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent-deep)] focus-visible:ring-offset-2" onClick={() => { update("sourceType", inferSourceTypeFromAction("camera")); cameraInputRef.current?.click(); }}>
              사진/PDF/텍스트로 기록 시작
              <span className="sr-only">여러 장 답안지 사진 찍기</span>
            </Button>
            <p className="mt-2 text-xs text-[color:var(--ink-muted)]">사진은 OCR 초안으로만 사용됩니다. 저장 전 직접 확인해 주세요.</p>
          </div>
          <div className="mt-4 rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] p-3">
            <p className="text-xs font-medium text-[color:var(--muted)]">사진 촬영 팁</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[color:var(--muted)]">
              <li>그림자가 적게 찍기</li>
              <li>한 페이지씩 정면으로 찍기</li>
              <li>흔들리면 다시 찍기</li>
            </ul>
          </div>
          <details className="mt-3 rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)]">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs text-[color:var(--ink-muted)]">다른 입력 방식 보기</summary>
            <div className="grid gap-2 border-t border-[color:var(--border-hairline)] px-3 py-2 sm:flex sm:flex-wrap">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { update("sourceType", inferSourceTypeFromAction("gallery")); galleryInputRef.current?.click(); }}>
                앨범에서 선택
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  update("sourceType", inferSourceTypeFromAction("text"));
                  textAreaRef.current?.focus();
                  textAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                텍스트로 입력
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => { update("sourceType", inferSourceTypeFromAction("pdf")); pdfInputRef.current?.click(); }}>
                PDF 선택
              </Button>
            </div>
          </details>
          <div className="mt-3">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              onChange={(event) => {
                if (event.currentTarget.files) onImage(event.currentTarget.files);
              }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => event.currentTarget.files && onImage(event.currentTarget.files)}
            />
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) onPdf(file);
              }}
            />
          </div>
          <p className="mt-3 inline-flex rounded-full border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] px-3 py-1 text-xs text-[color:var(--ink-muted)]">
            OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-1">
        <label className="space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">시험 모드</span>
          <select value={mode} className="form-control" disabled>
            <option value="first">감정평가사 1차</option>
            <option value="second">감정평가사 2차</option>
          </select>
        </label>
      </div>
      <div className={`rounded-[var(--radius-pill)] border px-3 py-2 ${extractionState === "failed" ? "border-[color:var(--status-red)] bg-[color:var(--status-red-soft)]" : "border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)]"}`}>
        <p className="text-xs font-medium text-[color:var(--muted)]">OCR 상태 · {extractionStateLabel[extractionState]}</p>
        <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">
          {{
            idle: "사진을 찍거나 텍스트를 붙여넣어 시작하세요.",
            uploading: "사진을 불러오는 중입니다.",
            extracting: "OCR 초안을 만드는 중입니다.",
            succeeded: "OCR 초안이 준비되었습니다. 저장 전 직접 확인해 주세요.",
            failed: "사진을 읽지 못했습니다. 텍스트로 계속할 수 있습니다.",
            manual: "파일을 기록했습니다. 내용은 직접 확인해 주세요.",
          }[extractionState]}
        </p>
      </div>
      <div className="mt-5 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-4">
        <p className="text-xs font-medium text-[color:var(--muted)]">필수 입력</p>
        <SubjectSelect
          subjectLabel={config.subjectLabel}
          subjects={config.subjects}
          value={form.subjectLabel}
          onChange={updateSubject}
          className="form-control w-full"
        />
        <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => update("subjectLabel", "")}>
          나중에 확인
        </Button>
      </div>
      <label className="mt-4 block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">
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
            update("lowConfidenceFlag", form.lowConfidenceFlag || hasLowConfidenceText(value));
          }}
          onFocus={() => { if (uploadedPages.length === 0 && !form.sourceLabel) update("sourceType", inferSourceTypeFromAction("text")); }}
          placeholder={
            mode === "second"
              ? "권장: 사례, 기준 답안, 내 답안을 텍스트로 붙여넣으세요. 예: 기준 답안: ... / 내 답안: ..."
              : "권장: 문제와 정답, 내가 고른 답을 텍스트로 붙여넣으세요. 예: 정답: 3 / 내 답: 2"
          }
          className="min-h-56 border-[color:var(--border-hairline)] bg-[color:var(--bg-surface)] text-[color:var(--foreground-strong)] leading-7 transition-colors focus-visible:border-[color:var(--accent-deep)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent-deep)]/20"
        />
      </label>
      <p className="text-xs text-[color:var(--muted)]">OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요.</p>
      {form.sourceType === "pdf" ? <p className="text-xs text-[color:var(--muted)]">현재 PDF는 파일명만 기록됩니다. 내용은 직접 붙여넣어 주세요.</p> : null}
      {uploadedPages.length > 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium text-[color:var(--muted)]">페이지 순서 확인</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">여러 장 답안지는 순서가 중요합니다. 저장 전 페이지 순서와 OCR 내용을 확인해 주세요.</p>
            </div>
            <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => cameraInputRef.current?.click()}>
              다시 찍기
            </Button>
          </div>
          <ul className="mt-3 space-y-2">
            {uploadedPages.map((page, index) => (
              <li key={page.id} className="rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] p-3 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="break-words font-medium text-[color:var(--foreground-strong)]">{page.label}</span>
                  <div className="grid grid-cols-3 gap-2 sm:flex">
                    <Button type="button" variant="outline" className="min-h-11 px-3 text-xs" onClick={() => onMovePage(index, "up")} disabled={index === 0} aria-label={`${page.label} 위로 이동`}>위로</Button>
                    <Button type="button" variant="outline" className="min-h-11 px-3 text-xs" onClick={() => onMovePage(index, "down")} disabled={index === uploadedPages.length - 1} aria-label={`${page.label} 아래로 이동`}>아래로</Button>
                    <Button type="button" variant="outline" className="min-h-11 px-3 text-xs" onClick={() => onRemovePage(index)} aria-label={`${page.label} 제거`}>제거</Button>
                  </div>
                </div>
                <details className="mt-2 rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface)]">
                  <summary className="cursor-pointer list-none px-3 py-2 text-xs text-[color:var(--muted)]">미리보기</summary>
                  <div className="border-t border-[color:var(--border-hairline)] px-3 py-3">
                    {page.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local blob preview keeps mobile capture lightweight without uploading raw pages.
                      <img src={page.previewUrl} alt={`${page.label} 미리보기`} className="max-h-64 w-full rounded-[var(--radius-sm)] object-contain" />
                    ) : null}
                    <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[color:var(--muted)]">{page.ocrText || "내용은 아래 OCR 편집창에서 확인해 주세요."}</p>
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
      <details className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">선택 정보</summary>
        <div className="grid gap-3 border-t border-[color:var(--border-subtle)] px-4 py-3 sm:grid-cols-3">
        <label className="space-y-2">
          <span className="text-xs text-[color:var(--muted)]">소요 시간</span>
          <input value={form.timeSpentSeconds} onChange={(event) => update("timeSpentSeconds", event.target.value)} className="form-control" placeholder="예: 45분" />
        </label>
        <label className="space-y-2">
          <span className="text-xs text-[color:var(--muted)]">자신감</span>
          <select value={form.confidence} onChange={(event) => update("confidence", event.target.value as ConfidenceLevel)} className="form-control">
            {CONFIDENCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs text-[color:var(--muted)]">메모</span>
          <input value={form.sourceLabel} onChange={(event) => update("sourceLabel", event.target.value)} className="form-control" placeholder="선택 입력" />
        </label>
        </div>
      </details>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" onClick={onGenerate} disabled={extracting} className="w-full sm:w-auto">
          {extracting ? "입력 내용 확인 중" : "기록 시작하기"}
        </Button>
        <p className="text-xs text-[color:var(--muted)]">노트에 반영됩니다.</p>
      </div>
      <details className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">이미지/PDF로 입력하기 (선택)</summary>
        <div className="border-t border-[color:var(--border-subtle)] px-4 py-3">
          {form.sourceLabel ? <p className="text-sm text-[color:var(--muted)]">보관한 파일: {form.sourceLabel}</p> : null}
          {uploadedPages.length > 0 ? <p className="mt-2 text-sm text-[color:var(--muted)]">페이지 순서: {uploadedPages.map((page) => page.label).join(" / ")}</p> : null}
          {form.sourceType === "pdf" ? (
            <p className="mt-2 text-sm text-[color:var(--muted)]">현재 PDF는 파일명만 기록됩니다. 내용은 직접 붙여넣어 주세요.</p>
          ) : null}
        </div>
      </details>
      <p className="mt-3 text-caption leading-5 text-[color:var(--muted)]">오늘은 이 작업 하나만 먼저 합니다.</p>
      {form.lowConfidenceFlag ? (
        <p className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--foreground-strong)]">
          인식이 불안정합니다. 중요한 숫자/단어를 확인해 주세요. 계산형 정리는 확인 후 진행합니다.
        </p>
      ) : null}
      {calculatorWorkflow ? (
        <div className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-[color:var(--foreground-strong)]">
              {calculatorWorkflow.subject} 계산형 기록이면 계산기 스텝을 먼저 고정할 수 있습니다.
            </p>
            <Link href={`/app/calculator?context=${calculatorWorkflow.context}&mode=${calculatorWorkflow.mode}`}>
              <Button type="button" variant="outline">
                계산기 스텝
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
      {needsOcrConfirmation ? (
        <p className="mt-3 rounded-[var(--radius-md)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--foreground-strong)]">
          OCR 확인 필요{missingConfirmationFields.length > 0 ? `: ${missingConfirmationFields.join(", ")}` : ""}. 저장 전에 필수 항목을 확인해 주세요.
        </p>
      ) : null}
      {extractError ? <p className="mt-3 text-sm leading-6 text-[color:var(--cue-risk)]">{extractError}</p> : null}
      {mode === "second" ? (
        <div className="mt-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3">
          <p className="text-xs font-medium text-[color:var(--muted)]">저장 전 캡처 품질 체크</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[color:var(--muted)]">
            <li>글자가 선명한가</li>
            <li>페이지 순서가 맞는가</li>
            <li>문제번호가 보이는가</li>
            <li>계산/답/단위가 보이는가</li>
            <li>끝/이하여백 표시가 있는가</li>
          </ul>
        </div>
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
  onEdit,
  onRegenerate,
  onRawOcrChange,
}: {
  form: DraftState;
  mode: AppraisalMode;
  uploadedPages: UploadedPage[];
  needsOcrConfirmation: boolean;
  missingConfirmationFields: string[];
  onEdit: () => void;
  onRegenerate: () => void;
  onRawOcrChange: (value: string) => void;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-caption text-[color:var(--muted)]">Step 2. 확인 · Step 3. 정리</p>
          <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">텍스트를 확인한 뒤 노트로 정리합니다</h3>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onRegenerate}>
            다시 만들기
          </Button>
          <Button type="button" variant="outline" onClick={onEdit}>
            필드 확인
          </Button>
        </div>
      </div>
      {needsOcrConfirmation ? (
        <p className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--foreground-strong)]">
          OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요.
          {missingConfirmationFields.length > 0 ? ` 확인 필요: ${missingConfirmationFields.join(", ")}` : ""}
        </p>
      ) : null}
      <p className="mt-4 text-xs text-[color:var(--muted)]">AI 정리는 초안입니다. 저장 전 직접 확인해 주세요.</p>

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
        <p className="mt-2 text-xs text-[color:var(--muted)]">수정 내용은 이 기기 초안에 자동 저장됩니다. AI 초안은 참고용이며 최종 판단이 아닙니다.</p>
      </div>
      {mode === "first" ? (
        <div className="mt-5 grid gap-3">
          <PreviewLine label="과목" value={form.subjectLabel} />
          <PreviewLine label="주제/사례 요약" value={form.problemTitle || form.caseSummary} />
          <PreviewLine label="가장 큰 간극" value={form.userReasonText || "확인 필요"} />
          <PreviewLine label="다음 행동" value={form.comparisonPoint || "확인 필요"} />
          <PreviewLine label="확신/복습 시점" value={`${form.confidence} · ${form.nextReviewDate}`} />
          <PreviewLine label="실수 원인 추정" value={form.userReasonPreset || form.userReasonText} />
          <PreviewLine label="핵심 개념" value={form.keyConcepts} />
          <PreviewLine label="유사/재시도 행동" value={form.comparisonPoint} />
          <PreviewLine label="페이지 라벨" value={form.sourceLabel || "없음"} />
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          <PreviewLine label="과목" value={form.subjectLabel} />
          <PreviewLine label="주제/사례 요약" value={form.caseSummary || "확인 필요"} />
          <PreviewLine label="가장 큰 간극" value={form.biggestGap || form.missingIssue} />
          <PreviewLine label="다음 행동" value={form.rewriteInstruction || "확인 필요"} />
          <PreviewLine label="확신/복습 시점" value={`${form.confidence} · ${form.nextReviewDate}`} />
          <PreviewLine label="누락 논점 후보" value={form.missingIssue} />
          <PreviewLine label="구조 약점" value={form.weakStructurePoint} />
          <PreviewLine label="다시쓰기 지시" value={form.rewriteInstruction} />
          <PreviewLine label="페이지 라벨" value={form.sourceLabel || "없음"} />
        </div>
      )}
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
  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--muted)]">Step 3. 저장하고 오늘 계획에 반영</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">정리되었습니다</h3>
      <div className="mt-4 grid gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-4">
        <PreviewLine label="가장 큰 gap" value={mode === "second" ? form.biggestGap || form.missingIssue : form.userReasonText} />
        <PreviewLine label="다음 행동" value={mode === "second" ? form.rewriteInstruction : form.comparisonPoint} />
        <PreviewLine label="노트 요약" value={`${form.subjectLabel} · ${mode === "second" ? form.caseSummary : form.problemTitle || form.sourceLabel}`} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SubjectSelect subjectLabel={config.subjectLabel} subjects={config.subjects} value={form.subjectLabel} onChange={updateSubject} />
        <label className="space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">{mode === "second" ? "작업 단계" : "회차 / 번호"}</span>
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

      <div className={`mt-5 grid gap-4 ${mode === "second" ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {mode === "second" ? (
          <label className="space-y-2">
            <span className="text-sm text-[color:var(--foreground-strong)]">분류</span>
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
          <span className="text-sm text-[color:var(--foreground-strong)]">확신 정도</span>
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
          <span className="text-sm text-[color:var(--foreground-strong)]">다음 review 시점</span>
          <input
            type="date"
            value={form.nextReviewDate}
            onChange={(event) => update("nextReviewDate", event.target.value)}
            className="form-control"
          />
        </label>
      </div>

      <details className="mt-5 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-4">
        <summary className="cursor-pointer text-sm font-medium text-[color:var(--foreground-strong)]">저장될 원문 보기</summary>
        <Textarea
          value={form.rawQuestionText}
          onChange={(event) => update("rawQuestionText", event.target.value)}
          className="mt-4 min-h-36 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
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
            placeholder="예: 기출, 모의, 오답노트"
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
          <span className="text-sm text-[color:var(--foreground-strong)]">정답</span>
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
    <div className="mt-5 space-y-4">
      <label className="block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">보강할 논점 1개</span>
        <Textarea
          value={form.userReasonText}
          onChange={(event) => {
            update("userReasonText", event.target.value);
            update("missingIssue", event.target.value);
          }}
          className="min-h-32 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
        />
      </label>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">내 답안 요약</span>
          <input
            value={form.myAnswerSummary}
            onChange={(event) => update("myAnswerSummary", event.target.value)}
            className="form-control"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">rewrite 지시</span>
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
    <section className="rounded-[var(--radius-card)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--muted)]">Step 1. 쟁점 회상</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">기준답안 보기 전, 쟁점 1개만 적으세요.</h3>
      <details className="mt-2 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3"><summary className="cursor-pointer text-xs font-medium text-[color:var(--muted)]">왜 이 순서인가요?</summary><p className="mt-2 text-xs leading-6 text-[color:var(--muted)]">완벽히 쓰지 말고, 지금 떠오르는 문장만 적으세요. 이 과목은 먼저 이 구조로 답안을 잡습니다. {template.structure}</p></details>
      <label className="mt-4 block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">쟁점 회상</span>
        <Textarea
          value={issueRecall}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-44 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
          placeholder={template.issueRecallPlaceholder}
        />
      </label>
      <Button type="button" className="mt-4 w-full sm:w-auto" disabled={issueRecall.trim().length < 8} onClick={onNext}>
        다음: 목차 작성
      </Button>
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
    <section className="rounded-[var(--radius-card)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--muted)]">Step 2. 목차 작성</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">전체 답안보다 목차 3줄이 먼저입니다.</h3>
      <details className="mt-2 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3"><summary className="cursor-pointer text-xs font-medium text-[color:var(--muted)]">왜 이 순서인가요?</summary><p className="mt-2 text-xs leading-6 text-[color:var(--muted)]">기준 답안 보기 전에 이 체크포인트 중 3개를 떠올립니다: {template.checklist.slice(0, 3).join(", ")}</p></details>
      <label className="mt-4 block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">목차 초안</span>
        <Textarea
          value={outlineDraft}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-44 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
          placeholder={template.outlinePlaceholder}
        />
      </label>
      <Button type="button" className="mt-4 w-full sm:w-auto" disabled={outlineDraft.trim().length < 8} onClick={onNext}>
        다음: 내 답안 작성
      </Button>
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
    "감정평가 및 보상법규": "요건:\n조문/법리:\n사안 포섭:\n결론:",
  };
  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--muted)]">Step 3. 내 답안 작성</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">비교는 작성 이후에 합니다.</h3>
      <details className="mt-2 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3"><summary className="cursor-pointer text-xs font-medium text-[color:var(--muted)]">왜 이 순서인가요?</summary><p className="mt-2 text-xs leading-6 text-[color:var(--muted)]">완벽히 쓰지 말고, 지금 떠오르는 문장만 적으세요.</p></details>
      <label className="mt-4 block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">내 답안</span>
        <Textarea
          value={answer}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-56 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
          placeholder={templates[subject] ?? "핵심 문장 1개:\n근거:\n결론:"}
        />
      </label>
      <Button type="button" className="mt-4 w-full sm:w-auto" disabled={answer.trim().length < 8} onClick={onNext}>
        다음: 기준답안/해설 입력
      </Button>
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
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--muted)]">Step 4. 기준답안/해설 입력</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">작성한 뒤에만 기준답안을 봅니다.</h3>
      <details className="mt-2 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3"><summary className="cursor-pointer text-xs font-medium text-[color:var(--muted)]">왜 이 순서인가요?</summary><p className="mt-2 text-xs leading-6 text-[color:var(--muted)]">비교는 작성 이후에 합니다.</p></details>
      <label className="mt-4 block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">기준 답안 요약</span>
        <Textarea
          value={reference}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-56 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
        />
      </label>
      <Button type="button" className="mt-4 w-full sm:w-auto" disabled={reference.trim().length < 8} onClick={onNext}>
        다음: 가장 큰 간극 1개
      </Button>
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
    <section className="rounded-[var(--radius-card)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--muted)]">Step 5. 가장 큰 간극 1개</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">오늘은 가장 큰 간극 1개만 고칩니다.</h3>
      <details className="mt-2 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3"><summary className="cursor-pointer text-xs font-medium text-[color:var(--muted)]">왜 이 순서인가요?</summary><p className="mt-2 text-xs leading-6 text-[color:var(--muted)]">{template.biggestGapGuidance}</p></details>
      <label className="mt-4 block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">보강할 논점 1개</span>
        <Textarea
          value={biggestGap}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-32 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
          placeholder={template.commonGaps[0]}
        />
      </label>
      <Button type="button" className="mt-4 w-full sm:w-auto" disabled={biggestGap.trim().length < 4} onClick={onNext}>
        다음: 문단 다시쓰기
      </Button>
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
    <section className="rounded-[var(--radius-card)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--muted)]">Step 6. 문단 다시쓰기</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">한 문단만 다시 씁니다.</h3>
      <details className="mt-2 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3"><summary className="cursor-pointer text-xs font-medium text-[color:var(--muted)]">왜 이 순서인가요?</summary><p className="mt-2 text-xs leading-6 text-[color:var(--muted)]">{template.rewriteGuidance}</p></details>
      <div className="mt-4 space-y-4">
        <details className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3">
          <summary className="cursor-pointer text-xs font-medium text-[color:var(--muted)]">처음 쓴 답안 보기</summary>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--foreground-strong)]">{form.userAnswer || "아직 작성된 답안이 없습니다."}</p>
        </details>
        <label className="block space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">다시 쓴 문단</span>
          <Textarea
            value={form.rewriteParagraph}
            onChange={(event) => {
              update("rewriteParagraph", event.target.value);
            }}
            data-testid="second-write-final-textarea"
            className="min-h-56 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
            placeholder="누락 논점 1개를 반영해 문단을 다시 작성하세요."
          />
        </label>
      </div>
      <details className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3">
        <summary className="cursor-pointer text-xs font-medium text-[color:var(--muted)]">세부 입력 보기 (선택)</summary>
        <div className="mt-3 space-y-3">
          <label className="block space-y-2">
            <span className="text-sm text-[color:var(--foreground-strong)]">보강할 논점 1개</span>
            <Textarea
              value={form.userReasonText}
              onChange={(event) => {
                update("userReasonText", event.target.value);
                update("missingIssue", event.target.value);
              }}
              className="min-h-28 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[color:var(--foreground-strong)]">rewrite 지시</span>
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
    <section className="rounded-[var(--radius-card)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--cue-review)]">문단 다시쓰기 컨텍스트</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">{title}</h3>
      <div className="mt-4 grid gap-3">
        <PreviewLine label="가장 큰 간극" value={biggestGap} />
        <PreviewLine label="다시쓰기 지시" value={rewriteInstruction} />
      </div>
      <details className="mt-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[color:var(--foreground-strong)]">
          비교 요약 펼쳐서 보기
        </summary>
        <div className="grid gap-3 border-t border-[color:var(--border-subtle)] p-4 lg:grid-cols-2">
          <PreviewLine label="기준 답안 요약" value={referenceSummary} />
          <PreviewLine label="내 답안 요약" value={myAnswerSummary} />
        </div>
      </details>
      <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
        전체 답안이 아니라 한 문단만 다시 씁니다. 위 간극 1개만 반영해 짧고 정확하게 작성하세요.
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
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--muted)]">실행 입력</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">보강 문단을 바로 작성합니다</h3>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">하나의 간극만 보강한 문단으로 저장하면 다음 review 일정이 자동 연결됩니다.</p>
      <label className="mt-4 block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">다시 쓴 문단</span>
        <Textarea
          value={form.rewriteParagraph}
          onChange={(event) => {
            update("rewriteParagraph", event.target.value);
          }}
          className="min-h-64 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
          placeholder="누락 논점 1개를 반영해 문단을 다시 작성하세요."
        />
      </label>
      <label className="mt-4 block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">보강할 논점 1개</span>
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

function PreviewLine({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-strong)]">{value?.trim() ? value : "확인 필요"}</p>
    </div>
  );
}
