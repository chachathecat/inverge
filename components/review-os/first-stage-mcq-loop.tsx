"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PrivateContentBlocker =
  | "approved_content_required"
  | "subject_applicability_implementation_required"
  | "owner_local_trial_content_required";

type AvailabilityPayload = Readonly<{
  ok: boolean;
  error?: string;
  availability?: Readonly<{
    state: "available" | "blocked";
    blocker: PrivateContentBlocker | null;
    bankPractice?: boolean;
    questions: ReadonlyArray<Readonly<{
      questionId: string;
      subjectId: string;
      questionNumber: number;
    }>>;
  }>;
  continuation?: Readonly<{
    state: "ready" | "history_incomplete" | "unavailable";
    action: Readonly<{
      kind: "resume_attempt" | "resume_ready" | "review_due" | "review_scheduled" | "review_blocked";
      sessionId: string;
      reviewTaskId: string | null;
      actionAt: string | null;
      priority: "critical" | "high" | "normal" | null;
    }> | null;
  }>;
}>;

type Continuation = NonNullable<AvailabilityPayload["continuation"]>;

type AvailabilityState = Readonly<{
  state: "loading" | "available" | "blocked" | "unavailable";
  blocker: PrivateContentBlocker | null;
  questionCount: number;
  bankPractice: boolean;
  continuation: Continuation;
}>;

type FirstStageMcqLoopProps = Readonly<{
  capacityEnabled?: boolean;
  legalEvidenceEnabled?: boolean;
  localTrialEnabled?: boolean;
}>;

const REVIEWED_SUBJECTS = [
  {
    id: "economics_principles",
    label: "경제학",
    href: "/app/first-stage/practice",
    api: "/api/review-os/first-stage/sessions",
  },
  {
    id: "accounting",
    label: "회계학",
    href: "/app/first-stage/accounting",
    api: "/api/review-os/first-stage/accounting/sessions",
  },
  {
    id: "civil_law",
    label: "민법",
    href: "/app/first-stage/civil-law",
    api: "/api/review-os/first-stage/civil-law/sessions",
  },
  {
    id: "real_estate_principles",
    label: "부동산학원론",
    href: "/app/first-stage/real-estate-principles",
    api: "/api/review-os/first-stage/real-estate-principles/sessions",
  },
  {
    id: "appraiser_related_law",
    label: "감정평가관계법규",
    href: "/app/first-stage/appraiser-related-law",
    api: "/api/review-os/first-stage/appraiser-related-law/sessions",
  },
] as const;

const OWNER_LOCAL_TRIAL = {
  href: "/app/first-stage/economics-trial",
  api: "/api/review-os/first-stage/economics-trial/sessions",
} as const;

const INITIAL_AVAILABILITY: AvailabilityState = Object.freeze({
  state: "loading",
  blocker: null,
  questionCount: 0,
  bankPractice: false,
  continuation: { state: "unavailable", action: null } as const,
});

const DISABLED_LOCAL_TRIAL: AvailabilityState = Object.freeze({
  state: "blocked",
  blocker: "owner_local_trial_content_required",
  questionCount: 0,
  bankPractice: false,
  continuation: { state: "ready", action: null } as const,
});

const BLOCKER_COPY: Record<PrivateContentBlocker, string> = {
  approved_content_required: "검토·설치 대기",
  subject_applicability_implementation_required: "과목 검토 기능 대기",
  owner_local_trial_content_required: "PC 시험 설치 대기",
};

async function readAvailability(api: string, signal: AbortSignal): Promise<AvailabilityState> {
  try {
    const response = await fetch(api, {
      cache: "no-store",
      credentials: "same-origin",
      signal,
    });
    const payload = await response.json() as AvailabilityPayload;
    if (!response.ok || !payload.ok || !payload.availability) {
      return { ...INITIAL_AVAILABILITY, state: "unavailable" };
    }
    return {
      state: payload.availability.state,
      blocker: payload.availability.blocker,
      questionCount: payload.availability.questions.length,
      bankPractice: payload.availability.bankPractice === true,
      continuation: payload.continuation ?? { state: "unavailable", action: null },
    };
  } catch {
    return { ...INITIAL_AVAILABILITY, state: "unavailable" };
  }
}

async function readAllAvailability(signal: AbortSignal, localTrialEnabled: boolean) {
  return Promise.all([
    Promise.all(REVIEWED_SUBJECTS.map((subject) => readAvailability(subject.api, signal))),
    localTrialEnabled
      ? readAvailability(OWNER_LOCAL_TRIAL.api, signal)
      : Promise.resolve(DISABLED_LOCAL_TRIAL),
  ] as const);
}

function statusCopy(status: AvailabilityState) {
  if (status.state === "loading") return "확인 중";
  if (status.state === "unavailable") return "상태 확인 필요";
  if (status.state === "blocked") {
    return status.blocker ? BLOCKER_COPY[status.blocker] : "학습 재고 대기";
  }
  if (status.continuation.state !== "ready") return "저장 기록 확인 필요";
  if (status.continuation.action?.kind === "resume_attempt") return "진행 중 · 이어가기";
  if (status.continuation.action?.kind === "resume_ready") return "시작한 문제 · 이어가기";
  if (status.continuation.action?.kind === "review_due") return "D+1 복습할 차례";
  if (status.continuation.action?.kind === "review_scheduled") return "응답 저장됨 · D+1 예약";
  if (status.continuation.action?.kind === "review_blocked") return "응답 저장됨 · 복습 재고 대기";
  if (status.bankPractice) return `학습 가능 · ${status.questionCount}문항 · 자동 배정 가능`;
  return `학습 가능 · ${status.questionCount}문항`;
}

function continuationLabel(subject: (typeof REVIEWED_SUBJECTS)[number], continuation: Continuation["action"]) {
  if (!continuation) return null;
  if (continuation.kind === "resume_attempt") return `${subject.label} 진행 중인 문제 이어가기`;
  if (continuation.kind === "resume_ready") return `${subject.label} 시작한 문제 이어가기`;
  if (continuation.kind === "review_due") return `${subject.label} D+1 복습 시작`;
  if (continuation.kind === "review_blocked") return `${subject.label} 복습 준비 상태 확인`;
  return `${subject.label} 저장 결과·복습 일정 보기`;
}

export function FirstStageMcqLoop({
  capacityEnabled = false,
  legalEvidenceEnabled = false,
  localTrialEnabled = false,
}: FirstStageMcqLoopProps = {}) {
  const [subjects, setSubjects] = useState<Record<string, AvailabilityState>>(() =>
    Object.fromEntries(REVIEWED_SUBJECTS.map((subject) => [subject.id, INITIAL_AVAILABILITY])),
  );
  const [localTrial, setLocalTrial] = useState<AvailabilityState>(INITIAL_AVAILABILITY);
  const [pending, setPending] = useState(true);
  const requestSequence = useRef(0);
  const requestController = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setPending(true);
    setSubjects(Object.fromEntries(REVIEWED_SUBJECTS.map((subject) => [subject.id, INITIAL_AVAILABILITY])));
    setLocalTrial(INITIAL_AVAILABILITY);
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    const [reviewedStates, trialState] = await readAllAvailability(controller.signal, localTrialEnabled);
    window.clearTimeout(timeout);
    if (requestSequence.current !== sequence) return;
    requestController.current = null;
    setSubjects(Object.fromEntries(REVIEWED_SUBJECTS.map((subject, index) => [subject.id, reviewedStates[index]])));
    setLocalTrial(trialState);
    setPending(false);
  }, [localTrialEnabled]);

  useEffect(() => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    const controller = new AbortController();
    requestController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    void readAllAvailability(controller.signal, localTrialEnabled).then(([reviewedStates, trialState]) => {
      if (requestSequence.current !== sequence) return;
      requestController.current = null;
      setSubjects(Object.fromEntries(REVIEWED_SUBJECTS.map((subject, index) => [subject.id, reviewedStates[index]])));
      setLocalTrial(trialState);
      setPending(false);
    }).finally(() => window.clearTimeout(timeout));
    return () => {
      requestSequence.current += 1;
      requestController.current?.abort();
      requestController.current = null;
    };
  }, [localTrialEnabled, refresh]);

  const readySubjects = useMemo(
    () => REVIEWED_SUBJECTS.filter((subject) =>
      subjects[subject.id]?.state === "available" && subjects[subject.id]?.continuation.state === "ready"),
    [subjects],
  );
  const continuationSubject = useMemo(() => {
    const rank = { resume_attempt: 0, resume_ready: 1, review_due: 2, review_blocked: 3, review_scheduled: 4 } as const;
    const reviewRank = { critical: 0, high: 1, normal: 2 } as const;
    return REVIEWED_SUBJECTS
      .map((subject) => {
        const status = subjects[subject.id];
        return {
          subject,
          action: status?.state === "available" && status.continuation.state === "ready"
            ? status.continuation.action
            : null,
        };
      })
      .filter((entry): entry is {
        subject: (typeof REVIEWED_SUBJECTS)[number];
        action: NonNullable<Continuation["action"]>;
      } => Boolean(entry.action))
      .sort((left, right) =>
        rank[left.action.kind] - rank[right.action.kind] ||
        (left.action.kind === "review_due" && right.action.kind === "review_due"
          ? reviewRank[left.action.priority ?? "normal"] - reviewRank[right.action.priority ?? "normal"]
          : 0) ||
        String(left.action.actionAt ?? "").localeCompare(String(right.action.actionAt ?? "")) ||
        left.subject.id.localeCompare(right.subject.id))[0] ?? null;
  }, [subjects]);
  const hasUnknownAvailability = pending ||
    REVIEWED_SUBJECTS.some((subject) => {
      const state = subjects[subject.id]?.state;
      const continuationState = subjects[subject.id]?.continuation.state;
      return state === "loading" || state === "unavailable" ||
        (state === "available" && continuationState !== "ready");
    }) ||
    localTrial.state === "loading" ||
    localTrial.state === "unavailable";
  const primaryAction = continuationSubject
    ? {
        kind: "link" as const,
        href: `${continuationSubject.subject.href}?sessionId=${encodeURIComponent(continuationSubject.action.sessionId)}`,
        label: continuationLabel(continuationSubject.subject, continuationSubject.action)!,
      }
    : readySubjects[0]
      ? { kind: "link" as const, href: readySubjects[0].href, label: `${readySubjects[0].label} 연습 시작` }
    : localTrialEnabled && localTrial.state === "available"
      ? { kind: "link" as const, href: OWNER_LOCAL_TRIAL.href, label: "경제학 PC 시험 이어가기" }
      : hasUnknownAvailability
        ? { kind: "retry" as const, label: pending ? "1차 상태 확인 중…" : "1차 상태 다시 확인" }
        : { kind: "link" as const, href: "/app?mode=second", label: "2차 오늘 할 일 계속하기" };

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Owner private · default off
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">1차 오늘 학습</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          다섯 과목의 실제 학습 가능 상태를 확인하고, 지금 이어갈 한 가지 작업을 엽니다.
          콘텐츠가 준비되지 않은 과목은 대기 상태로 남기며 문제를 임의로 만들지 않습니다.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5" aria-live="polite" aria-busy={pending}>
          <p className="text-xs font-semibold text-slate-500">현재 상태</p>
          <p className="mt-2 text-lg font-bold text-slate-950">
            {pending ? "5과목 재고를 확인하고 있습니다." : `학습 가능 ${readySubjects.length}/5과목`}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {pending
              ? "각 과목의 검토 재고를 확인한 뒤 다음 작업을 정합니다."
              : continuationSubject
                ? "서버에 저장된 응답과 복습 시점을 확인해 가장 먼저 이어갈 작업을 표시합니다."
                : readySubjects.length > 0
                  ? "검토된 재고가 있는 과목부터 이어갑니다."
                  : localTrialEnabled && localTrial.state === "available"
                    ? "검토 완료 재고는 아직 없지만, 기존 PC 전용 경제학 시험은 별도 표시로 이어갈 수 있습니다."
                    : hasUnknownAvailability
                      ? "일부 과목의 상태를 확인하지 못했습니다. 다시 확인하기 전에는 다른 단계로 넘기지 않습니다."
                      : "모든 1차 경로가 명확히 대기 중이므로 기존 2차 학습 흐름을 계속할 수 있습니다."}
          </p>
        </div>

        <div data-primary-owner-action>
          {primaryAction.kind === "link" ? (
            <Link
              href={primaryAction.href}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white sm:w-auto"
            >
              {primaryAction.label}
            </Link>
          ) : (
            <button
              type="button"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              disabled={pending}
              onClick={() => void refresh()}
            >
              {primaryAction.label}
            </button>
          )}
        </div>

        <section className="mt-8" aria-labelledby="first-stage-subject-status-title">
          <h2 id="first-stage-subject-status-title" className="text-base font-bold text-slate-950">과목별 상태</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {REVIEWED_SUBJECTS.map((subject) => {
              const status = subjects[subject.id] ?? INITIAL_AVAILABILITY;
              const continuation = status.continuation.action;
              const href = continuation
                ? `${subject.href}?sessionId=${encodeURIComponent(continuation.sessionId)}`
                : subject.href;
              return (
                <article
                  key={subject.id}
                  className="rounded-2xl border border-slate-200 p-4"
                  data-first-stage-continuation={continuation?.kind ?? "none"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-950">{subject.label}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.state === "available" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {statusCopy(status)}
                    </span>
                  </div>
                  <Link href={href} prefetch={false} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-slate-700 underline underline-offset-4">
                    {status.state === "available" && status.continuation.state === "ready"
                      ? continuationLabel(subject, continuation) ?? "이 과목 열기"
                      : "대기 사유 확인"}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <details className="mt-6 rounded-2xl border border-slate-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">다른 작업 보기</summary>
          <nav className="flex flex-col border-t border-slate-200 px-4 py-2 text-sm" aria-label="1차 다른 작업">
            {localTrialEnabled && (
              <Link href="/app/first-stage/economics-trial" prefetch={false} className="inline-flex min-h-11 items-center underline underline-offset-4">
                경제학 PC 전용 시험 · {statusCopy(localTrial)}
              </Link>
            )}
            {capacityEnabled && (
              <Link href="/app/first-stage/capacity" prefetch={false} className="inline-flex min-h-11 items-center underline underline-offset-4">
                오늘 학습 가능 시간 계산
              </Link>
            )}
            {legalEvidenceEnabled && (
              <Link href="/app/first-stage/legal-evidence" prefetch={false} className="inline-flex min-h-11 items-center underline underline-offset-4">
                보유 법령 근거 확인
              </Link>
            )}
            <Link href="/app?mode=second" prefetch={false} className="inline-flex min-h-11 items-center underline underline-offset-4">
              2차 오늘 할 일
            </Link>
          </nav>
        </details>

        <button
          type="button"
          className="mt-5 min-h-11 text-sm font-medium text-slate-600 underline underline-offset-4 disabled:opacity-50"
          disabled={pending}
          onClick={() => void refresh()}
        >
          {pending ? "상태 확인 중…" : "5과목 상태 다시 확인"}
        </button>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          학습 효능, 합격 가능성, 과목 완성이나 공식 결과를 주장하지 않습니다. 표시된 가능 상태는 서버가 확인한 현재 비공개 재고 기준입니다.
        </p>
      </section>
    </main>
  );
}
