"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { postActuaryFirst } from "@/lib/actuary-first/client";
import { probabilityFormulaFamilies } from "@/lib/actuary-first/formula-families";
import { getProbabilitySampleSet } from "@/lib/actuary-first/sample-data";
import type {
  ChoiceId,
  FormulaFamilyId,
  ProbabilitySetAnswer,
  ProbabilitySetSubmission,
  VariableBindingPrompt,
} from "@/lib/actuary-first/types";
import { logInvergeEvent } from "@/lib/inverge/event-client";
import { cn } from "@/lib/utils";

const CONFIDENCE_OPTIONS = [
  { value: "low", label: "낮음" },
  { value: "medium", label: "중간" },
  { value: "high", label: "높음" },
] as const;

function createDefaultAnswer(questionId: string): ProbabilitySetAnswer {
  return {
    questionId,
    selectedChoiceId: null,
    userAnswerValue: null,
    userFormulaFamilyId: null,
    userWorkText: "",
    userVariableBindings: {},
    intermediateSteps: [],
    confidence: null,
    flagged: false,
    elapsedSecondsOnQuestion: 0,
    firstAnsweredAt: null,
    lastUpdatedAt: null,
  };
}

export function ActuaryFirstPastSetSolvingPage({ subjectId, setId }: { subjectId: string; setId: string }) {
  const set = useMemo(() => getProbabilitySampleSet(setId), [setId]);
  const [startedAt] = useState(() => new Date().toISOString());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ProbabilitySetAnswer>>(() =>
    set.questions.reduce<Record<string, ProbabilitySetAnswer>>((acc, question) => {
      acc[question.question_id] = createDefaultAnswer(question.question_id);
      return acc;
    }, {}),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<ProbabilitySetSubmission | null>(null);
  const currentQuestion = set.questions[currentIndex];

  function updateAnswer(questionId: string, next: Partial<ProbabilitySetAnswer>) {
    const now = new Date().toISOString();
    setAnswers((current) => {
      const previous = current[questionId] ?? createDefaultAnswer(questionId);
      const selectedChoice = next.selectedChoiceId ?? previous.selectedChoiceId;
      return {
        ...current,
        [questionId]: {
          ...previous,
          ...next,
          userAnswerValue:
            selectedChoice !== null
              ? set.questions.find((question) => question.question_id === questionId)?.choices.find((choice) => choice.id === selectedChoice)?.value ?? previous.userAnswerValue
              : previous.userAnswerValue,
          firstAnsweredAt: previous.firstAnsweredAt ?? (selectedChoice ? now : null),
          lastUpdatedAt: now,
        },
      };
    });
  }

  async function submitSet() {
    setIsSubmitting(true);
    const totalElapsedSeconds = Math.max(
      1,
      Math.round((new Date().getTime() - new Date(startedAt).getTime()) / 1000),
    );
    const payload = {
      subjectId: "probability" as const,
      setId: set.id,
      startedAt,
      totalElapsedSeconds,
      totalPausedSeconds: 0,
      exceededTimeLimit: totalElapsedSeconds > set.timeLimitMinutes * 60,
      overtimeSeconds: Math.max(0, totalElapsedSeconds - set.timeLimitMinutes * 60),
      answers,
    };
    const result = await postActuaryFirst<ProbabilitySetSubmission>("/api/actuary-first/set-submissions", payload);
    if (result) {
      setSubmitted(result);
      logInvergeEvent("first.set.submitted", {
        examId: "actuary_first",
        stage: "first",
        subjectId: "probability",
        setId: set.id,
        properties: {
          reviewCandidateCount: result.setEvaluation.review_candidate_count,
          correctCount: result.setEvaluation.correct_count,
          answeredCount: result.setEvaluation.answered_count,
        },
      });
    }
    setIsSubmitting(false);
  }

  if (submitted) {
    const primaryCandidate = submitted.reviewQueueCandidates[0];
    return (
      <main className="mx-auto w-full max-w-[900px] px-5 py-10">
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-10">
          <span className="inline-flex rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-1 text-caption font-medium text-[color:var(--muted-strong)]">
            세트 제출 완료
          </span>
          <h1 className="mt-5 text-[32px] font-medium leading-[1.14] tracking-[-0.04em] text-[color:var(--foreground-strong)]">
            계산 패턴을 먼저 정리할 포인트가 잡혔습니다.
          </h1>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatCard label="정답" value={`${submitted.setEvaluation.correct_count}/${submitted.setEvaluation.answered_count}`} />
            <StatCard label="리뷰 후보" value={`${submitted.setEvaluation.review_candidate_count}개`} />
            <StatCard label="다음 행동" value={submitted.nextAction.next_action_label} />
          </div>
          {primaryCandidate ? (
            <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4">
              <p className="text-caption text-[color:var(--muted)]">우선 확인 포인트</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-strong)]">{primaryCandidate.reviewReasonSentence}</p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">{primaryCandidate.recommendedReviewAction}</p>
            </div>
          ) : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/exams/actuary-first/probability/review" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
              리뷰로 이어가기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/exams/actuary-first/probability/records" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
              기록 보기
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[900px] px-5 py-10">
      <div className="space-y-6">
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6">
          <p className="text-sm font-medium text-[color:var(--foreground-strong)]">계리사 1차 · 확률론 샘플 세트</p>
          <p className="mt-1 text-caption text-[color:var(--muted)]">
            {set.sourceLabel} · {set.questions.length}문항 · 제한 {set.timeLimitMinutes}분
          </p>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
            <div>
              <p className="text-caption text-[color:var(--muted)]">
                {currentQuestion.question_number} / {set.questions.length} · {currentQuestion.problem_family}
              </p>
              <h1 className="mt-3 text-h2 font-medium text-[color:var(--foreground-strong)]">{currentQuestion.stem}</h1>
            </div>
            <div className="shrink-0 rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-1 text-caption text-[color:var(--muted-strong)]">
              {currentQuestion.expected_time_seconds}초 기준
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {currentQuestion.choices.map((choice) => {
              const selected = answers[currentQuestion.question_id]?.selectedChoiceId === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => {
                    updateAnswer(currentQuestion.question_id, {
                      selectedChoiceId: choice.id as ChoiceId,
                    });
                    logInvergeEvent("first.answer.changed", {
                      examId: "actuary_first",
                      stage: "first",
                      subjectId,
                      setId: set.id,
                      questionId: currentQuestion.question_id,
                    });
                  }}
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

          <div className="mt-6 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-2">
            <FormulaSelector
              questionId={currentQuestion.question_id}
              value={answers[currentQuestion.question_id]?.userFormulaFamilyId}
              options={currentQuestion.formula_options}
              onChange={(value) => updateAnswer(currentQuestion.question_id, { userFormulaFamilyId: value })}
            />
            <ConfidenceSelector
              value={answers[currentQuestion.question_id]?.confidence}
              onChange={(value) => updateAnswer(currentQuestion.question_id, { confidence: value })}
            />
          </div>

          {currentQuestion.expected_input_form === "choice_plus_work" ? (
            <div className="mt-4 space-y-2">
              <label className="block text-caption font-medium text-[color:var(--muted)]">
                풀이 메모
              </label>
              <textarea
                value={answers[currentQuestion.question_id]?.userWorkText ?? ""}
                onChange={(event) =>
                  updateAnswer(currentQuestion.question_id, {
                    userWorkText: event.target.value,
                  })
                }
                rows={3}
                placeholder="사용한 공식이나 계산 흐름을 짧게 남겨 보세요."
                className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 py-3 text-sm leading-6 text-[color:var(--foreground-strong)] outline-none focus:border-[var(--primary)]"
              />
            </div>
          ) : null}

          {currentQuestion.variable_binding_prompts?.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {currentQuestion.variable_binding_prompts.map((prompt) => (
                <BindingSelector
                  key={prompt.field}
                  prompt={prompt}
                  value={answers[currentQuestion.question_id]?.userVariableBindings[prompt.field]}
                  onChange={(nextValue) =>
                    updateAnswer(currentQuestion.question_id, {
                      userVariableBindings: {
                        ...answers[currentQuestion.question_id]?.userVariableBindings,
                        [prompt.field]: nextValue,
                      },
                    })
                  }
                />
              ))}
            </div>
          ) : null}

          {currentQuestion.supports_intermediate_steps && currentQuestion.key_step_prompts?.length ? (
            <div className="mt-4 space-y-3">
              <p className="text-caption font-medium text-[color:var(--muted)]">중간 단계</p>
              {currentQuestion.key_step_prompts.map((prompt, index) => (
                <label key={prompt.id} className="block space-y-2">
                  <span className="text-caption text-[color:var(--muted)]">{prompt.label}</span>
                  <input
                    type="text"
                    value={answers[currentQuestion.question_id]?.intermediateSteps?.[index] ?? ""}
                    onChange={(event) => {
                      const nextSteps = [...(answers[currentQuestion.question_id]?.intermediateSteps ?? [])];
                      nextSteps[index] = event.target.value;
                      updateAnswer(currentQuestion.question_id, {
                        intermediateSteps: nextSteps,
                      });
                    }}
                    placeholder="한 줄씩 짧게 남겨 보세요."
                    className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 text-sm text-[color:var(--foreground-strong)] outline-none focus:border-[var(--primary)]"
                  />
                </label>
              ))}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <QuestionDots
              total={set.questions.length}
              currentIndex={currentIndex}
              answeredIds={new Set(Object.values(answers).filter((answer) => answer.selectedChoiceId !== null).map((answer) => answer.questionId))}
              onSelect={setCurrentIndex}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} disabled={currentIndex === 0}>
                이전
              </Button>
              {currentIndex < set.questions.length - 1 ? (
                <Button type="button" onClick={() => setCurrentIndex((index) => Math.min(set.questions.length - 1, index + 1))}>
                  다음
                </Button>
              ) : (
                <Button type="button" onClick={submitSet} disabled={isSubmitting}>
                  {isSubmitting ? "제출 중" : "세트 제출"}
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4">
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 text-h3 font-medium text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}

function FormulaSelector({
  questionId,
  value,
  options,
  onChange,
}: {
  questionId: string;
  value: FormulaFamilyId | null;
  options: { value: FormulaFamilyId; label: string }[];
  onChange: (value: FormulaFamilyId) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-caption font-medium text-[color:var(--muted)]">공식 family</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value as FormulaFamilyId)}
        className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 text-sm text-[color:var(--foreground-strong)] outline-none focus:border-[var(--primary)]"
        aria-label={`${questionId}-formula-family`}
      >
        <option value="">선택 안 함</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {value ? (
        <p className="text-caption text-[color:var(--muted)]">{probabilityFormulaFamilies[value].public_label}</p>
      ) : null}
    </label>
  );
}

function ConfidenceSelector({
  value,
  onChange,
}: {
  value: ProbabilitySetAnswer["confidence"];
  onChange: (value: ProbabilitySetAnswer["confidence"]) => void;
}) {
  return (
    <div>
      <p className="text-caption font-medium text-[color:var(--muted)]">자신감</p>
      <div className="mt-2 flex gap-2">
        {CONFIDENCE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "h-10 rounded-full border px-4 text-sm font-medium transition",
              value === option.value
                ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-white"
                : "border-[var(--border)] text-[color:var(--muted)]",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BindingSelector({
  prompt,
  value,
  onChange,
}: {
  prompt: VariableBindingPrompt;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-caption font-medium text-[color:var(--muted)]">{prompt.label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 text-sm text-[color:var(--foreground-strong)] outline-none focus:border-[var(--primary)]"
      >
        <option value="">선택 안 함</option>
        {prompt.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function QuestionDots({
  total,
  currentIndex,
  answeredIds,
  onSelect,
}: {
  total: number;
  currentIndex: number;
  answeredIds: Set<string>;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          className={cn(
            "h-9 w-9 rounded-full border text-sm font-medium",
            currentIndex === index
              ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-white"
              : answeredIds.size > index
                ? "border-[var(--border-strong)] bg-[color:var(--surface-soft)] text-[color:var(--foreground-strong)]"
                : "border-[var(--border)] text-[color:var(--muted)]",
          )}
        >
          {index + 1}
        </button>
      ))}
    </div>
  );
}
