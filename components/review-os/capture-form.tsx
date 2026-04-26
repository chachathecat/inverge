"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  MISTAKE_REASON_PRESETS,
  SECOND_TASK_PRESETS,
  type ConfidenceLevel,
  type SourceType,
} from "@/lib/review-os/types";

type CaptureFormProps = {
  userId: string;
  mode: AppraisalMode;
  initialPreferredSubjects?: string[];
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
};

const SECOND_DEFAULTS: Record<string, { structure: string; issue: string; sentence: string; rewrite: string; caseSummary: string }> = {
  감정평가실무: {
    structure: "문제 요구 -> 평가 근거 -> 계산 -> 결론",
    issue: "계산 근거 또는 적용 조건 누락",
    sentence: "평가 절차와 계산 근거를 분리해 적습니다.",
    rewrite: "빠진 평가 근거 1개를 먼저 보강하고 8~10줄로 다시 씁니다.",
    caseSummary: "평가 절차와 계산 근거를 확인할 사례입니다.",
  },
  감정평가이론: {
    structure: "정의 -> 논점 -> 사례 적용 -> 결론",
    issue: "개념 정의 뒤 사례 적용 문장 부족",
    sentence: "이론 개념을 사례 사실관계에 연결하는 문장을 추가합니다.",
    rewrite: "정의 2줄, 적용 4줄, 결론 1줄로 다시 씁니다.",
    caseSummary: "이론 개념을 사례에 적용해야 하는 문제입니다.",
  },
  "감정평가 및 보상법규": {
    structure: "요건 -> 절차 -> 조문/법리 -> 사안 포섭",
    issue: "요건 또는 조문 적용 누락",
    sentence: "요건 충족 여부를 사안 사실과 직접 연결합니다.",
    rewrite: "누락된 요건 1개와 사안 포섭 문장 1개를 보강합니다.",
    caseSummary: "요건과 절차를 사안에 포섭해야 하는 문제입니다.",
  },
};

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
  return SECOND_DEFAULTS[subject] ?? {
    structure: "문제 요구 -> 논점 -> 적용 -> 결론",
    issue: "핵심 논점 또는 적용 문장 누락",
    sentence: "논점을 사례 사실관계에 연결하는 문장을 추가합니다.",
    rewrite: "누락 논점 1개를 먼저 표시하고 짧게 다시 씁니다.",
    caseSummary: "답안 구조와 누락 논점을 확인할 사례입니다.",
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

export function WrongAnswerCaptureForm({
  userId,
  mode,
  initialPreferredSubjects = [],
  workflow = "default",
  rewriteContext = null,
}: CaptureFormProps) {
  const router = useRouter();
  const config = getModeConfig(mode);
  const storageKey = { userId, feature: "capture-draft", entityId: mode };
  const initialSubject =
    initialPreferredSubjects.find((subject) => (config.subjects as readonly string[]).includes(subject)) ?? getDefaultSubject(mode);
  const [form, setForm] = useState<DraftState>(() => {
    const saved = loadReviewOsDraft<DraftState>(storageKey);
    if (saved) {
      return {
        ...saved,
        subjectLabel: normalizeSubjectForMode(saved.subjectLabel, mode),
      };
    }
    return {
        subjectLabel: initialSubject,
        sourceType: "manual",
        sourceLabel: "",
        problemTitle: rewriteContext?.sourceTitle ?? "",
        problemIdentifier: mode === "second" ? SECOND_TASK_PRESETS[0] : "",
        rawQuestionText: "",
        correctAnswer: rewriteContext?.referenceSummary ?? "",
        userAnswer: "",
        userReasonText: rewriteContext?.biggestGap ?? (mode === "second" ? secondDefaults(initialSubject).issue : firstDefaults(initialSubject).reason),
        userReasonPreset: "",
        confidence: "중간",
        timeSpentSeconds: "",
        nextReviewDate: getDefaultNextReviewDate(mode),
        keyConcepts: firstDefaults(initialSubject).concepts,
        coreFormula: firstDefaults(initialSubject).formula,
        comparisonPoint: firstDefaults(initialSubject).comparison,
        missingIssue: rewriteContext?.biggestGap ?? secondDefaults(initialSubject).issue,
        weakStructurePoint: secondDefaults(initialSubject).structure,
        weakApplicationSentence: secondDefaults(initialSubject).sentence,
        rewriteInstruction: rewriteContext?.rewriteInstruction ?? secondDefaults(initialSubject).rewrite,
        referenceStructure: secondDefaults(initialSubject).structure,
        myAnswerSummary: rewriteContext?.myAnswerSummary ?? "",
        caseSummary: secondDefaults(initialSubject).caseSummary,
        issueRecall: "",
        outlineDraft: "",
        productionBeforeComparison: mode === "second",
        referenceAnswerAddedAfterProduction: mode === "second",
        biggestGap: rewriteContext?.biggestGap ?? secondDefaults(initialSubject).issue,
        rawOcrText: "",
        rawExtractionJson: {},
        normalizedDraft: undefined,
        extractionNeedsReview: false,
      };
  });
  const secondWriteEnabled = mode === "second" && workflow === "second-write" && !rewriteContext;
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
  >(rewriteContext && mode === "second" ? "confirm" : secondWriteEnabled ? "second-issue-recall" : "intake");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const missingConfirmationFields = getMissingConfirmationFields(form, mode);
  const needsOcrConfirmation = Boolean(form.extractionNeedsReview || missingConfirmationFields.length > 0);

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
    const subject = pickSubject(sourceText, config.subjects, base.subjectLabel || initialSubject);
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
    try {
      const body = new FormData();
      body.append("mode", mode);
      body.append("text", text);
      body.append("source_label", form.sourceLabel);
      const response = await fetch("/api/inverge/ocr", { method: "POST", body });
      const extraction = (await response.json()) as ({ ok?: boolean; error?: string } & ExtractionPipelineResult);
      if (!response.ok || !extraction.ok) {
        setExtractError(extraction.error ?? "구조 초안을 만들지 못했습니다.");
        return;
      }
      setForm(persist(applyExtraction(form, extraction)));
      setStage("preview");
    } catch {
      setExtractError("구조 초안을 만들지 못했습니다.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleImageImport(file: File) {
    setExtracting(true);
    setExtractError("");
    try {
      const body = new FormData();
      body.append("mode", mode);
      body.append("images", file);
      const response = await fetch("/api/inverge/ocr", { method: "POST", body });
      const result = (await response.json()) as ({ ok?: boolean; text?: string; extractedText?: string; error?: string } & ExtractionPipelineResult);
      if (!response.ok || !result.ok) {
        setExtractError(result.error ?? "이미지에서 텍스트를 불러오지 못했습니다.");
        return;
      }
      const extractedText = result.text ?? result.extractedText ?? "";
      const base: DraftState = {
        ...form,
        sourceType: "image",
        sourceLabel: file.name,
        rawQuestionText: extractedText || form.rawQuestionText,
      };
      setForm(persist(result.normalized_draft ? applyExtraction(base, result) : buildStructuredDraft(base, extractedText || base.rawQuestionText)));
      setStage("preview");
    } catch {
      setExtractError("이미지에서 텍스트를 불러오지 못했습니다.");
    } finally {
      setExtracting(false);
    }
  }

  function handlePdfImport(file: File) {
    setForm((prev) =>
      persist({
        ...prev,
        sourceType: "pdf",
        sourceLabel: file.name,
      }),
    );
    setExtractError("PDF는 이번 v1에서 파일명과 원문 보관까지만 지원합니다. 필요한 텍스트를 붙여넣고 초안을 만드세요.");
  }

  function resetDraft() {
    clearReviewOsDraft(storageKey);
    setStage("intake");
    setError("");
    setExtractError("");
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
      if (needsOcrConfirmation) {
        const missingLabels = missingConfirmationFields.map((field) => field.label).join(", ");
        setError(
          missingLabels
            ? `OCR 확인 필요: ${missingLabels} 항목을 확인해 주세요.`
            : "OCR 확인 필요: 추출 초안을 다시 확인한 뒤 저장해 주세요.",
        );
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
          correctAnswer: form.correctAnswer || "-",
          userAnswer: form.userAnswer || "-",
          userReasonText: form.userReasonText || undefined,
          userReasonPreset: form.userReasonPreset || undefined,
          confidence: form.confidence,
          timeSpentSeconds: form.timeSpentSeconds ? Number(form.timeSpentSeconds) : undefined,
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
              problemTitle: form.problemTitle,
              rewrite_source_item_id: rewriteContext?.sourceItemId ?? null,
              rewrite_source_gap: rewriteContext?.biggestGap ?? null,
              rewrite_instruction: form.rewriteInstruction || rewriteContext?.rewriteInstruction || null,
              rewrite_completed: mode === "second" && Boolean(rewriteContext),
              issue_recall: form.issueRecall || null,
              outline_draft: form.outlineDraft || null,
              production_before_comparison: mode === "second" ? form.productionBeforeComparison : null,
              produced_answer_before_reference: mode === "second" ? form.productionBeforeComparison : null,
              reference_answer_added_after_production:
                mode === "second" ? form.referenceAnswerAddedAfterProduction : null,
              biggest_gap: mode === "second" ? form.biggestGap || form.missingIssue || null : null,
            },
          },
          issueRecall: form.issueRecall || undefined,
          outlineDraft: form.outlineDraft || undefined,
          productionBeforeComparison: mode === "second" ? form.productionBeforeComparison : undefined,
          referenceAnswerAddedAfterProduction: mode === "second" ? form.referenceAnswerAddedAfterProduction : undefined,
          biggestGap: mode === "second" ? form.biggestGap || form.missingIssue || undefined : undefined,
          rewriteSourceItemId: rewriteContext?.sourceItemId ?? undefined,
          rewriteSourceGap: rewriteContext?.biggestGap ?? undefined,
          rewriteCompleted: mode === "second" && Boolean(rewriteContext),
        }),
      });
      const result = (await response.json()) as { ok?: boolean; item?: { id: string } };
      if (!response.ok || !result.ok || !result.item) {
        setError("항목을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      clearReviewOsDraft(storageKey);
      router.push(`/app/items/${result.item.id}?mode=${mode}`);
      router.refresh();
    } catch {
      setError("항목을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
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
          {stage === "second-issue-recall" ? (
            <SecondIssueRecallPanel issueRecall={form.issueRecall} onChange={(value) => update("issueRecall", value)} onNext={() => setStage("second-outline")} />
          ) : null}
          {stage === "second-outline" ? (
            <SecondOutlinePanel outlineDraft={form.outlineDraft} onChange={(value) => update("outlineDraft", value)} onNext={() => setStage("second-answer")} />
          ) : null}
          {stage === "second-answer" ? (
            <SecondAnswerPanel
              answer={form.userAnswer}
              onChange={(value) => {
                update("userAnswer", value);
                update("myAnswerSummary", firstLine(value, form.myAnswerSummary || "내 답안 요약"));
              }}
              onNext={() => setStage("second-reference")}
            />
          ) : null}
          {stage === "second-reference" ? (
            <SecondReferencePanel
              reference={form.correctAnswer}
              onChange={(value) => update("correctAnswer", value)}
              onNext={() => setStage("second-gap")}
            />
          ) : null}
          {stage === "second-gap" ? (
            <SecondGapPanel
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
            <SecondGapRewritePanel form={form} update={update} onBack={() => setStage("second-gap")} />
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
            needsOcrConfirmation={needsOcrConfirmation}
            missingConfirmationFields={missingConfirmationFields.map((field) => field.label)}
            update={update}
            updateSubject={updateSubject}
            onImage={handleImageImport}
            onPdf={handlePdfImport}
            onGenerate={() => generateStructuredDraft()}
          />

          {stage !== "intake" ? (
            <ExtractionPreview
              form={form}
              mode={mode}
              needsOcrConfirmation={needsOcrConfirmation}
              missingConfirmationFields={missingConfirmationFields.map((field) => field.label)}
              onEdit={() => setStage(mode === "second" ? "second-answer" : "confirm")}
              onRegenerate={() => generateStructuredDraft()}
            />
          ) : null}

          {stage === "confirm" ? (
            <ConfirmPanel form={form} mode={mode} config={config} update={update} updateSubject={updateSubject} />
          ) : null}
          {mode === "second" && stage === "second-issue-recall" ? (
            <SecondIssueRecallPanel issueRecall={form.issueRecall} onChange={(value) => update("issueRecall", value)} onNext={() => setStage("second-outline")} />
          ) : null}
          {mode === "second" && stage === "second-outline" ? (
            <SecondOutlinePanel outlineDraft={form.outlineDraft} onChange={(value) => update("outlineDraft", value)} onNext={() => setStage("second-answer")} />
          ) : null}
          {mode === "second" && stage === "second-answer" ? (
            <SecondAnswerPanel
              answer={form.userAnswer}
              onChange={(value) => {
                update("userAnswer", value);
                update("myAnswerSummary", firstLine(value, form.myAnswerSummary || "내 답안 요약"));
              }}
              onNext={() => setStage("second-reference")}
            />
          ) : null}
          {mode === "second" && stage === "second-reference" ? (
            <SecondReferencePanel reference={form.correctAnswer} onChange={(value) => update("correctAnswer", value)} onNext={() => setStage("second-gap")} />
          ) : null}
          {mode === "second" && stage === "second-gap" ? (
            <SecondGapPanel
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
            <SecondGapRewritePanel form={form} update={update} onBack={() => setStage("second-gap")} />
          ) : null}
        </>
      )}

      {error ? <p className="text-sm text-[color:var(--status-red)]">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        {rewriteContext && mode === "second" ? (
          <Button type="submit" disabled={submitting || !form.userAnswer.trim()} className="w-full sm:w-auto">
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
        ) : (
          <Button
            type="submit"
            disabled={submitting || stage === "intake" || (mode === "second" && stage !== "second-rewrite" && stage !== "confirm")}
            className="w-full sm:w-auto"
          >
            {submitting ? "구조화 중" : mode === "second" ? "교정노트 저장" : "오답노트 저장"}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={resetDraft} className="w-full sm:w-auto">
          임시 입력 지우기
        </Button>
      </div>
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
  onImage,
  onPdf,
  onGenerate,
}: FieldProps & {
  config: ReturnType<typeof getModeConfig>;
  extracting: boolean;
  extractError: string;
  updateSubject: (value: string) => void;
  needsOcrConfirmation: boolean;
  missingConfirmationFields: string[];
  onImage: (file: File) => void;
  onPdf: (file: File) => void;
  onGenerate: () => void | Promise<void>;
}) {
  const calculatorWorkflow = getCalculatorWorkflowForSubject(form.subjectLabel);

  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--brand-700)]">Step 1. 입력 선택</p>
      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-[62ch]">
          <h3 className="text-title text-[color:var(--foreground-strong)]">
            {mode === "second" ? "텍스트 원문으로 교정 초안을 만듭니다" : "텍스트 원문으로 오답 초안을 만듭니다"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            {mode === "second"
              ? "사진은 초안 추출용입니다. 저장 전 반드시 과목/기준 답안/내 답안/가장 큰 간극을 확인합니다. OCR 결과는 사용자가 확인한 뒤 저장됩니다."
              : "사진은 초안 추출용입니다. 저장 전 반드시 과목/정답/내 답/오답 원인/회상 문장을 확인합니다. OCR 결과는 사용자가 확인한 뒤 저장됩니다."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--bg-surface)] px-5 py-3 text-sm font-medium text-[color:var(--foreground-strong)] sm:w-auto">
            사진 업로드 (OCR 초안)
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImage(file);
              }}
            />
          </label>
          <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--bg-surface)] px-5 py-3 text-sm text-[color:var(--foreground-strong)] sm:w-auto">
            PDF 보관
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onPdf(file);
              }}
            />
          </label>
        </div>
      </div>
      <div className="mt-5">
        <SubjectSelect
          subjectLabel={config.subjectLabel}
          subjects={config.subjects}
          value={form.subjectLabel}
          onChange={updateSubject}
          className="form-control w-full"
        />
      </div>
      <label className="mt-5 block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">
          {mode === "second" ? "사례 / 기준 답안 / 내 답안 텍스트" : "문제 / 정답 / 내가 고른 답 텍스트"}
        </span>
        <Textarea
          value={form.rawQuestionText}
          onChange={(event) => update("rawQuestionText", event.target.value)}
          placeholder={
            mode === "second"
              ? "권장: 사례, 기준 답안, 내 답안을 텍스트로 붙여넣으세요. 예: 기준 답안: ... / 내 답안: ..."
              : "권장: 문제와 정답, 내가 고른 답을 텍스트로 붙여넣으세요. 예: 정답: 3 / 내 답: 2"
          }
          className="min-h-52 border-[var(--border)] bg-[color:var(--bg-surface)] text-[color:var(--foreground-strong)] leading-7"
        />
      </label>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" onClick={onGenerate} disabled={extracting} className="w-full sm:w-auto">
          {extracting ? "추출 중" : "구조 초안 만들기"}
        </Button>
        {form.sourceLabel ? <p className="text-sm text-[color:var(--muted)]">보관한 파일: {form.sourceLabel}</p> : null}
      </div>
      <p className="mt-3 text-caption leading-5 text-[color:var(--muted)]">텍스트 붙여넣기/수기 입력 경로는 계속 사용할 수 있습니다.</p>
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
    </section>
  );
}

function ExtractionPreview({
  form,
  mode,
  needsOcrConfirmation,
  missingConfirmationFields,
  onEdit,
  onRegenerate,
}: {
  form: DraftState;
  mode: AppraisalMode;
  needsOcrConfirmation: boolean;
  missingConfirmationFields: string[];
  onEdit: () => void;
  onRegenerate: () => void;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-caption text-[color:var(--muted)]">Step 2. Extraction preview</p>
          <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">
            {mode === "second" ? "교정노트 초안" : "오답노트 초안"}
          </h3>
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
          OCR 확인 필요{missingConfirmationFields.length > 0 ? `: ${missingConfirmationFields.join(", ")}` : ""}. 필드 확인 후 저장할 수 있습니다.
        </p>
      ) : null}
      {mode === "first" ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <PreviewLine label="과목 추정" value={form.subjectLabel} />
          <PreviewLine label="문제 제목" value={form.problemTitle} />
          <PreviewLine label="정답" value={form.correctAnswer || "확인 필요"} />
          <PreviewLine label="내 답" value={form.userAnswer || "확인 필요"} />
          <PreviewLine label="왜 틀렸는지" value={form.userReasonText} />
          <PreviewLine label="핵심 개념" value={form.keyConcepts} />
          <PreviewLine label="핵심 공식" value={form.coreFormula} />
          <PreviewLine label="다음 review" value={form.nextReviewDate} />
        </div>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <PreviewLine label="과목 추정" value={form.subjectLabel} />
          <PreviewLine label="사례 요약" value={form.caseSummary} />
          <PreviewLine label="기준 답안 구조" value={form.referenceStructure} />
          <PreviewLine label="내 답안 요약" value={form.myAnswerSummary || "확인 필요"} />
          <PreviewLine label="누락 논점" value={form.missingIssue} />
          <PreviewLine label="약한 문장" value={form.weakApplicationSentence} />
          <PreviewLine label="구조 약점" value={form.weakStructurePoint} />
          <PreviewLine label="rewrite 지시" value={form.rewriteInstruction} />
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
      <p className="text-caption text-[color:var(--muted)]">Step 3. Confirm</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">필수 항목만 확인합니다</h3>
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
          <span className="text-sm text-[color:var(--foreground-strong)]">출처/세트</span>
          <input
            value={form.sourceLabel}
            onChange={(event) => update("sourceLabel", event.target.value)}
            className="form-control"
            placeholder="예: 2025 모의고사 3회"
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
  issueRecall,
  onChange,
  onNext,
}: {
  issueRecall: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--muted)]">Step 1. 쟁점 회상</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">기준 답안 보기 전에 쟁점 3개를 먼저 적습니다</h3>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">기준 답안 보기 전에 쟁점 3개를 먼저 떠올립니다.</p>
      <label className="mt-4 block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">쟁점 회상</span>
        <Textarea
          value={issueRecall}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-44 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
          placeholder={"1) \n2) \n3) "}
        />
      </label>
      <Button type="button" className="mt-4 w-full sm:w-auto" disabled={issueRecall.trim().length < 8} onClick={onNext}>
        다음: 목차 작성
      </Button>
    </section>
  );
}

function SecondOutlinePanel({
  outlineDraft,
  onChange,
  onNext,
}: {
  outlineDraft: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--muted)]">Step 2. 목차 작성</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">전체 답안보다 목차를 먼저 잡습니다</h3>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">답안 작성 전에 목차를 먼저 잡아보세요.</p>
      <label className="mt-4 block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">목차 초안</span>
        <Textarea
          value={outlineDraft}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-44 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
          placeholder={"I. \nII. \nIII. "}
        />
      </label>
      <Button type="button" className="mt-4 w-full sm:w-auto" disabled={outlineDraft.trim().length < 8} onClick={onNext}>
        다음: 내 답안 작성
      </Button>
    </section>
  );
}

function SecondAnswerPanel({
  answer,
  onChange,
  onNext,
}: {
  answer: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--muted)]">Step 3. 내 답안 작성</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">비교는 작성 이후에 합니다</h3>
      <label className="mt-4 block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">내 답안</span>
        <Textarea
          value={answer}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-56 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
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
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">작성 이후에 기준답안을 입력합니다</h3>
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
  biggestGap,
  onChange,
  onNext,
}: {
  biggestGap: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--muted)]">Step 5. 가장 큰 간극 1개</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">오늘은 간극 1개만 고칩니다</h3>
      <label className="mt-4 block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">보강할 논점 1개</span>
        <Textarea
          value={biggestGap}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-32 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)] leading-7"
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
  update,
  onBack,
}: {
  form: DraftState;
  update: <K extends keyof DraftState>(key: K, value: DraftState[K]) => void;
  onBack: () => void;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] p-4 sm:p-5">
      <p className="text-caption text-[color:var(--muted)]">Step 6. 문단 다시쓰기</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">한 문단 다시쓰기로 보강을 마무리합니다</h3>
      <div className="mt-4 space-y-4">
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
      </div>
      <button type="button" onClick={onBack} className="mt-4 text-xs text-[color:var(--muted)] underline-offset-2 hover:underline">
        이전 단계로 돌아가기
      </button>
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
          value={form.userAnswer}
          onChange={(event) => {
            update("userAnswer", event.target.value);
            update("myAnswerSummary", firstLine(event.target.value, form.myAnswerSummary || "문단 다시쓰기"));
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
