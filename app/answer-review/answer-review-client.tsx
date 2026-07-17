"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ButtonHTMLAttributes, ChangeEvent, ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import {
  RefinedBadge,
  RefinedShell,
} from "@/components/inverge/refined-primitives";
import {
  BiggestGap,
  TrustEvidenceBar,
  V3ActionButton,
  V3ActionLink,
  V3RouteFrame,
} from "@/components/learner";
import { FailureAwareState } from "@/components/learner/failure-aware-state";
import { CognitiveLearningActionCard } from "@/components/review-os/cognitive-learning-action-card";
import { TrustProvenanceLayer } from "@/components/review-os/trust-provenance-layer";
import {
  CalculatorRoutineTrainer,
  type CalculatorRoutineDraftReference,
  type CalculatorRoutineReferenceHints,
} from "@/components/review-os/calculator-routine-trainer";
import {
  CalculatorRoutineSyncStatusLine,
  useCalculatorRoutineLearningSignalSync,
} from "@/components/review-os/calculator-routine-sync-status";
import { ResultFeedbackPrompt } from "@/components/shared/result-feedback-prompt";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  normalizeAnswerReviewStructureDraft,
  type AnswerReviewExplanationLevel,
  type AnswerReviewStructureDraft,
} from "@/lib/evaluate/answer-review-structure";
import { buildAnswerReviewQualityView } from "@/lib/evaluate/answer-review-quality";
import {
  getDefaultSubject,
  normalizeSubjectForMode,
  parseAppraisalMode,
  type AppraisalMode,
} from "@/lib/review-os/appraisal";
import {
  getCalculatorRoutineEligibility,
  getCalculatorRoutineIdFromDraftStorageKey,
} from "@/lib/review-os/calculator-routine";
import { buildCognitiveLearningActionUnit } from "@/lib/review-os/cognitive-learning-actions";
import {
  APPRAISAL_FIRST_SUBJECTS,
  APPRAISAL_SECOND_SUBJECTS,
} from "@/lib/review-os/types";
import type { TrustProvenanceEvidence } from "@/lib/review-os/trust-provenance";
import { cn } from "@/lib/utils";

type InputStatusCardProps = {
  title: string;
  statusText: string;
  helper: string;
  isSecond?: boolean;
};

type StepId = 1 | 2 | 3;
type ViewerMode = "anonymous" | "authenticated";
type StructureErrorAction = "retry" | "edit_input" | "login" | "pricing";

type AnswerReviewClientPageProps = {
  viewerMode?: ViewerMode;
  userEmail?: string | null;
  initialExamMode?: AppraisalMode;
  initialSubject?: string | null;
};

type ProblemSnapAnswerReviewHandoff = {
  source: "problem-snap";
  examMode?: AppraisalMode;
  subject?: string;
  problemSummary?: string;
  problemText?: string;
  retryMemo?: string;
  nextPracticeAction?: string;
  calculatorRoutineId?: string;
  calculatorRoutineDraftKey?: string;
};

const SECTION_FADE = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const CARD_TEXT_MAX_LENGTH = 200;
const DETAILS_TEXT_MAX_LENGTH = 560;
const FILE_NAME_MAX_LENGTH = 34;

const STEP_ITEMS: Array<{ id: StepId; label: string }> = [
  { id: 1, label: "자료 입력" },
  { id: 2, label: "검토 결과 확인" },
  { id: 3, label: "보강 문단 정리" },
];

function AnswerReviewFrame({
  isSecond,
  children,
}: {
  isSecond: boolean;
  children: ReactNode;
}) {
  const contractProps = {
    "data-s224v-surface": isSecond
      ? "/answer-review?mode=second"
      : "/answer-review?mode=first",
    "data-answer-review-presentation": isSecond ? "v3" : "legacy",
  } as const;

  if (isSecond) {
    return (
      <div className="space-y-5 py-6 sm:space-y-8 sm:py-10" {...contractProps}>
        <V3RouteFrame
          width="content"
          className="mx-auto space-y-5 px-5 sm:space-y-8 md:px-8"
        >
          {children}
        </V3RouteFrame>
      </div>
    );
  }

  return (
    <RefinedShell
      className="space-y-5 py-6 sm:space-y-8 sm:py-10"
      {...contractProps}
    >
      {children}
    </RefinedShell>
  );
}

function AnswerReviewGapContainer({
  isSecond,
  children,
}: {
  isSecond: boolean;
  children: ReactNode;
}) {
  const contractProps = {
    "data-answer-review-result-loop": true,
    "data-s224v-one-gap-feedback-card": true,
    "data-s232e4-biggest-gap": true,
  } as const;

  return isSecond ? (
    <div className="space-y-4" {...contractProps}>
      {children}
    </div>
  ) : (
    <article
      className="one-gap-feedback-card rounded-[var(--radius-md)] border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] p-5"
      {...contractProps}
    >
      {children}
    </article>
  );
}

const NON_RETRYABLE_STRUCTURE_ERROR_COPY: Readonly<Record<string, string>> =
  Object.freeze({
    ANONYMOUS_TRIAL_LIMIT:
      "체험 답안 검토 이용 범위를 모두 사용했습니다. 로그인하면 계속할 수 있습니다.",
    FREE_TRIAL_LIMIT_REACHED:
      "무료 체험의 답안 검토 이용 범위를 모두 사용했습니다. 이용 범위를 확인해 주세요.",
    CORE_LIMIT_REACHED:
      "현재 요금제의 답안 검토 이용 범위를 모두 사용했습니다. 이용 범위를 확인해 주세요.",
    BILLING_REQUIRED: "답안 검토를 계속하려면 이용 범위를 확인해 주세요.",
    INSUFFICIENT_INPUT:
      "검토에 필요한 정보가 부족합니다. 내 답안을 보강하거나 문제·참고자료를 추가해 주세요.",
  });

const STRUCTURE_ERROR_HEADING: Readonly<Record<StructureErrorAction, string>> =
  Object.freeze({
    retry: "답안 검토를 다시 시도해 주세요",
    edit_input: "검토 입력을 보강해 주세요",
    login: "로그인 후 답안 검토를 계속할 수 있습니다",
    pricing: "답안 검토 이용 범위를 확인해 주세요",
  });

const createCalculatorRoutineRunId = (
  source: "problem-snap" | "answer-review",
) => {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${source}-${randomPart}`;
};

function InputStatusCard({
  title,
  statusText,
  helper,
  isSecond = false,
}: InputStatusCardProps) {
  if (isSecond) {
    return (
      <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--color-border-default)] py-3 last:border-b-0">
        <div className="min-w-0">
          <p className="v3-type-caption text-[var(--color-text-secondary)]">
            {title} · {helper}
          </p>
          <p className="v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)]">
            {statusText}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.article
      layout
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] p-3"
    >
      <p className="text-caption font-medium text-[color:var(--muted)]">
        {title}
      </p>
      <p className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">
        {statusText}
      </p>
      <p className="mt-1 text-caption leading-5 text-[color:var(--muted)]">
        {helper}
      </p>
    </motion.article>
  );
}

function AnswerReviewActionButton({
  isSecond,
  legacyVariant = "default",
  legacyClassName,
  v3Tone = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  isSecond: boolean;
  legacyVariant?: "default" | "outline" | "ghost";
  legacyClassName?: string;
  v3Tone?: "primary" | "secondary" | "quiet";
}) {
  if (isSecond) {
    return <V3ActionButton tone={v3Tone} {...props} />;
  }

  return (
    <button
      type={props.type ?? "button"}
      {...props}
      className={cn(
        buttonVariants({ variant: legacyVariant }),
        legacyClassName,
        props.className,
      )}
    />
  );
}

function answerReviewDisclosureClass(isSecond: boolean) {
  return isSecond
    ? "quiet-disclosure rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-4"
    : "quiet-disclosure rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4";
}

function AnswerReviewDiagnosticLine({
  isSecond,
  label,
  value,
}: {
  isSecond: boolean;
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <article
      className={
        isSecond
          ? "border-b border-[var(--color-border-default)] py-3 last:border-b-0"
          : "rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3"
      }
    >
      <p
        className={
          isSecond
            ? "v3-type-caption text-[var(--color-text-secondary)]"
            : "text-caption font-medium text-[color:var(--muted)]"
        }
      >
        {label}
      </p>
      <p
        className={
          isSecond
            ? "v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)]"
            : "mt-1 text-caption leading-5 text-[color:var(--foreground-strong)]"
        }
      >
        {value}
      </p>
    </article>
  );
}

export default function AnswerReviewClientPage({
  viewerMode = "authenticated",
  initialExamMode = "second",
  initialSubject = null,
}: AnswerReviewClientPageProps) {
  const initialReviewContext = {
    examMode: initialExamMode,
    subject: normalizeSubjectForMode(
      initialSubject ?? getDefaultSubject(initialExamMode),
      initialExamMode,
    ),
  };
  const [problemFiles, setProblemFiles] = useState<File[]>([]);
  const [myAnswerFiles, setMyAnswerFiles] = useState<File[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [problemText, setProblemText] = useState("");
  const [myAnswerText, setMyAnswerText] = useState("");
  const [referenceAnswerText, setReferenceAnswerText] = useState("");
  const [missingPointMemo, setMissingPointMemo] = useState("");
  const [revisionParagraph, setRevisionParagraph] = useState("");
  const [feedbackCopyStatus, setFeedbackCopyStatus] = useState<
    "idle" | "success" | "failed"
  >("idle");
  const [copiedFeedbackDraftText, setCopiedFeedbackDraftText] = useState<
    string | null
  >(null);
  const [isStructuring, setIsStructuring] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [isStructureErrorRetryable, setIsStructureErrorRetryable] =
    useState(false);
  const [structureErrorAction, setStructureErrorAction] =
    useState<StructureErrorAction>("retry");
  const [structureDraft, setStructureDraft] =
    useState<AnswerReviewStructureDraft | null>(null);
  const [learningSignalStatus, setLearningSignalStatus] = useState<
    "saved" | "skipped" | "failed" | null
  >(null);
  const [referenceGrounding, setReferenceGrounding] = useState<{
    used: boolean;
    displayLabel: string;
    references: Array<{
      id: string;
      exam_year: number;
      subject: string;
      reason: string;
    }>;
  } | null>(null);
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [examMode, setExamMode] = useState<AppraisalMode>(
    initialReviewContext.examMode,
  );
  const [subject, setSubject] = useState<string>(initialReviewContext.subject);
  const [showExampleAnswer, setShowExampleAnswer] = useState(false);
  const [resultSecondaryOpen, setResultSecondaryOpen] = useState(false);
  const [explanationLevel, setExplanationLevel] =
    useState<AnswerReviewExplanationLevel>("standard");
  const [problemSnapRoutineReference, setProblemSnapRoutineReference] =
    useState<CalculatorRoutineDraftReference | null>(null);
  const [hasProblemSnapRoutineHandoff, setHasProblemSnapRoutineHandoff] =
    useState(false);
  const [answerReviewRoutineRunId, setAnswerReviewRoutineRunId] = useState<
    string | null
  >(null);
  const calculatorRoutineSync = useCalculatorRoutineLearningSignalSync();
  const answerCameraInputRef = useRef<HTMLInputElement | null>(null);
  const problemCameraInputRef = useRef<HTMLInputElement | null>(null);
  const generalFileInputRef = useRef<HTMLInputElement | null>(null);
  const answerTextRef = useRef<HTMLTextAreaElement | null>(null);
  const stepTwoHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const stepThreeHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const previousStepRef = useRef<StepId>(currentStep);
  const [generalUploadIntent, setGeneralUploadIntent] = useState<
    "answer" | "problem"
  >("answer");
  const [problemSnapNoticeVisible, setProblemSnapNoticeVisible] =
    useState(false);

  const prefersReducedMotion = useReducedMotion();
  const [motionReady, setMotionReady] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMotionReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (previousStepRef.current === currentStep) return;
    previousStepRef.current = currentStep;
    const frame = window.requestAnimationFrame(() => {
      const focusTarget =
        currentStep === 1
          ? answerTextRef.current
          : currentStep === 2
            ? stepTwoHeadingRef.current
            : stepThreeHeadingRef.current;
      focusTarget?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentStep]);
  const shouldReduceMotion = !motionReady || Boolean(prefersReducedMotion);
  const subjectOptions =
    examMode === "second"
      ? APPRAISAL_SECOND_SUBJECTS
      : APPRAISAL_FIRST_SUBJECTS;
  const calculationContextText = [
    subject,
    problemText,
    myAnswerText,
    referenceAnswerText,
    structureDraft?.questionSummary,
    structureDraft?.coreConcepts.join(" "),
    structureDraft?.requiredIssues,
    structureDraft?.weakLogicPoint,
  ].join(" ");
  const calculatorRoutineEligibility = useMemo(
    () =>
      getCalculatorRoutineEligibility({
        examMode,
        subject,
        calculationContextText,
      }),
    [calculationContextText, examMode, subject],
  );

  const calculatorRoutineReferenceHints =
    useMemo<CalculatorRoutineReferenceHints>(
      () => ({
        conditions: [
          structureDraft?.questionSummary,
          problemText.trim()
            ? "문제/사례 입력을 원문 조건과 다시 대조해 주세요."
            : "",
        ].filter(Boolean) as string[],
        formula: structureDraft?.coreConcepts ?? [],
        numbers_units: [
          structureDraft?.requiredIssues,
          structureDraft?.weakLogicPoint,
        ].filter(Boolean) as string[],
        casio_input: [
          "계산기 입력은 원문 숫자와 단위를 기준으로 본인 계산기에서 직접 확인해 주세요.",
        ],
        display_value: ["화면값은 원문 숫자·단위와 대조해 직접 확인해 주세요."],
        answer_value: [
          structureDraft?.rewriteTarget,
          "답안 기재값은 계산 결과와 반올림 기준을 분리해 확인해 주세요.",
        ].filter(Boolean) as string[],
        unit_rounding: [
          structureDraft?.caution,
          "단위와 반올림 기준을 답안에 남겨 주세요.",
        ].filter(Boolean) as string[],
        verification: [
          "역산·단위 검산·크기 검산 중 하나 이상을 직접 수행해 주세요.",
        ],
        mistake_type: structureDraft?.missingIssueCandidates ?? [],
      }),
      [problemText, structureDraft],
    );

  const clearProblemSnapRoutineResume = () => {
    setProblemSnapRoutineReference(null);
    setHasProblemSnapRoutineHandoff(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rawHandoff = sessionStorage.getItem(
      "inverge.problemSnap.answerReviewHandoff",
    );
    if (!rawHandoff) return;
    try {
      const handoff = JSON.parse(rawHandoff) as ProblemSnapAnswerReviewHandoff;
      if (handoff.source !== "problem-snap") {
        sessionStorage.removeItem("inverge.problemSnap.answerReviewHandoff");
        return;
      }
      const nextExamMode =
        parseAppraisalMode(handoff.examMode ?? null) ?? examMode;
      const nextSubject = normalizeSubjectForMode(
        handoff.subject ?? null,
        nextExamMode,
      );
      setExamMode(nextExamMode);
      setSubject(nextSubject);
      setProblemText(
        (handoff.problemText || handoff.problemSummary || "").trim(),
      );
      setMyAnswerText((handoff.retryMemo || "").trim());
      if (!missingPointMemo.trim() && handoff.nextPracticeAction?.trim()) {
        setMissingPointMemo(handoff.nextPracticeAction.trim());
      }
      const routineIdFromDraftKey = getCalculatorRoutineIdFromDraftStorageKey(
        handoff.calculatorRoutineDraftKey,
      );
      const handoffRoutineId =
        handoff.calculatorRoutineId ?? routineIdFromDraftKey;
      if (
        handoffRoutineId &&
        handoff.calculatorRoutineDraftKey &&
        routineIdFromDraftKey === handoffRoutineId
      ) {
        setProblemSnapRoutineReference({
          routineId: handoffRoutineId,
          draftKey: handoff.calculatorRoutineDraftKey,
        });
        setHasProblemSnapRoutineHandoff(true);
      }
      setProblemSnapNoticeVisible(true);
    } finally {
      sessionStorage.removeItem("inverge.problemSnap.answerReviewHandoff");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProblemFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearProblemSnapRoutineResume();
    setProblemFiles(Array.from(event.target.files ?? []));
  };

  const handleMyAnswerFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearProblemSnapRoutineResume();
    setMyAnswerFiles(Array.from(event.target.files ?? []));
  };

  const handleReferenceFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    clearProblemSnapRoutineResume();
    setReferenceFiles(Array.from(event.target.files ?? []));
  };

  const handleGeneralFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    clearProblemSnapRoutineResume();
    if (generalUploadIntent === "problem") {
      setProblemFiles(files);
    } else {
      setMyAnswerFiles(files);
    }
    event.target.value = "";
  };

  const hasProblemInput =
    problemText.trim().length > 0 || problemFiles.length > 0;
  const hasMyAnswer =
    myAnswerText.trim().length > 0 || myAnswerFiles.length > 0;
  const hasReferenceAnswer =
    referenceAnswerText.trim().length > 0 || referenceFiles.length > 0;
  const hasMissingPointMemo = missingPointMemo.trim().length > 0;
  const hasRevisionParagraph = revisionParagraph.trim().length > 0;
  const myAnswerLength = myAnswerText.trim().length;
  const isVeryShortAnswer = myAnswerLength > 0 && myAnswerLength < 120;

  const getParagraphCount = (text: string) => {
    const normalized = text.trim();
    if (!normalized) return 0;
    return normalized
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean).length;
  };

  const toShortLine = (
    text: string,
    fallback: string,
    maxLength = CARD_TEXT_MAX_LENGTH,
  ) => {
    const normalized = text.trim().replace(/\s+/g, " ");
    if (!normalized) return fallback;
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength).trimEnd()}…`;
  };

  const toDetailLine = (
    text: string,
    fallback: string,
    maxLength = DETAILS_TEXT_MAX_LENGTH,
  ) => {
    const normalized = text.trim().replace(/\s+/g, " ");
    if (!normalized) return fallback;
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength).trimEnd()}…`;
  };

  const shortenFileName = (name: string, maxLength = FILE_NAME_MAX_LENGTH) => {
    if (name.length <= maxLength) return name;
    const extIndex = name.lastIndexOf(".");
    if (extIndex <= 0 || extIndex >= name.length - 1)
      return `${name.slice(0, maxLength - 1).trimEnd()}…`;
    const ext = name.slice(extIndex);
    const base = name.slice(0, extIndex);
    const baseMaxLength = Math.max(8, maxLength - ext.length - 1);
    return `${base.slice(0, baseMaxLength).trimEnd()}…${ext}`;
  };

  const summarizeFiles = (files: File[]) => {
    if (files.length === 0) return "선택된 파일이 없습니다.";
    if (files.length <= 2)
      return files.map((file) => shortenFileName(file.name)).join(", ");
    return `${shortenFileName(files[0].name)}, ${shortenFileName(files[1].name)} 외 ${files.length - 2}개`;
  };

  const returnToEntry = () => {
    setResultSecondaryOpen(false);
    setStructureError(null);
    setIsStructureErrorRetryable(false);
    setStructureErrorAction("retry");
    setStructureDraft(null);
    setLearningSignalStatus(null);
    setReferenceGrounding(null);
    setMissingPointMemo("");
    setRevisionParagraph("");
    setFeedbackCopyStatus("idle");
    setCopiedFeedbackDraftText(null);
    calculatorRoutineSync.reset();
    setCurrentStep(1);
    window.setTimeout(() => answerTextRef.current?.focus(), 0);
  };

  const runStructure = async () => {
    if (!hasMyAnswer) {
      setStructureError("내 답안 불러오기 또는 텍스트를 먼저 입력해 주세요.");
      setIsStructureErrorRetryable(false);
      setStructureErrorAction("edit_input");
      return;
    }

    setCurrentStep(1);
    setIsStructuring(true);
    setStructureError(null);
    setIsStructureErrorRetryable(false);
    setStructureErrorAction("retry");
    setStructureDraft(null);
    setLearningSignalStatus(null);
    setReferenceGrounding(null);
    setMissingPointMemo("");
    setRevisionParagraph("");
    setFeedbackCopyStatus("idle");
    setCopiedFeedbackDraftText(null);
    setResultSecondaryOpen(false);
    calculatorRoutineSync.reset();
    if (
      hasProblemSnapRoutineHandoff &&
      problemSnapRoutineReference?.routineId &&
      problemSnapRoutineReference.draftKey
    ) {
      setAnswerReviewRoutineRunId(null);
    } else {
      clearProblemSnapRoutineResume();
      setAnswerReviewRoutineRunId(
        createCalculatorRoutineRunId("answer-review"),
      );
    }

    try {
      const formData = new FormData();
      for (const file of problemFiles) formData.append("questionFiles", file);
      for (const file of myAnswerFiles) formData.append("answerFiles", file);
      for (const file of referenceFiles)
        formData.append("referenceFiles", file);
      formData.set("questionText", problemText);
      formData.set("answerText", myAnswerText);
      formData.set("referenceText", referenceAnswerText);
      formData.set("examMode", examMode);
      formData.set("subject", normalizeSubjectForMode(subject, examMode));
      formData.set("explanationLevel", explanationLevel);

      const response = await fetch("/api/answer-review/structure", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | {
            ok: true;
            draft: unknown;
            learningSignalStatus?: "saved" | "skipped" | "failed";
            referenceGrounding?: {
              used: boolean;
              displayLabel: string;
              references: Array<{
                id: string;
                exam_year: number;
                subject: string;
                reason: string;
              }>;
            };
          }
        | { ok: false; error: string; errorCode?: string };

      if (!response.ok || !payload.ok) {
        const errorCode = payload.ok ? "" : (payload.errorCode ?? "");
        const isAnonymousTrialLimit = errorCode === "ANONYMOUS_TRIAL_LIMIT";
        const isAccountLimit = [
          "FREE_TRIAL_LIMIT_REACHED",
          "CORE_LIMIT_REACHED",
          "BILLING_REQUIRED",
        ].includes(errorCode);
        const isInputQualityFailure = errorCode === "INSUFFICIENT_INPUT";
        if (
          !payload.ok &&
          (isAnonymousTrialLimit || isAccountLimit || isInputQualityFailure)
        ) {
          setStructureDraft(null);
          setLearningSignalStatus(null);
          setReferenceGrounding(null);
          setIsStructureErrorRetryable(false);
          setStructureErrorAction(
            isInputQualityFailure
              ? "edit_input"
              : isAnonymousTrialLimit
                ? "login"
                : "pricing",
          );
          setStructureError(
            NON_RETRYABLE_STRUCTURE_ERROR_COPY[errorCode] ??
              "현재 입력으로는 답안 검토를 계속할 수 없습니다. 이용 범위 또는 입력 내용을 확인해 주세요.",
          );
          setCurrentStep(2);
          return;
        }
        throw new Error(
          payload.ok ? "검토 결과를 불러오지 못했습니다." : payload.error,
        );
      }

      const normalizedDraft = normalizeAnswerReviewStructureDraft(
        payload.draft,
      );
      setStructureDraft(normalizedDraft);
      setIsStructureErrorRetryable(false);
      setStructureErrorAction("retry");
      setLearningSignalStatus(payload.learningSignalStatus ?? "skipped");
      setReferenceGrounding(payload.referenceGrounding ?? null);
      setMissingPointMemo(normalizedDraft.missingIssueCandidates.join(", "));
      setRevisionParagraph(normalizedDraft.rewriteDraftSuggestion);
      setCurrentStep(2);
    } catch (error) {
      setStructureDraft(null);
      setLearningSignalStatus(null);
      setReferenceGrounding(null);
      setIsStructureErrorRetryable(true);
      setStructureErrorAction("retry");
      setStructureError(
        error instanceof Error
          ? error.message
          : "지금은 파일 검토를 진행할 수 없습니다. 텍스트 입력으로 계속해 주세요.",
      );
      setCurrentStep(2);
    } finally {
      setIsStructuring(false);
    }
  };

  const feedbackDraftText = useMemo(() => {
    const inputStatusSummary = `문제/사례 ${hasProblemInput ? "입력됨" : "미입력"}, 내 답안 ${hasMyAnswer ? "입력됨" : "미입력"}, 검토 참고자료 ${
      hasReferenceAnswer ? "입력됨" : "미입력"
    }`;
    const missingPointSummary = hasMissingPointMemo
      ? `이번 답안은 ${missingPointMemo.trim()} 보강이 우선입니다.`
      : "누락 논점 후보를 먼저 적으면 학습 보조 정리가 완성됩니다.";
    const revisionSummary = hasRevisionParagraph
      ? revisionParagraph.trim()
      : "보강 문단을 작성하면 다음 행동이 더 선명해집니다.";

    return [
      "[입력 상태]",
      `- ${inputStatusSummary}`,
      "",
      "[가장 큰 간극]",
      `- ${missingPointSummary}`,
      "",
      "[다시 쓸 문장]",
      `- ${revisionSummary}`,
      "",
      "[다음 행동]",
      "- 보강 문단 구조를 기준으로 한 문단만 다시 작성해 보세요.",
      "",
      "※ 학습 보조 초안입니다. 공식 채점이나 합격 판정이 아닙니다.",
    ].join("\n");
  }, [
    hasMissingPointMemo,
    hasMyAnswer,
    hasProblemInput,
    hasReferenceAnswer,
    hasRevisionParagraph,
    missingPointMemo,
    revisionParagraph,
  ]);

  const qualityView = useMemo(() => {
    if (!structureDraft) return null;
    return buildAnswerReviewQualityView(structureDraft);
  }, [structureDraft]);

  const cognitiveLearningActions = useMemo(
    () =>
      buildCognitiveLearningActionUnit({
        mode: examMode,
        subjectLabel: subject,
        biggestGap:
          qualityView?.primaryFix.gap ??
          structureDraft?.requiredIssues ??
          missingPointMemo,
        nextAction:
          qualityView?.nextAction ??
          structureDraft?.nextAction ??
          revisionParagraph,
        nextTaskType:
          examMode === "second"
            ? calculatorRoutineEligibility.eligible
              ? "calculation_process_check"
              : "paragraph_rewrite"
            : "ox",
      }),
    [
      calculatorRoutineEligibility.eligible,
      examMode,
      missingPointMemo,
      qualityView,
      revisionParagraph,
      structureDraft,
      subject,
    ],
  );

  const explanationTitle =
    explanationLevel === "easy"
      ? "쉽게 풀이"
      : explanationLevel === "exam"
        ? "시험답안식 보강 포인트"
        : "핵심 해설";

  const reviewerNoteText = useMemo(() => {
    return [
      "입력 상태",
      `- 문제/사례: ${hasProblemInput ? "입력됨" : "미입력"}`,
      `- 내 답안: ${hasMyAnswer ? "입력됨" : "미입력"}`,
      `- 검토 참고자료: ${hasReferenceAnswer ? "입력됨" : "미입력"}`,
      "",
      "누락 후보",
      `- ${hasMissingPointMemo ? missingPointMemo.trim() : "누락 논점 후보 메모 필요"}`,
      "",
      "교정 문단",
      `- ${hasRevisionParagraph ? revisionParagraph.trim() : "교정 문단 작성 필요"}`,
    ].join("\n");
  }, [
    hasMissingPointMemo,
    hasMyAnswer,
    hasProblemInput,
    hasReferenceAnswer,
    hasRevisionParagraph,
    missingPointMemo,
    revisionParagraph,
  ]);

  const copyFeedbackDraft = async () => {
    try {
      await navigator.clipboard.writeText(feedbackDraftText);
      setCopiedFeedbackDraftText(feedbackDraftText);
      setFeedbackCopyStatus("success");
    } catch {
      setCopiedFeedbackDraftText(feedbackDraftText);
      setFeedbackCopyStatus("failed");
    }
  };

  const visibleFeedbackCopyStatus =
    copiedFeedbackDraftText === feedbackDraftText ? feedbackCopyStatus : "idle";
  const didCopyCurrentDraft = visibleFeedbackCopyStatus === "success";
  const primaryActionLabel =
    currentStep === 1
      ? isStructuring
        ? "답안 정리 중..."
        : "답안 스냅으로 시작"
      : currentStep === 2
        ? "보강 문단 정리"
        : "정리 내용 복사";
  const isPrimaryActionDisabled =
    currentStep === 1 ? !hasMyAnswer || isStructuring : false;
  const completionStatus = structureError
    ? "검토 오류"
    : isStructuring
      ? "검토 중"
      : structureDraft
        ? "검토 완료"
        : "검토 대기";

  const biggestGapFix = toShortLine(
    structureDraft?.rewriteTarget || qualityView?.nextAction || "",
    "누락된 핵심 논점을 문단 하나로 다시 구성해 보세요.",
  );
  const inputStatusSummary = `문제/사례 ${hasProblemInput ? "입력됨" : "미입력"}, 내 답안 ${hasMyAnswer ? "입력됨" : "미입력"}, 검토 참고자료 ${
    hasReferenceAnswer ? "입력됨" : "미입력"
  }`;
  const trustEvidence: TrustProvenanceEvidence = structureError
    ? { kind: "unavailable", evidenceAvailable: false }
    : hasProblemInput ||
        hasMyAnswer ||
        hasReferenceAnswer ||
        isStructuring ||
        Boolean(structureDraft)
      ? { kind: "review_requirement", reviewRequired: true }
      : { kind: "unavailable", evidenceAvailable: false };
  const trustSources = [
    ...(hasProblemInput || hasMyAnswer ? (["learner_text"] as const) : []),
    ...(hasReferenceAnswer ? (["reference"] as const) : []),
    ...(structureDraft ? (["ai_draft"] as const) : []),
    ...(!hasProblemInput &&
    !hasMyAnswer &&
    !hasReferenceAnswer &&
    !structureDraft
      ? (["none"] as const)
      : []),
  ];

  const handlePrimaryAction = () => {
    if (currentStep === 1) {
      void runStructure();
      return;
    }
    if (currentStep === 2) {
      if (!structureDraft) return;
      setResultSecondaryOpen(false);
      setCurrentStep(3);
      return;
    }
    void copyFeedbackDraft();
  };

  const focusAnswerTextarea = () => {
    answerTextRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    answerTextRef.current?.focus();
  };

  return (
    <>
      <a
        href="#answer-review-main"
        data-v3-skip-link
        className={cn(
          "fixed left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] z-[100] inline-flex min-h-11 min-w-11 -translate-y-[200%] items-center justify-center px-4 transition-transform focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
          examMode === "second"
            ? "v3-type-label-strong rounded-[var(--v3-radius-control)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] focus-visible:ring-offset-[var(--color-background-canvas)]"
            : "rounded-[var(--radius-sm)] bg-[color:var(--bg-surface)] text-sm font-semibold text-[color:var(--foreground-strong)] focus-visible:ring-offset-[var(--bg-surface)]",
        )}
      >
        본문 바로가기
      </a>
      <main
        id="answer-review-main"
        tabIndex={-1}
        data-s232e3-answer-review-entry="learner-first"
      >
        <AnswerReviewFrame isSecond={examMode === "second"}>
          <section
            className={
              examMode === "second"
                ? "space-y-5 rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-4 sm:p-6"
                : "space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-4 sm:p-6"
            }
            aria-labelledby="s232e3-answer-review-title"
            data-answer-review-stage="answer-review-shell"
            data-s232e3-answer-review-primary
          >
            {examMode === "second" ? (
              <header
                className="max-w-[var(--layout-reading-column)] space-y-2"
                data-v3-layout="route-header"
              >
                <p className="v3-type-caption text-[var(--color-text-secondary)]">
                  답안 훈련 · 지금 할 일
                </p>
                <h1
                  id="s232e3-answer-review-title"
                  className="v3-type-screen hero-balance ko-keep text-[var(--color-text-primary)]"
                >
                  답안 검토
                </h1>
                <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">
                  이미 쓴 답안을 올리면 누락 논점, 약한 구조, 오늘 다시 쓸
                  문장을 정리합니다.
                </p>
              </header>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <RefinedBadge>답안 훈련</RefinedBadge>
                </div>
                <p className="v3-type-caption text-[color:var(--muted)]">
                  답안 훈련 · 지금 할 일
                </p>
                <h1
                  id="s232e3-answer-review-title"
                  className="v3-type-screen ko-keep text-[color:var(--foreground-strong)]"
                >
                  답안 검토
                </h1>
                <p className="v3-type-body ko-keep text-[color:var(--muted)]">
                  이미 쓴 답안을 올리면 누락 논점, 약한 구조, 오늘 다시 쓸
                  문장을 정리합니다.
                </p>
              </>
            )}
            <dl
              className={
                examMode === "second"
                  ? "divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]"
                  : "divide-y divide-[color:var(--border)] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)]"
              }
              data-s232e3-answer-review-context
            >
              <div
                className="px-3 py-3 sm:grid sm:grid-cols-[80px_minmax(0,1fr)] sm:gap-3"
                data-s232e3-stage="now"
              >
                <dt
                  className={
                    examMode === "second"
                      ? "v3-type-caption text-[var(--color-text-secondary)]"
                      : "v3-type-caption text-[color:var(--muted)]"
                  }
                >
                  지금
                </dt>
                <dd
                  className={
                    examMode === "second"
                      ? "v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)]"
                      : "v3-type-compact ko-keep mt-1 text-[color:var(--foreground-strong)]"
                  }
                >
                  내 답안을 스냅하거나 텍스트로 남깁니다.
                </dd>
              </div>
              <div
                className="px-3 py-3 sm:grid sm:grid-cols-[80px_minmax(0,1fr)] sm:gap-3"
                data-s232e3-stage="why"
              >
                <dt
                  className={
                    examMode === "second"
                      ? "v3-type-caption text-[var(--color-text-secondary)]"
                      : "v3-type-caption text-[color:var(--muted)]"
                  }
                >
                  왜
                </dt>
                <dd
                  className={
                    examMode === "second"
                      ? "v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)]"
                      : "v3-type-compact ko-keep mt-1 text-[color:var(--foreground-strong)]"
                  }
                >
                  내 답안의 누락 논점과 약한 구조를 먼저 좁힙니다.
                </dd>
              </div>
              <div
                className="px-3 py-3 sm:grid sm:grid-cols-[80px_minmax(0,1fr)] sm:gap-3"
                data-s232e3-stage="result"
              >
                <dt
                  className={
                    examMode === "second"
                      ? "v3-type-caption text-[var(--color-text-secondary)]"
                      : "v3-type-caption text-[color:var(--muted)]"
                  }
                >
                  결과
                </dt>
                <dd
                  className={
                    examMode === "second"
                      ? "v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)]"
                      : "v3-type-compact ko-keep mt-1 text-[color:var(--foreground-strong)]"
                  }
                >
                  가장 큰 간극 1개와 다시 쓸 문장을 확인합니다.
                </dd>
              </div>
            </dl>
            {examMode === "second" ? (
              <TrustEvidenceBar
                evidence={trustEvidence}
                sources={trustSources}
                summary={`${completionStatus} · ${inputStatusSummary}`}
                detail="결과는 학습 보조 초안이며 채점 결과나 합격 여부를 확정하지 않습니다. 입력과 참고자료를 직접 확인한 뒤 사용하세요."
                showSaveStatus={false}
                testId="answer-review-trust-layer-v3"
              />
            ) : (
              <TrustProvenanceLayer
                evidence={trustEvidence}
                sources={trustSources}
                title="답안 검토의 신뢰 상태"
                summary="결과는 학습 보조 초안이며 공식 점수나 합격 여부를 확정하지 않습니다. 입력과 참고자료를 직접 확인한 뒤 사용하세요."
                details={[
                  { label: "입력 상태", value: inputStatusSummary },
                  { label: "검토 상태", value: completionStatus },
                ]}
                stage="answer-review-shell"
                trustLayerMarker="answer-review-shell"
                ariaLabel="답안 검토 신뢰 및 출처 상태"
                testId="answer-review-trust-layer"
              />
            )}
            {problemSnapNoticeVisible ? (
              <article
                className={
                  examMode === "second"
                    ? "flex items-center justify-between gap-3 border-y border-[var(--color-border-default)] py-3"
                    : "flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-2"
                }
              >
                <p
                  className={
                    examMode === "second"
                      ? "v3-type-caption ko-keep text-[var(--color-text-secondary)]"
                      : "text-caption leading-5 text-[color:var(--muted)]"
                  }
                >
                  Problem Snap에서 다시 푼 답안을 불러왔습니다.
                </p>
                {examMode === "second" ? (
                  <V3ActionButton
                    tone="quiet"
                    className="min-w-11 px-3"
                    onClick={() => setProblemSnapNoticeVisible(false)}
                  >
                    닫기
                  </V3ActionButton>
                ) : (
                  <button
                    type="button"
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "h-8 px-2",
                    )}
                    onClick={() => setProblemSnapNoticeVisible(false)}
                  >
                    닫기
                  </button>
                )}
              </article>
            ) : null}
            {viewerMode === "anonymous" ? (
              <article
                className={
                  examMode === "second"
                    ? "border-y border-[var(--color-border-default)] py-3"
                    : "rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-2"
                }
              >
                <p
                  className={
                    examMode === "second"
                      ? "v3-type-caption ko-keep text-[var(--color-text-secondary)]"
                      : "text-caption leading-5 text-[color:var(--muted)]"
                  }
                >
                  로그인 없이 오늘 1회 빠른 답안 정리를 체험할 수 있습니다.
                </p>
                <p
                  className={
                    examMode === "second"
                      ? "v3-type-caption ko-keep text-[var(--color-text-secondary)]"
                      : "text-caption leading-5 text-[color:var(--muted)]"
                  }
                >
                  기록 저장, 복습, 오늘 계획 반영은 로그인 후 사용할 수
                  있습니다.
                </p>
              </article>
            ) : null}

            <input
              ref={answerCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              aria-label="내 답안 카메라 파일 선택"
              disabled={isStructuring}
              onChange={handleMyAnswerFileChange}
            />
            <input
              ref={problemCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              aria-label="문제 또는 사례 카메라 파일 선택"
              disabled={isStructuring}
              onChange={handleProblemFileChange}
            />
            <input
              ref={generalFileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              aria-label="답안 검토 파일 선택"
              disabled={isStructuring}
              onChange={handleGeneralFileChange}
            />
            {currentStep === 1 ? (
              <>
                <div
                  className="grid gap-2 sm:grid-cols-2"
                  data-s224v-secondary-input-options="quiet"
                  data-s232e3-answer-entry-actions
                  data-s232e4-entry-actions-scoped="step-1"
                >
                  {examMode === "second" ? (
                    <>
                      <V3ActionButton
                        tone="secondary"
                        fullWidth
                        disabled={isStructuring}
                        onClick={() => answerCameraInputRef.current?.click()}
                      >
                        답안 스냅
                      </V3ActionButton>
                      <V3ActionButton
                        tone="secondary"
                        fullWidth
                        disabled={isStructuring}
                        onClick={focusAnswerTextarea}
                      >
                        텍스트 붙여넣기
                      </V3ActionButton>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={isStructuring}
                        onClick={() => answerCameraInputRef.current?.click()}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "h-11 w-full justify-center text-sm font-semibold",
                        )}
                      >
                        답안 스냅
                      </button>
                      <button
                        type="button"
                        disabled={isStructuring}
                        onClick={focusAnswerTextarea}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "h-11 w-full justify-center text-sm",
                        )}
                      >
                        텍스트 붙여넣기
                      </button>
                    </>
                  )}
                </div>
                {viewerMode === "anonymous" ? (
                  <p
                    className={
                      examMode === "second"
                        ? "v3-type-caption inline-flex w-fit rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] px-3 py-2 text-[var(--color-text-secondary)]"
                        : "inline-flex w-fit rounded-full border border-[var(--border)] bg-[color:var(--surface)] px-2.5 py-1 text-xs font-medium text-[color:var(--muted)]"
                    }
                  >
                    무료 체험 1회
                  </p>
                ) : null}
              </>
            ) : null}

            <section
              className={
                examMode === "second"
                  ? "space-y-5 border-t border-[var(--color-border-default)] pt-5"
                  : "space-y-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4 sm:p-5"
              }
            >
              <div
                className={
                  examMode === "second"
                    ? "border-y border-[var(--color-border-default)] py-2"
                    : "rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] p-3"
                }
              >
                <ol className="grid gap-2 sm:grid-cols-3">
                  {STEP_ITEMS.map((item) => {
                    const isActive = currentStep === item.id;
                    const isDone = currentStep > item.id;
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          "rounded-[var(--radius-sm)] border px-3 py-2 text-caption leading-5",
                          isActive
                            ? examMode === "second"
                              ? "border-[var(--color-border-focus)] bg-[var(--color-background-brand-soft)] text-[var(--color-text-primary)]"
                              : "border-[#1E2A46] text-[#1E2A46]"
                            : examMode === "second"
                              ? "border-transparent text-[var(--color-text-secondary)]"
                              : "border-[var(--border)] text-[color:var(--muted)]",
                        )}
                        aria-current={isActive ? "step" : undefined}
                      >
                        <span
                          className={cn(
                            "mr-1",
                            isDone
                              ? examMode === "second"
                                ? "text-[var(--color-text-primary)]"
                                : "text-[#1E2A46]"
                              : examMode === "second"
                                ? "text-[var(--color-text-secondary)]"
                                : "text-[color:var(--muted)]",
                          )}
                        >
                          {item.id}.
                        </span>
                        {item.label}
                      </li>
                    );
                  })}
                </ol>
              </div>

              {currentStep === 1 ? (
                <motion.section
                  className="space-y-4"
                  initial={shouldReduceMotion ? false : "hidden"}
                  animate={shouldReduceMotion ? undefined : "visible"}
                  variants={SECTION_FADE}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <fieldset
                    className="min-w-0 space-y-4 border-0 p-0"
                    disabled={isStructuring}
                    aria-busy={isStructuring ? true : undefined}
                    data-s232f3-answer-input-lock={
                      isStructuring ? "locked" : "editable"
                    }
                  >
                    <legend className="sr-only">답안 검토 입력</legend>
                    <h2
                      className={
                        examMode === "second"
                          ? "v3-type-section ko-keep text-[var(--color-text-primary)]"
                          : "v3-type-section ko-keep text-[color:var(--foreground-strong)]"
                      }
                    >
                      내 답안을 먼저 남겨주세요.
                    </h2>
                    <p
                      className={
                        examMode === "second"
                          ? "v3-type-compact ko-keep text-[var(--color-text-secondary)]"
                          : "v3-type-compact ko-keep text-[color:var(--muted)]"
                      }
                    >
                      문제와 참고자료는 없어도 됩니다. 내 답안 하나로 검토를
                      시작할 수 있습니다.
                    </p>
                    <div
                      className={
                        examMode === "second"
                          ? "space-y-5"
                          : "grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]"
                      }
                    >
                      <motion.div
                        className="space-y-4"
                        initial={
                          shouldReduceMotion ? false : { opacity: 0, y: 8 }
                        }
                        animate={
                          shouldReduceMotion ? undefined : { opacity: 1, y: 0 }
                        }
                        transition={{ duration: 0.26, ease: "easeOut" }}
                      >
                        <article
                          className={
                            examMode === "second"
                              ? "border-l-2 border-[var(--color-border-focus)] bg-[var(--color-background-focus)] px-4 py-3"
                              : "rounded-[var(--radius-md)] border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] p-4 sm:p-5"
                          }
                        >
                          <p
                            className={
                              examMode === "second"
                                ? "v3-type-caption text-[var(--color-text-secondary)]"
                                : "v3-type-caption text-[#3f4c66]"
                            }
                          >
                            지금 할 일
                          </p>
                          <p
                            className={
                              examMode === "second"
                                ? "v3-type-item ko-keep mt-2 text-[var(--color-text-primary)]"
                                : "v3-type-item ko-keep mt-2 text-[#1e2a46]"
                            }
                          >
                            답안 스냅으로 시작
                          </p>
                          <p
                            className={
                              examMode === "second"
                                ? "v3-type-compact ko-keep mt-1 text-[var(--color-text-secondary)]"
                                : "v3-type-compact ko-keep mt-1 text-[#3f4c66]"
                            }
                          >
                            먼저 쓴 답안을 남기고, 문제·사례·참고자료는 필요할
                            때만 더합니다.
                          </p>
                        </article>
                        <div
                          className={
                            examMode === "second"
                              ? "space-y-4 border-y border-[var(--color-border-default)] py-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0"
                              : "grid gap-3 sm:grid-cols-2"
                          }
                        >
                          <div
                            className={
                              examMode === "second"
                                ? "space-y-2 v3-type-caption text-[var(--color-text-secondary)]"
                                : "space-y-2 text-caption font-medium text-[color:var(--muted)]"
                            }
                            data-s224v-answer-review-scope="second-only"
                          >
                            <span className="block">훈련 범위</span>
                            <span
                              className={
                                examMode === "second"
                                  ? "v3-type-compact block min-h-11 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] px-3 py-2 text-[var(--color-text-primary)]"
                                  : "block rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--foreground-strong)]"
                              }
                            >
                              감정평가사 2차 답안
                            </span>
                          </div>
                          <label
                            className={
                              examMode === "second"
                                ? "v3-type-caption space-y-2 text-[var(--color-text-secondary)]"
                                : "space-y-2 text-caption font-medium text-[color:var(--muted)]"
                            }
                          >
                            과목
                            <select
                              className={
                                examMode === "second"
                                  ? "v3-type-compact min-h-11 w-full rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] px-3 py-2 text-[var(--color-text-primary)]"
                                  : "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--foreground-strong)]"
                              }
                              value={subject}
                              onChange={(event) => {
                                clearProblemSnapRoutineResume();
                                setSubject(event.target.value);
                              }}
                            >
                              {subjectOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <article
                          className={
                            examMode === "second"
                              ? "space-y-2 rounded-[var(--v3-radius-control)] border border-[var(--color-border-focus)] bg-[var(--color-background-surface)] p-4"
                              : "space-y-2 rounded-[var(--radius-md)] border border-[#27375f] bg-[color:var(--surface)] p-4"
                          }
                          id="answer-review-text"
                          data-s232e3-answer-required
                        >
                          <div className="flex items-center justify-between gap-3">
                            <label
                              htmlFor="answer-review-my-answer-input"
                              className={
                                examMode === "second"
                                  ? "text-caption font-medium text-[var(--color-text-secondary)]"
                                  : "text-caption font-medium text-[#3f4c66]"
                              }
                            >
                              내 답안 입력 (필수)
                            </label>
                            <span
                              className={
                                examMode === "second"
                                  ? "rounded-full bg-[var(--color-background-brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-primary)]"
                                  : "rounded-full bg-[#eef2fb] px-2.5 py-1 text-xs font-semibold text-[#1e2a46]"
                              }
                            >
                              최소 입력
                            </span>
                          </div>
                          <Textarea
                            id="answer-review-my-answer-input"
                            ref={answerTextRef}
                            className={
                              examMode === "second"
                                ? "min-h-[210px] border-[var(--color-border-default)] bg-[var(--color-background-surface)]"
                                : "min-h-[210px] border-[#c9d1e7] bg-[color:var(--surface)]"
                            }
                            placeholder="초안 텍스트가 있으면 붙여 넣고, 없으면 직접 입력해 주세요."
                            data-testid="answer-review-my-answer-input"
                            value={myAnswerText}
                            onChange={(event) => {
                              clearProblemSnapRoutineResume();
                              setMyAnswerText(event.target.value);
                            }}
                          />
                          <div
                            className={
                              examMode === "second"
                                ? "v3-type-caption mt-2 flex items-center justify-between text-[var(--color-text-secondary)]"
                                : "mt-2 flex items-center justify-between text-caption text-[color:var(--muted)]"
                            }
                          >
                            <span>현재 {myAnswerLength}자</span>
                            {isVeryShortAnswer ? (
                              <motion.span
                                animate={
                                  shouldReduceMotion
                                    ? undefined
                                    : { opacity: [0.6, 1, 0.6] }
                                }
                                transition={{ duration: 1.2, repeat: Infinity }}
                                className={
                                  examMode === "second"
                                    ? "text-[var(--color-text-attention)]"
                                    : "text-[#7a5a2a]"
                                }
                              >
                                답안이 너무 짧을 수 있습니다.
                              </motion.span>
                            ) : null}
                          </div>
                        </article>

                        <article
                          className={
                            examMode === "second"
                              ? "border-t border-[var(--color-border-default)] pt-4"
                              : "rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4"
                          }
                          data-s232e3-answer-review-start-surface
                        >
                          <p
                            className={
                              examMode === "second"
                                ? "v3-type-compact ko-keep text-[var(--color-text-secondary)]"
                                : "v3-type-compact ko-keep text-[color:var(--muted)]"
                            }
                          >
                            내 답안만 있어도 검토를 시작할 수 있습니다.
                          </p>
                          <AnswerReviewActionButton
                            isSecond={examMode === "second"}
                            type="button"
                            className="primary-action mt-3 w-full"
                            legacyClassName="primary-action mt-3 w-full"
                            onClick={handlePrimaryAction}
                            disabled={isPrimaryActionDisabled}
                            data-testid="answer-review-start"
                            data-s224v-dominant-primary-action
                            data-s232e3-answer-review-start
                          >
                            답안 정리 시작
                          </AnswerReviewActionButton>
                        </article>

                        <details
                          className={
                            examMode === "second"
                              ? "quiet-disclosure rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-4"
                              : "quiet-disclosure rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4"
                          }
                          data-s224v-secondary-input-options="quiet"
                          data-s232e3-answer-review-optional
                        >
                          <summary
                            className={
                              examMode === "second"
                                ? "v3-type-label-strong inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-primary)]"
                                : "v3-type-label-strong cursor-pointer text-[color:var(--foreground-strong)]"
                            }
                          >
                            정확도 높이기 (선택)
                          </summary>
                          <div className="mt-4 space-y-4">
                            <p
                              className={
                                examMode === "second"
                                  ? "v3-type-compact ko-keep text-[var(--color-text-secondary)]"
                                  : "v3-type-compact ko-keep text-[color:var(--muted)]"
                              }
                            >
                              문제·사례·참고자료와 해설 방식을 더하면 검토
                              맥락을 보강할 수 있습니다.
                            </p>
                            <div
                              className="grid gap-2 sm:grid-cols-2"
                              data-s232e3-optional-entry-actions
                            >
                              <AnswerReviewActionButton
                                isSecond={examMode === "second"}
                                v3Tone="secondary"
                                legacyVariant="outline"
                                legacyClassName="w-full justify-center h-11 text-sm"
                                className="w-full"
                                onClick={() =>
                                  problemCameraInputRef.current?.click()
                                }
                              >
                                사례 스캔
                              </AnswerReviewActionButton>
                              <AnswerReviewActionButton
                                isSecond={examMode === "second"}
                                v3Tone="secondary"
                                legacyVariant="outline"
                                legacyClassName="w-full justify-center h-11 text-sm"
                                className="w-full"
                                onClick={() => {
                                  setGeneralUploadIntent("answer");
                                  generalFileInputRef.current?.click();
                                }}
                              >
                                PDF/사진
                              </AnswerReviewActionButton>
                            </div>
                            <article
                              className={
                                examMode === "second"
                                  ? "border-y border-[var(--color-border-default)] py-4"
                                  : "rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4"
                              }
                            >
                              <p
                                className={
                                  examMode === "second"
                                    ? "v3-type-label-strong text-[var(--color-text-primary)]"
                                    : "text-caption font-medium text-[color:var(--muted)]"
                                }
                              >
                                이미지/PDF 입력
                              </p>
                              <p
                                className={
                                  examMode === "second"
                                    ? "v3-type-caption ko-keep mt-1 text-[var(--color-text-secondary)]"
                                    : "mt-1 text-caption leading-5 text-[color:var(--muted)]"
                                }
                              >
                                텍스트가 가장 빠르지만, 파일 업로드도 바로
                                사용할 수 있습니다.
                              </p>
                              <div
                                className={
                                  examMode === "second"
                                    ? "mt-3 divide-y divide-[var(--color-border-default)]"
                                    : "mt-3 grid gap-3 lg:grid-cols-3"
                                }
                              >
                                <section
                                  className={
                                    examMode === "second"
                                      ? "space-y-2 py-3 first:pt-0"
                                      : "space-y-2 rounded-[var(--radius-sm)] border border-[var(--border)] p-3"
                                  }
                                  id="problem-upload"
                                >
                                  <p
                                    className={
                                      examMode === "second"
                                        ? "v3-type-caption text-[var(--color-text-secondary)]"
                                        : "text-caption font-medium text-[color:var(--muted)]"
                                    }
                                  >
                                    문제/사례 불러오기
                                  </p>
                                  <label
                                    htmlFor="answer-review-problem-file-upload"
                                    className={
                                      examMode === "second"
                                        ? "v3-type-label-strong inline-flex min-h-[var(--control-height)] w-full cursor-pointer items-center justify-center rounded-[var(--v3-radius-control)] border border-[var(--color-border-strong)] bg-[var(--color-background-surface)] px-5 py-3 text-[var(--color-text-primary)] sm:w-auto"
                                        : cn(
                                            buttonVariants({
                                              variant: "outline",
                                            }),
                                            "w-full cursor-pointer justify-center sm:w-auto",
                                          )
                                    }
                                  >
                                    PDF/사진 불러오기
                                  </label>
                                  <input
                                    id="answer-review-problem-file-upload"
                                    type="file"
                                    accept="image/*,.pdf"
                                    multiple
                                    className="hidden"
                                    onChange={handleProblemFileChange}
                                  />
                                  <p
                                    className={
                                      examMode === "second"
                                        ? "v3-type-caption text-[var(--color-text-secondary)]"
                                        : "text-caption leading-5 text-[color:var(--muted)]"
                                    }
                                  >
                                    파일:{" "}
                                    <span
                                      className={
                                        examMode === "second"
                                          ? "font-medium text-[var(--color-text-primary)]"
                                          : "font-medium text-[color:var(--foreground-strong)]"
                                      }
                                    >
                                      {summarizeFiles(problemFiles)}
                                    </span>
                                  </p>
                                </section>

                                <section
                                  className={
                                    examMode === "second"
                                      ? "space-y-2 py-3"
                                      : "space-y-2 rounded-[var(--radius-sm)] border border-[#b7c1dd] bg-[#f8faff] p-3"
                                  }
                                  id="my-answer-upload"
                                >
                                  <p
                                    className={
                                      examMode === "second"
                                        ? "text-caption font-medium text-[var(--color-text-secondary)]"
                                        : "text-caption font-medium text-[#3f4c66]"
                                    }
                                  >
                                    내 답안 불러오기
                                  </p>
                                  <label
                                    htmlFor="answer-review-my-answer-file-upload"
                                    className={
                                      examMode === "second"
                                        ? "v3-type-label-strong inline-flex min-h-[var(--control-height)] w-full cursor-pointer items-center justify-center rounded-[var(--v3-radius-control)] border border-[var(--color-border-strong)] bg-[var(--color-background-surface)] px-5 py-3 text-[var(--color-text-primary)] sm:w-auto"
                                        : cn(
                                            buttonVariants({
                                              variant: "outline",
                                            }),
                                            "w-full cursor-pointer justify-center sm:w-auto",
                                          )
                                    }
                                  >
                                    PDF/사진 불러오기
                                  </label>
                                  <input
                                    id="answer-review-my-answer-file-upload"
                                    type="file"
                                    accept="image/*,.pdf"
                                    multiple
                                    className="hidden"
                                    onChange={handleMyAnswerFileChange}
                                  />
                                  <p
                                    className={
                                      examMode === "second"
                                        ? "v3-type-caption text-[var(--color-text-secondary)]"
                                        : "text-caption leading-5 text-[color:var(--muted)]"
                                    }
                                  >
                                    파일:{" "}
                                    <span
                                      className={
                                        examMode === "second"
                                          ? "font-medium text-[var(--color-text-primary)]"
                                          : "font-medium text-[color:var(--foreground-strong)]"
                                      }
                                    >
                                      {summarizeFiles(myAnswerFiles)}
                                    </span>
                                  </p>
                                </section>

                                <section
                                  className={
                                    examMode === "second"
                                      ? "space-y-2 py-3 last:pb-0"
                                      : "space-y-2 rounded-[var(--radius-sm)] border border-[var(--border)] p-3"
                                  }
                                  id="reference-upload"
                                >
                                  <p
                                    className={
                                      examMode === "second"
                                        ? "v3-type-caption text-[var(--color-text-secondary)]"
                                        : "text-caption font-medium text-[color:var(--muted)]"
                                    }
                                  >
                                    검토 참고자료 추가 (선택)
                                  </p>
                                  <label
                                    htmlFor="answer-review-reference-file-upload"
                                    className={
                                      examMode === "second"
                                        ? "v3-type-label-strong inline-flex min-h-[var(--control-height)] w-full cursor-pointer items-center justify-center rounded-[var(--v3-radius-control)] border border-[var(--color-border-strong)] bg-[var(--color-background-surface)] px-5 py-3 text-[var(--color-text-primary)] sm:w-auto"
                                        : cn(
                                            buttonVariants({
                                              variant: "outline",
                                            }),
                                            "w-full cursor-pointer justify-center sm:w-auto",
                                          )
                                    }
                                  >
                                    PDF/사진 불러오기
                                  </label>
                                  <input
                                    id="answer-review-reference-file-upload"
                                    type="file"
                                    accept="image/*,.pdf"
                                    multiple
                                    className="hidden"
                                    onChange={handleReferenceFileChange}
                                  />
                                  <p
                                    className={
                                      examMode === "second"
                                        ? "v3-type-caption text-[var(--color-text-secondary)]"
                                        : "text-caption leading-5 text-[color:var(--muted)]"
                                    }
                                  >
                                    파일:{" "}
                                    <span
                                      className={
                                        examMode === "second"
                                          ? "font-medium text-[var(--color-text-primary)]"
                                          : "font-medium text-[color:var(--foreground-strong)]"
                                      }
                                    >
                                      {summarizeFiles(referenceFiles)}
                                    </span>
                                  </p>
                                </section>
                              </div>
                            </article>

                            <div className="space-y-3">
                              <div
                                className="space-y-2"
                                id="answer-review-problem"
                              >
                                <label
                                  htmlFor="answer-review-problem-input"
                                  className={
                                    examMode === "second"
                                      ? "v3-type-caption text-[var(--color-text-secondary)]"
                                      : "text-caption font-medium text-[color:var(--muted)]"
                                  }
                                >
                                  문제/사례 입력
                                </label>
                                <Textarea
                                  id="answer-review-problem-input"
                                  className={
                                    examMode === "second"
                                      ? "min-h-[120px] rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)]"
                                      : "min-h-[120px] bg-[color:var(--surface)]"
                                  }
                                  placeholder="문제 요구사항, 사례 조건, 논점 키워드를 입력해 주세요."
                                  data-testid="answer-review-problem-input"
                                  value={problemText}
                                  onChange={(event) => {
                                    clearProblemSnapRoutineResume();
                                    setProblemText(event.target.value);
                                  }}
                                />
                              </div>
                              <details
                                className={
                                  examMode === "second"
                                    ? "rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-3"
                                    : "rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] p-3"
                                }
                                id="answer-review-reference"
                              >
                                <summary
                                  id="answer-review-reference-label"
                                  className={
                                    examMode === "second"
                                      ? "v3-type-label-strong inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-primary)]"
                                      : "cursor-pointer text-caption font-medium text-[color:var(--muted)]"
                                  }
                                >
                                  참고 정리/메모 입력 (선택)
                                </summary>
                                <div className="mt-2 space-y-2">
                                  <Textarea
                                    aria-labelledby="answer-review-reference-label"
                                    className={
                                      examMode === "second"
                                        ? "min-h-[120px] rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)]"
                                        : "min-h-[120px] bg-[color:var(--surface)]"
                                    }
                                    placeholder="강의/교재 정리 또는 참고 목차를 텍스트로 붙여 넣어 주세요."
                                    data-testid="answer-review-reference-input"
                                    value={referenceAnswerText}
                                    onChange={(event) => {
                                      clearProblemSnapRoutineResume();
                                      setReferenceAnswerText(
                                        event.target.value,
                                      );
                                    }}
                                  />
                                </div>
                              </details>
                            </div>
                            <article
                              className={
                                examMode === "second"
                                  ? "border-y border-[var(--color-border-default)] py-4"
                                  : "rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4"
                              }
                            >
                              <p
                                className={
                                  examMode === "second"
                                    ? "v3-type-label-strong text-[var(--color-text-primary)]"
                                    : "v3-type-label-strong text-[color:var(--foreground-strong)]"
                                }
                              >
                                해설 난이도
                              </p>
                              <div className="mt-2 grid gap-2">
                                {[
                                  { value: "easy", label: "쉽게 풀이" },
                                  { value: "standard", label: "기본 해설" },
                                  { value: "exam", label: "시험답안식" },
                                ].map((option) => (
                                  <label
                                    key={option.value}
                                    className={
                                      examMode === "second"
                                        ? "v3-type-caption flex min-h-11 items-center gap-2 text-[var(--color-text-primary)]"
                                        : "flex min-h-11 items-center gap-2 text-caption text-[color:var(--foreground-strong)]"
                                    }
                                  >
                                    <input
                                      type="radio"
                                      name="explanationLevel"
                                      value={option.value}
                                      checked={
                                        explanationLevel === option.value
                                      }
                                      onChange={() =>
                                        setExplanationLevel(
                                          option.value as AnswerReviewExplanationLevel,
                                        )
                                      }
                                    />
                                    <span>{option.label}</span>
                                  </label>
                                ))}
                              </div>
                              <p
                                className={
                                  examMode === "second"
                                    ? "v3-type-caption ko-keep mt-2 text-[var(--color-text-secondary)]"
                                    : "mt-2 text-xs leading-5 text-[color:var(--muted)]"
                                }
                              >
                                쉬운 풀이는 이해용이고, 답안 구조는
                                작성용입니다.
                              </p>
                            </article>
                            <article
                              className={
                                examMode === "second"
                                  ? "border-b border-[var(--color-border-default)] pb-3"
                                  : "rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4"
                              }
                            >
                              <p
                                className={
                                  examMode === "second"
                                    ? "v3-type-label-strong text-[var(--color-text-primary)]"
                                    : "v3-type-label-strong text-[color:var(--foreground-strong)]"
                                }
                              >
                                선택 입력 상태
                              </p>
                              <div
                                className={
                                  examMode === "second"
                                    ? "mt-2 divide-y divide-[var(--color-border-default)]"
                                    : "mt-3 grid gap-2 sm:grid-cols-2"
                                }
                              >
                                <InputStatusCard
                                  title="문제/사례"
                                  statusText={
                                    hasProblemInput ? "입력됨" : "선택"
                                  }
                                  helper="선택 입력"
                                  isSecond={examMode === "second"}
                                />
                                <InputStatusCard
                                  title="검토 참고자료"
                                  statusText={
                                    hasReferenceAnswer ? "입력됨" : "선택"
                                  }
                                  helper="선택 입력"
                                  isSecond={examMode === "second"}
                                />
                              </div>
                            </article>
                          </div>
                        </details>
                      </motion.div>

                      <motion.aside
                        className="space-y-3 lg:sticky lg:top-6 lg:self-start"
                        initial={
                          shouldReduceMotion ? false : { opacity: 0, x: 10 }
                        }
                        animate={
                          shouldReduceMotion ? undefined : { opacity: 1, x: 0 }
                        }
                        transition={{
                          duration: 0.28,
                          ease: "easeOut",
                          delay: shouldReduceMotion ? 0 : 0.05,
                        }}
                      >
                        <article
                          className={
                            examMode === "second"
                              ? "border-y border-[var(--color-border-default)] py-3"
                              : "rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4"
                          }
                        >
                          <p
                            className={
                              examMode === "second"
                                ? "v3-type-label-strong text-[var(--color-text-primary)]"
                                : "text-caption font-medium text-[color:var(--muted)]"
                            }
                          >
                            입력 준비 상태
                          </p>
                          <div
                            className={
                              examMode === "second"
                                ? "mt-2 divide-y divide-[var(--color-border-default)]"
                                : "mt-3 grid gap-2"
                            }
                          >
                            <InputStatusCard
                              title="내 답안"
                              statusText={hasMyAnswer ? "입력됨" : "미입력"}
                              helper="필수 입력"
                              isSecond={examMode === "second"}
                            />
                          </div>
                        </article>
                      </motion.aside>
                    </div>

                    <section
                      className={
                        examMode === "second"
                          ? "quiet-disclosure rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-4"
                          : "quiet-disclosure rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4"
                      }
                      data-s224v-secondary-diagnostics
                    >
                      <button
                        type="button"
                        onClick={() => setShowExampleAnswer((prev) => !prev)}
                        className={
                          examMode === "second"
                            ? "v3-type-label-strong min-h-11 text-[var(--color-text-primary)]"
                            : "text-caption font-medium text-[color:var(--foreground-strong)]"
                        }
                      >
                        예시 구조 보기
                      </button>
                      <AnimatePresence>
                        {showExampleAnswer ? (
                          <motion.div
                            initial={
                              shouldReduceMotion
                                ? false
                                : { opacity: 0, height: 0 }
                            }
                            animate={
                              shouldReduceMotion
                                ? undefined
                                : { opacity: 1, height: "auto" }
                            }
                            exit={
                              shouldReduceMotion
                                ? undefined
                                : { opacity: 0, height: 0 }
                            }
                            className={
                              examMode === "second"
                                ? "v3-type-compact ko-keep mt-3 overflow-hidden border-t border-[var(--color-border-default)] pt-3 text-[var(--color-text-primary)]"
                                : "mt-3 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3 text-caption leading-6 text-[color:var(--foreground-strong)]"
                            }
                          >
                            결론을 먼저 제시한 뒤, 근거 조문/판례 포인트를
                            2~3개로 연결하고 마지막에 사안 적용을 짧게 정리한
                            문단 구조를 권장합니다.
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </section>
                  </fieldset>

                  {isStructuring ? (
                    <div data-s232f3-answer-review-loading="memory-only">
                      <FailureAwareState
                        evidence={{
                          kind: "loading",
                          safety: {
                            kind: "memory_only",
                            retainedInMemory: true,
                          },
                        }}
                        announceChange
                        testId="answer-review-structure-loading"
                      />
                    </div>
                  ) : null}

                  {structureError ? (
                    <p
                      className={
                        examMode === "second"
                          ? "v3-type-caption ko-keep text-[var(--color-text-risk)]"
                          : "text-caption leading-5 text-[color:var(--muted)]"
                      }
                    >
                      {structureError}
                    </p>
                  ) : null}
                </motion.section>
              ) : null}

              {currentStep === 2 ? (
                <AnimatePresence mode="wait">
                  <motion.section
                    key="studio-step-2"
                    id="answer-review-structure-result"
                    className="space-y-5"
                    initial={shouldReduceMotion ? false : { y: 10 }}
                    animate={{ y: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.32,
                      ease: "easeOut",
                    }}
                  >
                    <motion.div
                      className={
                        examMode === "second"
                          ? "space-y-5"
                          : "space-y-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4 sm:p-5"
                      }
                      initial={shouldReduceMotion ? false : { y: 8 }}
                      animate={{ y: 0 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.28,
                        ease: "easeOut",
                      }}
                      data-answer-review-result-shell
                      data-s232e4-answer-review-result={
                        structureDraft ? "one-gap-first" : undefined
                      }
                      data-s232f3-answer-review-analysis={
                        structureDraft
                          ? "succeeded"
                          : structureError
                            ? "failed"
                            : "pending"
                      }
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p
                            className={
                              examMode === "second"
                                ? "v3-type-caption text-[var(--color-text-secondary)]"
                                : "text-caption text-[color:var(--muted)]"
                            }
                          >
                            {examMode === "second"
                              ? "감정평가사 2차"
                              : "감정평가사 1차"}{" "}
                            · {subject}
                          </p>
                          <h2
                            ref={stepTwoHeadingRef}
                            tabIndex={-1}
                            className={
                              examMode === "second"
                                ? "v3-type-section ko-keep text-[var(--color-text-primary)]"
                                : "text-base font-semibold text-[color:var(--foreground-strong)]"
                            }
                          >
                            {structureDraft
                              ? "가장 큰 간극부터 확인"
                              : STRUCTURE_ERROR_HEADING[structureErrorAction]}
                          </h2>
                          <p
                            className={
                              examMode === "second"
                                ? "v3-type-compact ko-keep text-[var(--color-text-secondary)]"
                                : "text-caption leading-5 text-[color:var(--muted)]"
                            }
                          >
                            {structureDraft
                              ? "점수보다 가장 큰 간극 1개를 먼저 다시 씁니다."
                              : "현재 답안은 이 화면에 남아 있습니다."}
                          </p>
                        </div>
                        <AnswerReviewActionButton
                          isSecond={examMode === "second"}
                          legacyVariant="outline"
                          v3Tone="secondary"
                          onClick={() => {
                            returnToEntry();
                          }}
                          legacyClassName="h-9 px-4"
                        >
                          입력 수정하기
                        </AnswerReviewActionButton>
                      </div>
                      {structureDraft ? (
                        <AnswerReviewGapContainer
                          isSecond={examMode === "second"}
                        >
                          {examMode === "second" ? (
                            <BiggestGap
                              headingId="answer-review-biggest-gap"
                              gap={toDetailLine(
                                qualityView?.primaryFix.gap || "",
                                "핵심 논점 입력을 보강하면 가장 큰 간극이 자동 정리됩니다.",
                              )}
                              evidence={`${qualityView?.primaryFix.whyItMatters || "핵심 논점을 놓치면 답안의 설득력이 크게 떨어집니다."} · 다시 쓸 대상: ${qualityView?.primaryFix.howToFix || biggestGapFix}`}
                              type="MissingLink"
                            />
                          ) : (
                            <>
                              <p className="v3-type-caption text-[#3f4c66]">
                                가장 먼저 고칠 1가지
                              </p>
                              <h3 className="v3-type-section ko-keep mt-2 text-[#1e2a46]">
                                가장 큰 간극
                              </h3>
                              <p className="v3-type-body ko-keep mt-2 text-[#1e2a46]">
                                {toDetailLine(
                                  qualityView?.primaryFix.gap || "",
                                  "핵심 논점 입력을 보강하면 가장 큰 간극이 자동 정리됩니다.",
                                )}
                              </p>
                              <dl className="mt-4 divide-y divide-[#cbd3e2] border-y border-[#cbd3e2]">
                                <div className="py-3 sm:grid sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-3">
                                  <dt className="v3-type-caption text-[#3f4c66]">
                                    왜 중요한가
                                  </dt>
                                  <dd className="v3-type-compact ko-keep mt-1 text-[#1e2a46] sm:mt-0">
                                    {qualityView?.primaryFix.whyItMatters ||
                                      "핵심 논점을 놓치면 답안의 설득력이 크게 떨어집니다."}
                                  </dd>
                                </div>
                                <div className="py-3 sm:grid sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-3">
                                  <dt className="v3-type-caption text-[#3f4c66]">
                                    다시 쓸 대상
                                  </dt>
                                  <dd className="v3-type-compact ko-keep mt-1 text-[#1e2a46] sm:mt-0">
                                    {qualityView?.primaryFix.howToFix ||
                                      biggestGapFix}
                                  </dd>
                                </div>
                              </dl>
                            </>
                          )}
                          <AnswerReviewActionButton
                            isSecond={examMode === "second"}
                            className="mt-4 w-full sm:w-auto"
                            legacyClassName="mt-4 w-full sm:w-auto"
                            onClick={handlePrimaryAction}
                            data-testid="answer-review-build-feedback"
                            data-s232e4-rewrite-entry
                          >
                            {primaryActionLabel}
                          </AnswerReviewActionButton>
                          <p
                            className={
                              examMode === "second"
                                ? "v3-type-caption ko-keep text-[var(--color-text-secondary)]"
                                : "v3-type-caption ko-keep mt-2 text-[#3f4c66]"
                            }
                          >
                            이 간극을 반영할 한 문단만 다음 단계에서 수정합니다.
                          </p>
                        </AnswerReviewGapContainer>
                      ) : null}
                    </motion.div>
                    {structureDraft && learningSignalStatus === "failed" ? (
                      <article
                        className={
                          examMode === "second"
                            ? "rounded-[var(--v3-radius-control)] border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] px-4 py-3"
                            : "rounded-[var(--radius-sm)] border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] px-4 py-3"
                        }
                        role="status"
                        data-s232f3-answer-review-analysis-status="succeeded"
                        data-s232f3-learning-signal-status="failed"
                      >
                        <p className="text-caption font-medium text-[var(--color-text-primary)]">
                          답안 분석은 완료됐지만 학습 기록 저장 여부는 확인되지
                          않았습니다.
                        </p>
                        <p className="mt-1 text-caption leading-5 text-[var(--color-text-secondary)]">
                          아래 분석 결과와 보강 문단은 현재 화면에서 사용할 수
                          있습니다. 약점 신호·복습·오늘 계획 반영은 확인되지
                          않았습니다.
                        </p>
                      </article>
                    ) : null}
                    {structureError ? (
                      <div
                        className="space-y-3"
                        data-s232f3-answer-review-error={
                          isStructureErrorRetryable
                            ? "retryable-memory-only"
                            : "blocked-memory-only"
                        }
                      >
                        <FailureAwareState
                          evidence={{
                            kind: "error",
                            retryable: isStructureErrorRetryable,
                            safety: {
                              kind: "memory_only",
                              retainedInMemory: true,
                            },
                          }}
                          action={
                            structureErrorAction === "retry"
                              ? {
                                  kind: "button",
                                  label: "답안 검토 다시 시도",
                                  onAction: () => void runStructure(),
                                }
                              : structureErrorAction === "edit_input"
                                ? {
                                    kind: "button",
                                    label: "입력 보강하기",
                                    onAction: returnToEntry,
                                  }
                                : structureErrorAction === "login"
                                  ? {
                                      kind: "link",
                                      label: "로그인하고 계속",
                                      href:
                                        examMode === "second"
                                          ? "/login?returnTo=%2Fanswer-review%3Fmode%3Dsecond"
                                          : "/login?returnTo=%2Fanswer-review%3Fmode%3Dfirst",
                                    }
                                  : {
                                      kind: "link",
                                      label: "이용 범위 확인",
                                      href: "/pricing",
                                    }
                          }
                          announceChange
                          testId="answer-review-structure-error"
                        />
                        <p
                          className="v3-type-caption ko-keep text-[color:var(--color-text-risk)]"
                          role="alert"
                          data-s232f3-answer-review-error-detail
                        >
                          {structureError}
                        </p>
                      </div>
                    ) : null}
                    {structureDraft ? (
                      <details
                        className={answerReviewDisclosureClass(
                          examMode === "second",
                        )}
                        data-s224v-secondary-diagnostics
                        data-s232e4-result-status-evidence
                      >
                        <summary
                          className={
                            examMode === "second"
                              ? "v3-type-label-strong inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-primary)]"
                              : "cursor-pointer text-caption font-medium text-[color:var(--muted)]"
                          }
                        >
                          검토 상태·근거 보기
                        </summary>
                        <div className="mt-4 space-y-3">
                          <p
                            className={
                              examMode === "second"
                                ? "v3-type-caption text-[var(--color-text-secondary)]"
                                : "text-caption leading-5 text-[color:var(--muted)]"
                            }
                          >
                            검토 상태 · {completionStatus}
                          </p>
                          {referenceGrounding?.used ? (
                            <p
                              className={
                                examMode === "second"
                                  ? "v3-type-caption ko-keep text-[var(--color-text-secondary)]"
                                  : "text-caption leading-5 text-[color:var(--muted)]"
                              }
                            >
                              유사 기출 구조를 참고해 검토했습니다.{" "}
                              {referenceGrounding.displayLabel}
                            </p>
                          ) : qualityView ? (
                            <p
                              className={
                                examMode === "second"
                                  ? "v3-type-caption ko-keep text-[var(--color-text-secondary)]"
                                  : "text-caption leading-5 text-[color:var(--muted)]"
                              }
                            >
                              유사 기출 reference 없이 입력 자료 기준으로
                              검토했습니다.
                            </p>
                          ) : null}
                          {learningSignalStatus === "saved" ? (
                            <article
                              className={
                                examMode === "second"
                                  ? "border-t border-[var(--color-border-default)] py-3"
                                  : "rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 py-3"
                              }
                            >
                              <p
                                className={
                                  examMode === "second"
                                    ? "v3-type-caption ko-keep text-[var(--color-text-secondary)]"
                                    : "text-caption leading-5 text-[color:var(--muted)]"
                                }
                              >
                                학습 신호가 기록되었습니다.{" "}
                                <Link
                                  href={
                                    examMode === "second"
                                      ? "/app?mode=second"
                                      : "/app?mode=first"
                                  }
                                  className={
                                    examMode === "second"
                                      ? "font-medium text-[var(--color-text-primary)] underline underline-offset-2"
                                      : "font-medium text-[color:var(--foreground-strong)] underline underline-offset-2"
                                  }
                                >
                                  오늘 확인
                                </Link>
                              </p>
                            </article>
                          ) : null}
                          {learningSignalStatus === "skipped" ? (
                            <article
                              className={
                                examMode === "second"
                                  ? "border-t border-[var(--color-border-default)] py-3"
                                  : "rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 py-3"
                              }
                            >
                              <p
                                className={
                                  examMode === "second"
                                    ? "v3-type-caption ko-keep text-[var(--color-text-secondary)]"
                                    : "text-caption leading-5 text-[color:var(--muted)]"
                                }
                              >
                                입력 정보가 충분하지 않아 학습 신호 저장은
                                건너뛰었습니다.
                              </p>
                            </article>
                          ) : null}
                          {viewerMode === "anonymous" && structureDraft ? (
                            <article
                              className={
                                examMode === "second"
                                  ? "border-t border-[var(--color-border-default)] py-3"
                                  : "rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 py-3"
                              }
                            >
                              <p
                                className={
                                  examMode === "second"
                                    ? "v3-type-label-strong text-[var(--color-text-primary)]"
                                    : "text-caption font-medium text-[color:var(--foreground-strong)]"
                                }
                              >
                                검토 결과가 준비되었습니다.
                              </p>
                              <ul
                                className={
                                  examMode === "second"
                                    ? "v3-type-caption ko-keep mt-1 space-y-1 text-[var(--color-text-secondary)]"
                                    : "mt-1 space-y-1 text-caption leading-5 text-[color:var(--muted)]"
                                }
                              >
                                <li>
                                  • 로그인해 저장하면 약점 신호에 누적됩니다.
                                </li>
                                <li>• 로그인해 저장하면 복습에 남습니다.</li>
                                <li>
                                  • 로그인해 저장하면 오늘 계획에 반영됩니다.
                                </li>
                              </ul>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {examMode === "second" ? (
                                  <V3ActionLink
                                    href="/login?returnTo=%2Fanswer-review%3Fmode%3Dsecond"
                                    tone="secondary"
                                  >
                                    로그인하고 기록 저장
                                  </V3ActionLink>
                                ) : (
                                  <Link
                                    href="/login?returnTo=%2Fanswer-review%3Fmode%3Dfirst"
                                    className={cn(
                                      buttonVariants({ variant: "default" }),
                                      "min-h-11 px-3 text-xs",
                                    )}
                                  >
                                    로그인하고 기록 저장
                                  </Link>
                                )}
                                <AnswerReviewActionButton
                                  isSecond={examMode === "second"}
                                  v3Tone="secondary"
                                  legacyVariant="outline"
                                  legacyClassName="h-8 px-3 text-xs"
                                  onClick={() => setCurrentStep(2)}
                                >
                                  결과만 계속 보기
                                </AnswerReviewActionButton>
                              </div>
                            </article>
                          ) : null}
                          {qualityView &&
                          qualityView.qualityWarnings.length > 0 ? (
                            <article
                              className={
                                examMode === "second"
                                  ? "border-t border-[var(--color-border-default)] py-3"
                                  : "rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 py-3"
                              }
                            >
                              <p
                                className={
                                  examMode === "second"
                                    ? "v3-type-label-strong text-[var(--color-text-primary)]"
                                    : "text-caption font-medium text-[color:var(--muted)]"
                                }
                              >
                                검토 품질 확인 필요
                              </p>
                              <ul
                                className={
                                  examMode === "second"
                                    ? "v3-type-caption ko-keep mt-1 space-y-1 text-[var(--color-text-secondary)]"
                                    : "mt-1 space-y-1 text-xs leading-5 text-[color:var(--muted)]"
                                }
                              >
                                {qualityView.qualityWarnings.map((warning) => (
                                  <li key={warning}>• {warning}</li>
                                ))}
                              </ul>
                            </article>
                          ) : null}
                          <ResultFeedbackPrompt
                            route="/answer-review"
                            pageContext={{
                              section: "answer-review-result",
                              viewerMode,
                              examMode,
                              subject,
                            }}
                            presentation={
                              examMode === "second" ? "v3" : "legacy"
                            }
                          />
                        </div>
                      </details>
                    ) : null}
                    {structureDraft ? (
                      <details
                        className={answerReviewDisclosureClass(
                          examMode === "second",
                        )}
                        data-s224v-secondary-diagnostics
                        data-s232e4-result-secondary
                        open={resultSecondaryOpen}
                        onToggle={(event) =>
                          setResultSecondaryOpen(event.currentTarget.open)
                        }
                      >
                        <summary
                          className={
                            examMode === "second"
                              ? "v3-type-label-strong inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-primary)]"
                              : "cursor-pointer text-caption font-medium text-[color:var(--muted)]"
                          }
                        >
                          진단·계산 과정 보기 (선택)
                        </summary>
                        {resultSecondaryOpen ? (
                          <div
                            className={
                              examMode === "second"
                                ? "mt-4 space-y-5"
                                : "mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]"
                            }
                            data-calculator-routine-v3={
                              examMode === "second" ? true : undefined
                            }
                          >
                            <div className="space-y-4">
                              <CalculatorRoutineTrainer
                                key={
                                  hasProblemSnapRoutineHandoff
                                    ? problemSnapRoutineReference?.draftKey ||
                                      "problem-snap-calculator-routine"
                                    : answerReviewRoutineRunId ||
                                      "answer-review-calculator-routine"
                                }
                                source="answer-review"
                                examMode={examMode}
                                subject={subject}
                                eligibility={calculatorRoutineEligibility}
                                referenceHints={calculatorRoutineReferenceHints}
                                routineId={
                                  hasProblemSnapRoutineHandoff
                                    ? problemSnapRoutineReference?.routineId ||
                                      undefined
                                    : answerReviewRoutineRunId || undefined
                                }
                                resumeDraftKey={
                                  hasProblemSnapRoutineHandoff
                                    ? problemSnapRoutineReference?.draftKey ||
                                      undefined
                                    : undefined
                                }
                                presentation={
                                  examMode === "second"
                                    ? "embedded-v3"
                                    : "embedded"
                                }
                                onDraftReferenceChange={
                                  hasProblemSnapRoutineHandoff
                                    ? setProblemSnapRoutineReference
                                    : undefined
                                }
                                onComplete={
                                  calculatorRoutineSync.syncCompletion
                                }
                              />
                              <CalculatorRoutineSyncStatusLine
                                status={calculatorRoutineSync.status}
                                offlineEvidence={
                                  calculatorRoutineSync.offlineEvidence
                                }
                                retryAvailable={
                                  calculatorRoutineSync.retryAvailable
                                }
                                onRetry={calculatorRoutineSync.retry}
                                presentation={
                                  examMode === "second" ? "v3" : "legacy"
                                }
                              />

                              <details
                                className={answerReviewDisclosureClass(
                                  examMode === "second",
                                )}
                                data-answer-review-secondary-details
                                data-s224v-secondary-diagnostics
                              >
                                <summary
                                  className={
                                    examMode === "second"
                                      ? "v3-type-label-strong inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-primary)]"
                                      : "cursor-pointer text-caption font-medium text-[color:var(--muted)]"
                                  }
                                >
                                  진단 세부 보기
                                </summary>
                                <div className="mt-4 space-y-4">
                                  <article>
                                    <p
                                      className={
                                        examMode === "second"
                                          ? "v3-type-label-strong text-[var(--color-text-primary)]"
                                          : "text-caption font-medium text-[color:var(--muted)]"
                                      }
                                    >
                                      {explanationTitle}
                                    </p>
                                    {explanationLevel === "easy" ? (
                                      <div
                                        className={
                                          examMode === "second"
                                            ? "v3-type-compact ko-keep mt-2 space-y-2 text-[var(--color-text-primary)]"
                                            : "mt-2 space-y-2 text-caption leading-6 text-[color:var(--foreground-strong)]"
                                        }
                                      >
                                        <p>
                                          <span className="font-medium">
                                            한 줄 요약
                                          </span>
                                          :{" "}
                                          {toDetailLine(
                                            qualityView?.explanation.summary ||
                                              "",
                                            "핵심 이유를 쉬운 말로 먼저 정리해 보세요.",
                                          )}
                                        </p>
                                        <details>
                                          <summary
                                            className={
                                              examMode === "second"
                                                ? "inline-flex min-h-11 cursor-pointer items-center"
                                                : undefined
                                            }
                                          >
                                            용어 쉽게 풀기
                                          </summary>
                                          <ul>
                                            {(
                                              qualityView?.explanation
                                                .keyTerms ?? []
                                            ).map((item) => (
                                              <li key={item}>• {item}</li>
                                            ))}
                                          </ul>
                                        </details>
                                        <details>
                                          <summary
                                            className={
                                              examMode === "second"
                                                ? "inline-flex min-h-11 cursor-pointer items-center"
                                                : undefined
                                            }
                                          >
                                            단계별 풀이
                                          </summary>
                                          <ul>
                                            {(
                                              qualityView?.explanation.steps ??
                                              []
                                            ).map((item) => (
                                              <li key={item}>• {item}</li>
                                            ))}
                                          </ul>
                                        </details>
                                        <p>
                                          <span className="font-medium">
                                            그래서 지금 고칠 것
                                          </span>
                                          :{" "}
                                          {toShortLine(
                                            qualityView?.nextAction || "",
                                            "누락 논점 1개를 먼저 보강하세요.",
                                          )}
                                        </p>
                                      </div>
                                    ) : explanationLevel === "exam" ? (
                                      <ul
                                        className={
                                          examMode === "second"
                                            ? "v3-type-compact ko-keep mt-2 space-y-2 text-[var(--color-text-primary)]"
                                            : "mt-2 space-y-2 text-caption leading-6 text-[color:var(--foreground-strong)]"
                                        }
                                      >
                                        <li>
                                          • 답안 목차 보강:{" "}
                                          {toShortLine(
                                            qualityView?.skeleton.issue.join(
                                              " · ",
                                            ) || "",
                                            "논점 목차를 먼저 정리하세요.",
                                          )}
                                        </li>
                                        <li>
                                          • 필수 키워드:{" "}
                                          {toShortLine(
                                            (
                                              qualityView?.explanation
                                                .examHints ?? []
                                            ).join(" · ") || "",
                                            "필수 키워드 누락 여부를 확인하세요.",
                                          )}
                                        </li>
                                        <li>
                                          • 문단 보강 포인트:{" "}
                                          {toShortLine(
                                            qualityView?.primaryFix.howToFix ||
                                              "",
                                            "적용 문장을 한 줄 보강하세요.",
                                          )}
                                        </li>
                                      </ul>
                                    ) : (
                                      <ul
                                        className={
                                          examMode === "second"
                                            ? "v3-type-compact ko-keep mt-2 space-y-2 text-[var(--color-text-primary)]"
                                            : "mt-2 space-y-2 text-caption leading-6 text-[color:var(--foreground-strong)]"
                                        }
                                      >
                                        <li>
                                          • 핵심 이유:{" "}
                                          {toShortLine(
                                            qualityView?.explanation.summary ||
                                              "",
                                            "핵심 이유를 먼저 정리하세요.",
                                          )}
                                        </li>
                                        <li>
                                          • 적용 순서:{" "}
                                          {toShortLine(
                                            (
                                              qualityView?.explanation.steps ??
                                              []
                                            ).join(" → ") || "",
                                            "논점 분리 후 적용 순서대로 보강하세요.",
                                          )}
                                        </li>
                                        <li>
                                          • 보강 포인트:{" "}
                                          {toShortLine(
                                            (
                                              qualityView?.explanation
                                                .examHints ?? []
                                            ).join(" · ") || "",
                                            "보강 포인트 1개를 실행하세요.",
                                          )}
                                        </li>
                                      </ul>
                                    )}
                                  </article>

                                  <article>
                                    <p
                                      className={
                                        examMode === "second"
                                          ? "v3-type-caption text-[var(--color-text-secondary)]"
                                          : "text-caption font-medium text-[color:var(--muted)]"
                                      }
                                    >
                                      누락 논점
                                    </p>
                                    <p
                                      className={
                                        examMode === "second"
                                          ? "v3-type-compact ko-keep mt-2 text-[var(--color-text-primary)]"
                                          : "mt-2 text-caption leading-6 text-[color:var(--foreground-strong)]"
                                      }
                                    >
                                      {toDetailLine(
                                        structureDraft?.requiredIssues ||
                                          structureDraft?.caution ||
                                          "",
                                        "입력을 보강하면 누락 논점이 더 선명해집니다.",
                                      )}
                                    </p>
                                  </article>

                                  <article>
                                    <p
                                      className={
                                        examMode === "second"
                                          ? "v3-type-caption text-[var(--color-text-secondary)]"
                                          : "text-caption font-medium text-[color:var(--muted)]"
                                      }
                                    >
                                      약한 구조
                                    </p>
                                    <ul
                                      className={
                                        examMode === "second"
                                          ? "v3-type-compact ko-keep mt-2 space-y-2 text-[var(--color-text-primary)]"
                                          : "mt-2 space-y-2 text-caption leading-6 text-[color:var(--foreground-strong)]"
                                      }
                                    >
                                      <li>
                                        • 약한 문단 포인트:{" "}
                                        {toShortLine(
                                          structureDraft?.weakParagraphPoint ||
                                            "",
                                          "보강할 문단 포인트를 직접 지정해 주세요.",
                                        )}
                                      </li>
                                      <li>
                                        • 논리 보강 포인트:{" "}
                                        {toShortLine(
                                          structureDraft?.weakLogicPoint || "",
                                          "논리 연결 근거를 한 줄 더 추가해 보세요.",
                                        )}
                                      </li>
                                      <li>
                                        • 잘한 부분:{" "}
                                        {toShortLine(
                                          structureDraft?.strengths[0] || "",
                                          "강점은 유지하고 간극 하나만 우선 보강하세요.",
                                        )}
                                      </li>
                                    </ul>
                                  </article>

                                  <article>
                                    <p
                                      className={
                                        examMode === "second"
                                          ? "v3-type-caption text-[var(--color-text-secondary)]"
                                          : "text-caption font-medium text-[color:var(--muted)]"
                                      }
                                    >
                                      다시 쓸 문장
                                    </p>
                                    <p
                                      className={
                                        examMode === "second"
                                          ? "v3-type-compact ko-keep mt-2 text-[var(--color-text-primary)]"
                                          : "mt-2 text-caption leading-6 text-[color:var(--foreground-strong)]"
                                      }
                                    >
                                      {toDetailLine(
                                        structureDraft?.rewriteDraftSuggestion ||
                                          structureDraft?.rewriteTarget ||
                                          "",
                                        "추천 다시쓰기 초안이 아직 없습니다. 수동 메모를 활용해 보강하세요.",
                                      )}
                                    </p>
                                  </article>
                                </div>
                              </details>
                            </div>

                            <motion.aside
                              className={
                                examMode === "second"
                                  ? "divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]"
                                  : "space-y-3 lg:sticky lg:top-6 lg:self-start"
                              }
                              initial={shouldReduceMotion ? false : { x: 10 }}
                              animate={{ x: 0 }}
                              transition={{
                                duration: 0.3,
                                ease: "easeOut",
                                delay: shouldReduceMotion ? 0 : 0.08,
                              }}
                            >
                              <article
                                className={
                                  examMode === "second"
                                    ? "py-3"
                                    : "rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4"
                                }
                              >
                                <p
                                  className={
                                    examMode === "second"
                                      ? "v3-type-caption text-[var(--color-text-secondary)]"
                                      : "text-caption text-[color:var(--muted)]"
                                  }
                                >
                                  보강 우선도
                                </p>
                                <p
                                  className={
                                    examMode === "second"
                                      ? "v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)]"
                                      : "mt-1 text-sm font-semibold leading-6 text-[color:var(--foreground-strong)]"
                                  }
                                >
                                  간극 1개 우선 보강
                                </p>
                                <p
                                  className={
                                    examMode === "second"
                                      ? "v3-type-caption ko-keep mt-2 text-[var(--color-text-secondary)]"
                                      : "mt-2 text-caption leading-5 text-[color:var(--muted)]"
                                  }
                                >
                                  점수보다 다음 보강 행동을 먼저 실행해 주세요.
                                </p>
                              </article>
                              <article
                                className={
                                  examMode === "second"
                                    ? "py-3"
                                    : "rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4"
                                }
                              >
                                <p
                                  className={
                                    examMode === "second"
                                      ? "v3-type-caption text-[var(--color-text-secondary)]"
                                      : "text-caption font-medium text-[color:var(--muted)]"
                                  }
                                >
                                  보조 지표
                                </p>
                                <ul
                                  className={
                                    examMode === "second"
                                      ? "v3-type-compact ko-keep mt-2 space-y-1 text-[var(--color-text-primary)]"
                                      : "mt-2 space-y-1 text-caption leading-5 text-[color:var(--foreground-strong)]"
                                  }
                                >
                                  <li>
                                    강점 {structureDraft?.strengths.length ?? 0}
                                    개
                                  </li>
                                  <li>
                                    누락 후보{" "}
                                    {structureDraft?.missingIssueCandidates
                                      .length ?? 0}
                                    개
                                  </li>
                                  <li>
                                    다음 행동 제안{" "}
                                    {qualityView?.nextAction ? "있음" : "없음"}
                                  </li>
                                </ul>
                              </article>
                              <article
                                className={
                                  examMode === "second"
                                    ? "py-3"
                                    : "rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4"
                                }
                              >
                                <p
                                  className={
                                    examMode === "second"
                                      ? "v3-type-caption text-[var(--color-text-secondary)]"
                                      : "text-caption font-medium text-[color:var(--muted)]"
                                  }
                                >
                                  답안 구조
                                </p>
                                <p
                                  className={
                                    examMode === "second"
                                      ? "v3-type-caption ko-keep mt-1 text-[var(--color-text-secondary)]"
                                      : "mt-1 text-caption leading-5 text-[color:var(--muted)]"
                                  }
                                >
                                  문장형 답안이 아니라 목차와 필수 키워드만
                                  정리합니다.
                                </p>
                                <ul
                                  className={
                                    examMode === "second"
                                      ? "v3-type-compact ko-keep mt-2 space-y-1 text-[var(--color-text-primary)]"
                                      : "mt-2 space-y-1 text-caption leading-5 text-[color:var(--foreground-strong)]"
                                  }
                                >
                                  <li>
                                    Ⅰ. 논점의 정리:{" "}
                                    {toShortLine(
                                      qualityView?.skeleton.issue.join(" · ") ||
                                        "",
                                      "핵심 논점과 기준 키워드를 1줄로 정리합니다.",
                                    )}
                                  </li>
                                  <li>
                                    Ⅱ. 기준/법리:{" "}
                                    {toShortLine(
                                      qualityView?.skeleton.rule.join(" · ") ||
                                        "",
                                      "기준 문구와 법리 키워드를 빠짐없이 배치합니다.",
                                    )}
                                  </li>
                                  <li>
                                    Ⅲ. 사안의 적용:{" "}
                                    {toShortLine(
                                      qualityView?.skeleton.application.join(
                                        " · ",
                                      ) || "",
                                      "사안 적용 근거를 1~2문장으로 보강합니다.",
                                    )}
                                  </li>
                                  <li>
                                    Ⅳ. 결론:{" "}
                                    {toShortLine(
                                      qualityView?.skeleton.conclusion.join(
                                        " · ",
                                      ) || "",
                                      "결론 문장을 다시 써서 마무리합니다.",
                                    )}
                                  </li>
                                </ul>
                              </article>
                            </motion.aside>
                          </div>
                        ) : null}
                      </details>
                    ) : null}
                  </motion.section>
                </AnimatePresence>
              ) : null}

              {currentStep === 3 && structureDraft ? (
                <motion.section
                  className="space-y-5"
                  initial={shouldReduceMotion ? false : { y: 8 }}
                  animate={{ y: 0 }}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 0.32,
                    ease: "easeOut",
                  }}
                  data-s232e4-answer-review-rewrite="single-paragraph"
                >
                  <div
                    className={
                      examMode === "second"
                        ? "flex flex-wrap items-start justify-between gap-3 border-y border-[var(--color-border-default)] py-4"
                        : "flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4 sm:p-5"
                    }
                  >
                    <div className="space-y-1">
                      <p
                        className={
                          examMode === "second"
                            ? "v3-type-caption text-[var(--color-text-secondary)]"
                            : "text-caption text-[color:var(--muted)]"
                        }
                      >
                        {examMode === "second"
                          ? "감정평가사 2차"
                          : "감정평가사 1차"}{" "}
                        · {subject}
                      </p>
                      <h2
                        ref={stepThreeHeadingRef}
                        tabIndex={-1}
                        className={
                          examMode === "second"
                            ? "v3-type-section ko-keep text-[var(--color-text-primary)]"
                            : "v3-type-section ko-keep text-[color:var(--foreground-strong)]"
                        }
                      >
                        보강 문단 정리
                      </h2>
                      <p
                        className={
                          examMode === "second"
                            ? "v3-type-compact ko-keep text-[var(--color-text-secondary)]"
                            : "v3-type-compact ko-keep text-[color:var(--muted)]"
                        }
                      >
                        가장 큰 간극을 반영할 한 문단만 다시 쓰고, 복사하거나
                        다음 학습으로 계속합니다.
                      </p>
                    </div>
                    <AnswerReviewActionButton
                      isSecond={examMode === "second"}
                      legacyVariant="outline"
                      v3Tone="secondary"
                      onClick={() => setCurrentStep(2)}
                      legacyClassName="h-9 px-4"
                    >
                      검토 결과로 돌아가기
                    </AnswerReviewActionButton>
                  </div>

                  <motion.article
                    className={
                      examMode === "second"
                        ? "space-y-5 rounded-[var(--v3-radius-panel)] border border-[var(--color-border-focus)] bg-[var(--color-background-focus)] p-4 sm:p-6"
                        : "space-y-5 rounded-[var(--radius-md)] border border-[color:var(--brand-700)] bg-[color:var(--surface)] p-4 sm:p-6"
                    }
                    initial={shouldReduceMotion ? false : { y: 8 }}
                    animate={{ y: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.28,
                      ease: "easeOut",
                    }}
                    data-s232e4-rewrite-surface
                  >
                    <dl
                      className={
                        examMode === "second"
                          ? "divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]"
                          : "divide-y divide-[color:var(--border)] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)]"
                      }
                    >
                      <div className="px-3 py-3 sm:grid sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-3">
                        <dt
                          className={
                            examMode === "second"
                              ? "v3-type-caption text-[var(--color-text-secondary)]"
                              : "v3-type-caption text-[color:var(--muted)]"
                          }
                        >
                          다시 쓸 대상
                        </dt>
                        <dd
                          className={
                            examMode === "second"
                              ? "v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)] sm:mt-0"
                              : "v3-type-compact ko-keep mt-1 text-[color:var(--foreground-strong)] sm:mt-0"
                          }
                        >
                          {biggestGapFix}
                        </dd>
                      </div>
                      <div className="px-3 py-3 sm:grid sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-3">
                        <dt
                          className={
                            examMode === "second"
                              ? "v3-type-caption text-[var(--color-text-secondary)]"
                              : "v3-type-caption text-[color:var(--muted)]"
                          }
                        >
                          작성 지시
                        </dt>
                        <dd
                          className={
                            examMode === "second"
                              ? "v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)] sm:mt-0"
                              : "v3-type-compact ko-keep mt-1 text-[color:var(--foreground-strong)] sm:mt-0"
                          }
                        >
                          {toDetailLine(
                            qualityView?.nextAction ||
                              structureDraft?.nextAction ||
                              "",
                            "교정 문단 구조를 기준으로 한 문단만 다시 작성해 보세요.",
                          )}
                        </dd>
                      </div>
                    </dl>

                    <div className="space-y-2">
                      <label
                        htmlFor="answer-review-revision-input"
                        className={
                          examMode === "second"
                            ? "v3-type-label-strong text-[var(--color-text-primary)]"
                            : "v3-type-label-strong text-[color:var(--foreground-strong)]"
                        }
                      >
                        보강할 한 문단
                      </label>
                      <p
                        id="answer-review-revision-help"
                        className={
                          examMode === "second"
                            ? "v3-type-caption ko-keep text-[var(--color-text-secondary)]"
                            : "v3-type-caption ko-keep text-[color:var(--muted)]"
                        }
                      >
                        제안 문장을 그대로 쓰지 말고, 내 답안과 문제 조건에
                        맞는지 직접 확인하세요.
                      </p>
                      <Textarea
                        id="answer-review-revision-input"
                        aria-describedby="answer-review-revision-help"
                        className={
                          examMode === "second"
                            ? "min-h-[160px] rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)]"
                            : "min-h-[160px] bg-[color:var(--surface)]"
                        }
                        placeholder="누락 논점을 반영해 보강 문단을 직접 작성해 주세요."
                        value={revisionParagraph}
                        onChange={(event) =>
                          setRevisionParagraph(event.target.value)
                        }
                        data-testid="answer-review-revision-input"
                      />
                    </div>

                    <div
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                      data-s232e4-copy-or-continue
                    >
                      <AnswerReviewActionButton
                        isSecond={examMode === "second"}
                        className="w-full sm:w-auto"
                        legacyClassName="w-full sm:w-auto"
                        onClick={handlePrimaryAction}
                        data-testid="answer-review-copy-feedback"
                      >
                        {primaryActionLabel}
                      </AnswerReviewActionButton>
                      {examMode === "second" ? (
                        <V3ActionLink
                          href="/app?mode=second"
                          tone="secondary"
                          data-s232e4-answer-review-continue
                        >
                          오늘 학습으로 계속
                        </V3ActionLink>
                      ) : (
                        <Link
                          href="/app?mode=first"
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                            "w-full sm:w-auto",
                          )}
                          data-s232e4-answer-review-continue
                        >
                          오늘 학습으로 계속
                        </Link>
                      )}
                    </div>

                    {visibleFeedbackCopyStatus !== "idle" ? (
                      <p
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        className={
                          examMode === "second"
                            ? "v3-type-caption ko-keep text-[var(--color-text-secondary)]"
                            : "text-caption leading-5 text-[color:var(--muted)]"
                        }
                      >
                        {didCopyCurrentDraft
                          ? "복사 완료. 저장 전 직접 확인해 주세요."
                          : "클립보드 복사에 실패했습니다. 텍스트를 수동으로 복사해 주세요."}
                      </p>
                    ) : null}
                  </motion.article>

                  <details
                    className={answerReviewDisclosureClass(
                      examMode === "second",
                    )}
                    data-s224v-secondary-diagnostics
                    data-s232e4-rewrite-guidance
                  >
                    <summary
                      className={
                        examMode === "second"
                          ? "v3-type-label-strong inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-primary)]"
                          : "cursor-pointer text-caption font-medium text-[color:var(--muted)]"
                      }
                    >
                      복습·계속 단서 보기 (선택)
                    </summary>
                    <div className="mt-4">
                      <CognitiveLearningActionCard
                        unit={cognitiveLearningActions}
                        compact
                        presentation={examMode === "second" ? "v3" : "legacy"}
                      />
                    </div>
                  </details>

                  <details
                    className={answerReviewDisclosureClass(
                      examMode === "second",
                    )}
                    data-s224v-secondary-diagnostics
                    data-s232e4-rewrite-details
                  >
                    <summary
                      className={
                        examMode === "second"
                          ? "v3-type-label-strong inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-primary)]"
                          : "cursor-pointer text-caption font-medium text-[color:var(--muted)]"
                      }
                    >
                      입력·초안 상태 보기
                    </summary>
                    <div className="mt-4 space-y-4">
                      <dl
                        className={
                          examMode === "second"
                            ? "divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]"
                            : "grid gap-3 sm:grid-cols-2"
                        }
                      >
                        <div
                          className={
                            examMode === "second"
                              ? "py-3"
                              : "rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3"
                          }
                        >
                          <dt
                            className={
                              examMode === "second"
                                ? "v3-type-caption text-[var(--color-text-secondary)]"
                                : "text-caption font-medium text-[color:var(--muted)]"
                            }
                          >
                            입력 상태
                          </dt>
                          <dd
                            className={
                              examMode === "second"
                                ? "v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)]"
                                : "mt-1 text-caption leading-5 text-[color:var(--foreground-strong)]"
                            }
                          >
                            {inputStatusSummary}
                          </dd>
                        </div>
                        <div
                          className={
                            examMode === "second"
                              ? "py-3"
                              : "rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3"
                          }
                        >
                          <dt
                            className={
                              examMode === "second"
                                ? "v3-type-caption text-[var(--color-text-secondary)]"
                                : "text-caption font-medium text-[color:var(--muted)]"
                            }
                          >
                            초안 구성
                          </dt>
                          <dd
                            className={
                              examMode === "second"
                                ? "v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)]"
                                : "mt-1 text-caption leading-5 text-[color:var(--foreground-strong)]"
                            }
                          >
                            교정 문단{" "}
                            {hasRevisionParagraph
                              ? `${getParagraphCount(revisionParagraph)}문단`
                              : "작성 필요"}{" "}
                            · 강점 {structureDraft?.strengths.length ?? 0}개 ·
                            간극{" "}
                            {structureDraft?.missingIssueCandidates.length ?? 0}
                            개
                          </dd>
                        </div>
                      </dl>
                      <div className="space-y-2">
                        <label
                          htmlFor="answer-review-missing-point-input"
                          className={
                            examMode === "second"
                              ? "v3-type-caption text-[var(--color-text-secondary)]"
                              : "text-caption font-medium text-[color:var(--muted)]"
                          }
                        >
                          누락 논점 후보 메모
                        </label>
                        <Textarea
                          id="answer-review-missing-point-input"
                          className={
                            examMode === "second"
                              ? "min-h-[96px] rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)]"
                              : "min-h-[96px] bg-[color:var(--surface)]"
                          }
                          placeholder="예: 처분 근거 조문 제시가 누락되어 논증 연결이 약함"
                          value={missingPointMemo}
                          onChange={(event) =>
                            setMissingPointMemo(event.target.value)
                          }
                        />
                      </div>
                      <pre
                        className={
                          examMode === "second"
                            ? "v3-type-compact max-h-[240px] overflow-auto whitespace-pre-wrap border-y border-[var(--color-border-default)] py-3 text-[var(--color-text-primary)]"
                            : "max-h-[240px] overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3 text-caption leading-6 text-[color:var(--foreground-strong)]"
                        }
                      >
                        {reviewerNoteText}
                      </pre>
                    </div>
                  </details>
                </motion.section>
              ) : null}

              {currentStep !== 1 && structureDraft ? (
                <details
                  className={answerReviewDisclosureClass(examMode === "second")}
                  data-s224v-secondary-diagnostics
                  data-s232e4-full-diagnostics
                >
                  <summary
                    className={
                      examMode === "second"
                        ? "v3-type-label-strong inline-flex min-h-11 cursor-pointer items-center text-[var(--color-text-primary)]"
                        : "cursor-pointer text-sm font-medium text-[color:var(--foreground-strong)]"
                    }
                  >
                    전체 진단 보기 (선택)
                  </summary>
                  <div className="mt-3 space-y-3">
                    <section
                      id="manual-comparison-preview"
                      className="space-y-2"
                    >
                      <p
                        className={
                          examMode === "second"
                            ? "v3-type-label-strong text-[var(--color-text-primary)]"
                            : "text-caption font-medium text-[color:var(--muted)]"
                        }
                      >
                        검토 흐름
                      </p>
                      <ul
                        className={
                          examMode === "second"
                            ? "v3-type-caption ko-keep space-y-1 text-[var(--color-text-secondary)]"
                            : "space-y-1 text-caption leading-5 text-[color:var(--muted)]"
                        }
                      >
                        <li>1) 문제/사례 입력</li>
                        <li>2) 내 답안 입력</li>
                        <li>3) 참고 정리 입력</li>
                        <li>4) 보강 문단 저장 전 확인</li>
                      </ul>
                      <p
                        className={
                          examMode === "second"
                            ? "v3-type-caption ko-keep text-[var(--color-text-secondary)]"
                            : "text-caption leading-5 text-[color:var(--muted)]"
                        }
                      >
                        긴 PDF는 필요한 문제/답안/참고 정리 페이지만 나눠 넣는
                        것이 좋습니다.
                      </p>
                      {hasMyAnswer ? (
                        <p
                          className={
                            examMode === "second"
                              ? "v3-type-caption ko-keep text-[var(--color-text-secondary)]"
                              : "text-caption leading-5 text-[color:var(--muted)]"
                          }
                        >
                          입력 요약: 내 답안 {myAnswerText.trim().length}자/
                          {getParagraphCount(myAnswerText)}문단, 참고 정리{" "}
                          {referenceAnswerText.trim().length}자/
                          {getParagraphCount(referenceAnswerText)}문단.
                        </p>
                      ) : null}
                    </section>

                    <section className="space-y-2">
                      <p
                        className={
                          examMode === "second"
                            ? "v3-type-label-strong text-[var(--color-text-primary)]"
                            : "text-caption font-medium text-[color:var(--muted)]"
                        }
                      >
                        세부 분석
                      </p>
                      {structureDraft ? (
                        <div
                          className={
                            examMode === "second"
                              ? "divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]"
                              : "grid gap-2 sm:grid-cols-2"
                          }
                        >
                          <AnswerReviewDiagnosticLine
                            isSecond={examMode === "second"}
                            label="문제 요구"
                            value={toDetailLine(
                              structureDraft.questionSummary,
                              "문제 요구를 더 입력하면 검토 정확도가 높아집니다.",
                            )}
                          />
                          <AnswerReviewDiagnosticLine
                            isSecond={examMode === "second"}
                            label="핵심 개념"
                            value={toDetailLine(
                              structureDraft.coreConcepts.length > 0
                                ? structureDraft.coreConcepts.join(", ")
                                : "",
                              "핵심 개념을 더 입력해 주세요.",
                            )}
                          />
                          <AnswerReviewDiagnosticLine
                            isSecond={examMode === "second"}
                            label="필수 논점"
                            value={toDetailLine(
                              structureDraft.requiredIssues,
                              "참고 정리와 문제 요구를 더 입력하면 보강할 간극이 선명해집니다.",
                            )}
                          />
                          <AnswerReviewDiagnosticLine
                            isSecond={examMode === "second"}
                            label="내 답안 구조"
                            value={toDetailLine(
                              structureDraft.userAnswerStructure,
                              "문단별 주장과 근거를 정리하면 구조 분석이 선명해집니다.",
                            )}
                          />
                          <AnswerReviewDiagnosticLine
                            isSecond={examMode === "second"}
                            label="참고 정리 구조"
                            value={toDetailLine(
                              structureDraft.referenceStructure,
                              "참고 정리의 목차를 입력하면 비교가 정확해집니다.",
                            )}
                          />
                          <AnswerReviewDiagnosticLine
                            isSecond={examMode === "second"}
                            label="보강 문단 포인트"
                            value={toDetailLine(
                              structureDraft.weakParagraphPoint,
                              "보강할 문단 포인트를 직접 확인해 주세요.",
                            )}
                          />
                          <AnswerReviewDiagnosticLine
                            isSecond={examMode === "second"}
                            label="논리 보강 포인트"
                            value={toDetailLine(
                              structureDraft.weakLogicPoint,
                              "논리 연결이 약한 지점을 직접 확인해 주세요.",
                            )}
                          />
                          <AnswerReviewDiagnosticLine
                            isSecond={examMode === "second"}
                            label="검토 메모"
                            value={toDetailLine(
                              structureDraft.caution,
                              "검토 메모를 확인하고 필요한 부분을 수정해 주세요.",
                            )}
                          />
                        </div>
                      ) : (
                        <p
                          className={
                            examMode === "second"
                              ? "v3-type-caption ko-keep text-[var(--color-text-secondary)]"
                              : "text-caption leading-5 text-[color:var(--muted)]"
                          }
                        >
                          먼저 답안 정리를 시작하면 세부 분석을 확인할 수
                          있습니다.
                        </p>
                      )}
                    </section>
                  </div>
                </details>
              ) : null}
            </section>
          </section>

          <div>
            {examMode === "second" ? (
              <V3ActionLink href="/exams" tone="secondary">
                시험 선택으로 돌아가기
              </V3ActionLink>
            ) : (
              <Link
                href="/exams"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full sm:w-auto",
                )}
              >
                시험 선택으로 돌아가기
              </Link>
            )}
          </div>
        </AnswerReviewFrame>
      </main>
    </>
  );
}
