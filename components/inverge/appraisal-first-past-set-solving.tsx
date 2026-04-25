"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Pause, Play } from "lucide-react";

import { FocusAudioControl } from "@/components/inverge/focus-audio-control";
import { OcrAssistPanel } from "@/components/inverge/ocr-assist-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { postAppraisalFirst } from "@/lib/appraisal-first/client";
import { buildUserScopedKey, getAppraisalFirstBrowserUserId } from "@/lib/appraisal-first/browser-storage";
import { useAuthSession } from "@/lib/auth/client";
import { logInvergeEvent } from "@/lib/inverge/event-client";
import { cn } from "@/lib/utils";

type SubjectId = "civil_law" | "economics" | "real_estate" | "appraisal_law" | "accounting";
type ChoiceId = "1" | "2" | "3" | "4" | "5";
type ConfidenceLevel = "low" | "medium" | "high";
type PastSetPageMode = "intro" | "resume_prompt" | "solving" | "paused" | "confirm_submit" | "submitting" | "submitted";
type ReviewReasonCode = "unanswered" | "low_confidence" | "medium_confidence" | "flagged" | "time_overuse";
type ReviewPriority = "today" | "this_week" | "maintenance";

type PastSetChoice = {
  id: ChoiceId;
  text: string;
};

type PastSetQuestion = {
  id: string;
  number: number;
  subjectId: SubjectId;
  unit: string;
  stem: string;
  choices: PastSetChoice[];
  difficulty: "low" | "medium" | "high";
  expectedTimeSeconds?: number;
  timeOveruseThresholdSeconds?: number;
  curriculumNodeIds?: string[];
  reviewCandidateFlags?: {
    lowConfidence: boolean;
    flagged: boolean;
    timeOveruse: boolean;
  };
  active?: boolean;
};

type PastSet = {
  id: string;
  subjectId: SubjectId;
  title: string;
  sourceLabel: string;
  timeLimitMinutes: number;
  questions: PastSetQuestion[];
};

type PastSetAnswer = {
  questionId: string;
  selectedChoiceId: ChoiceId | null;
  confidence: ConfidenceLevel | null;
  flagged: boolean;
  visited: boolean;
  firstAnsweredAt: string | null;
  lastUpdatedAt: string | null;
  elapsedSecondsOnQuestion: number;
};

type TimerState = {
  startedAt: string | null;
  pausedAt: string | null;
  totalPausedSeconds: number;
  remainingSeconds: number;
  timeLimitSeconds: number;
};

type ImmediateSetFeedback = {
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  lowConfidenceCount: number;
  mediumConfidenceCount: number;
  flaggedCount: number;
  exceededTimeLimit: boolean;
  overtimeSeconds: number;
  reviewQueueCandidateCount: number;
};

type ReviewQueueCandidate = {
  questionId: string;
  subjectId: SubjectId;
  setId: string;
  unit: string;
  difficulty: "low" | "medium" | "high";
  selectedChoiceId: ChoiceId | null;
  confidence: ConfidenceLevel | null;
  flagged: boolean;
  elapsedSecondsOnQuestion: number;
  reasonCodes: ReviewReasonCode[];
  priority: ReviewPriority;
  reviewReasonSentence?: string;
  recommendedReviewAction?: string;
};

type PastSetSubmittedResult = {
  subjectId: SubjectId;
  setId: string;
  startedAt: string;
  submittedAt: string;
  totalElapsedSeconds: number;
  totalPausedSeconds: number;
  exceededTimeLimit: boolean;
  overtimeSeconds: number;
  answers: Record<string, PastSetAnswer>;
  feedback: ImmediateSetFeedback;
  reviewQueueCandidates: ReviewQueueCandidate[];
};

type PersistedDraft = {
  mode: PastSetPageMode;
  currentQuestionId: string;
  answers: Record<string, PastSetAnswer>;
  timer: TimerState;
  sourceCaptureText?: string;
  sourceCaptureFiles?: string[];
  updatedAt: string;
};

type RuntimeQuestionConfig = {
  questionId: string;
  number: number;
  unit: string;
  difficulty: "low" | "medium" | "high";
  curriculumNodeIds: string[];
  expectedTimeSeconds: number;
  timeOveruseThresholdSeconds: number;
  reviewCandidateFlags: {
    lowConfidence: boolean;
    flagged: boolean;
    timeOveruse: boolean;
  };
  active: boolean;
};

type RuntimeSetConfig = {
  setId: string;
  setTitle: string;
  sourceLabel: string;
  timeLimitMinutes: number;
  active: boolean;
  questions: RuntimeQuestionConfig[];
};

const SUBJECT_LABELS: Record<SubjectId, string> = {
  civil_law: "민법",
  economics: "경제학원론",
  real_estate: "부동산학원론",
  appraisal_law: "감정평가관계법규",
  accounting: "회계학",
};

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string }[] = [
  { value: "low", label: "확신 낮음" },
  { value: "medium", label: "보통" },
  { value: "high", label: "확신 있음" },
];

const MOCK_SETS: Record<SubjectId, PastSet> = {
  appraisal_law: {
    id: "intro-10",
    subjectId: "appraisal_law",
    title: "감정평가관계법규 Starter 10문항",
    sourceLabel: "기출 변형 세트",
    timeLimitMinutes: 12,
    questions: [
      {
        id: "law-1",
        number: 1,
        subjectId: "appraisal_law",
        unit: "감정평가법",
        difficulty: "medium",
        stem: "감정평가사의 기본 직무 원칙에 관한 설명으로 가장 옳은 것은 무엇인가요?",
        choices: [
          { id: "1", text: "의뢰인의 요청에 따라 평가 결과를 임의로 조정할 수 있다." },
          { id: "2", text: "독립성과 공정성을 유지해야 한다." },
          { id: "3", text: "평가 목적보다 수수료 수준을 우선한다." },
          { id: "4", text: "서면 설명은 생략할 수 있다." },
          { id: "5", text: "계약서가 있으면 책임은 모두 면제된다." },
        ],
      },
      {
        id: "law-2",
        number: 2,
        subjectId: "appraisal_law",
        unit: "손실보상법",
        difficulty: "high",
        stem: "공익사업을 위한 토지 보상에 관한 설명으로 옳지 않은 것은 무엇인가요?",
        choices: [
          { id: "1", text: "보상은 정당보상을 기준으로 한다." },
          { id: "2", text: "재결 절차는 보상 결정에서 중요하다." },
          { id: "3", text: "사업인정은 보상 절차와 관련이 있다." },
          { id: "4", text: "보상액 산정에서 시점은 고려하지 않는다." },
          { id: "5", text: "잔여지 가치 하락은 일정 조건에서 문제 된다." },
        ],
      },
      {
        id: "law-3",
        number: 3,
        subjectId: "appraisal_law",
        unit: "부동산공시법",
        difficulty: "medium",
        stem: "표준지공시지가에 관한 설명으로 가장 옳은 것은 무엇인가요?",
        choices: [
          { id: "1", text: "개별공시지가 산정의 기준으로 활용된다." },
          { id: "2", text: "모든 토지는 실제 거래가격으로만 산정한다." },
          { id: "3", text: "감정평가사가 임의로 결정한다." },
          { id: "4", text: "매월 새로 공시된다." },
          { id: "5", text: "조세 부과와는 무관하다." },
        ],
      },
      {
        id: "law-4",
        number: 4,
        subjectId: "appraisal_law",
        unit: "감정평가법",
        difficulty: "low",
        stem: "감정평가서 기재 사항에 관한 설명으로 옳은 것은 무엇인가요?",
        choices: [
          { id: "1", text: "평가 목적은 적지 않아도 된다." },
          { id: "2", text: "대상과 기준 시점은 중요한 기재 사항이다." },
          { id: "3", text: "작성자는 표시하지 않는다." },
          { id: "4", text: "근거 자료는 모두 생략한다." },
          { id: "5", text: "평가액만 있으면 충분하다." },
        ],
      },
      {
        id: "law-5",
        number: 5,
        subjectId: "appraisal_law",
        unit: "감정평가법",
        difficulty: "medium",
        stem: "감정평가 기준 준수에 관한 설명으로 가장 옳은 것은 무엇인가요?",
        choices: [
          { id: "1", text: "기준은 참고 자료에 불과하다." },
          { id: "2", text: "평가 목적에 따라 기준 준수가 달라지지 않는다." },
          { id: "3", text: "관련 법령과 기준을 함께 고려해야 한다." },
          { id: "4", text: "의뢰인의 지시가 항상 우선한다." },
          { id: "5", text: "시장 자료는 사용할 필요가 없다." },
        ],
      },
    ],
  },
  civil_law: {
    id: "intro-10",
    subjectId: "civil_law",
    title: "민법 Starter 10문항",
    sourceLabel: "기출 변형 세트",
    timeLimitMinutes: 12,
    questions: [],
  },
  economics: {
    id: "intro-10",
    subjectId: "economics",
    title: "경제학원론 Starter 10문항",
    sourceLabel: "기출 변형 세트",
    timeLimitMinutes: 12,
    questions: [],
  },
  real_estate: {
    id: "intro-10",
    subjectId: "real_estate",
    title: "부동산학원론 Starter 10문항",
    sourceLabel: "기출 변형 세트",
    timeLimitMinutes: 12,
    questions: [],
  },
  accounting: {
    id: "intro-10",
    subjectId: "accounting",
    title: "회계학 Starter 10문항",
    sourceLabel: "기출 변형 세트",
    timeLimitMinutes: 12,
    questions: [],
  },
};

function makeFallbackSet(subjectId: SubjectId, setId: string): PastSet {
  const subjectName = SUBJECT_LABELS[subjectId];

  return {
    ...MOCK_SETS.appraisal_law,
    id: setId,
    subjectId,
    title: `${subjectName} Starter 5문항`,
    questions: MOCK_SETS.appraisal_law.questions.map((question) => ({
      ...question,
      id: `${subjectId}-${question.number}`,
      subjectId,
      unit: subjectName,
      stem: `${subjectName} 기출 세트 기준으로, 다음 설명 중 가장 옳은 것을 고르세요.`,
    })),
  };
}

function getMockSet(subjectId: string, setId: string): PastSet {
  const safeSubjectId = isSubjectId(subjectId) ? subjectId : "appraisal_law";
  const set = MOCK_SETS[safeSubjectId];

  if (set.questions.length > 0) {
    return { ...set, id: setId };
  }

  return makeFallbackSet(safeSubjectId, setId);
}

function isSubjectId(value: string): value is SubjectId {
  return Object.keys(SUBJECT_LABELS).includes(value);
}

function defaultAnswer(questionId: string): PastSetAnswer {
  return {
    questionId,
    selectedChoiceId: null,
    confidence: null,
    flagged: false,
    visited: false,
    firstAnsweredAt: null,
    lastUpdatedAt: null,
    elapsedSecondsOnQuestion: 0,
  };
}

function initializeAnswers(questions: PastSetQuestion[]) {
  return questions.reduce((acc, question) => {
    acc[question.id] = defaultAnswer(question.id);
    return acc;
  }, {} as Record<string, PastSetAnswer>);
}

function formatSeconds(totalSeconds: number) {
  const absolute = Math.abs(totalSeconds);
  const minutes = Math.floor(absolute / 60);
  const seconds = absolute % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getExpectedThreshold(question: PastSetQuestion) {
  if (typeof question.timeOveruseThresholdSeconds === "number") {
    return question.timeOveruseThresholdSeconds;
  }
  if (typeof question.expectedTimeSeconds === "number") {
    return question.expectedTimeSeconds + 30;
  }
  if (question.difficulty === "high") return 120;
  if (question.difficulty === "medium") return 90;
  return 70;
}

function buildFeedback(set: PastSet, answers: Record<string, PastSetAnswer>, timer: TimerState): ImmediateSetFeedback {
  const values = Object.values(answers);
  const answeredCount = values.filter((answer) => answer.selectedChoiceId !== null).length;
  const lowConfidenceCount = values.filter((answer) => answer.confidence === "low").length;
  const mediumConfidenceCount = values.filter((answer) => answer.confidence === "medium").length;
  const flaggedCount = values.filter((answer) => answer.flagged).length;
  const exceededTimeLimit = timer.remainingSeconds <= 0;
  const reviewQueueCandidateCount = buildReviewQueueCandidates(set, answers).length;

  return {
    totalQuestions: set.questions.length,
    answeredCount,
    unansweredCount: set.questions.length - answeredCount,
    lowConfidenceCount,
    mediumConfidenceCount,
    flaggedCount,
    exceededTimeLimit,
    overtimeSeconds: exceededTimeLimit ? Math.abs(timer.remainingSeconds) : 0,
    reviewQueueCandidateCount,
  };
}

function buildReviewQueueCandidates(set: PastSet, answers: Record<string, PastSetAnswer>): ReviewQueueCandidate[] {
  return set.questions.flatMap((question) => {
    const answer = answers[question.id] ?? defaultAnswer(question.id);
    const reasonCodes: ReviewReasonCode[] = [];

    if (answer.selectedChoiceId === null) reasonCodes.push("unanswered");
    if (answer.confidence === "low" && question.reviewCandidateFlags?.lowConfidence !== false) reasonCodes.push("low_confidence");
    if (answer.confidence === "medium") reasonCodes.push("medium_confidence");
    if (answer.flagged && question.reviewCandidateFlags?.flagged !== false) reasonCodes.push("flagged");
    if (answer.elapsedSecondsOnQuestion > getExpectedThreshold(question) && question.reviewCandidateFlags?.timeOveruse !== false) {
      reasonCodes.push("time_overuse");
    }

    if (reasonCodes.length === 0) {
      return [];
    }

    return [
      {
        questionId: question.id,
        subjectId: question.subjectId,
        setId: set.id,
        unit: question.unit,
        difficulty: question.difficulty,
        selectedChoiceId: answer.selectedChoiceId,
        confidence: answer.confidence,
        flagged: answer.flagged,
        elapsedSecondsOnQuestion: answer.elapsedSecondsOnQuestion,
        reasonCodes,
        priority: reasonCodes.some((code) => code === "unanswered" || code === "low_confidence" || code === "flagged")
          ? "today"
          : "this_week",
      },
    ];
  });
}

function applyRuntimeSetConfig(set: PastSet, config: RuntimeSetConfig | null): PastSet {
  if (!config || !config.active) {
    return set;
  }

  const questionConfigById = new Map(config.questions.map((question) => [question.questionId, question]));
  const nextQuestions = set.questions
    .map((question) => {
      const override = questionConfigById.get(question.id);
      if (!override) {
        return question;
      }

      return {
        ...question,
        number: override.number,
        unit: override.unit,
        difficulty: override.difficulty,
        expectedTimeSeconds: override.expectedTimeSeconds,
        timeOveruseThresholdSeconds: override.timeOveruseThresholdSeconds,
        curriculumNodeIds: override.curriculumNodeIds,
        reviewCandidateFlags: override.reviewCandidateFlags,
        active: override.active,
      };
    })
    .filter((question) => question.active !== false);

  return {
    ...set,
    title: config.setTitle || set.title,
    sourceLabel: config.sourceLabel || set.sourceLabel,
    timeLimitMinutes: config.timeLimitMinutes || set.timeLimitMinutes,
    questions: nextQuestions,
  };
}

async function fetchRuntimeSetConfig(subjectId: SubjectId, setId: string) {
  const response = await fetch(`/api/appraisal-first/sets/${setId}?subjectId=${subjectId}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("set-config-fetch-failed");
  }

  const result = (await response.json()) as { ok?: boolean; detail?: { set: RuntimeSetConfig; questions: RuntimeQuestionConfig[] } };
  if (!result.ok || !result.detail) {
    throw new Error("set-config-invalid-response");
  }

  return {
    setId: result.detail.set.setId,
    setTitle: result.detail.set.setTitle,
    sourceLabel: result.detail.set.sourceLabel,
    timeLimitMinutes: result.detail.set.timeLimitMinutes,
    active: result.detail.set.active,
    questions: result.detail.questions,
  } satisfies RuntimeSetConfig;
}

function readDraft(draftStorageKey: string | null): PersistedDraft | null {
  if (typeof window === "undefined") return null;
  if (!draftStorageKey) return null;

  try {
    const stored = window.localStorage.getItem(draftStorageKey);
    return stored ? (JSON.parse(stored) as PersistedDraft) : null;
  } catch {
    return null;
  }
}

function SetContextBar({ set }: { set: PastSet }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-5 py-4">
      <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{SUBJECT_LABELS[set.subjectId]}</p>
      <p className="mt-1 text-caption text-[color:var(--muted)]">
        {set.sourceLabel} · {set.questions.length}문항 · 제한 {set.timeLimitMinutes}분
      </p>
    </div>
  );
}

function IntroPanel({
  hasDraft,
  onStart,
  onResume,
  sourceCaptureText,
  onApplySourceCapture,
}: {
  hasDraft: boolean;
  onStart: () => void;
  onResume: () => void;
  sourceCaptureText: string;
  onApplySourceCapture: (text: string, fileNames: string[]) => void;
}) {
  return (
    <section className="animate-in-up rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-10">
      <span className="inline-flex rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-1 text-caption font-medium text-[color:var(--muted-strong)]">
        기출 세트 안내
      </span>
      <h1 className="mt-5 max-w-3xl text-[32px] font-medium leading-[1.14] tracking-[-0.045em] text-[color:var(--foreground-strong)] sm:text-[44px]">
        세트처럼 풀고, 다시 볼 문제만 남깁니다.
      </h1>
      <p className="mt-5 max-w-2xl text-body text-[color:var(--muted)]">
        직접 입력으로 시작할 수도 있고, 사진에서 텍스트를 불러와 검토한 뒤 참고 메모로 붙일 수도 있습니다.
        풀이가 끝나면 선택한 답안, 확신도, 다시 볼 문제, 사용한 시간을 바탕으로 리뷰 큐와 주간 코칭이 이어집니다.
      </p>
      <div className="mt-6">
        <OcrAssistPanel
          title="문제 확인 보조 입력"
          description="직접 메모를 적거나 사진에서 텍스트를 불러와 검토한 뒤, 풀이 중 참고 메모로 붙일 수 있습니다."
          applyLabel="풀이 화면에 반영"
          directInputPlaceholder="문제 지문이나 메모를 직접 적어 두세요."
          initialText={sourceCaptureText}
          helperText="OCR로 불러온 텍스트도 바로 확정하지 않고, 현재 세트의 참고 메모로만 반영합니다."
          onApply={onApplySourceCapture}
        />
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {hasDraft ? (
          <Button type="button" size="lg" onClick={onResume} className="w-full sm:w-auto">
            이어서 풀기
          </Button>
        ) : null}
        <Button type="button" size="lg" variant={hasDraft ? "outline" : "default"} onClick={onStart} className="w-full sm:w-auto">
          {hasDraft ? "처음부터 다시 시작" : "세트 시작하기"}
        </Button>
      </div>
    </section>
  );
}

function SolvingHeader({
  set,
  questionNumber,
  remainingSeconds,
  onPause,
}: {
  set: PastSet;
  questionNumber: number;
  remainingSeconds: number;
  onPause: () => void;
}) {
  const exceeded = remainingSeconds <= 0;

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{set.title}</p>
        <p className="mt-1 text-caption text-[color:var(--muted)]">
          {questionNumber} / {set.questions.length}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-sm font-medium",
            exceeded
              ? "border-[color:rgba(166,87,78,0.24)] bg-[color:var(--status-red-soft)] text-[color:var(--foreground-strong)]"
              : "border-[var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--foreground-strong)]",
          )}
        >
          {exceeded ? `珥덇낵 ${formatSeconds(remainingSeconds)}` : formatSeconds(remainingSeconds)}
        </span>
        <Button type="button" variant="ghost" onClick={onPause}>
          <Pause className="mr-2 h-4 w-4" />
          일시정지
        </Button>
      </div>
    </div>
  );
}

function QuestionNavigator({
  questions,
  answers,
  currentQuestionId,
  onSelect,
}: {
  questions: PastSetQuestion[];
  answers: Record<string, PastSetAnswer>;
  currentQuestionId: string;
  onSelect: (questionId: string) => void;
}) {
  return (
    <nav className="flex gap-2 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-3" aria-label="臾몄젣 ?대룞">
      {questions.map((question) => {
        const answer = answers[question.id];
        const active = question.id === currentQuestionId;
        const answered = answer?.selectedChoiceId !== null;
        const flagged = answer?.flagged;

        return (
          <button
            key={question.id}
            type="button"
            onClick={() => onSelect(question.id)}
            className={cn(
              "h-10 w-10 shrink-0 rounded-full border text-sm font-medium transition",
              active
                ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-white"
                : answered
                  ? "border-[var(--border-strong)] bg-[color:var(--surface-soft)] text-[color:var(--foreground-strong)]"
                  : "border-[var(--border)] bg-transparent text-[color:var(--muted)]",
            )}
            aria-label={`${question.number}번 문제${flagged ? ", 다시 볼 문제" : ""}`}
          >
            {question.number}
          </button>
        );
      })}
    </nav>
  );
}

function QuestionPanel({
  question,
  answer,
  onChange,
}: {
  question: PastSetQuestion;
  answer: PastSetAnswer;
  onChange: (next: PastSetAnswer) => void;
}) {
  function updateAnswer(next: Partial<PastSetAnswer>) {
    const now = new Date().toISOString();
    onChange({
      ...answer,
      ...next,
      visited: true,
      firstAnsweredAt: answer.firstAnsweredAt ?? (next.selectedChoiceId ? now : null),
      lastUpdatedAt: now,
    });
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 sm:p-8">
      <p className="text-caption text-[color:var(--muted)]">
        {question.number}번 · {question.unit}
      </p>
      <h2 className="mt-3 text-h3 font-medium leading-8 text-[color:var(--foreground-strong)]">{question.stem}</h2>
      <div className="mt-6 space-y-3">
        {question.choices.map((choice) => {
          const selected = answer.selectedChoiceId === choice.id;

          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => updateAnswer({ selectedChoiceId: choice.id })}
              className={cn(
                "flex w-full gap-3 rounded-[var(--radius-md)] border px-4 py-4 text-left transition",
                selected
                  ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]"
                  : "border-[var(--border)] hover:border-[var(--border-strong)]",
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-sm font-medium">
                {choice.id}
              </span>
              <span className="text-sm leading-7 text-[color:var(--foreground-strong)]">{choice.text}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex flex-col gap-4 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="확신도">
          {CONFIDENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={answer.confidence === option.value}
              onClick={() => updateAnswer({ confidence: option.value })}
              className={cn(
                "h-9 rounded-full border px-3.5 text-[13px] font-medium transition",
                answer.confidence === option.value
                  ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-white"
                  : "border-[var(--border)] text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => updateAnswer({ flagged: !answer.flagged })}
          className={cn(
            "h-10 rounded-full border px-4 text-sm font-medium transition",
            answer.flagged
              ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--foreground-strong)]"
              : "border-[var(--border)] text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]",
          )}
        >
          다시 볼 문제
        </button>
      </div>
    </section>
  );
}

function PausedPanel({ onResume }: { onResume: () => void }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-10">
      <p className="text-caption text-[color:var(--muted)]">일시정지</p>
      <h1 className="mt-3 text-h1 font-medium text-[color:var(--foreground-strong)]">풀이를 잠시 멈췄습니다.</h1>
      <p className="mt-4 text-body text-[color:var(--muted)]">지금 상태는 그대로 유지됩니다. 준비되면 다시 이어서 풀 수 있습니다.</p>
      <Button type="button" size="lg" onClick={onResume} className="mt-8 w-full sm:w-auto">
        <Play className="mr-2 h-4 w-4" />
        다시 풀기
      </Button>
    </section>
  );
}

function SubmittedPanel({ result }: { result: PastSetSubmittedResult }) {
  const firstDiagnosis = result.reviewQueueCandidates.find((candidate) => candidate.reviewReasonSentence);
  const diagnosisLabel =
    result.subjectId === "civil_law"
      ? "민법 진단"
      : result.subjectId === "appraisal_law"
        ? "법규 진단"
        : "진단";

  return (
    <section className="animate-in-up rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-10">
      <span className="inline-flex rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-1 text-caption font-medium text-[color:var(--muted-strong)]">
        세트 제출 완료
      </span>
      <h1 className="mt-5 text-h1 font-medium text-[color:var(--foreground-strong)]">리뷰로 넘길 문제만 남겼습니다.</h1>
      <p className="mt-4 max-w-2xl text-body text-[color:var(--muted)]">
        확신도가 낮거나 다시 보기로 남긴 문제는 리뷰 후보로 정리됩니다. 세부 코칭은 다음 단계에서 이어집니다.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <SummaryTile label="답안 표시" value={`${result.feedback.answeredCount}/${result.feedback.totalQuestions}`} />
        <SummaryTile label="다시 볼 문제" value={`${result.feedback.flaggedCount}문항`} />
        <SummaryTile label="리뷰 후보" value={`${result.feedback.reviewQueueCandidateCount}문항`} />
      </div>
      {firstDiagnosis ? (
        <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4">
          <p className="text-caption text-[color:var(--muted)]">{diagnosisLabel}</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-strong)]">{firstDiagnosis.reviewReasonSentence}</p>
          {firstDiagnosis.recommendedReviewAction ? (
            <p className="mt-1 text-caption text-[color:var(--muted)]">{firstDiagnosis.recommendedReviewAction}</p>
          ) : null}
        </div>
      ) : null}
      <Link href={`/exams/appraisal-first/${result.subjectId}/review`} className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full sm:w-auto")}>
        리뷰로 이동
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4">
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 text-h3 font-medium text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}

function StickySubmitBar({
  mode,
  answeredCount,
  totalQuestions,
  onSubmit,
}: {
  mode: PastSetPageMode;
  answeredCount: number;
  totalQuestions: number;
  onSubmit: () => void;
}) {
  if (mode !== "solving" && mode !== "confirm_submit") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_94%,transparent)] px-5 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-[1040px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-[color:var(--muted)]">
          {mode === "confirm_submit"
            ? "미응답 문항은 리뷰 후보로 반영됩니다."
            : `${answeredCount}/${totalQuestions}문항 답안 표시`}
        </p>
        <Button type="button" size="lg" onClick={onSubmit} className="w-full sm:w-auto">
          {mode === "confirm_submit" ? "이 상태로 제출하기" : "세트 제출하기"}
        </Button>
      </div>
    </div>
  );
}

export function AppraisalFirstPastSetSolvingPage({ subjectId, setId }: { subjectId: string; setId: string }) {
  const session = useAuthSession();
  const baseSet = useMemo(() => getMockSet(subjectId, setId), [setId, subjectId]);
  const safeSubjectId = baseSet.subjectId;
  const browserUserId = useMemo(
    () => getAppraisalFirstBrowserUserId(session.userId, session.isDemo),
    [session.isDemo, session.userId],
  );
  const draftStorageKey = useMemo(
    () =>
      browserUserId
        ? buildUserScopedKey({
            userId: browserUserId,
            feature: "past-set-draft",
            subjectId: safeSubjectId,
            entityId: baseSet.id,
          })
        : null,
    [baseSet.id, browserUserId, safeSubjectId],
  );
  const [runtimeSetConfig, setRuntimeSetConfig] = useState<RuntimeSetConfig | null>(null);
  const set = useMemo(() => applyRuntimeSetConfig(baseSet, runtimeSetConfig), [baseSet, runtimeSetConfig]);
  const [mode, setMode] = useState<PastSetPageMode>("intro");
  const [currentQuestionId, setCurrentQuestionId] = useState(baseSet.questions[0]?.id ?? "");
  const [answers, setAnswers] = useState<Record<string, PastSetAnswer>>(() => initializeAnswers(baseSet.questions));
  const [timer, setTimer] = useState<TimerState>(() => ({
    startedAt: null,
    pausedAt: null,
    totalPausedSeconds: 0,
    remainingSeconds: baseSet.timeLimitMinutes * 60,
    timeLimitSeconds: baseSet.timeLimitMinutes * 60,
  }));
  const [submittedResult, setSubmittedResult] = useState<PastSetSubmittedResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sourceCaptureText, setSourceCaptureText] = useState("");
  const [sourceCaptureFiles, setSourceCaptureFiles] = useState<string[]>([]);
  const loggedAnswerQuestionIds = useRef<Set<string>>(new Set());

  const currentQuestion = set.questions.find((question) => question.id === currentQuestionId) ?? set.questions[0];
  const answeredCount = Object.values(answers).filter((answer) => answer.selectedChoiceId !== null).length;
  const unansweredCount = set.questions.length - answeredCount;

  useEffect(() => {
    let cancelled = false;
    fetchRuntimeSetConfig(safeSubjectId, baseSet.id)
      .then((config) => {
        if (!cancelled) {
          setRuntimeSetConfig(config);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRuntimeSetConfig(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [baseSet.id, safeSubjectId]);

  useEffect(() => {
    if (mode !== "solving") return;

    const interval = window.setInterval(() => {
      setTimer((current) => ({ ...current, remainingSeconds: current.remainingSeconds - 1 }));
      setAnswers((current) => {
        const active = current[currentQuestionId];
        if (!active) return current;

        return {
          ...current,
          [currentQuestionId]: {
            ...active,
            visited: true,
            elapsedSecondsOnQuestion: active.elapsedSecondsOnQuestion + 1,
          },
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [currentQuestionId, mode]);

  useEffect(() => {
    let cancelled = false;

    async function syncDraftMode() {
      const draft = readDraft(draftStorageKey);
      if (!cancelled) {
        setMode(draft ? "resume_prompt" : "intro");
      }
    }

    void syncDraftMode();
    return () => {
      cancelled = true;
    };
  }, [draftStorageKey]);

  useEffect(() => {
    if (mode !== "solving" && mode !== "paused" && mode !== "confirm_submit") return;
    if (!draftStorageKey) return;

    const draft: PersistedDraft = {
      mode,
      currentQuestionId,
      answers,
      timer,
      sourceCaptureText,
      sourceCaptureFiles,
      updatedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch {
      // Draft persistence should not interrupt solving.
    }
  }, [answers, currentQuestionId, draftStorageKey, mode, sourceCaptureFiles, sourceCaptureText, timer]);

  function startSet() {
    const startedAt = new Date().toISOString();
    loggedAnswerQuestionIds.current = new Set();
    setAnswers(initializeAnswers(set.questions));
    setCurrentQuestionId(set.questions[0]?.id ?? "");
    setSourceCaptureText("");
    setSourceCaptureFiles([]);
    setSubmitError(null);
    setTimer({
      startedAt,
      pausedAt: null,
      totalPausedSeconds: 0,
      remainingSeconds: set.timeLimitMinutes * 60,
      timeLimitSeconds: set.timeLimitMinutes * 60,
    });
    if (draftStorageKey) {
      window.localStorage.removeItem(draftStorageKey);
    }
    logInvergeEvent("first.past_set.started", {
      examId: "appraisal_first",
      subjectId: safeSubjectId,
      setId: set.id,
      stage: "first",
      properties: {
        questionCount: set.questions.length,
        timeLimitSeconds: set.timeLimitMinutes * 60,
      },
    });
    setMode("solving");
  }

  function resumeDraft() {
    const draft = readDraft(draftStorageKey);
    if (!draft) {
      startSet();
      return;
    }

    setCurrentQuestionId(draft.currentQuestionId);
    setAnswers(draft.answers);
    setSourceCaptureText(draft.sourceCaptureText ?? "");
    setSourceCaptureFiles(draft.sourceCaptureFiles ?? []);
    setSubmitError(null);
    setTimer({ ...draft.timer, pausedAt: new Date().toISOString() });
    setMode("paused");
  }

  function pauseSet() {
    setTimer((current) => ({ ...current, pausedAt: new Date().toISOString() }));
    setMode("paused");
  }

  function resumeSet() {
    const now = Date.now();
    const pausedAt = timer.pausedAt ? new Date(timer.pausedAt).getTime() : now;
    const pausedSeconds = Math.max(0, Math.round((now - pausedAt) / 1000));
    setTimer((current) => ({
      ...current,
      pausedAt: null,
      totalPausedSeconds: current.totalPausedSeconds + pausedSeconds,
    }));
    setMode("solving");
  }

  function updateAnswer(next: PastSetAnswer) {
    const previous = answers[next.questionId];
    const changedSelectedChoice = previous?.selectedChoiceId !== next.selectedChoiceId && next.selectedChoiceId !== null;
    if (changedSelectedChoice && !loggedAnswerQuestionIds.current.has(next.questionId)) {
      loggedAnswerQuestionIds.current.add(next.questionId);
      logInvergeEvent("first.answer.changed", {
        examId: "appraisal_first",
        subjectId: safeSubjectId,
        setId: set.id,
        questionId: next.questionId,
        stage: "first",
        properties: {
          elapsedSecondsOnQuestion: next.elapsedSecondsOnQuestion,
          hasConfidence: Boolean(next.confidence),
          flagged: next.flagged,
        },
      });
    }
    setAnswers((current) => ({ ...current, [next.questionId]: next }));
  }

  function submitSet(force = false) {
    if (unansweredCount > 0 && !force) {
      setMode("confirm_submit");
      return;
    }

    setMode("submitting");
    setSubmitError(null);

    window.setTimeout(async () => {
      const submittedAt = new Date().toISOString();
      const startedAt = timer.startedAt ?? submittedAt;
      const exceededTimeLimit = timer.remainingSeconds <= 0;
      const feedback = buildFeedback(set, answers, timer);
      const reviewQueueCandidates = buildReviewQueueCandidates(set, answers);
      const result: PastSetSubmittedResult = {
        subjectId: safeSubjectId,
        setId: set.id,
        startedAt,
        submittedAt,
        totalElapsedSeconds: timer.timeLimitSeconds - timer.remainingSeconds,
        totalPausedSeconds: timer.totalPausedSeconds,
        exceededTimeLimit,
        overtimeSeconds: exceededTimeLimit ? Math.abs(timer.remainingSeconds) : 0,
        answers,
        feedback,
        reviewQueueCandidates,
      };

      const savedResult = await postAppraisalFirst<PastSetSubmittedResult>("/api/appraisal-first/set-submissions", result);
      if (!savedResult) {
        setSubmitError("세트 저장에 실패했습니다. 잠시 후 다시 제출해 주세요.");
        setMode("confirm_submit");
        return;
      }
      const persistedResult = savedResult;
      if (draftStorageKey) {
        window.localStorage.removeItem(draftStorageKey);
      }
      logInvergeEvent("first.set.submitted", {
        examId: "appraisal_first",
        subjectId: safeSubjectId,
        setId: set.id,
        stage: "first",
        properties: {
          answeredCount: persistedResult.feedback.answeredCount,
          totalQuestions: persistedResult.feedback.totalQuestions,
          reviewQueueCandidateCount: persistedResult.feedback.reviewQueueCandidateCount,
          totalElapsedSeconds: persistedResult.totalElapsedSeconds,
          exceededTimeLimit: persistedResult.exceededTimeLimit,
        },
      });
      console.log("appraisal-first-past-set-result", persistedResult);
      setSubmittedResult(persistedResult);
      setMode("submitted");
    }, 650);
  }

  if (!currentQuestion) {
    return (
      <main className="mx-auto w-full max-w-[1040px] px-5 py-10 sm:px-8">
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-10">
          <h1 className="text-h1 font-medium text-[color:var(--foreground-strong)]">?명듃瑜?李얠쓣 ???놁뒿?덈떎.</h1>
          <p className="mt-4 text-body text-[color:var(--muted)]">?ㅻⅨ 湲곗텧 ?명듃瑜??좏깮??二쇱꽭??</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[1040px] px-5 pb-36 pt-7 sm:px-8 sm:pb-32 sm:pt-10 lg:pt-12">
        <div className="space-y-6">
          <div className="flex justify-end">
            <FocusAudioControl />
          </div>
          <SetContextBar set={set} />
          {mode === "intro" || mode === "resume_prompt" ? (
            <IntroPanel
              hasDraft={mode === "resume_prompt"}
              onStart={startSet}
              onResume={resumeDraft}
              sourceCaptureText={sourceCaptureText}
              onApplySourceCapture={(text, fileNames) => {
                setSourceCaptureText(text);
                setSourceCaptureFiles(fileNames);
              }}
            />
          ) : null}
          {mode === "solving" || mode === "confirm_submit" ? (
            <>
              <SolvingHeader
                set={set}
                questionNumber={currentQuestion.number}
                remainingSeconds={timer.remainingSeconds}
                onPause={pauseSet}
              />
              <QuestionNavigator
                questions={set.questions}
                answers={answers}
                currentQuestionId={currentQuestion.id}
                onSelect={setCurrentQuestionId}
              />
              {sourceCaptureText ? (
                <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4">
                  <p className="text-caption text-[color:var(--muted)]">불러온 참고 메모</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[color:var(--foreground-strong)]">
                    {sourceCaptureText}
                  </p>
                  {sourceCaptureFiles.length > 0 ? (
                    <p className="mt-2 text-caption text-[color:var(--muted)]">
                      사진 {sourceCaptureFiles.length}개에서 불러옴
                    </p>
                  ) : null}
                </section>
              ) : null}
              {mode === "confirm_submit" ? (
                <section className="rounded-[var(--radius-md)] border border-[color:rgba(168,121,42,0.24)] bg-[color:var(--status-amber-soft)] p-4">
                  <p className="text-sm leading-6 text-[color:var(--foreground-strong)]">
                    아직 답을 표시하지 않은 문항이 있습니다. 이 상태로 제출하면 미응답 문항도 리뷰 후보에 함께 반영됩니다.
                  </p>
                </section>
              ) : null}
              {submitError ? (
                <section className="rounded-[var(--radius-md)] border border-[color:rgba(158,74,70,0.24)] bg-[color:rgba(158,74,70,0.08)] p-4">
                  <p className="text-sm leading-6 text-[color:var(--foreground-strong)]">{submitError}</p>
                </section>
              ) : null}
              <QuestionPanel question={currentQuestion} answer={answers[currentQuestion.id]} onChange={updateAnswer} />
            </>
          ) : null}
          {mode === "paused" ? <PausedPanel onResume={resumeSet} /> : null}
          {mode === "submitting" ? (
            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-10">
              <p className="text-caption text-[color:var(--muted)]">제출 중</p>
              <h1 className="mt-3 text-h1 font-medium text-[color:var(--foreground-strong)]">
                세트 활동 데이터를 정리하고 있습니다.
              </h1>
            </section>
          ) : null}
          {mode === "submitted" && submittedResult ? <SubmittedPanel result={submittedResult} /> : null}
        </div>
      </main>
      <StickySubmitBar
        mode={mode}
        answeredCount={answeredCount}
        totalQuestions={set.questions.length}
        onSubmit={() => submitSet(mode === "confirm_submit")}
      />
    </>
  );
}




