"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { FeedbackPrompt } from "@/components/inverge/feedback-prompt";
import { Button, buttonVariants } from "@/components/ui/button";
import { postAppraisalFirst } from "@/lib/appraisal-first/client";
import { useAuthSession } from "@/lib/auth/client";
import { logInvergeEvent } from "@/lib/inverge/event-client";
import { cn } from "@/lib/utils";

type StudyStage = "not_started" | "concept_review" | "past_set_entry" | "mock_exam";
type SubjectId = "civil_law" | "economics" | "real_estate" | "appraisal_law" | "accounting";
type ConfidenceLevel = "stable" | "unstable" | "weak" | "unknown";
type AbilityKey =
  | "accuracy"
  | "time_management"
  | "option_judgment"
  | "law_memory"
  | "calculation_stability";
type StarterMainIssue =
  | "concept_recall"
  | "option_judgment"
  | "law_memory"
  | "calculation_stability"
  | "time_management"
  | "not_sure";
type TimePressureLevel = "comfortable" | "slightly_tight" | "very_tight" | "not_measured";
type DiagnosisStep = "loading" | "input" | "submitting" | "result" | "error";

type OnboardingPayload = {
  examId: "appraisal_first";
  currentStudyStage: StudyStage;
  subjectConfidence: Record<SubjectId, ConfidenceLevel>;
  targetExamDate?: string;
  weeklyAvailableHours?: number;
  recentSevenDaySetCount?: number;
  derived?: {
    isColdStart: boolean;
    hasRecentSetData: boolean;
    weakSubjectIds: SubjectId[];
    unknownSubjectIds: SubjectId[];
  };
};

type StarterDiagnosisFormState = {
  selectedSubjectId: SubjectId | null;
  miniSetQuestionCount: number | null;
  miniSetCorrectCount: number | null;
  elapsedMinutes: number | null;
  mainIssue: StarterMainIssue | null;
  timePressure: TimePressureLevel | null;
};

type StarterDiagnosisValidationErrors = {
  selectedSubjectId?: string;
  miniSetQuestionCount?: string;
  miniSetCorrectCount?: string;
  elapsedMinutes?: string;
  mainIssue?: string;
  timePressure?: string;
};

type StarterDiagnosisResult = {
  examId: "appraisal_first";
  selectedSubjectId: SubjectId;
  miniSet: {
    questionCount: number;
    correctCount: number;
    accuracyRate: number;
    elapsedMinutes?: number;
  };
  mainIssue: StarterMainIssue;
  timePressure: TimePressureLevel;
  abilityAdjustment: {
    ability: AbilityKey;
    direction: "lower_priority" | "watch" | "priority";
    reason: string;
  }[];
  firstWeekPlanSeedPatch: {
    prioritySubjectIds: SubjectId[];
    priorityAbilityKeys: AbilityKey[];
    recommendedFirstSet: {
      subjectId: SubjectId;
      questionCount: number;
      timeLimitMinutes?: number;
    };
    reviewQueueSeed: {
      reason: string;
      estimatedItemCount: number;
    };
  };
  metadata: {
    source: "starter_diagnosis";
    schemaVersion: 1;
    createdAt: string;
  };
};

type OnboardingResponse = {
  ok: boolean;
  data?: OnboardingPayload;
};

type StarterDiagnosisResponse = {
  ok: boolean;
  data?: StarterDiagnosisResult;
};

const SUBJECTS: { id: SubjectId; name: string }[] = [
  { id: "civil_law", name: "민법" },
  { id: "economics", name: "경제학원론" },
  { id: "real_estate", name: "부동산학원론" },
  { id: "appraisal_law", name: "감정평가관계법규" },
  { id: "accounting", name: "회계학" },
];

const ISSUE_OPTIONS: { value: StarterMainIssue; label: string }[] = [
  { value: "concept_recall", label: "개념이 바로 떠오르지 않음" },
  { value: "option_judgment", label: "선지 판단이 흔들림" },
  { value: "law_memory", label: "법령 기억이 약함" },
  { value: "calculation_stability", label: "계산이 흔들림" },
  { value: "time_management", label: "시간이 부족했음" },
  { value: "not_sure", label: "아직 잘 모르겠음" },
];

const TIME_PRESSURE_OPTIONS: { value: TimePressureLevel; label: string }[] = [
  { value: "comfortable", label: "여유 있었음" },
  { value: "slightly_tight", label: "조금 빠듯했음" },
  { value: "very_tight", label: "많이 부족했음" },
  { value: "not_measured", label: "시간을 재지 않았음" },
];

const ISSUE_TO_ABILITY: Record<StarterMainIssue, AbilityKey[]> = {
  concept_recall: ["accuracy"],
  option_judgment: ["option_judgment"],
  law_memory: ["law_memory"],
  calculation_stability: ["calculation_stability"],
  time_management: ["time_management"],
  not_sure: ["accuracy", "option_judgment"],
};

function getSubjectName(subjectId?: SubjectId | null) {
  return SUBJECTS.find((subject) => subject.id === subjectId)?.name ?? "감정평가관계법규";
}

function getInitialSubject(onboarding: OnboardingPayload | null): SubjectId {
  return onboarding?.derived?.weakSubjectIds?.[0] ?? "appraisal_law";
}

function parseOptionalNumber(value: string) {
  if (value.trim() === "") return null;
  return Number(value);
}

function validateForm(form: StarterDiagnosisFormState): StarterDiagnosisValidationErrors {
  const errors: StarterDiagnosisValidationErrors = {};
  if (!form.selectedSubjectId) errors.selectedSubjectId = "진단 과목을 선택해 주세요.";
  if (form.miniSetQuestionCount === null || !Number.isInteger(form.miniSetQuestionCount) || form.miniSetQuestionCount < 5 || form.miniSetQuestionCount > 30) {
    errors.miniSetQuestionCount = "세트 문항 수는 5문항 이상 30문항 이하로 적어 주세요.";
  }
  if (
    form.miniSetCorrectCount === null ||
    !Number.isInteger(form.miniSetCorrectCount) ||
    form.miniSetCorrectCount < 0 ||
    (form.miniSetQuestionCount !== null && form.miniSetCorrectCount > form.miniSetQuestionCount)
  ) {
    errors.miniSetCorrectCount = "맞힌 문항 수를 다시 확인해 주세요.";
  }
  if (form.elapsedMinutes !== null && (!Number.isInteger(form.elapsedMinutes) || form.elapsedMinutes < 1 || form.elapsedMinutes > 120)) {
    errors.elapsedMinutes = "소요 시간은 1분 이상 120분 이하로 적어 주세요.";
  }
  if (!form.mainIssue) errors.mainIssue = "가장 흔들린 이유를 선택해 주세요.";
  if (!form.timePressure) errors.timePressure = "시간 운영 상태를 선택해 주세요.";
  return errors;
}

function unique<T>(items: T[]) {
  return items.filter((item, index) => items.indexOf(item) === index);
}

function buildResult(form: StarterDiagnosisFormState, onboarding: OnboardingPayload | null): StarterDiagnosisResult | null {
  if (
    !form.selectedSubjectId ||
    form.miniSetQuestionCount === null ||
    form.miniSetCorrectCount === null ||
    !form.mainIssue ||
    !form.timePressure
  ) {
    return null;
  }

  const accuracyRate = Math.round((form.miniSetCorrectCount / form.miniSetQuestionCount) * 100);
  const prioritySubjectIds = unique([
    form.selectedSubjectId,
    ...(onboarding?.derived?.weakSubjectIds ?? []),
    "appraisal_law" as const,
    "accounting" as const,
  ]);
  const priorityAbilityKeys = unique([
    ...ISSUE_TO_ABILITY[form.mainIssue],
    ...(accuracyRate <= 75 ? ["accuracy" as const] : []),
    ...(form.timePressure === "comfortable" ? [] : ["time_management" as const]),
  ]);
  const now = new Date().toISOString();

  return {
    examId: "appraisal_first",
    selectedSubjectId: form.selectedSubjectId,
    miniSet: {
      questionCount: form.miniSetQuestionCount,
      correctCount: form.miniSetCorrectCount,
      accuracyRate,
      ...(form.elapsedMinutes !== null ? { elapsedMinutes: form.elapsedMinutes } : {}),
    },
    mainIssue: form.mainIssue,
    timePressure: form.timePressure,
    abilityAdjustment: priorityAbilityKeys.map((ability) => ({
      ability,
      direction: "priority",
      reason: `${getSubjectName(form.selectedSubjectId)}에서 ${form.mainIssue} 신호가 보였습니다.`,
    })),
    firstWeekPlanSeedPatch: {
      prioritySubjectIds,
      priorityAbilityKeys,
      recommendedFirstSet: {
        subjectId: form.selectedSubjectId,
        questionCount: form.miniSetQuestionCount,
        ...(form.elapsedMinutes !== null && form.timePressure !== "comfortable"
          ? { timeLimitMinutes: form.elapsedMinutes }
          : {}),
      },
      reviewQueueSeed: {
        reason: `${getSubjectName(form.selectedSubjectId)}에서 다시 볼 기준을 먼저 잡습니다.`,
        estimatedItemCount: form.mainIssue === "not_sure" ? 8 : 12,
      },
    },
    metadata: {
      source: "starter_diagnosis",
      schemaVersion: 1,
      createdAt: now,
    },
  };
}

async function fetchOnboarding() {
  const response = await fetch("/api/appraisal-first/onboarding", { cache: "no-store" });
  if (!response.ok) throw new Error("onboarding-fetch-failed");
  const result = (await response.json()) as OnboardingResponse;
  if (!result.ok) throw new Error("onboarding-invalid-response");
  return result.data ?? null;
}

async function fetchStarterDiagnosis() {
  const response = await fetch("/api/appraisal-first/starter-diagnosis", { cache: "no-store" });
  if (!response.ok) throw new Error("starter-fetch-failed");
  const result = (await response.json()) as StarterDiagnosisResponse;
  if (!result.ok) throw new Error("starter-invalid-response");
  return result.data ?? null;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-[13px] leading-5 text-[color:var(--status-red)]">{message}</p>;
}

export function AppraisalFirstStarterDiagnosisPage() {
  const session = useAuthSession();
  const isAuthBlocked = session.authEnabled && !session.isAuthenticated;
  const [step, setStep] = useState<DiagnosisStep>("loading");
  const [onboarding, setOnboarding] = useState<OnboardingPayload | null>(null);
  const [form, setForm] = useState<StarterDiagnosisFormState>({
    selectedSubjectId: "appraisal_law",
    miniSetQuestionCount: 10,
    miniSetCorrectCount: null,
    elapsedMinutes: null,
    mainIssue: null,
    timePressure: null,
  });
  const [errors, setErrors] = useState<StarterDiagnosisValidationErrors>({});
  const [result, setResult] = useState<StarterDiagnosisResult | null>(null);
  const [submitError, setSubmitError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isAuthBlocked) {
        if (!cancelled) {
          setStep("error");
        }
        return;
      }

      if (!cancelled) {
        setStep("loading");
      }

      try {
        const [nextOnboarding, existingResult] = await Promise.all([fetchOnboarding(), fetchStarterDiagnosis()]);
        if (cancelled) return;

        setOnboarding(nextOnboarding);
        setForm((current) => ({
          ...current,
          selectedSubjectId: getInitialSubject(nextOnboarding),
        }));

        if (existingResult) {
          setResult(existingResult);
          setStep("result");
          return;
        }

        setStep("input");
      } catch {
        if (!cancelled) {
          setStep("error");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthBlocked, session.userId]);

  const accuracyRate = useMemo(() => {
    if (form.miniSetQuestionCount === null || form.miniSetCorrectCount === null || form.miniSetQuestionCount === 0) {
      return null;
    }
    return Math.round((form.miniSetCorrectCount / form.miniSetQuestionCount) * 100);
  }, [form.miniSetCorrectCount, form.miniSetQuestionCount]);

  async function handleSubmit() {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const nextResult = buildResult(form, onboarding);
    if (!nextResult) return;

    setStep("submitting");
    setSubmitError(undefined);

    try {
      const saved = await postAppraisalFirst<StarterDiagnosisResult>("/api/appraisal-first/starter-diagnosis", nextResult);
      if (!saved) {
        throw new Error("starter-save-failed");
      }

      logInvergeEvent("first.starter_diagnosis.submitted", {
        examId: saved.examId,
        subjectId: saved.selectedSubjectId,
        stage: "first",
        properties: {
          questionCount: saved.miniSet.questionCount,
          correctCount: saved.miniSet.correctCount,
          accuracyRate: saved.miniSet.accuracyRate,
          mainIssue: saved.mainIssue,
          timePressure: saved.timePressure,
        },
      });
      setResult(saved);
      setStep("result");
    } catch {
      setSubmitError("저장에 실패했습니다. 잠시 뒤 다시 시도해 주세요.");
      setStep("input");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1040px] px-5 pb-36 pt-7 sm:px-8 sm:pb-32 sm:pt-10 lg:pt-12">
      <div className="space-y-8 sm:space-y-10">
        <section className="space-y-4">
          <span className="inline-flex rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-1 text-caption font-medium text-[color:var(--muted-strong)]">
            감정평가사 1차 · 스타터 진단
          </span>
          <h1 className="text-[32px] font-medium leading-[1.14] tracking-[-0.045em] text-[color:var(--foreground-strong)] sm:text-[44px]">
            첫 주에 먼저 붙잡을 축만 조용히 정리합니다.
          </h1>
          <p className="max-w-2xl text-body text-[color:var(--muted)]">
            최근 세트나 방금 푼 미니 세트 결과를 기준으로 첫 주 코칭 seed를 만듭니다. 정교한 점수보다, 어디서 먼저 흔들리는지가 중요합니다.
          </p>
        </section>

        {step === "loading" ? (
          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8">
            <p className="text-sm text-[color:var(--muted)]">기준 데이터를 불러오는 중입니다.</p>
          </section>
        ) : null}

        {step === "error" ? (
          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8">
            <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">스타터 진단을 불러오지 못했습니다.</h2>
            <p className="mt-3 text-body text-[color:var(--muted)]">잠시 뒤 다시 열어 주세요.</p>
          </section>
        ) : null}

        {step === "input" ? (
          <>
            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 sm:p-8">
              <h2 className="text-h3 font-medium text-[color:var(--foreground-strong)]">진단 과목</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {SUBJECTS.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, selectedSubjectId: subject.id }))}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      form.selectedSubjectId === subject.id
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "border-[var(--border)] text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]",
                    )}
                  >
                    {subject.name}
                  </button>
                ))}
              </div>
              <FieldError message={errors.selectedSubjectId} />
            </section>

            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 sm:p-8">
              <h2 className="text-h3 font-medium text-[color:var(--foreground-strong)]">미니 세트 결과</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <label className="block">
                  <span className="text-[13px] font-medium text-[color:var(--muted-strong)]">세트 문항 수</span>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={form.miniSetQuestionCount?.toString() ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, miniSetQuestionCount: parseOptionalNumber(event.target.value) }))}
                    className="mt-3 h-12 w-full rounded-[14px] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 text-[15px] outline-none transition focus:border-[var(--primary)]"
                  />
                  <FieldError message={errors.miniSetQuestionCount} />
                </label>

                <label className="block">
                  <span className="text-[13px] font-medium text-[color:var(--muted-strong)]">맞힌 문항 수</span>
                  <input
                    type="number"
                    min={0}
                    value={form.miniSetCorrectCount?.toString() ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, miniSetCorrectCount: parseOptionalNumber(event.target.value) }))}
                    className="mt-3 h-12 w-full rounded-[14px] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 text-[15px] outline-none transition focus:border-[var(--primary)]"
                  />
                  <FieldError message={errors.miniSetCorrectCount} />
                </label>

                <label className="block">
                  <span className="text-[13px] font-medium text-[color:var(--muted-strong)]">소요 시간</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={form.elapsedMinutes?.toString() ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, elapsedMinutes: parseOptionalNumber(event.target.value) }))}
                    className="mt-3 h-12 w-full rounded-[14px] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 text-[15px] outline-none transition focus:border-[var(--primary)]"
                  />
                  <FieldError message={errors.elapsedMinutes} />
                </label>
              </div>
              <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
                {accuracyRate === null ? "정확도는 입력한 값이 모두 있을 때 계산됩니다." : `현재 정확도 기준은 ${accuracyRate}%입니다.`}
              </p>
            </section>

            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 sm:p-8">
              <h2 className="text-h3 font-medium text-[color:var(--foreground-strong)]">가장 흔들린 이유</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {ISSUE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, mainIssue: option.value }))}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      form.mainIssue === option.value
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "border-[var(--border)] text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <FieldError message={errors.mainIssue} />
            </section>

            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 sm:p-8">
              <h2 className="text-h3 font-medium text-[color:var(--foreground-strong)]">시간 운영 상태</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {TIME_PRESSURE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, timePressure: option.value }))}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      form.timePressure === option.value
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "border-[var(--border)] text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <FieldError message={errors.timePressure} />
            </section>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_94%,transparent)] px-5 py-4 backdrop-blur">
              <div className="mx-auto flex max-w-[1040px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className={cn("text-sm leading-6", submitError ? "text-[color:var(--status-red)]" : "text-[color:var(--muted)]")}>
                  {submitError ?? "입력값은 첫 주 코칭 기준을 잡는 데만 사용됩니다."}
                </p>
                <Button type="button" size="lg" onClick={() => void handleSubmit()} className="w-full sm:w-auto">
                  진단 저장하기
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {step === "submitting" ? (
          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8">
            <p className="text-sm text-[color:var(--muted)]">첫 주 코칭 기준을 정리하고 있습니다.</p>
          </section>
        ) : null}

        {step === "result" && result ? (
          <>
            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-10">
              <span className="inline-flex rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-1 text-caption font-medium text-[color:var(--muted-strong)]">
                기준 생성 완료
              </span>
              <h1 className="mt-5 text-h1 font-medium text-[color:var(--foreground-strong)]">{getSubjectName(result.selectedSubjectId)}부터 먼저 잡습니다.</h1>
              <p className="mt-4 max-w-2xl text-body text-[color:var(--muted)]">
                {result.miniSet.questionCount}문항 중 {result.miniSet.correctCount}문항을 맞힌 기록을 기준으로 첫 주 코칭 seed를 만들었습니다.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <SummaryTile label="정확도 기준" value={`${result.miniSet.accuracyRate}%`} />
                <SummaryTile label="리뷰 seed" value={`${result.firstWeekPlanSeedPatch.reviewQueueSeed.estimatedItemCount}문항`} />
                <SummaryTile label="첫 세트" value={`${result.firstWeekPlanSeedPatch.recommendedFirstSet.questionCount}문항`} />
              </div>
              <p className="mt-6 text-sm leading-7 text-[color:var(--muted)]">{result.firstWeekPlanSeedPatch.reviewQueueSeed.reason}</p>
              <Link href={`/exams/appraisal-first/${result.selectedSubjectId}/past-set/intro-10`} className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full sm:w-auto")}>
                첫 기출 세트로 이동
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </section>
            <FeedbackPrompt
              trigger="first_starter_result"
              context={{
                examId: "appraisal_first",
                stage: "first",
                subjectId: result.selectedSubjectId,
              }}
            />
          </>
        ) : null}
      </div>
    </main>
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
