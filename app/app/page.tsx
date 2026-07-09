import Link from "next/link";
import { redirect } from "next/navigation";

import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { LocalBetaTodayReflection } from "@/components/review-os/local-beta-note-reflection";
import { TodaySubjectSelector } from "@/components/review-os/today-first-subject-selector";
import { EvidenceLine, OneActionFooter } from "@/components/review-os/minimal-study-system";
import { getModeConfig, normalizeSubjectForMode, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { DEFAULT_DAILY_STUDY_ACTIVITY, reviewOsService } from "@/lib/review-os/service";
import { buildNotebookPreview } from "@/lib/review-os/study-note";
import { getSimilarQuestionReferenceCandidates } from "@/lib/review-os/question-reference";
import { type TodayFocus } from "@/lib/review-os/types";
import { buildTodayPlanCard, type TodayPlanActionKind } from "@/lib/review-os/today-plan";
import { selectActiveTodayPlanTasks, TODAY_PLAN_MAX_PRIMARY_TASKS, type TodayPlanTaskKind } from "@/lib/review-os/today-plan-engine";
import { buildLearnerTodayPlanTasksWithGatedDurableConceptGraph } from "@/lib/review-os/today-plan-learner-route-integration";
import { buildCalculatorRoutineRecoveryHref } from "@/lib/review-os/calculator-routine-learning-signal";
import { buildPersonalWeaknessProfile } from "@/lib/review-os/weakness-diagnostics";
import { isOverdueDueAt, resolveDailyStudyState } from "@/lib/review-os/daily-study-state";


function buildFallbackTodayFocus(mode: "first" | "second"): TodayFocus {
  return {
    lines: [
      "오늘은 이 작업 하나만 먼저 합니다.",
      "아직 오늘 할 일 신호가 없어 오늘 한 것부터 시작합니다.",
      mode === "second" ? "쟁점 회상 1개를 남기면 복습과 학습 노트로 이어집니다." : "오답 1개를 남기면 복습과 학습 노트로 이어집니다.",
    ],
    nextAction: mode === "second" ? "2차 답안 흐름을 사진/PDF/텍스트 중 하나로 정리하세요." : "1차 오답 1개를 사진/PDF/텍스트 중 하나로 정리하세요.",
    nextActionType: "capture_now",
    primaryTaskLabel: mode === "second" ? "2차 답안 1건 정리" : "1차 오답 1건 정리",
    reason: "첫 기록을 저장하면 오늘 할 일, 복습, 학습 노트가 이어집니다.",
    estimatedDurationMinutes: mode === "second" ? 18 : 12,
    priorityScore: 0,
    sourceQueueId: null,
    sourceItemId: null,
    queue: [],
  };
}

const TASK_TYPE_LABELS: Record<TodayPlanTaskKind, string> = {
  first_ox_retry: "5분 재풀이",
  concept_review: "개념 1개 회상",
  cloze_review: "빈칸 회상",
  accounting_template_retry: "계산 틀 재확인",
  calculator_routine: "계산·검산",
  second_answer_rewrite: "문단 다시쓰기",
  ocr_confirmation: "OCR 확인",
  note_cleanup: "노트 정리",
};

function resolveTaskTypeLabel(taskType: TodayPlanTaskKind) {
  return TASK_TYPE_LABELS[taskType];
}

type PageProps = {
  searchParams?: Promise<{ mode?: string; subject?: string; saved?: string; migrated?: string }>;
};

export default async function ReviewOsDashboardPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const modeParam = query?.mode;
  const subjectParam = query?.subject;
  const savedParam = query?.saved;
  const migratedParam = query?.migrated;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app", modeParam));
  if (!session.userId || !session.email) return null;

  if (!profile && !modeParam) redirect("/app/onboarding");
  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const [focus, weekly, allItems, learningSignal, learningSignalEvents, dailyActivity] = await Promise.all([
    reviewOsService.getTodayFocus(session.userId, session.email, mode).catch(() => buildFallbackTodayFocus(mode)),
    reviewOsService.getWeeklySummary(session.userId, session.email).catch(() => null),
    reviewOsService.listWrongAnswerItems(session.userId, session.email, 12).catch(() => []),
    reviewOsService.getLearningSignalSummary(session.userId, session.email, mode).catch(() => null),
    reviewOsService.listLearningSignalEvents(session.userId, session.email, mode, 10).catch(() => []),
    reviewOsService.getDailyStudyActivity(session.userId, session.email, mode).catch(() => DEFAULT_DAILY_STUDY_ACTIVITY),
  ]);

  const items = allItems.filter((item) => item.examName === config.label).slice(0, 5);
  const queue = focus.queue.filter((item) => item.examName === config.label);
  let recentStudyLog: Awaited<ReturnType<typeof reviewOsService.getRecentStudyLog>> | null = null;
  if (mode === "first") {
    try {
      recentStudyLog = await reviewOsService.getRecentStudyLog(session.userId, session.email, "first");
    } catch (error) {
      console.warn("[review-os] failed to load optional recent study log", error);
    }
  }
  const hasDataSignals = learningSignalEvents.length > 0 || queue.length > 0 || Boolean(recentStudyLog);
  const firstUse = items.length === 0 && !hasDataSignals;
  const hasDurableSummary = items.length > 0 || queue.length > 0 || learningSignalEvents.length > 0 || Boolean(recentStudyLog);
  const hasOverdueQueue = queue.some((item) => isOverdueDueAt(item.dueAt));
  const homeState = resolveDailyStudyState({
    hasNoData: firstUse,
    hasDueQueue: dailyActivity.hasDueQueue || queue.length > 0,
    hasOverdueQueue: dailyActivity.completedToday ? false : dailyActivity.hasOverdueQueue || hasOverdueQueue,
    savedToday: dailyActivity.savedToday || Boolean(savedParam),
    completedToday: dailyActivity.completedToday,
    mode,
  });
  const homePrimaryCta =
    homeState === "first_capture"
      ? "오늘 한 것 올리기"
      : homeState === "overdue_recovery"
        ? "15분 복구 시작"
        : homeState === "evening_capture"
          ? "사진/텍스트로 남기기"
          : mode === "second"
            ? "지금 10분 다시 쓰기"
            : "지금 5분 다시 풀기";
  const todayPlan = buildTodayPlanCard({ mode, learningSignals: learningSignalEvents, queue, items });
  const weaknessProfile = buildPersonalWeaknessProfile({
    learningSignalSummary: learningSignal,
    learningSignalEvents: learningSignalEvents,
    reviewQueue: queue,
    wrongAnswerItems: items,
    mode,
  });
  const todayPlanTasks = selectActiveTodayPlanTasks(
    await buildLearnerTodayPlanTasksWithGatedDurableConceptGraph({
      userId: session.userId,
      mode,
      queue,
      items,
      learningSignals: learningSignalEvents,
      repeatedGaps: weaknessProfile.repeatedGaps,
      riskLevel: weaknessProfile.riskLevel,
    }).catch(() => []),
    TODAY_PLAN_MAX_PRIMARY_TASKS,
  );
  const questionReferenceHintsByTaskId = new Map(
    await Promise.all(todayPlanTasks.map(async (task) => ([
      task.itemId,
      await getSimilarQuestionReferenceCandidates({
        examMode: task.exam_mode,
        subject: task.subject,
        topicCandidate: task.title,
        conceptCandidate: task.one_biggest_gap,
        mistakeType: task.task_type,
        issueTags: [task.one_biggest_gap],
        derivedTags: [task.priority_reason, task.source_label].filter((value): value is string => Boolean(value)),
        safeSkeletonIds: task.task_type === "second_answer_rewrite" ? ["appraisal_income_capitalization", "second_law_requirement_subsumption"] : [],
      }),
    ] as const))),
  );
  const isFirstSetStart = mode === "first" && focus.nextActionType === "capture_now";
  const selectedSubject = normalizeSubjectForMode(subjectParam, mode);
  const selectedFirstSubject = mode === "first" ? selectedSubject : normalizeSubjectForMode(null, "first");
  const selectedSubjectQuery = encodeURIComponent(selectedSubject);
  const firstSetHref = `/app/sets?mode=first&subject=${encodeURIComponent(selectedFirstSubject)}`;
  const firstCaptureHref = `/app/capture?mode=first&subject=${encodeURIComponent(selectedFirstSubject)}`;
  const firstReviewHref = `/app/review?mode=first&subject=${encodeURIComponent(selectedFirstSubject)}`;
  const firstNotesHref = `/app/notes?mode=first&subject=${encodeURIComponent(selectedFirstSubject)}`;
  const firstStudyLogHref = `/app/study-log?mode=first&subject=${encodeURIComponent(selectedFirstSubject)}`;
  const secondCaptureHref = `/app/capture?mode=second&subject=${selectedSubjectQuery}`;
  const secondReviewHref = `/app/review?mode=second&subject=${selectedSubjectQuery}`;
  const secondNotesHref = `/app/notes?mode=second&subject=${selectedSubjectQuery}`;
  const defaultPrimaryHref = isFirstSetStart ? firstSetHref : `/app/session?mode=${mode}&subject=${selectedSubjectQuery}`;
  const modeCaptureHref = mode === "second" ? secondCaptureHref : firstCaptureHref;

  const resolveTodayPlanHref = (actionKind: TodayPlanActionKind) => {
    if (actionKind === "first_capture") return firstCaptureHref;
    if (actionKind === "first_set") return firstSetHref;
    if (actionKind === "second_write") return `/app/write?mode=second&subject=${selectedSubjectQuery}`;
    if (actionKind === "second_review") return secondReviewHref;
    if (actionKind === "second_items") return secondNotesHref;
    return `/app/session?mode=first&subject=${encodeURIComponent(selectedFirstSubject)}`;
  };
  const resolveTaskHref = (task: (typeof todayPlanTasks)[number]) => {
    const hrefKind = task.primary_cta.hrefKind;
    if (hrefKind === "capture") return mode === "second" ? secondCaptureHref : firstCaptureHref;
    if (hrefKind === "write") return `/app/write?mode=second&subject=${selectedSubjectQuery}`;
    if (hrefKind === "items") return mode === "second" ? secondNotesHref : firstNotesHref;
    if (hrefKind === "review") return mode === "second" ? secondReviewHref : firstReviewHref;
    if (hrefKind === "first_ox") return "/app/first/ox";
    if (hrefKind === "calculator_template") {
      if (task.task_type === "calculator_routine" && task.calculator_routine_recovery) {
        try {
          return buildCalculatorRoutineRecoveryHref(task.calculator_routine_recovery);
        } catch {
          // Recovery metadata is optional; invalid metadata falls back to the ordinary calculator workflow.
        }
      }
      return mode === "second"
        ? "/app/calculator?mode=second&context=practice&focus=casio"
        : "/app/calculator?mode=first&context=accounting&focus=accounting_template";
    }
    return `/app/session?mode=${mode}&subject=${selectedSubjectQuery}`;
  };

  const primaryHref = todayPlan.hasPlan ? resolveTodayPlanHref(todayPlan.actionKind) : defaultPrimaryHref;
  const primaryCtaLabel = todayPlan.ctaLabel;
  const dailyStateCopy = {
    recommendationBasis: "추천은 저장된 학습 신호 기반입니다.",
    overdueTitle: "오늘은 복구만 합니다",
    overdueReason: "괜찮습니다. 오늘은 복구 1개만 하면 됩니다.",
    overdueHelp: "밀린 걸 전부 따라잡으려 하지 마세요.",
    completionTitle: "최근 흐름이 이어지고 있습니다.",
    completionAction: "완료 처리하기",
  } as const;
  const notebookPreview = items.slice(0, 3).map((item) => buildNotebookPreview(item));
  const repeatedSignalLine =
    weaknessProfile.topSubjects[0] && weaknessProfile.topMistakeTypes[0]
      ? `${weaknessProfile.topSubjects[0].subject}에서 ${weaknessProfile.topMistakeTypes[0].mistakeType}이 반복됩니다.`
      : "반복 약점 신호를 수집 중입니다.";
  const latestProblemSnapSignal = learningSignalEvents.find((event) => event.sourceType === "problem-snap") ?? null;
  const problemSnapSignalCta =
    mode === "second"
      ? { label: "답안 검토로 보기", href: `/answer-review?mode=${mode}` }
      : { label: "다시 풀기", href: `/problem-snap?mode=${mode}` };
  const visibleTodayPlanTasks = todayPlanTasks;
  const heroTodayPlanTasks = todayPlanTasks.slice(0, TODAY_PLAN_MAX_PRIMARY_TASKS);
  const heroPrimaryHref = heroTodayPlanTasks[0] ? resolveTaskHref(heroTodayPlanTasks[0]) : todayPlan.hasPlan ? primaryHref : modeCaptureHref;
  const missionTask = heroTodayPlanTasks[0] ?? null;
  const missionTitle = homeState === "overdue_recovery"
    ? dailyStateCopy.overdueTitle
    : homeState === "post_completion"
      ? dailyStateCopy.completionTitle
      : missionTask?.title ?? (mode === "second" ? "답안 1개 올리고 오늘 계획 만들기" : "오늘 한 것 1개 올리고 계획 만들기");
  const missionWhy = homeState === "overdue_recovery" ? dailyStateCopy.overdueReason : missionTask?.display_reason ?? missionTask?.reason ?? todayPlan.reason;
  const missionMinutes = missionTask ? `${missionTask.estimated_minutes}분` : mode === "second" ? "18분 안팎" : "12분 안팎";
  const missionAfter = missionTask
    ? "교정 노트에 저장되고 다음 복습 시점으로 돌아옵니다."
    : "학습 노트, 오늘 할 일, 복습 대기가 함께 만들어집니다.";
  const fallbackMissionPrimaryLabel =
    homeState === "first_capture" || homeState === "overdue_recovery" || homeState === "evening_capture"
      ? homePrimaryCta
      : "답안 1개 올리기";
  const missionPrimaryLabel = missionTask?.display_primary_cta ?? missionTask?.primary_cta.label ?? (todayPlan.hasPlan ? primaryCtaLabel : fallbackMissionPrimaryLabel);
  const learnerLoopSummary = "오늘 한 것 올리기 → 학습 노트 → 오늘 할 일 → 복습 → 학습 기록";

  return (
    <div
      className="space-y-6 md:space-y-7"
      data-s224v-surface="/app"
      data-s224v-primary-cta-count-above-fold="1"
      data-s224v-visible-trust-layer-count="0"
      data-s224v-visible-primary-work-items-max={TODAY_PLAN_MAX_PRIMARY_TASKS}
      data-s224v-secondary-diagnostics="quiet-disclosure"
      data-s224v-equal-weight-card-grid="absent"
      data-s224v-repeated-warning-copy="absent"
      data-learner-loop-summary={learnerLoopSummary}
      data-review-completion-action={dailyStateCopy.completionAction}
      data-recommendation-basis={dailyStateCopy.recommendationBasis}
      data-overdue-recovery-help={dailyStateCopy.overdueHelp}
    >
      <section
        className="mission-surface p-5 sm:p-7"
        data-ux-surface-reset-primary-card
        data-today-plan-primary-surface
        data-visible-primary-task-cap={TODAY_PLAN_MAX_PRIMARY_TASKS}
        data-s226-primary-mission
      >
        <p className="text-caption font-medium text-[color:var(--muted)]">오늘의 1개</p>
        <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
          <div className="min-w-0">
            <h1 className="hero-balance ko-keep text-[30px] font-semibold leading-tight text-[color:var(--foreground-strong)] sm:text-[36px]">
              {missionTitle}
            </h1>
            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="density-quiet">왜 이걸 하나요</p>
                <p className="mt-1 leading-6 text-[color:var(--foreground-strong)]">{missionWhy}</p>
              </div>
              <div>
                <p className="density-quiet">예상 시간</p>
                <p className="mt-1 tabular-nums leading-6 text-[color:var(--foreground-strong)]">{missionMinutes}</p>
              </div>
              <div>
                <p className="density-quiet">끝나면 이어질 것</p>
                <p className="mt-1 leading-6 text-[color:var(--foreground-strong)]">{missionAfter}</p>
              </div>
            </div>
          </div>
          <Link
            href={heroPrimaryHref}
            className="primary-action inline-flex min-h-12 w-full items-center justify-center px-6 text-sm font-semibold transition hover:bg-[color:var(--brand-800)] sm:w-auto"
            data-s226-primary-cta
          >
            {missionPrimaryLabel}
          </Link>
        </div>
      </section>

      {savedParam ? (
        <section className="evidence-bar px-4 py-3">
          <EvidenceLine>저장한 내용은 교정 노트에서 확인할 수 있습니다.</EvidenceLine>
          <OneActionFooter>
            <Link href={`/app/notes?mode=${mode}`} className="inline-flex rounded-full border border-[color:var(--border-subtle)] px-4 py-2 text-xs font-medium text-[color:var(--foreground-strong)]">
              교정 노트 보기
            </Link>
          </OneActionFooter>
        </section>
      ) : null}

      {migratedParam && mode === "second" ? (
        <section className="evidence-bar px-4 py-3">
          <EvidenceLine>이전 기록은 보관되었고, 오늘 할 일은 2차 답안 운영 중심으로 정리되었습니다.</EvidenceLine>
        </section>
      ) : null}

      <LocalBetaTodayReflection mode={mode} hasDurableSummary={hasDurableSummary} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="space-y-4">
          <details
            className="operating-surface"
            data-learning-loop-summary
            data-s224v-secondary-diagnostics
          >
            <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium text-[color:var(--foreground-strong)] sm:px-5">
              다른 작업 · 오늘 기록 근거 보기
            </summary>
            <div className="space-y-4 border-t border-[color:var(--border-subtle)] px-4 py-5 sm:px-5">
              <div className="today-priority-card rounded-[var(--radius-md)] border border-[color:var(--border-hairline)] bg-[color:var(--bg-elevated)] px-4 py-3">
                <p className="text-caption text-[color:var(--muted)]">오늘의 우선순위 · 최대 3개</p>
                <div className="mt-3 space-y-3">
                  {todayPlanTasks.length === 0 ? (
                    <div className="space-y-1 text-xs text-[color:var(--muted)]" data-today-plan-empty-state>
                      <p className="font-medium text-[color:var(--foreground-strong)]">오늘 할 일이 아직 없습니다.</p>
                      <p>오늘 한 것을 하나 올리면 다음 행동이 만들어집니다.</p>
                      <Link href={modeCaptureHref} className="pt-1 font-medium text-[color:var(--foreground-strong)] underline underline-offset-2">오늘 한 것 올리기</Link>
                    </div>
                  ) : (
                    visibleTodayPlanTasks.map((task, index) => (
                      <article key={task.itemId} className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3" data-today-plan-primary-task>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium leading-6 text-[color:var(--foreground-strong)]">{index + 1}. {task.title}</p>
                              {task.display_source_label ? (
                                <span className="rounded-full border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--muted)]">{task.display_source_label}</span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{task.subject} · {task.estimated_minutes}분</p>
                            <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]"><span className="font-medium text-[color:var(--foreground-strong)]">왜 지금?</span> {task.display_reason ?? task.reason}</p>
                          </div>
                          <Link href={resolveTaskHref(task)} className="secondary-action inline-flex min-h-10 w-full shrink-0 items-center justify-center px-3 py-2 text-xs font-medium sm:w-auto">
                            {task.display_primary_cta ?? task.primary_cta.label}
                          </Link>
                        </div>
                        <details className="quiet-disclosure mt-3 rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)]" data-s224v-secondary-diagnostics>
                          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-[color:var(--muted)]">세부 내용 보기</summary>
                          <div className="grid gap-2 border-t border-[color:var(--border-hairline)] px-3 py-3 text-xs leading-5 text-[color:var(--muted)]">
                            <p><span className="font-medium text-[color:var(--foreground-strong)]">가장 큰 약점:</span> {task.one_biggest_gap}</p>
                            <p><span className="font-medium text-[color:var(--foreground-strong)]">다음 행동:</span> {task.one_next_action}</p>
                            <p><span className="font-medium text-[color:var(--foreground-strong)]">상태:</span> {task.status === "due" ? "진행 필요" : task.status === "completed" ? "완료" : "대기"}</p>
                            <p><span className="font-medium text-[color:var(--foreground-strong)]">작업:</span> {resolveTaskTypeLabel(task.task_type)}</p>
                            {questionReferenceHintsByTaskId.get(task.itemId)?.length ? (
                              <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--bg-surface)] p-3">
                                <p className="font-medium text-[color:var(--foreground-strong)]">관련 기출 기준 힌트</p>
                                <ul className="mt-2 space-y-2">
                                  {questionReferenceHintsByTaskId.get(task.itemId)?.slice(0, 2).map((hint) => (
                                    <li key={hint.referenceId}>
                                      <span className="font-medium text-[color:var(--foreground-strong)]">{hint.title}</span>
                                      <span> · {hint.reason}</span>
                                      {hint.skeletonId ? <span> · 학습 구조: {hint.skeletonId}</span> : null}
                                    </li>
                                  ))}
                                </ul>
                                <p className="mt-2">원문 자료가 아니라 메타데이터 기준이며, 원문은 이 힌트에 저장하지 않습니다.</p>
                              </div>
                            ) : null}
                          </div>
                        </details>
                      </article>
                    ))
                  )}
                </div>
              </div>

              <TodaySubjectSelector
                mode={mode}
                selectedSubject={selectedSubject}
                primaryHref={modeCaptureHref}
                primaryLabel="오늘 한 것 올리기"
                quietPrimary
                isFirstSetStart={isFirstSetStart}
                captureHref={modeCaptureHref}
                reviewHref={mode === "second" ? secondReviewHref : firstReviewHref}
                notesHref={mode === "second" ? secondNotesHref : firstNotesHref}
                setHref={mode === "first" ? firstSetHref : undefined}
                studyLogHref={mode === "first" ? firstStudyLogHref : undefined}
              />

              {mode === "first" ? (
                <details className="quiet-disclosure rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]" data-secondary-action-surface="first-mode-migration" data-s224v-secondary-diagnostics>
                  <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">2차 전환 설정</summary>
                  <div className="border-t border-[color:var(--border-subtle)] px-4 py-3">
                    <Link href="/app/mode-migration?mode=first" className="text-xs font-medium text-[color:var(--foreground-strong)] underline underline-offset-2">
                      2차 준비로 전환
                    </Link>
                  </div>
                </details>
              ) : null}

              {latestProblemSnapSignal && todayPlanTasks[0]?.source_label !== "Problem Snap 기반" ? (
                <details className="quiet-disclosure rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]" data-secondary-action-surface="problem-snap" data-s224v-secondary-diagnostics>
                  <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">다른 작업 · Problem Snap 신호 보기</summary>
                  <div className="border-t border-[color:var(--border-subtle)] px-4 py-3">
                    <p className="text-xs font-medium text-[color:var(--foreground-strong)]">Problem Snap</p>
                    <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">{latestProblemSnapSignal.subject}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">다음 행동: {latestProblemSnapSignal.nextTask}</p>
                    <Link href={problemSnapSignalCta.href} className="mt-2 inline-flex text-xs font-medium text-[color:var(--foreground-strong)] underline underline-offset-2">
                      {problemSnapSignalCta.label}
                    </Link>
                  </div>
                </details>
              ) : null}
            </div>
          </details>

          <details
            className="operating-surface"
            data-learning-loop-summary
            data-s224v-secondary-diagnostics
          >
            <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium text-[color:var(--foreground-strong)] sm:px-5">
              학습 루프 요약 보기
            </summary>
            <div className="space-y-5 border-t border-[color:var(--border-subtle)] px-4 py-5 sm:px-5">
              <p className="text-xs leading-6 text-[color:var(--muted)]">복습은 대기, 진행 필요, 완료 흐름으로만 관리합니다. 예측 점수나 합격 여부는 보여주지 않습니다.</p>

              <section className="space-y-3" data-loop-weekly-summary>
                <h3 className="text-sm font-medium text-[color:var(--foreground-strong)]">이번 주 학습 정리</h3>
                {weekly ? (
                  <>
                    <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">{weekly.summaryText}</p>
                    <Link href={`/app/weekly?mode=${mode}`} className="inline-flex text-sm font-medium text-[color:var(--foreground-strong)] underline underline-offset-2">
                      주간 정리 보기
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-[color:var(--muted)]">아직 주간 정리가 없습니다. 입력이 쌓이면 우선순위가 만들어집니다.</p>
                )}
              </section>

              <section className="space-y-4" data-loop-notes-summary>
                <h3 className="text-sm font-medium text-[color:var(--foreground-strong)]">정리된 기록</h3>
                {notebookPreview.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-[color:var(--muted)]">아직 기록이 없습니다.</p>
                    <p className="text-sm text-[color:var(--muted)]">오늘 푼 문제나 답안 일부를 정리하면 첫 교정 노트가 만들어집니다.</p>
                    <Link href={modeCaptureHref} className="inline-flex text-sm font-medium text-[color:var(--foreground-strong)] underline underline-offset-2">오늘 한 것 올리기</Link>
                  </div>
                ) : (
                  notebookPreview.map((note, index) => (
                    <Link
                      key={`${note.title}-${index}`}
                      href={`/app/items/${items[index].id}?mode=${mode}`}
                      className="block rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] px-4 py-4 text-sm transition duration-150 hover:bg-[color:var(--bg-subtle)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[color:var(--foreground-strong)]">{note.title}</p>
                          <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{note.summaryLine}</p>
                        </div>
                        <span className="rounded-full border border-[color:var(--border-subtle)] px-2 py-1 text-[11px] text-[color:var(--muted)]">
                          {note.noteLabel}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-[color:var(--muted)]">다음 확인: {note.nextReviewDate}</p>
                    </Link>
                  ))
                )}
              </section>
            </div>
          </details>
        </section>

        <aside>
          <details className="quiet-disclosure operating-surface" data-s226-diagnostics-disclosure data-s224v-secondary-diagnostics>
            <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium text-[color:var(--foreground-strong)]">
              오늘 기록 신호 보기
            </summary>
            <div className="space-y-5 border-t border-[color:var(--border-subtle)] px-4 py-4">
              <section>
                <p className="density-quiet">현재 흐름</p>
                <p className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">{config.label} · 실무·이론·법규</p>
                <div className="mt-4 grid gap-3 text-sm">
                  <div>
                    <p className="density-quiet">다시 볼 항목</p>
                    <p className="mt-1 tabular-nums text-[color:var(--foreground-strong)]">{queue.length}개</p>
                  </div>
                  <div>
                    <p className="density-quiet">과목</p>
                    <p className="mt-1 text-[color:var(--foreground-strong)]">
                      {profile?.preferredSubjects.filter((subject) => (config.subjects as readonly string[]).includes(subject)).join(", ") || selectedSubject}
                    </p>
                  </div>
                  <div>
                    <p className="density-quiet">반복 신호</p>
                    <p className="mt-1 leading-6 text-[color:var(--foreground-strong)]">{repeatedSignalLine}</p>
                  </div>
                </div>
              </section>

              <section>
                <p className="density-quiet">누적 신호</p>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  누적 {learningSignal?.totalCount ?? 0}건 · 최근 {learningSignal?.latestEventAt ? new Date(learningSignal.latestEventAt).toLocaleDateString("ko-KR") : "-"}
                </p>
                <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">오늘 기록 기반 진단 정보는 참고 신호입니다. 오늘은 위의 1개 미션만 먼저 진행합니다.</p>
              </section>
            </div>
          </details>
        </aside>
      </div>

      <ReviewOsFeedbackButton route="/app" pageContext={{ section: "today", firstUse, mode }} />
    </div>
  );
}
