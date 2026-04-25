"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { postActuarySecond } from "@/lib/actuary-second/client";
import { getPresentValueSampleQuestion, presentValueSampleQuestions } from "@/lib/actuary-second/sample-data";
import type {
  ActuarySecondSubmissionRecord,
  AnswerConfidence,
  PresentValueFormulaFamilyId,
} from "@/lib/actuary-second/types";
import { cn } from "@/lib/utils";

const CONFIDENCE_OPTIONS: { value: AnswerConfidence; label: string }[] = [
  { value: "low", label: "낮음" },
  { value: "medium", label: "보통" },
  { value: "high", label: "높음" },
];

const FORMULA_OPTIONS: { value: PresentValueFormulaFamilyId; label: string }[] = [
  { value: "pv_single_payment_basic", label: "단일 현가" },
  { value: "pv_ordinary_annuity_basic", label: "보통 연금 현가" },
  { value: "pv_annuity_due_basic", label: "기초 연금 현가" },
  { value: "pv_deferred_annuity_basic", label: "이연 연금 현가" },
  { value: "pv_annuity_factor_form", label: "연금 현가 계수형" },
];

export function ActuarySecondProblemWorkspace({ questionId }: { questionId: string }) {
  const question = useMemo(() => getPresentValueSampleQuestion(questionId), [questionId]);
  const [rawAnswerText, setRawAnswerText] = useState("");
  const [rawWorkText, setRawWorkText] = useState("");
  const [explicitFormulaFamilyId, setExplicitFormulaFamilyId] = useState<PresentValueFormulaFamilyId | "">("");
  const [confidence, setConfidence] = useState<AnswerConfidence | "">("");
  const [intermediateSteps, setIntermediateSteps] = useState<string[]>(() => question.expected_key_steps.map(() => ""));
  const [elapsedSeconds, setElapsedSeconds] = useState(question.expected_time_seconds);
  const [submitted, setSubmitted] = useState<ActuarySecondSubmissionRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorMessage("");
    const result = await postActuarySecond<ActuarySecondSubmissionRecord>("/api/actuary-second/verifier", {
      subject_id: question.subject_id,
      question_id: question.question_id,
      raw_answer_text: rawAnswerText,
      raw_work_text: rawWorkText,
      intermediate_steps: intermediateSteps.filter((step) => step.trim().length > 0),
      explicit_formula_family_id: explicitFormulaFamilyId || null,
      elapsed_seconds: elapsedSeconds,
      confidence: confidence || null,
      interest_rate: question.interest_rate,
      period_count: question.period_count,
      payment_amount: question.payment_amount,
      compounding_assumption: question.compounding_assumption,
      present_value_target: question.present_value_target,
      annuity_type: question.annuity_type,
      timing_convention: question.timing_convention,
    });
    if (!result) {
      setErrorMessage("검증 결과를 저장하지 못했습니다.");
    } else {
      setSubmitted(result);
    }
    setIsSubmitting(false);
  }

  if (submitted) {
    const evaluation = submitted.evaluation;
    return (
      <main className="mx-auto w-full max-w-[960px] px-5 py-10">
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-10">
          <p className="text-caption font-medium text-[color:var(--muted)]">보험계리사 2차 샘플</p>
          <h1 className="mt-3 text-h1 font-medium text-[color:var(--foreground-strong)]">{evaluation.correction_seed.gap_title}</h1>
          <p className="mt-3 max-w-3xl text-body text-[color:var(--muted-strong)]">{evaluation.correction_seed.gap_summary}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <SummaryCard label="공식 확인" value={evaluation.verifier.formula_check_status} />
            <SummaryCard label="주요 교정 포인트" value={evaluation.primary_failure_class ?? "없음"} />
            <SummaryCard label="다음 행동" value={evaluation.next_action.next_action_type} />
          </div>

          <section className="mt-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4">
            <p className="text-caption text-[color:var(--muted)]">교정 포인트</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-strong)]">{evaluation.correction_seed.correction_target}</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:var(--muted-strong)]">
              {evaluation.correction_seed.guidance.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4">
            <p className="text-caption text-[color:var(--muted)]">다음 행동</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-strong)]">{evaluation.next_action.next_action_label}</p>
            <p className="mt-1 text-caption text-[color:var(--muted)]">{evaluation.next_action.next_action_reason}</p>
          </section>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/exams/actuary-second/insurance_math/present-value/records" className={cn(buttonVariants(), "w-full sm:w-auto")}>
              기록
            </Link>
            <Link
              href={`/exams/actuary-second/insurance_math/present-value/${presentValueSampleQuestions[1]?.question_id ?? question.question_id}`}
              className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
            >
              다음 샘플
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[960px] px-5 py-10">
      <div className="space-y-6">
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-8">
          <p className="text-caption font-medium text-[color:var(--muted)]">보험계리사 2차 샘플</p>
          <h1 className="mt-3 text-h2 font-medium text-[color:var(--foreground-strong)]">{question.raw_problem_text}</h1>
          <p className="mt-3 text-caption text-[color:var(--muted)]">
            공식 계열 {question.expected_formula_family_id} · {question.step_check_mode}
          </p>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-caption font-medium text-[color:var(--muted)]">공식 계열</span>
              <select
                className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 text-sm"
                value={explicitFormulaFamilyId}
                onChange={(event) => setExplicitFormulaFamilyId(event.target.value as PresentValueFormulaFamilyId | "")}
              >
                <option value="">명시한 공식 없음</option>
                {FORMULA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-caption font-medium text-[color:var(--muted)]">확신도</span>
              <select
                className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 text-sm"
                value={confidence}
                onChange={(event) => setConfidence(event.target.value as AnswerConfidence | "")}
              >
                <option value="">확신도 선택</option>
                {CONFIDENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-caption font-medium text-[color:var(--muted)]">풀이 시간(초)</span>
              <input
                type="number"
                className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 text-sm"
                value={elapsedSeconds}
                onChange={(event) => setElapsedSeconds(Number(event.target.value) || question.expected_time_seconds)}
              />
            </label>
          </div>

          <div className="mt-4 space-y-2">
            <span className="text-caption font-medium text-[color:var(--muted)]">최종 답안</span>
            <Textarea
              value={rawAnswerText}
              onChange={(event) => setRawAnswerText(event.target.value)}
              className="min-h-[140px]"
              placeholder="최종 답안과 필요한 경우 짧은 결론 문장을 적어 주세요."
            />
          </div>

          <div className="mt-4 space-y-2">
            <span className="text-caption font-medium text-[color:var(--muted)]">계산 메모</span>
            <Textarea
              value={rawWorkText}
              onChange={(event) => setRawWorkText(event.target.value)}
              className="min-h-[140px]"
              placeholder="사용한 공식이나 계산 흐름을 짧게 남겨 주세요."
            />
          </div>

          {question.expected_key_steps.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {question.expected_key_steps.map((step, index) => (
                <label key={step.id} className="space-y-2">
                  <span className="text-caption font-medium text-[color:var(--muted)]">{step.label}</span>
                  <input
                    type="text"
                    className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 text-sm"
                    value={intermediateSteps[index] ?? ""}
                    onChange={(event) => {
                      setIntermediateSteps((current) => {
                        const next = [...current];
                        next[index] = event.target.value;
                        return next;
                      });
                    }}
                    placeholder="핵심 단계를 한 줄로 남겨 주세요."
                  />
                </label>
              ))}
            </div>
          ) : null}

          {errorMessage ? <p className="mt-4 text-sm text-[color:var(--status-red)]">{errorMessage}</p> : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting ? "검증 중" : "검증 실행"}
            </Button>
            <Link href="/exams/actuary-second/insurance_math/present-value/records" className={cn(buttonVariants({ variant: "outline" }))}>
              기록
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4">
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}
