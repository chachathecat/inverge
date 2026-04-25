"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { buildUserScopedKey, getAppraisalFirstBrowserUserId } from "@/lib/appraisal-first/browser-storage";
import { postAppraisalFirst } from "@/lib/appraisal-first/client";
import { useAuthSession } from "@/lib/auth/client";
import { logInvergeEvent } from "@/lib/inverge/event-client";
import { cn } from "@/lib/utils";

type StudyStage = "not_started" | "concept_review" | "past_set_entry" | "mock_exam";
type SubjectId = "civil_law" | "economics" | "real_estate" | "appraisal_law" | "accounting";
type ConfidenceLevel = "stable" | "unstable" | "weak" | "unknown";

type OnboardingFormState = {
  currentStudyStage: StudyStage | null;
  subjectConfidence: Record<SubjectId, ConfidenceLevel>;
  targetExamDate: string | null;
  weeklyAvailableHours: number | null;
  recentSevenDaySetCount: number | null;
};

type OnboardingValidationErrors = {
  currentStudyStage?: string;
  targetExamDate?: string;
  weeklyAvailableHours?: string;
  recentSevenDaySetCount?: string;
};

type OnboardingSubmitPayload = {
  examId: "appraisal_first";
  currentStudyStage: StudyStage;
  subjectConfidence: Record<SubjectId, ConfidenceLevel>;
  targetExamDate?: string;
  weeklyAvailableHours?: number;
  recentSevenDaySetCount?: number;
  derived: {
    isColdStart: boolean;
    hasRecentSetData: boolean;
    weakSubjectIds: SubjectId[];
    unknownSubjectIds: SubjectId[];
  };
  metadata: {
    source: "onboarding";
    schemaVersion: 1;
    createdAt: string;
    updatedAt: string;
  };
};

type OnboardingResponse = {
  ok: boolean;
  data?: OnboardingSubmitPayload;
};

const SUBJECTS: { id: SubjectId; name: string }[] = [
  { id: "civil_law", name: "민법" },
  { id: "economics", name: "경제학원론" },
  { id: "real_estate", name: "부동산학원론" },
  { id: "appraisal_law", name: "감정평가관계법규" },
  { id: "accounting", name: "회계학" },
];

const STUDY_STAGE_OPTIONS: { value: StudyStage; label: string; description: string }[] = [
  { value: "not_started", label: "처음 시작", description: "아직 세트 중심 루프를 만들기 전 단계입니다." },
  { value: "concept_review", label: "기본 이론 정리 중", description: "개념 학습과 문제 풀이를 함께 잡는 단계입니다." },
  { value: "past_set_entry", label: "기출 세트 진입", description: "세트 풀이 기록을 본격적으로 쌓기 시작합니다." },
  { value: "mock_exam", label: "모의 루프 진행", description: "시간 운영과 반복 실수를 함께 관리합니다." },
];

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string }[] = [
  { value: "stable", label: "안정" },
  { value: "unstable", label: "불안정" },
  { value: "weak", label: "취약" },
  { value: "unknown", label: "아직 모름" },
];

const INITIAL_CONFIDENCE: Record<SubjectId, ConfidenceLevel> = {
  civil_law: "unknown",
  economics: "unknown",
  real_estate: "unknown",
  appraisal_law: "unknown",
  accounting: "unknown",
};

const INITIAL_STATE: OnboardingFormState = {
  currentStudyStage: null,
  subjectConfidence: INITIAL_CONFIDENCE,
  targetExamDate: null,
  weeklyAvailableHours: null,
  recentSevenDaySetCount: null,
};

function todayDateString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function parseOptionalNumber(value: string) {
  if (value.trim() === "") return null;
  return Number(value);
}

function hydrateDraft(value: unknown): OnboardingFormState {
  if (typeof value !== "object" || value === null) return INITIAL_STATE;
  const candidate = value as Partial<OnboardingFormState>;
  return {
    currentStudyStage: STUDY_STAGE_OPTIONS.some((option) => option.value === candidate.currentStudyStage)
      ? (candidate.currentStudyStage as StudyStage)
      : null,
    subjectConfidence: SUBJECTS.reduce((acc, subject) => {
      const rawValue = candidate.subjectConfidence?.[subject.id];
      acc[subject.id] = CONFIDENCE_OPTIONS.some((option) => option.value === rawValue)
        ? (rawValue as ConfidenceLevel)
        : "unknown";
      return acc;
    }, {} as Record<SubjectId, ConfidenceLevel>),
    targetExamDate: typeof candidate.targetExamDate === "string" ? candidate.targetExamDate : null,
    weeklyAvailableHours:
      typeof candidate.weeklyAvailableHours === "number" ? candidate.weeklyAvailableHours : null,
    recentSevenDaySetCount:
      typeof candidate.recentSevenDaySetCount === "number" ? candidate.recentSevenDaySetCount : null,
  };
}

function readStoredDraft(storageKey: string | null) {
  if (typeof window === "undefined" || !storageKey) return INITIAL_STATE;
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? hydrateDraft(JSON.parse(stored)) : INITIAL_STATE;
  } catch {
    return INITIAL_STATE;
  }
}

function validateOnboardingDraft(state: OnboardingFormState): OnboardingValidationErrors {
  const errors: OnboardingValidationErrors = {};
  if (!state.currentStudyStage) {
    errors.currentStudyStage = "현재 학습 단계를 선택해 주세요.";
  }

  if (state.targetExamDate && state.targetExamDate < todayDateString()) {
    errors.targetExamDate = "오늘 이후의 날짜를 선택해 주세요.";
  }

  if (
    state.weeklyAvailableHours !== null &&
    (!Number.isInteger(state.weeklyAvailableHours) || state.weeklyAvailableHours < 1 || state.weeklyAvailableHours > 80)
  ) {
    errors.weeklyAvailableHours = "주당 학습 시간은 1시간 이상 80시간 이하로 적어 주세요.";
  }

  if (
    state.recentSevenDaySetCount !== null &&
    (!Number.isInteger(state.recentSevenDaySetCount) || state.recentSevenDaySetCount < 0 || state.recentSevenDaySetCount > 100)
  ) {
    errors.recentSevenDaySetCount = "최근 세트 수는 0개 이상 100개 이하로 적어 주세요.";
  }

  return errors;
}

function getDerivedState(state: OnboardingFormState) {
  const hasRecentSetData = Boolean(state.recentSevenDaySetCount && state.recentSevenDaySetCount > 0);
  const weakSubjectIds = SUBJECTS.filter((subject) => {
    const confidence = state.subjectConfidence[subject.id];
    return confidence === "weak" || confidence === "unstable";
  }).map((subject) => subject.id);
  const unknownSubjectIds = SUBJECTS.filter((subject) => state.subjectConfidence[subject.id] === "unknown").map((subject) => subject.id);

  return {
    isColdStart: !hasRecentSetData,
    hasRecentSetData,
    weakSubjectIds,
    unknownSubjectIds,
  };
}

function buildSubmitPayload(state: OnboardingFormState): OnboardingSubmitPayload | null {
  if (!state.currentStudyStage) return null;
  const now = new Date().toISOString();

  return {
    examId: "appraisal_first",
    currentStudyStage: state.currentStudyStage,
    subjectConfidence: state.subjectConfidence,
    ...(state.targetExamDate ? { targetExamDate: state.targetExamDate } : {}),
    ...(state.weeklyAvailableHours !== null ? { weeklyAvailableHours: state.weeklyAvailableHours } : {}),
    ...(state.recentSevenDaySetCount !== null ? { recentSevenDaySetCount: state.recentSevenDaySetCount } : {}),
    derived: getDerivedState(state),
    metadata: {
      source: "onboarding",
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    },
  };
}

async function fetchOnboarding() {
  const response = await fetch("/api/appraisal-first/onboarding", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("onboarding-fetch-failed");
  }

  const result = (await response.json()) as OnboardingResponse;
  if (!result.ok) {
    throw new Error("onboarding-invalid-response");
  }

  return result.data ?? null;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-[13px] leading-5 text-[color:var(--status-red)]">{message}</p>;
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 sm:p-8">
      <h2 className="text-h3 font-medium text-[color:var(--foreground-strong)]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function AppraisalFirstOnboardingPage() {
  const router = useRouter();
  const session = useAuthSession();
  const storageUserId = getAppraisalFirstBrowserUserId(session.userId, session.isDemo);
  const draftStorageKey = storageUserId ? buildUserScopedKey({ userId: storageUserId, feature: "onboarding-draft" }) : null;

  const [draft, setDraft] = useState<OnboardingFormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<OnboardingValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  const derived = useMemo(() => getDerivedState(draft), [draft]);
  const hasBlockingErrors = Object.keys(errors).length > 0;

  useEffect(() => {
    if (!storageUserId || hydratedUserId === storageUserId) return;

    let cancelled = false;

    async function load() {
      try {
        const serverData = await fetchOnboarding();
        if (cancelled) return;
        const serverDraft = serverData ? hydrateDraft(serverData) : INITIAL_STATE;
        const localDraft = readStoredDraft(draftStorageKey);
        const nextDraft =
          JSON.stringify(localDraft) !== JSON.stringify(INITIAL_STATE) ? localDraft : serverDraft;
        setDraft(nextDraft);
        setErrors(validateOnboardingDraft(nextDraft));
        setHydratedUserId(storageUserId);
      } catch {
        if (cancelled) return;
        const localDraft = readStoredDraft(draftStorageKey);
        setDraft(localDraft);
        setErrors(validateOnboardingDraft(localDraft));
        setHydratedUserId(storageUserId);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [draftStorageKey, hydratedUserId, storageUserId]);

  useEffect(() => {
    if (!draftStorageKey) return;
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch {
      // Draft persistence is optional.
    }
  }, [draft, draftStorageKey]);

  function updateDraft(next: OnboardingFormState) {
    setDraft(next);
    setErrors(validateOnboardingDraft(next));
    setSubmitError(undefined);
  }

  async function handleSubmit() {
    const nextErrors = validateOnboardingDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const payload = buildSubmitPayload(draft);
    if (!payload) return;

    setIsSubmitting(true);
    setSubmitError(undefined);

    try {
      const saved = await postAppraisalFirst<OnboardingSubmitPayload>("/api/appraisal-first/onboarding", payload);
      if (!saved) {
        throw new Error("onboarding-save-failed");
      }

      if (draftStorageKey) {
        window.localStorage.removeItem(draftStorageKey);
      }

      logInvergeEvent("first.onboarding.submitted", {
        examId: payload.examId,
        stage: "first",
        properties: {
          currentStudyStage: payload.currentStudyStage,
          weakSubjectCount: payload.derived.weakSubjectIds.length,
          unknownSubjectCount: payload.derived.unknownSubjectIds.length,
          hasRecentSetData: payload.derived.hasRecentSetData,
        },
      });
      router.push("/exams/appraisal-first/starter-diagnosis");
    } catch {
      setSubmitError("저장에 실패했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <main className="mx-auto w-full max-w-[1040px] px-5 pb-36 pt-7 sm:px-8 sm:pb-32 sm:pt-10 lg:pt-12">
        <div className="space-y-8 sm:space-y-10">
          <section className="space-y-4">
            <span className="inline-flex rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-1 text-caption font-medium text-[color:var(--muted-strong)]">
              감정평가사 1차 · 온보딩
            </span>
            <h1 className="text-[32px] font-medium leading-[1.14] tracking-[-0.045em] text-[color:var(--foreground-strong)] sm:text-[44px]">
              지금 상태를 먼저 적고, 첫 주 루프를 시작합니다.
            </h1>
            <p className="max-w-2xl text-body text-[color:var(--muted)]">
              감정평가사 1차는 문제 사진을 많이 쌓는 서비스가 아니라, 세트 풀이와 리뷰 흐름을 관리하는 시스템입니다.
              현재 상태를 간단히 적으면 첫 주 코칭 기준이 정리됩니다.
            </p>
          </section>

          <Section title="현재 학습 단계" description="가장 가까운 상태 하나만 선택해 주세요.">
            <div className="grid gap-3 sm:grid-cols-2">
              {STUDY_STAGE_OPTIONS.map((option) => {
                const selected = draft.currentStudyStage === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateDraft({ ...draft, currentStudyStage: option.value })}
                    className={cn(
                      "rounded-[var(--radius-md)] border px-4 py-4 text-left transition",
                      selected
                        ? "border-[var(--primary)] bg-[color:var(--primary-soft)]"
                        : "border-[var(--border)] bg-[color:var(--surface)] hover:border-[var(--border-strong)]",
                    )}
                  >
                    <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{option.label}</p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{option.description}</p>
                  </button>
                );
              })}
            </div>
            <FieldError message={errors.currentStudyStage} />
          </Section>

          <Section title="과목별 체감 상태" description="정확하지 않아도 괜찮습니다. 현재 체감만 적어 주세요.">
            <div className="divide-y divide-[var(--border)]">
              {SUBJECTS.map((subject) => (
                <div key={subject.id} className="grid gap-3 py-4 sm:grid-cols-[180px_1fr] sm:items-center">
                  <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{subject.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {CONFIDENCE_OPTIONS.map((option) => {
                      const selected = draft.subjectConfidence[subject.id] === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            updateDraft({
                              ...draft,
                              subjectConfidence: {
                                ...draft.subjectConfidence,
                                [subject.id]: option.value,
                              },
                            })
                          }
                          className={cn(
                            "rounded-full border px-3.5 py-2 text-[13px] font-medium transition",
                            selected
                              ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                              : "border-[var(--border)] text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]",
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="선택 입력" description="비워 두어도 첫 주 계획을 만들 수 있습니다.">
            <div className="grid gap-5 lg:grid-cols-3">
              <label className="block">
                <span className="text-[13px] font-medium text-[color:var(--muted-strong)]">목표 시험일</span>
                <input
                  type="date"
                  value={draft.targetExamDate ?? ""}
                  onChange={(event) => updateDraft({ ...draft, targetExamDate: event.target.value || null })}
                  className="mt-3 h-12 w-full rounded-[14px] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 text-[15px] outline-none transition focus:border-[var(--primary)]"
                />
                <FieldError message={errors.targetExamDate} />
              </label>

              <label className="block">
                <span className="text-[13px] font-medium text-[color:var(--muted-strong)]">이번 주 공부 가능 시간</span>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={draft.weeklyAvailableHours?.toString() ?? ""}
                  onChange={(event) => updateDraft({ ...draft, weeklyAvailableHours: parseOptionalNumber(event.target.value) })}
                  className="mt-3 h-12 w-full rounded-[14px] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 text-[15px] outline-none transition focus:border-[var(--primary)]"
                />
                <FieldError message={errors.weeklyAvailableHours} />
              </label>

              <label className="block">
                <span className="text-[13px] font-medium text-[color:var(--muted-strong)]">최근 7일 세트 수</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draft.recentSevenDaySetCount?.toString() ?? ""}
                  onChange={(event) => updateDraft({ ...draft, recentSevenDaySetCount: parseOptionalNumber(event.target.value) })}
                  className="mt-3 h-12 w-full rounded-[14px] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 text-[15px] outline-none transition focus:border-[var(--primary)]"
                />
                <FieldError message={errors.recentSevenDaySetCount} />
              </label>
            </div>
          </Section>

          <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-5 py-4">
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              {derived.hasRecentSetData
                ? "최근 세트 기록이 있다면 첫 주 계획에 바로 반영됩니다."
                : "아직 기록이 적어도 괜찮습니다. 첫 주는 기준을 만들기 위한 시작 루프로 잡힙니다."}
            </p>
          </section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_94%,transparent)] px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-[1040px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={cn("text-sm leading-6", submitError ? "text-[color:var(--status-red)]" : "text-[color:var(--muted)]")}>
            {submitError ?? "입력된 상태를 기준으로 첫 주 코칭 루프를 시작합니다."}
          </p>
          <Button type="button" size="lg" disabled={!draft.currentStudyStage || hasBlockingErrors || isSubmitting} onClick={() => void handleSubmit()} className="w-full sm:w-auto">
            {isSubmitting ? "저장 중" : "첫 주 계획 만들기"}
          </Button>
        </div>
      </div>
    </>
  );
}

