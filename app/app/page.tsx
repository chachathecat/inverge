import Link from "next/link";
import { redirect } from "next/navigation";

import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { LocalBetaTodayReflection } from "@/components/review-os/local-beta-note-reflection";
import { TodaySubjectSelector } from "@/components/review-os/today-first-subject-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceLine, OneActionFooter } from "@/components/review-os/minimal-study-system";
import { getModeConfig, normalizeSubjectForMode, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { DEFAULT_DAILY_STUDY_ACTIVITY, reviewOsService } from "@/lib/review-os/service";
import { buildNotebookPreview } from "@/lib/review-os/study-note";
import { getSimilarQuestionReferenceCandidates } from "@/lib/review-os/question-reference";
import { APPRAISAL_FIRST_SUBJECTS, type TodayFocus } from "@/lib/review-os/types";
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
  const dailyConsistencyCopy = dailyActivity.missedRecently
    ? "괜찮습니다. 오늘은 복구 1개만 하면 됩니다."
    : "최근 흐름이 이어지고 있습니다.";
  const primaryHeading =
    homeState === "first_capture"
      ? "오늘 한 것 올리기"
      : homeState === "overdue_recovery"
        ? "오늘은 복구만 합니다"
        : homeState === "post_completion"
          ? "오늘은 여기까지 해도 됩니다"
          : homeState === "evening_capture"
            ? "오늘 공부한 흔적을 남기고 끝내세요"
            : "오늘 합격에 제일 가까워지는 1개";
  const primaryDescription =
    homeState === "overdue_recovery"
      ? "밀린 걸 전부 따라잡으려 하지 마세요. 가장 작은 작업 1개만 끝냅니다."
      : homeState === "post_completion"
        ? "다음 복습은 예약되었습니다. 새 범위보다 회복이 우선입니다."
        : "지금은 전체를 다시 볼 때가 아니라, 이 약점 하나를 줄일 때입니다.";
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
  const selectedQueueItem = queue.find((item) => item.queueId === focus.sourceQueueId) ?? queue[0] ?? null;
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
  const nextAction = focus.nextAction ?? selectedQueueItem?.reviewReason ?? config.nextActionFallback;
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
  const diagnosedWeakPoint = selectedQueueItem?.mistakeType ?? (items[0] ? buildNotebookPreview(items[0]).weakPoint : config.emptyTitle);
  const notebookPreview = items.slice(0, 3).map((item) => buildNotebookPreview(item));
  const repeatedSignalLine =
    weaknessProfile.topSubjects[0] && weaknessProfile.topMistakeTypes[0]
      ? `${weaknessProfile.topSubjects[0].subject}에서 ${weaknessProfile.topMistakeTypes[0].mistakeType}이 반복됩니다.`
      : "반복 약점 신호를 수집 중입니다.";
  const recentStudyTaxonomyCandidates = recentStudyLog?.taxonomyCandidates ?? [];
  const recentStudyTaxonomyNodeId = recentStudyLog?.taxonomyNodeId ?? null;
  const recentStudyTaxonomyCandidate =
    (recentStudyTaxonomyNodeId
      ? recentStudyTaxonomyCandidates.find((candidate) => candidate.taxonomyNodeId === recentStudyTaxonomyNodeId)
      : null) ??
    recentStudyTaxonomyCandidates[0] ??
    null;
  const recentStudyTaxonomyLine = recentStudyTaxonomyCandidate
    ? `범위 후보: ${recentStudyTaxonomyCandidate.subject} · ${recentStudyTaxonomyCandidate.unit} · ${recentStudyTaxonomyCandidate.topic}`
    : null;
  const latestProblemSnapSignal = learningSignalEvents.find((event) => event.sourceType === "problem-snap") ?? null;
  const problemSnapSignalCta =
    mode === "second"
      ? { label: "답안 검토로 보기", href: `/answer-review?mode=${mode}` }
      : { label: "다시 풀기", href: `/problem-snap?mode=${mode}` };
  const visibleTodayPlanTasks = todayPlanTasks;
  const heroTodayPlanTasks = todayPlanTasks.slice(0, TODAY_PLAN_MAX_PRIMARY_TASKS);
  const heroTodayPlanEstimatedMinutes = heroTodayPlanTasks.reduce((sum, task) => sum + task.estimated_minutes, 0);
  const heroPrimaryHref = heroTodayPlanTasks[0] ? resolveTaskHref(heroTodayPlanTasks[0]) : modeCaptureHref;

  return (
    <div
      className="space-y-7 md:space-y-8"
      data-s224v-surface="/app"
      data-s224v-primary-cta-count-above-fold="1"
      data-s224v-visible-trust-layer-count="0"
      data-s224v-visible-primary-work-items-max={TODAY_PLAN_MAX_PRIMARY_TASKS}
      data-s224v-secondary-diagnostics="quiet-disclosure"
      data-s224v-equal-weight-card-grid="absent"
      data-s224v-repeated-warning-copy="absent"
    >
      <section
        className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-focus)] sm:p-7"
        data-ux-surface-reset-primary-card
      >
        <p className="text-caption font-medium text-[color:var(--muted)]">Today · 오늘 기록 기반</p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight text-[color:var(--foreground-strong)]">
          오늘은 이것만 하면 됩니다
        </h1>
        {heroTodayPlanTasks.length > 0 ? (
          <ol className="mt-5 space-y-3 text-[15px] leading-7 text-[color:var(--foreground-strong)]">
            {heroTodayPlanTasks.map((task, index) => (
              <li key={task.itemId}>
                {index + 1}. {task.title}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-5 rounded-[var(--radius-md)] bg-[color:var(--surface-soft)] px-4 py-4 text-[15px] leading-7 text-[color:var(--foreground-strong)]">
            오늘 한 것 1개를 올리면 첫 계획을 만들 수 있습니다.
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 border-t border-[color:var(--border-subtle)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[color:var(--muted)]">
            예상 시간{" "}
            <span className="font-semibold text-[color:var(--foreground-strong)]">
              {heroTodayPlanTasks.length > 0 ? `${heroTodayPlanEstimatedMinutes}분` : "계획 생성 후 표시"}
            </span>
          </p>
          <Link
            href={heroPrimaryHref}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-pill)] bg-[color:var(--brand-900)] px-6 text-sm font-semibold text-white transition hover:bg-[color:var(--brand-800)] sm:w-auto"
          >
            오늘 공부 시작
          </Link>
        </div>
      </section>

      {savedParam ? (
        <section className="rounded-[var(--radius-md)] bg-[color:var(--surfaceQuiet)] px-4 py-4">
          <EvidenceLine>저장 전 직접 확인해 주세요.</EvidenceLine>
          <OneActionFooter>
            <Link href={`/app/notes?mode=${mode}`} className="inline-flex rounded-full bg-[color:var(--actionPrimary)] px-4 py-2 text-xs font-medium text-white">
              학습 노트에서 확인
            </Link>
          </OneActionFooter>
        </section>
      ) : null}

      {migratedParam && mode === "second" ? (
        <section className="rounded-[var(--radius-md)] bg-[color:var(--surfaceQuiet)] px-4 py-4">
          <EvidenceLine>1차 기록은 보관되었고, 오늘 할 일은 2차 중심으로 전환되었습니다.</EvidenceLine>
          <OneActionFooter>
            <Link href="/app/review?mode=second" className="inline-flex rounded-full bg-[color:var(--actionPrimary)] px-4 py-2 text-xs font-medium text-white">
              2차 복습 보기
            </Link>
          </OneActionFooter>
        </section>
      ) : null}
      <LocalBetaTodayReflection mode={mode} hasDurableSummary={hasDurableSummary} />

      {mode === "first" ? (
        <section className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">2차 준비를 시작할 때</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">직접 확인 후 1차 기록을 보관하고 2차 답안 운영으로 전환합니다.</p>
            </div>
            <Link href="/app/mode-migration?mode=first" className="inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--border-subtle)] px-4 text-xs font-medium text-[color:var(--foreground-strong)]">
              2차 준비로 전환
            </Link>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        {firstUse ? (
          <Card className="border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] shadow-none" data-s224v-today-priority-card>
            <CardHeader className="space-y-3 p-4 sm:p-6">
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--brand-050)] px-4 py-3">
                <p className="text-caption text-[color:var(--muted)]">처음이라면</p>
                <p className="mt-1 text-body-lg text-[color:var(--foreground-strong)]">
                  {mode === "first"
                    ? "오답 하나만 저장하면 오늘 할 일, 복습, 학습 노트가 이어집니다."
                    : "답안 하나만 저장하면 보강할 문단과 오늘 할 일, 복습, 학습 노트가 이어집니다."}
                </p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">오늘 한 것 올리기 → 학습 노트 → 오늘 할 일 → 복습 → 학습 기록</p>
                <div className="mt-3 grid gap-2 text-xs text-[color:var(--muted)] sm:grid-cols-3">
                  <p><span className="font-medium text-[color:var(--foreground-strong)]">왜</span> 첫 기록이 우선순위를 만듭니다.</p>
                  <p><span className="font-medium text-[color:var(--foreground-strong)]">시간</span> {mode === "second" ? "18분 안팎" : "12분 안팎"}</p>
                  <p><span className="font-medium text-[color:var(--foreground-strong)]">다음</span> 학습 노트 · 복습으로 이어집니다.</p>
                </div>
              </div>
              <CardTitle>오늘 한 것 올리기</CardTitle>
              <CardDescription className="max-w-[66ch]">
                사진, PDF, 텍스트 중 하나로 남기면 학습 노트와 다음 행동으로 정리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">
              <TodaySubjectSelector
                mode={mode}
                selectedSubject={selectedSubject}
                primaryHref={modeCaptureHref}
                primaryLabel="오늘 한 것 올리기"
                quietPrimary
                captureHref={modeCaptureHref}
                reviewHref={mode === "second" ? secondReviewHref : firstReviewHref}
                notesHref={mode === "second" ? secondNotesHref : firstNotesHref}
                setHref={mode === "first" ? firstSetHref : undefined}
                studyLogHref={mode === "first" ? firstStudyLogHref : undefined}
              />
              <details className="quiet-disclosure rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]" data-s224v-secondary-diagnostics>
                <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">왜 입력부터 시작하나요?</summary>
                <div className="border-t border-[color:var(--border-subtle)] px-4 py-3 text-xs leading-6 text-[color:var(--muted)]">
                  입력이 아직 없으면 우선순위가 흐려질 수 있습니다. 오늘 한 것 1개만 저장하면 학습 노트, 복습, 오늘 할 일이 같은 흐름으로 이어집니다.
                </div>
              </details>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] shadow-none" data-s224v-today-priority-card>
            <CardHeader className="space-y-3 p-4 sm:p-6">
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--brand-050)] px-4 py-3">
                <p className="text-caption text-[color:var(--muted)]">오늘 할 일</p>
                <p className="mt-1 text-body-lg text-[color:var(--foreground-strong)]">{todayPlan.primaryTask}</p>
                {todayPlanTasks[0]?.source_label === "Problem Snap 기반" ? (
                  <p className="mt-1 text-xs text-[color:var(--muted)]">Problem Snap 기반</p>
                ) : null}
              </div>
              <CardTitle>{primaryHeading}</CardTitle>
              <CardDescription className="max-w-[66ch]">{primaryDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm">
                <p className="text-xs text-[color:var(--muted)]">일일 흐름</p>
                <p className="text-[color:var(--foreground-strong)]">{dailyConsistencyCopy}</p>
                <p className="text-xs text-[color:var(--muted)]">과목</p>
                <p className="text-[color:var(--foreground-strong)]">{selectedQueueItem?.subjectLabel ?? selectedSubject}</p>
                <p className="mt-2 text-xs text-[color:var(--muted)]">가장 큰 약점</p>
                <p className="text-[color:var(--foreground-strong)]">{diagnosedWeakPoint}</p>
                <p className="mt-2 text-xs text-[color:var(--muted)]">다음 행동</p>
                <p className="text-[color:var(--foreground-strong)]">{nextAction}</p>
                <p className="mt-2 text-xs text-[color:var(--muted)]">왜 지금 중요한가</p>
                <p className="text-[color:var(--foreground-strong)]">{todayPlan.reason}</p>
                <div className="mt-3 grid gap-2 border-t border-[color:var(--border-hairline)] pt-3 text-xs sm:grid-cols-2">
                  <div>
                    <p className="text-[color:var(--muted)]">예상 소요 시간</p>
                    <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">{todayPlan.estimatedDuration}</p>
                  </div>
                  <div>
                    <p className="text-[color:var(--muted)]">끝나면 이어갈 곳</p>
                    <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">학습 노트 · 복습 · 오늘 할 일</p>
                  </div>
                </div>
              </div>

              <div className="today-priority-card rounded-[var(--radius-md)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] px-4 py-3" data-today-plan-primary-surface data-visible-primary-task-cap={TODAY_PLAN_MAX_PRIMARY_TASKS}>
                <p className="text-caption text-[color:var(--ink-muted)]">오늘의 우선순위 · 최대 3개</p>
                <div className="mt-3 space-y-3">
                  {todayPlanTasks.length === 0 ? (
                    <div className="space-y-1 text-xs text-[color:var(--ink-muted)]" data-today-plan-empty-state>
                      <p className="font-medium text-[color:var(--foreground-strong)]">오늘 할 일이 아직 없습니다.</p>
                      <p>오늘 한 것을 하나 올리면 다음 행동이 만들어집니다.</p>
                      <Link href={modeCaptureHref} className="pt-1 font-medium text-[color:var(--ink-primary)] underline underline-offset-2">오늘 한 것 올리기</Link>
                    </div>
                  ) : (
                    visibleTodayPlanTasks.map((task, index) => (
                      <article key={task.itemId} className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3" data-today-plan-primary-task>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium leading-6 text-[color:var(--foreground-strong)]">{index + 1}. {task.title}</p>
                              {task.display_source_label ? (
                                <span className="rounded-full border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--ink-muted)]">{task.display_source_label}</span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{task.subject} · {task.estimated_minutes}분</p>
                            <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]"><span className="font-medium text-[color:var(--foreground-strong)]">왜 지금?</span> {task.display_reason ?? task.reason}</p>
                          </div>
                          <Link href={resolveTaskHref(task)} className="inline-flex min-h-10 w-full shrink-0 items-center justify-center rounded-full bg-[color:var(--foreground-strong)] px-3 py-2 text-xs font-medium text-white sm:w-auto">
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
              {(() => {
                const firstTodayPlanTask = todayPlanTasks[0] ?? null;
                return firstTodayPlanTask?.created_from_capture && firstTodayPlanTask.source_label !== "Problem Snap 기반" ? (
                  <details className="quiet-disclosure rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]" data-secondary-action-surface="capture-derived-context" data-s224v-secondary-diagnostics>
                    <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">다른 작업 · 오늘 기록 근거 보기</summary>
                    <div className="border-t border-[color:var(--border-subtle)] px-4 py-3">
                      <p className="text-xs text-[color:var(--foreground-strong)]">{firstTodayPlanTask.title}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted)]">이유: {firstTodayPlanTask.reason}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted)]">다음 행동: {firstTodayPlanTask.one_next_action}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted)]">{firstTodayPlanTask.display_source_label ?? firstTodayPlanTask.source_label ?? "학습 노트에서 생성됨"}</p>
                    </div>
                  </details>
                ) : null;
              })()}

              <TodaySubjectSelector
                mode={mode}
                selectedSubject={selectedSubject}
                primaryHref={primaryHref}
                primaryLabel={homeState === "start_today_task" ? primaryCtaLabel : homePrimaryCta}
                quietPrimary
                isFirstSetStart={isFirstSetStart}
                captureHref={modeCaptureHref}
                reviewHref={mode === "second" ? secondReviewHref : firstReviewHref}
                notesHref={mode === "second" ? secondNotesHref : firstNotesHref}
                setHref={mode === "first" ? firstSetHref : undefined}
                studyLogHref={mode === "first" ? firstStudyLogHref : undefined}
              />
              {mode === "first" && recentStudyLog ? (
                <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-4 py-3 text-sm">
                  <p className="text-[color:var(--foreground-strong)]">
                    최근 입력: {recentStudyLog.subject} {recentStudyLog.sourceLabel} / 확신도 {recentStudyLog.confidence}
                  </p>
                  {recentStudyTaxonomyLine ? <p className="mt-1 text-xs text-[color:var(--muted)]">{recentStudyTaxonomyLine}</p> : null}
                  <p className="mt-1 text-xs text-[color:var(--muted)]">입력을 기준으로 다음 복습 범위를 정리했습니다.</p>
                </div>
              ) : null}
              {latestProblemSnapSignal && todayPlanTasks[0]?.source_label !== "Problem Snap 기반" ? (
                <details className="quiet-disclosure rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]" data-secondary-action-surface="problem-snap" data-s224v-secondary-diagnostics>
                  <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">다른 작업 · Problem Snap 신호 보기</summary>
                  <div className="border-t border-[color:var(--border-subtle)] px-4 py-3">
                    <p className="text-xs font-medium text-[color:var(--ink-primary)]">Problem Snap</p>
                    <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">{latestProblemSnapSignal.subject}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">다음 행동: {latestProblemSnapSignal.nextTask}</p>
                    <Link href={problemSnapSignalCta.href} className="mt-2 inline-flex text-xs font-medium text-[color:var(--ink-primary)] underline underline-offset-2">
                      {problemSnapSignalCta.label}
                    </Link>
                  </div>
                </details>
              ) : null}
              {homeState === "overdue_recovery" ? (
                <div className="rounded-[var(--radius-md)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] px-4 py-3 text-xs text-[color:var(--foreground-strong)]">
                  <p>밀린 걸 전부 따라잡으려 하지 마세요.</p>
                  <p className="mt-1">오늘은 가장 작은 것 1개만 복구합니다.</p>
                  <p className="mt-1">새 범위보다 반복 실수 하나를 줄이는 게 우선입니다.</p>
                </div>
              ) : null}
              <details className="quiet-disclosure rounded-[var(--radius-md)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)]" data-s224v-secondary-diagnostics>
                <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">우선순위 근거 보기</summary>
                <div className="grid gap-3 border-t border-[color:var(--border-subtle)] p-4 lg:grid-cols-3">
                  <div>
                    <p className="text-xs text-[color:var(--muted)]">선택 이유</p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-strong)]">{todayPlan.reason}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[color:var(--muted)]">예상 소요 시간</p>
                    <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">{todayPlan.estimatedDuration}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[color:var(--muted)]">진단된 약점</p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-strong)]">{diagnosedWeakPoint}</p>
                  </div>
                </div>
                <div className="border-t border-[color:var(--border-subtle)] px-4 py-3">
                  <p className="text-xs text-[color:var(--muted)]">반복 신호</p>
                  <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">{repeatedSignalLine}</p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">오늘은 이 약점 하나만 줄입니다.</p>
                </div>
              </details>
            </CardContent>
          </Card>
        )}

        <details
          className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]"
          data-learning-loop-summary
          data-s224v-secondary-diagnostics
        >
          <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium text-[color:var(--foreground-strong)] sm:px-5">
            학습 루프 요약 보기
          </summary>
          <div className="space-y-5 border-t border-[color:var(--border-subtle)] px-4 py-5 sm:px-5">
            <section className="space-y-3 text-xs" data-loop-review-summary>
              <p className="text-[color:var(--muted)]">복습은 대기/진행 필요/완료 흐름으로만 관리합니다. 예측 점수나 합격 여부는 보여주지 않습니다. 추천은 저장된 학습 신호 기반입니다.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-3 py-3">
                  <p className="font-medium text-[color:var(--foreground-strong)]">진행 필요</p>
                  {queue.filter((item) => isOverdueDueAt(item.dueAt)).length === 0 ? <p className="mt-1 text-[color:var(--muted)]">오늘 바로 처리할 항목이 없습니다.</p> : queue.filter((item) => isOverdueDueAt(item.dueAt)).slice(0, 3).map((item) => <p key={`due-${item.queueId}`} className="mt-1 text-[color:var(--muted)]">{item.subjectLabel} · {item.reviewReason}</p>)}
                </div>
                <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-3 py-3">
                  <p className="font-medium text-[color:var(--foreground-strong)]">대기</p>
                  {queue.filter((item) => !isOverdueDueAt(item.dueAt)).length === 0 ? <p className="mt-1 text-[color:var(--muted)]">예정된 복습이 없습니다.</p> : queue.filter((item) => !isOverdueDueAt(item.dueAt)).slice(0, 3).map((item) => <p key={`pending-${item.queueId}`} className="mt-1 text-[color:var(--muted)]">{item.subjectLabel} · {item.problemTitle}</p>)}
                </div>
                <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-3 py-3">
                  <p className="font-medium text-[color:var(--foreground-strong)]">완료</p>
                  <p className="mt-1 text-[color:var(--muted)]">완료 처리하기 후 완료한 항목은 오늘 할 일에서 사라지고 복습 이력에 남습니다.</p>
                </div>
              </div>
              {latestProblemSnapSignal ? (
                <p className="text-[color:var(--muted)]">Problem Snap 기반 항목도 저장 후 오늘 할 일에 반영됩니다. {problemSnapSignalCta.label}</p>
              ) : null}
            </section>

            <section className="grid gap-3 text-sm lg:grid-cols-3" data-loop-status-summary>
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-4">
                <p className="text-[color:var(--muted)]">현재 모드</p>
                <p className="mt-1 text-[color:var(--foreground-strong)]">{config.label}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-4">
                <p className="text-[color:var(--muted)]">우선 과목</p>
                <p className="mt-1 text-[color:var(--foreground-strong)]">
                  {mode === "first"
                    ? APPRAISAL_FIRST_SUBJECTS.join(", ")
                    : profile?.preferredSubjects.filter((subject) => (config.subjects as readonly string[]).includes(subject)).join(", ") ||
                      selectedSubject}
                </p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-4">
                <p className="text-[color:var(--muted)]">오늘 다시 볼 항목</p>
                <p className="mt-1 tabular-nums text-[color:var(--foreground-strong)]">{queue.length}개</p>
              </div>
            </section>

            <section className="space-y-2 text-sm" data-loop-signal-summary>
              <p className="font-medium text-[color:var(--foreground-strong)]">누적 신호</p>
              <p className="text-[color:var(--muted)]">누적 {learningSignal?.totalCount ?? 0}건 · 최근 {learningSignal?.latestEventAt ? new Date(learningSignal.latestEventAt).toLocaleDateString("ko-KR") : "-"}</p>
              <p className="text-[color:var(--muted)]">주요 과목: {(learningSignal?.topSubjects ?? []).join(", ") || "-"}</p>
              <p className="text-[color:var(--muted)]">주요 태그: {(learningSignal?.topTags ?? []).join(", ") || "-"}</p>
            </section>

            <section className="space-y-3" data-loop-weekly-summary>
              <h3 className="text-sm font-medium text-[color:var(--foreground-strong)]">이번 주 학습 정리</h3>
              {weekly ? (
                <>
                  <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">{weekly.summaryText}</p>
                  <Link href={`/app/weekly?mode=${mode}`}>
                    <Button type="button" variant="outline">
                      주간 정리 보기
                    </Button>
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
                  <p className="text-sm text-[color:var(--muted)]">오늘 푼 문제나 답안 일부를 정리하면 첫 학습 노트가 만들어집니다.</p>
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

      <ReviewOsFeedbackButton route="/app" pageContext={{ section: "today", firstUse, mode }} />
    </div>
  );
}
