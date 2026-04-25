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
import { CONFIDENCE_OPTIONS, MISTAKE_REASON_PRESETS, SECOND_TASK_PRESETS, type ConfidenceLevel, type SourceType } from "@/lib/review-os/types";

type CaptureFormProps = {
  userId: string;
  mode: AppraisalMode;
  initialPreferredSubjects?: string[];
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
  rawOcrText?: string;
  rawExtractionJson?: Record<string, unknown>;
  normalizedDraft?: ExtractionDraft;
  extractionNeedsReview?: boolean;
};

const FIRST_DEFAULTS: Record<string, { concepts: string; formula: string; comparison: string; reason: string }> = {
  민법: {
    concepts: "요건, 효과, 예외",
    formula: "요건 -> 효과 -> 예외",
    comparison: "원칙과 예외를 같은 문장 안에서 구분합니다.",
    reason: "조건 누락 또는 원칙/예외 구분이 흐려졌습니다.",
  },
  경제학원론: {
    concepts: "수요, 공급, 균형",
    formula: "정의 -> 그래프 이동 -> 균형 변화",
    comparison: "곡선 이동과 곡선 위 이동을 구분합니다.",
    reason: "그래프 이동 방향 또는 균형 변화 판단이 흔들렸습니다.",
  },
  회계학: {
    concepts: "분개, 금액, 표시",
    formula: "분개 -> 금액 -> 재무제표 표시",
    comparison: "인식 시점과 측정 금액을 분리합니다.",
    reason: "분개 순서 또는 금액 산정 기준을 놓쳤습니다.",
  },
  부동산학원론: {
    concepts: "개념, 기준, 적용",
    formula: "개념 -> 계산 기준 -> 적용 조건",
    comparison: "정의와 계산 조건을 분리합니다.",
    reason: "개념 정의와 적용 조건이 섞였습니다.",
  },
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
  return FIRST_DEFAULTS[subject] ?? {
    concepts: "개념, 조건, 적용",
    formula: "개념 -> 조건 -> 적용",
    comparison: "정답 근거와 내가 고른 판단의 차이를 분리합니다.",
    reason: "정답 근거와 선택 근거가 갈라진 지점을 놓쳤습니다.",
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

export function WrongAnswerCaptureForm({ userId, mode, initialPreferredSubjects = [], rewriteContext = null }: CaptureFormProps) {
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
        rawOcrText: "",
        rawExtractionJson: {},
        normalizedDraft: undefined,
        extractionNeedsReview: false,
      };
  });
  const [stage, setStage] = useState<"intake" | "preview" | "confirm">(rewriteContext && mode === "second" ? "confirm" : "intake");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");

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
            },
          },
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
      ) : (
        <>
          <IntakePanel
            form={form}
            mode={mode}
            extracting={extracting}
            extractError={extractError}
            update={update}
            onImage={handleImageImport}
            onPdf={handlePdfImport}
            onGenerate={() => generateStructuredDraft()}
          />

          {stage !== "intake" ? (
            <ExtractionPreview form={form} mode={mode} onEdit={() => setStage("confirm")} onRegenerate={() => generateStructuredDraft()} />
          ) : null}

          {stage === "confirm" ? (
            <ConfirmPanel form={form} mode={mode} config={config} update={update} updateSubject={updateSubject} />
          ) : null}
        </>
      )}

      {error ? <p className="text-sm text-[color:var(--status-red)]">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        {rewriteContext && mode === "second" ? (
          <Button type="submit" disabled={submitting || !form.userAnswer.trim()}>
            {submitting ? "저장 중" : "문단 다시쓰기 저장"}
          </Button>
        ) : stage === "preview" ? (
          <Button type="button" onClick={() => setStage("confirm")}>
            확인하고 저장하기
          </Button>
        ) : (
          <Button type="submit" disabled={submitting || stage === "intake"}>
            {submitting ? "구조화 중" : mode === "second" ? "교정노트 저장" : "오답노트 저장"}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={resetDraft}>
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

function IntakePanel({
  form,
  mode,
  extracting,
  extractError,
  update,
  onImage,
  onPdf,
  onGenerate,
}: FieldProps & {
  extracting: boolean;
  extractError: string;
  onImage: (file: File) => void;
  onPdf: (file: File) => void;
  onGenerate: () => void | Promise<void>;
}) {
  const calculatorWorkflow = getCalculatorWorkflowForSubject(form.subjectLabel);

  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] p-5">
      <p className="text-caption text-[color:var(--brand-700)]">Step 1. Text transcript</p>
      <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-[62ch]">
          <h3 className="text-title text-[color:var(--foreground-strong)]">
            {mode === "second" ? "텍스트 원문으로 교정 초안을 만듭니다" : "텍스트 원문으로 오답 초안을 만듭니다"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            {mode === "second"
              ? "닫힌 alpha에서는 붙여넣은 사례, 기준 답안, 내 답안 텍스트가 가장 안정적입니다. 이미지와 PDF는 보관 또는 실험용으로만 다룹니다."
              : "닫힌 alpha에서는 붙여넣은 문제, 정답, 내 답 텍스트가 가장 안정적입니다. 이미지와 PDF는 보관 또는 실험용으로만 다룹니다."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--bg-surface)] px-4 py-2 text-sm text-[color:var(--foreground-strong)]">
            이미지 보관 / 실험
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
          <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[color:var(--border-strong)] bg-[color:var(--bg-surface)] px-4 py-2 text-sm text-[color:var(--foreground-strong)]">
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
          className="min-h-36 border-[var(--border)] bg-[color:var(--bg-surface)] text-[color:var(--foreground-strong)]"
        />
      </label>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" onClick={onGenerate} disabled={extracting}>
          {extracting ? "추출 중" : "구조 초안 만들기"}
        </Button>
        {form.sourceLabel ? <p className="text-sm text-[color:var(--muted)]">보관한 파일: {form.sourceLabel}</p> : null}
      </div>
      <p className="mt-3 text-caption leading-5 text-[color:var(--muted)]">
        이미지/PDF는 현재 실험 범위입니다. alpha 검증은 텍스트 원문을 기준으로 진행합니다.
      </p>
      {calculatorWorkflow ? (
        <div className="mt-4 rounded-2xl border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] px-4 py-3">
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
      {form.extractionNeedsReview ? (
        <p className="mt-3 rounded-2xl border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--foreground-strong)]">
          초안 값은 저장 전 확인이 필요합니다. 과목, 답, 보강 논점만 한 번 더 고정하세요.
        </p>
      ) : null}
      {extractError ? <p className="mt-3 text-sm leading-6 text-[color:var(--cue-risk)]">{extractError}</p> : null}
    </section>
  );
}

function ExtractionPreview({
  form,
  mode,
  onEdit,
  onRegenerate,
}: {
  form: DraftState;
  mode: AppraisalMode;
  onEdit: () => void;
  onRegenerate: () => void;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
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
      {mode === "first" ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
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
        <div className="mt-5 grid gap-3 md:grid-cols-2">
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
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
      <p className="text-caption text-[color:var(--muted)]">Step 3. Confirm</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">필수 항목만 확인합니다</h3>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">{config.subjectLabel}</span>
          <select
            value={form.subjectLabel}
            onChange={(event) => updateSubject(event.target.value)}
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
          >
            {config.subjects.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">{mode === "second" ? "작업 단계" : "회차 / 번호"}</span>
          {mode === "second" ? (
            <select
              value={form.problemIdentifier}
              onChange={(event) => update("problemIdentifier", event.target.value)}
              className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
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
              className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
              placeholder="예: 2024 기출 / 12번"
            />
          )}
        </label>
      </div>

      {mode === "first" ? <FirstConfirmFields form={form} mode={mode} update={update} /> : <SecondConfirmFields form={form} mode={mode} update={update} />}

      <div className={`mt-5 grid gap-4 ${mode === "second" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {mode === "second" ? (
          <label className="space-y-2">
            <span className="text-sm text-[color:var(--foreground-strong)]">분류</span>
            <select
              value={form.userReasonPreset}
              onChange={(event) => update("userReasonPreset", event.target.value)}
              className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
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
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
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
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
          />
        </label>
      </div>

      <details className="mt-5 rounded-2xl border border-[color:var(--border-subtle)] p-4">
        <summary className="cursor-pointer text-sm font-medium text-[color:var(--foreground-strong)]">저장될 원문 보기</summary>
        <Textarea
          value={form.rawQuestionText}
          onChange={(event) => update("rawQuestionText", event.target.value)}
          className="mt-4 min-h-32 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)]"
        />
      </details>
    </section>
  );
}

function FirstConfirmFields(props: FieldProps) {
  const { form, update } = props;
  return (
    <div className="mt-5 space-y-4">
      <section className="rounded-2xl border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] px-4 py-3">
        <p className="text-sm font-medium text-[color:var(--foreground-strong)]">해설 보기 전에 회상 먼저</p>
        <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
          해설 보기 전에, 이 선지가 틀린 이유를 한 문장으로 적어보세요. 이 한 줄이 다음 retry 기준이 됩니다.
        </p>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">정답</span>
          <input
            value={form.correctAnswer}
            onChange={(event) => update("correctAnswer", event.target.value)}
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">내가 고른 답</span>
          <input
            value={form.userAnswer}
            onChange={(event) => update("userAnswer", event.target.value)}
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
          />
        </label>
      </div>
      <label className="space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">실수 원인 분류 (1차)</span>
        <select
          value={form.userReasonPreset}
          onChange={(event) => update("userReasonPreset", event.target.value)}
          className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
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
          className="min-h-20 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)]"
          placeholder="예: 조문 예외 요건을 확인하지 않고 일반 원칙만 보고 2번을 골랐습니다."
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">왜 틀렸는지</span>
        <Textarea
          value={form.userReasonText}
          onChange={(event) => update("userReasonText", event.target.value)}
          className="min-h-24 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)]"
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
          className="min-h-24 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)]"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">내 답안 요약</span>
          <input
            value={form.myAnswerSummary}
            onChange={(event) => update("myAnswerSummary", event.target.value)}
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-[color:var(--foreground-strong)]">rewrite 지시</span>
          <input
            value={form.rewriteInstruction}
            onChange={(event) => update("rewriteInstruction", event.target.value)}
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
          />
        </label>
      </div>
    </div>
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
    <section className="rounded-[var(--radius-card)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] p-5">
      <p className="text-caption text-[color:var(--cue-review)]">문단 다시쓰기 컨텍스트</p>
      <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">{title}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <PreviewLine label="가장 큰 간극" value={biggestGap} />
        <PreviewLine label="다시쓰기 지시" value={rewriteInstruction} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <PreviewLine label="기준 답안 요약" value={referenceSummary} />
        <PreviewLine label="내 답안 요약" value={myAnswerSummary} />
      </div>
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
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
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
          className="min-h-44 border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)]"
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
          className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
        />
      </label>
    </section>
  );
}

function PreviewLine({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-strong)]">{value?.trim() ? value : "확인 필요"}</p>
    </div>
  );
}
