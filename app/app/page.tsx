import Link from "next/link";
import { redirect } from "next/navigation";

import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { ClosedBetaBanner } from "@/components/shared/closed-beta-banner";
import { TodayFirstSubjectSelector } from "@/components/review-os/today-first-subject-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyCommandCard, EvidenceLine, OneActionFooter, QuietDetails } from "@/components/review-os/minimal-study-system";
import { getModeConfig, normalizeSubjectForMode, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { DEFAULT_DAILY_STUDY_ACTIVITY, reviewOsService } from "@/lib/review-os/service";
import { buildNotebookPreview } from "@/lib/review-os/study-note";
import { APPRAISAL_FIRST_SUBJECTS } from "@/lib/review-os/types";
import { buildTodayPlanCard, type TodayPlanActionKind } from "@/lib/review-os/today-plan";
import { buildTodayPlanTasks, type TodayPlanTaskType } from "@/lib/review-os/today-plan-engine";
import { buildPersonalWeaknessProfile } from "@/lib/review-os/weakness-diagnostics";
import { isOverdueDueAt, resolveDailyStudyState } from "@/lib/review-os/daily-study-state";

const FIRST_MODE_INPUT_OPTIONS = [
  {
    title: "1차 오답 기록",
    description: "틀린 문제, 내가 고른 답, 틀린 이유를 남기면 다시 볼 목록이 만들어집니다.",
    hrefLabel: "오답 기록 시작",
    hrefKey: "capture",
  },
  {
    title: "세트 풀이 시작",
    description: "과목과 문항 수를 정하고 정답/내 답을 입력하면 다음 재시도 순서가 정리됩니다.",
    hrefLabel: "세트 풀이 열기",
    hrefKey: "set",
  },
  {
    title: "오늘 공부 기록",
    description: "본 범위와 어려웠던 점을 남기면 다음 복습 신호가 정리됩니다.",
    hrefLabel: "공부 기록 남기기",
    hrefKey: "study-log",
  },
] as const;

const TASK_TYPE_LABELS: Record<TodayPlanTaskType, string> = {
  first_ox_retry: "5분 재풀이",
  concept_review: "개념 1개 회상",
  cloze_review: "빈칸 회상",
  accounting_template_retry: "계산 틀 재확인",
  second_answer_rewrite: "문단 다시쓰기",
  ocr_confirmation: "OCR 확인",
  note_cleanup: "노트 정리",
};

function resolveTaskTypeLabel(taskType: TodayPlanTaskType) {
  return TASK_TYPE_LABELS[taskType];
}

const SECOND_MODE_INPUT_OPTIONS = [
  {
    title: "2차 답안 작성",
    description: "내 답안을 먼저 작성하면 비교할 기준이 선명해집니다.",
    hrefLabel: "답안 작성 시작",
    hrefKey: "write",
  },
  {
    title: "기준 답안과 비교",
    description: "답안 작성 후 비교로 이어집니다. 보강할 간극을 정리합니다.",
    hrefLabel: "비교 기록 보기",
    hrefKey: "items",
  },
  {
    title: "문단 다시쓰기",
    description: "비교 이후 진행됩니다. 간극 하나를 골라 문단을 다시 씁니다.",
    hrefLabel: "다시쓰기 큐 열기",
    hrefKey: "review",
  },
] as const;

type PageProps = {
  searchParams?: Promise<{ mode?: string; subject?: string; saved?: string }>;
};

export default async function ReviewOsDashboardPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const modeParam = query?.mode;
  const subjectParam = query?.subject;
  const savedParam = query?.saved;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app", modeParam));
  if (!session.userId || !session.email) return null;

  if (!profile && !modeParam) redirect("/app/onboarding");
  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const [focus, weekly, allItems, learningSignal, learningSignalEvents, dailyActivity] = await Promise.all([
    reviewOsService.getTodayFocus(session.userId, session.email, mode),
    reviewOsService.getWeeklySummary(session.userId, session.email),
    reviewOsService.listWrongAnswerItems(session.userId, session.email, 12),
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
      ? "오늘 한 것 하나만 올리세요"
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
  const todayPlanTasks = buildTodayPlanTasks({
    mode,
    queue,
    items,
    learningSignals: learningSignalEvents,
    repeatedGaps: weaknessProfile.repeatedGaps,
    riskLevel: weaknessProfile.riskLevel,
  });
  const nextAction = focus.nextAction ?? selectedQueueItem?.reviewReason ?? config.nextActionFallback;
  const isFirstSetStart = mode === "first" && focus.nextActionType === "capture_now";
  const selectedFirstSubject = normalizeSubjectForMode(subjectParam, "first");
  const firstSetHref = `/app/sets?mode=first&subject=${encodeURIComponent(selectedFirstSubject)}`;
  const firstCaptureHref = `/app/capture?mode=first&subject=${encodeURIComponent(selectedFirstSubject)}`;
  const defaultPrimaryHref = isFirstSetStart ? firstSetHref : `/app/session?mode=${mode}`;
  const secondaryHref = mode === "second" ? `/app/items?mode=${mode}` : `/app/review?mode=${mode}`;

  const resolveTodayPlanHref = (actionKind: TodayPlanActionKind) => {
    if (actionKind === "first_capture") return firstCaptureHref;
    if (actionKind === "first_set") return firstSetHref;
    if (actionKind === "second_write") return "/app/write?mode=second";
    if (actionKind === "second_review") return "/app/review?mode=second";
    if (actionKind === "second_items") return "/app/items?mode=second";
    return `/app/session?mode=first`;
  };
  const resolveTaskHref = (hrefKind: (typeof todayPlanTasks)[number]["primary_cta"]["hrefKind"]) => {
    if (hrefKind === "capture") return mode === "second" ? "/app/capture?mode=second" : firstCaptureHref;
    if (hrefKind === "write") return "/app/write?mode=second";
    if (hrefKind === "items") return `/app/items?mode=${mode}`;
    if (hrefKind === "review") return `/app/review?mode=${mode}`;
    if (hrefKind === "first_ox") return "/app/first/ox";
    if (hrefKind === "calculator_template") return "/app/calculator?mode=first&context=accounting";
    return `/app/session?mode=${mode}`;
  };

  const primaryHref = todayPlan.hasPlan ? resolveTodayPlanHref(todayPlan.actionKind) : defaultPrimaryHref;
  const primaryCtaLabel = todayPlan.ctaLabel;
  const diagnosedWeakPoint = selectedQueueItem?.mistakeType ?? (items[0] ? buildNotebookPreview(items[0]).weakPoint : config.emptyTitle);
  const notebookPreview = items.slice(0, 3).map((item) => buildNotebookPreview(item));
  const shouldShowFirstSubjectSelector = mode === "first" && isFirstSetStart;
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
      ? { label: "Answer Review로 검토", href: `/answer-review?mode=${mode}` }
      : { label: "다시 풀기", href: `/problem-snap?mode=${mode}` };
  const inputOptions =
    mode === "first"
      ? FIRST_MODE_INPUT_OPTIONS.map((option) => ({
          ...option,
          href:
            option.hrefKey === "set"
              ? firstSetHref
              : option.hrefKey === "capture"
                ? firstCaptureHref
                : `/app/study-log?mode=first&subject=${encodeURIComponent(selectedFirstSubject)}`,
        }))
      : SECOND_MODE_INPUT_OPTIONS.map((option) => ({
          ...option,
          href:
            option.hrefKey === "write"
              ? "/app/write?mode=second"
              : option.hrefKey === "items"
                ? "/app/items?mode=second"
                : "/app/review?mode=second",
        }));

  return (
    <div className="space-y-7 md:space-y-8">
      <ClosedBetaBanner />
      <DailyCommandCard title="오늘은 이것만 합니다." description="오늘 공부 흔적을 올리면 약점 1개와 다음 행동 1개로 정리합니다.">
        <QuietDetails>
          <p>채점 확정이 아니라, 다음 행동을 정리하는 학습 운영 도구입니다.</p>
        </QuietDetails>
      </DailyCommandCard>

      {savedParam ? (
        <section className="rounded-[var(--radius-md)] bg-[color:var(--surfaceQuiet)] px-4 py-4">
          <EvidenceLine>저장 전 직접 확인해 주세요.</EvidenceLine>
          <OneActionFooter>
            <Link href={`/app/items?mode=${mode}`} className="inline-flex rounded-full bg-[color:var(--actionPrimary)] px-4 py-2 text-xs font-medium text-white">
              노트에서 확인
            </Link>
          </OneActionFooter>
        </section>
      ) : null}

      <section className="space-y-4">
        {firstUse ? (
          <Card className="border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] shadow-none">
            <CardHeader className="space-y-3 p-4 sm:p-6">
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--brand-050)] px-4 py-3">
                <p className="text-caption text-[color:var(--muted)]">처음이라면</p>
                <p className="mt-1 text-body-lg text-[color:var(--foreground-strong)]">
                  {mode === "first"
                    ? "오답 하나만 남기면 오늘 할 일과 노트가 만들어집니다."
                    : "답안 하나를 남기면 보강할 문단과 오늘 할 일이 정리됩니다."}
                </p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">입력 1개 남기기 → 오늘 할 일 생성 → 노트에 누적</p>
              </div>
              <CardTitle>오늘 한 것 하나만 올리세요</CardTitle>
              <CardDescription className="max-w-[66ch]">
                사진, PDF, 텍스트를 올리면 오답노트와 다음 행동으로 정리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">
              <Link href={mode === "second" ? "/app/capture?mode=second" : inputOptions[0].href} className="w-full sm:w-auto">
                <Button type="button" className="w-full sm:w-auto">
                  오늘 한 것 올리기
                </Button>
              </Link>
              <details className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
                <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">다른 작업 보기</summary>
                <div className="grid gap-2.5 border-t border-[color:var(--border-subtle)] px-4 py-3">
                {(mode === "second" ? inputOptions : inputOptions.slice(1))
                  .filter((option) => option.href !== (mode === "second" ? "/app/capture?mode=second" : inputOptions[0].href))
                  .map((option) => (
                  <Link
                    key={option.title}
                    href={option.href}
                    className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-4 py-3 transition hover:bg-[color:var(--bg-subtle)]"
                  >
                    <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{option.title}</p>
                    <p className="mt-1 text-xs leading-6 text-[color:var(--muted)]">{option.description}</p>
                  </Link>
                ))}
                </div>
              </details>
              <details className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
                <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">왜 입력부터 시작하나요?</summary>
                <div className="border-t border-[color:var(--border-subtle)] px-4 py-3 text-xs leading-6 text-[color:var(--muted)]">
                  입력이 아직 없으면 우선순위가 흐려질 수 있습니다. 오늘 입력 하나만 남겨 두면 다음 복습과 재시도 순서를 더 편하게 이어갈 수 있습니다.
                </div>
              </details>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] shadow-none">
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
                <p className="text-[color:var(--foreground-strong)]">{selectedQueueItem?.subjectLabel ?? config.subjects[0]}</p>
                <p className="mt-2 text-xs text-[color:var(--muted)]">가장 큰 간극</p>
                <p className="text-[color:var(--foreground-strong)]">{diagnosedWeakPoint}</p>
                <p className="mt-2 text-xs text-[color:var(--muted)]">다음 행동</p>
                <p className="text-[color:var(--foreground-strong)]">{nextAction}</p>
                <p className="mt-2 text-xs text-[color:var(--muted)]">왜 지금 중요한가</p>
                <p className="text-[color:var(--foreground-strong)]">{todayPlan.reason}</p>
              </div>

              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] px-4 py-3">
                <p className="text-caption text-[color:var(--ink-muted)]">오늘의 우선순위</p>
                <div className="mt-3 space-y-3">
                  {todayPlanTasks.length === 0 ? (
                    <div className="space-y-1 text-xs text-[color:var(--ink-muted)]">
                      <p>기록을 하나 저장하면 오늘 할 일이 정리됩니다.</p>
                      <p>공부한 흔적을 하나 올리면 복습 큐도 함께 업데이트됩니다.</p>
                      <Link href={firstCaptureHref} className="pt-1 font-medium text-[color:var(--ink-primary)] underline underline-offset-2">기록 추가하기</Link>
                    </div>
                  ) : (
                    todayPlanTasks.map((task, index) => (
                      <article key={task.itemId} className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-6 text-[color:var(--foreground-strong)]">{index + 1}. {task.title}</p>
                            <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{task.subject} · {task.estimated_minutes}분</p>
                            <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{task.reason}</p>
                          </div>
                          <Link href={resolveTaskHref(task.primary_cta.hrefKind)} className="inline-flex min-h-10 w-full shrink-0 items-center justify-center rounded-full bg-[color:var(--foreground-strong)] px-3 py-2 text-xs font-medium text-white sm:w-auto">
                            {task.primary_cta.label}
                          </Link>
                        </div>
                        <details className="mt-3 rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)]">
                          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-[color:var(--muted)]">세부 내용 보기</summary>
                          <div className="grid gap-2 border-t border-[color:var(--border-hairline)] px-3 py-3 text-xs leading-5 text-[color:var(--muted)]">
                            <p><span className="font-medium text-[color:var(--foreground-strong)]">가장 큰 간극:</span> {task.one_biggest_gap}</p>
                            <p><span className="font-medium text-[color:var(--foreground-strong)]">다음 행동:</span> {task.one_next_action}</p>
                            <p><span className="font-medium text-[color:var(--foreground-strong)]">상태:</span> {task.status === "due" ? "진행 필요" : task.status === "completed" ? "완료" : "대기"}</p>
                            <p><span className="font-medium text-[color:var(--foreground-strong)]">작업:</span> {resolveTaskTypeLabel(task.task_type)}</p>
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
                  <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-4 py-3">
                    <p className="text-xs text-[color:var(--foreground-strong)]">{firstTodayPlanTask.title}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">이유: {firstTodayPlanTask.reason}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">다음 행동: {firstTodayPlanTask.one_next_action}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{firstTodayPlanTask.source_label ?? "오늘 기록 기반"}</p>
                  </div>
                ) : null;
              })()}

              {shouldShowFirstSubjectSelector ? (
                <TodayFirstSubjectSelector
                  selectedSubject={selectedFirstSubject}
                  primaryHref={primaryHref}
                  isFirstSetStart={isFirstSetStart}
                  secondaryHref={secondaryHref}
                  captureHref={firstCaptureHref}
                  setHref={firstSetHref}
                />
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link href={primaryHref} className="w-full sm:w-auto">
                    <Button type="button" className="w-full sm:w-auto">
                      {homeState === "start_today_task" ? primaryCtaLabel : homePrimaryCta}
                    </Button>
                  </Link>
                  <details className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] sm:w-auto">
                    <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">다른 작업 보기</summary>
                    <div className="flex flex-col gap-2 border-t border-[color:var(--border-subtle)] px-4 py-3 text-xs text-[color:var(--muted)]">
                      {mode === "first" ? (
                        <Link
                          href={`/app/study-log?mode=first&subject=${encodeURIComponent(normalizeSubjectForMode(selectedQueueItem?.subjectLabel, "first"))}`}
                          className="underline-offset-2 hover:underline"
                        >
                          공부 기록 입력
                        </Link>
                      ) : null}
                      <Link href={secondaryHref} className="underline-offset-2 hover:underline">
                        {homeState === "post_completion" ? "주간 정리 보기" : config.secondaryCta}
                      </Link>
                      <Link href={`/app/weekly?mode=${mode}`} className="underline-offset-2 hover:underline">
                        주간 정리
                      </Link>
                    </div>
                  </details>
                </div>
              )}
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
                <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-4 py-3">
                  <p className="text-xs font-medium text-[color:var(--ink-primary)]">Problem Snap</p>
                  <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">{latestProblemSnapSignal.subject}</p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">다음 행동: {latestProblemSnapSignal.nextTask}</p>
                  <Link href={problemSnapSignalCta.href} className="mt-2 inline-flex text-xs font-medium text-[color:var(--ink-primary)] underline underline-offset-2">
                    {problemSnapSignalCta.label}
                  </Link>
                </div>
              ) : null}
              {homeState === "overdue_recovery" ? (
                <div className="rounded-[var(--radius-md)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] px-4 py-3 text-xs text-[color:var(--foreground-strong)]">
                  <p>밀린 걸 전부 따라잡으려 하지 마세요.</p>
                  <p className="mt-1">오늘은 가장 작은 것 1개만 복구합니다.</p>
                  <p className="mt-1">새 범위보다 반복 실수 하나를 줄이는 게 우선입니다.</p>
                </div>
              ) : null}
              <details className="rounded-[var(--radius-md)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)]">
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

      <details className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">Review Queue 보기</summary>
        <div className="space-y-3 border-t border-[color:var(--border-subtle)] p-4 text-xs">
          <p className="text-[color:var(--muted)]">복습 큐는 대기/진행 필요/완료 흐름으로만 관리합니다. 예측 점수나 합격 여부는 보여주지 않습니다. 추천은 저장된 학습 신호 기반입니다.</p>
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
              <p className="mt-1 text-[color:var(--muted)]">완료 처리하기 후 완료한 항목은 Today Plan에서 사라지고 복습 이력에 남습니다.</p>
            </div>
          </div>
          {latestProblemSnapSignal ? (
            <p className="text-[color:var(--muted)]">Problem Snap 기반 항목도 저장 후 오늘 할 일에 반영됩니다. {problemSnapSignalCta.label}</p>
          ) : null}
        </div>
      </details>

        <details className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">누적 신호 보기</summary>
          <div className="space-y-2 border-t border-[color:var(--border-subtle)] p-4 text-sm">
            <p>누적 {learningSignal?.totalCount ?? 0}건 · 최근 {learningSignal?.latestEventAt ? new Date(learningSignal.latestEventAt).toLocaleDateString("ko-KR") : "-"}</p>
            <p>주요 과목: {(learningSignal?.topSubjects ?? []).join(", ") || "-"}</p>
            <p>주요 태그: {(learningSignal?.topTags ?? []).join(", ") || "-"}</p>
          </div>
        </details>

        <section className="space-y-3">
          <details className="group rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
            <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium text-[color:var(--foreground-strong)] sm:px-5">
              노트와 주간 흐름 보기
            </summary>
            <div className="space-y-5 border-t border-[color:var(--border-subtle)] px-4 py-5 sm:px-5">
              <div className="grid gap-3 text-sm lg:grid-cols-3">
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
                        config.subjects[0]}
                  </p>
                </div>
                <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-4">
                  <p className="text-[color:var(--muted)]">오늘 다시 볼 항목</p>
                  <p className="mt-1 tabular-nums text-[color:var(--foreground-strong)]">{queue.length}개</p>
                </div>
              </div>

              <Card className="border-[color:var(--border-subtle)] shadow-none">
                <CardHeader>
                  <CardTitle>이번 주 학습 정리</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                </CardContent>
              </Card>

              <Card className="border-[color:var(--border-subtle)] shadow-none">
                <CardHeader>
                  <CardTitle>정리된 기록</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {notebookPreview.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-[color:var(--muted)]">아직 기록이 없습니다.</p>
                      <p className="text-sm text-[color:var(--muted)]">오늘 푼 문제나 답안 일부를 올리면 첫 오답노트를 만들어 드립니다.</p>
                      <Link href={firstCaptureHref} className="inline-flex text-sm font-medium text-[color:var(--foreground-strong)] underline underline-offset-2">오늘 한 것 올리기</Link>
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
                </CardContent>
              </Card>
            </div>
          </details>
        </section>
      </section>

      <ReviewOsFeedbackButton route="/app" pageContext={{ section: "today", firstUse, mode }} />
    </div>
  );
}
