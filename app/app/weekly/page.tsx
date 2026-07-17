import Link from "next/link";

import {
  V3ActionLink,
  V3QuietDisclosure,
  V3RouteFrame,
  V3RouteHeader,
  V3SectionHeader,
  V3Surface,
} from "@/components/learner";
import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { ReviewOsAccessState } from "@/components/review-os/review-os-access-state";
import {
  CoreRouteReadDegradedNotice,
  CoreRouteReadEmptyShell,
  CoreRouteReadErrorPage,
} from "@/components/review-os/core-route-read-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import {
  countDegradedCoreRouteReads,
  resolveEssentialCoreRouteRead,
  resolveOptionalCoreRouteRead,
} from "@/lib/review-os/core-route-read-outcome";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import { buildPersonalWeaknessProfile } from "@/lib/review-os/weakness-diagnostics";
import type { WeeklyPlanTask } from "@/lib/review-os/types";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsWeeklyPage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  const { session, access, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/weekly", modeParam));
  if (access.status !== "allowed") return <ReviewOsAccessState access={access} embedded />;
  if (!session.userId || !session.email) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const planRead = await resolveEssentialCoreRouteRead("weekly_plan", () =>
    reviewOsService.getWeeklyPlan(session.userId!, session.email!, mode),
  );
  if (planRead.status !== "ready") {
    return <CoreRouteReadErrorPage surface="weekly" />;
  }
  const plan = planRead.value;
  const [learningSignalSummaryRead, learningSignalEventsRead, focusRead] = await Promise.all([
    resolveOptionalCoreRouteRead<
      Awaited<ReturnType<typeof reviewOsService.getLearningSignalSummary>> | null
    >(
      "weekly_learning_signal_summary",
      () => reviewOsService.getLearningSignalSummary(session.userId!, session.email!, mode),
      () => null,
    ),
    resolveOptionalCoreRouteRead(
      "weekly_learning_signal_events",
      () => reviewOsService.listLearningSignalEvents(session.userId!, session.email!, mode, 10),
      () => [],
    ),
    resolveOptionalCoreRouteRead<
      Pick<Awaited<ReturnType<typeof reviewOsService.getTodayFocus>>, "queue">
    >(
      "weekly_focus",
      () => reviewOsService.getTodayFocus(session.userId!, session.email!, mode),
      () => ({ queue: [] }),
    ),
  ]);
  const learningSignalSummary = learningSignalSummaryRead.value;
  const learningSignalEvents = learningSignalEventsRead.value;
  const focus = focusRead.value;
  const degradedReadCount = countDegradedCoreRouteReads([
    learningSignalSummaryRead,
    learningSignalEventsRead,
    focusRead,
  ]);
  const inputStartHref = `/app/capture?mode=${mode}`;

  if (plan.tasks.length === 0) {
    return (
      <CoreRouteReadEmptyShell
        surface="weekly"
        mode={mode}
        degradedCount={degradedReadCount}
        includeBrowserLocalRecords={false}
        confirmedEmptyContent={(
          mode === "second" ? (
            <V3Surface tone="subtle" className="space-y-4" labelledBy="weekly-empty-title">
              <h2 id="weekly-empty-title" className="v3-type-section text-[var(--color-text-primary)]">이번 주 계획 시작</h2>
              <p className="v3-type-body text-[var(--color-text-secondary)]">{config.emptyDescription}</p>
              <p className="v3-type-body text-[var(--color-text-primary)]">
                오늘은 답안 1건만 입력해 주간 계획의 기준점을 만듭니다.
              </p>
              <V3ActionLink href={inputStartHref}>{config.primaryCta}</V3ActionLink>
              <span className="sr-only" data-s232f4b-weekly-confirmed-empty />
            </V3Surface>
          ) : (
            <section
              className="space-y-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4"
              aria-label="이번 주 계획 시작 안내"
              data-s232f4b-weekly-confirmed-empty
            >
              <p className="text-sm leading-7 text-[color:var(--muted)]">{config.emptyDescription}</p>
              <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">
                오늘은 오답 1건만 입력해 주간 계획의 기준점을 만듭니다.
              </p>
              <Link
                href={inputStartHref}
                className={buttonVariants({ className: "w-full sm:w-auto" })}
              >
                {config.primaryCta}
              </Link>
            </section>
          )
        )}
      >
        <ReviewOsFeedbackButton
          route="/app/weekly"
          pageContext={{ mode, taskCount: 0, hasRecovery: false, overdueCount: 0 }}
          presentation={mode === "second" ? "v3" : "legacy"}
        />
      </CoreRouteReadEmptyShell>
    );
  }

  const weaknessProfile = buildPersonalWeaknessProfile({
    learningSignalSummary,
    learningSignalEvents,
    reviewQueue: focus.queue ?? [],
    mode,
  });
  const visibleTasks = plan.tasks.slice(0, 3);
  const primaryTask = plan.recovery?.task ?? plan.tasks[0] ?? null;
  const primaryHref = primaryTask ? `/app/review?mode=${mode}` : inputStartHref;

  if (mode === "second") {
    return (
      <V3RouteFrame width="reading" className="space-y-7">
        <V3RouteHeader
          eyebrow="이번 주 우선 작업"
          title="이번 주 2차 실행 계획"
          description={plan.summary}
        />
        <CoreRouteReadDegradedNotice count={degradedReadCount} />

        <V3Surface tone={plan.recovery ? "attention" : "focus"} className="space-y-6">
          <V3SectionHeader
            eyebrow="오늘의 1개"
            title={plan.primaryActionLabel}
            description={plan.recovery?.message ?? "가장 먼저 이어갈 작업 하나를 제시합니다."}
          />

          {plan.recovery ? (
            <div className="border-y border-[var(--color-border-attention)] py-4">
              <p className="v3-type-body text-[var(--color-text-primary)]">
                오늘은 {plan.recovery.task.estimatedDurationMinutes}분짜리 복구 작업 하나만 하세요.
              </p>
              <p className="v3-type-caption mt-1 text-[var(--color-text-attention)]">
                밀린 항목 {plan.recovery.overdueCount}개 중 1개만 먼저 처리합니다.
              </p>
            </div>
          ) : null}

          <div className="divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
            {visibleTasks.map((task) => {
              const actionLabel = task.action === "rewrite" ? "문단 다시쓰기" : task.action === "retry" ? "재시도" : "복습";
              return (
                <article key={task.queueId} className="py-4">
                  <p className="v3-type-caption text-[var(--color-text-secondary)]">
                    우선순위 {task.priorityOrder} · {task.estimatedDurationMinutes}분
                  </p>
                  <h2 className="v3-type-label-strong mt-1 text-[var(--color-text-primary)]">
                    {task.subject} · {actionLabel}
                  </h2>
                  <p className="v3-type-body mt-2 text-[var(--color-text-primary)]">{task.reason}</p>
                  <p className="v3-type-caption mt-2 text-[var(--color-text-secondary)]">목표: {task.target}</p>
                </article>
              );
            })}
          </div>
          {plan.tasks.length > 3 ? (
            <p className="v3-type-caption text-[var(--color-text-secondary)]">
              이번 주 작업은 최대 3개만 먼저 제시합니다. 나머지는 첫 작업 완료 후 자동으로 이어집니다.
            </p>
          ) : null}

          <V3ActionLink href={primaryHref}>
            {plan.recovery ? "복구 작업 시작" : "이번 주 첫 작업 시작"}
          </V3ActionLink>
        </V3Surface>

        <V3QuietDisclosure summary="기록 보기" helper="계획의 근거가 된 보조 기록입니다.">
          <dl className="divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
            <SecondaryRecord label="대기 큐" value={`${plan.secondaryRecords.queueCount}개`} v3 />
            <SecondaryRecord label="밀린 항목" value={`${plan.secondaryRecords.overdueCount}개`} v3 />
            <SecondaryRecord label="최근 오답(14일)" value={`${plan.secondaryRecords.recentWrongCount}개`} v3 />
          </dl>
        </V3QuietDisclosure>

        <V3Surface density="compact" tone="subtle">
          <V3SectionHeader
            title="이번 주 반복 약점"
            description={weaknessProfile.repeatedGaps[0]
              ? `${weaknessProfile.repeatedGaps[0].label} 신호가 반복됩니다.`
              : "반복 신호를 수집 중입니다."}
          />
        </V3Surface>

        <ReviewOsFeedbackButton
          route="/app/weekly"
          pageContext={{
            mode,
            taskCount: plan.tasks.length,
            hasRecovery: Boolean(plan.recovery),
            overdueCount: plan.secondaryRecords.overdueCount,
          }}
          presentation="v3"
        />
      </V3RouteFrame>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      <CoreRouteReadDegradedNotice count={degradedReadCount} />
      <Card className="border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-none">
        <CardHeader className="space-y-3 p-4 sm:p-6">
          <div className="rounded-[var(--radius-md)] border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] px-4 py-3">
            <p className="text-caption text-[color:var(--brand-800)]">이번 주 우선 작업</p>
            <p className="mt-1 text-body-lg text-[color:var(--foreground-strong)]">{plan.primaryActionLabel}</p>
          </div>
          <CardTitle>이번 주 1차 실행 계획</CardTitle>
          <CardDescription>{plan.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-4 pt-0 sm:p-6 sm:pt-0">
          {plan.recovery ? (
            <div className="rounded-[var(--radius-md)] border border-[color:var(--cue-risk)] bg-[color:var(--cue-risk-bg)] p-4">
              <p className="text-sm text-[color:var(--foreground-strong)]">{plan.recovery.message}</p>
              <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">
                오늘은 {plan.recovery.task.estimatedDurationMinutes}분짜리 복구 작업 하나만 하세요.
              </p>
              <p className="mt-2 text-xs text-[color:var(--muted)]">
                밀린 항목 {plan.recovery.overdueCount}개 중 1개만 먼저 처리합니다.
              </p>
            </div>
          ) : null}

          <div className="space-y-3">
            {visibleTasks.map((task) => (
              <WeeklyTaskItem key={task.queueId} task={task} />
            ))}
            {plan.tasks.length > 3 ? (
              <p className="text-xs leading-5 text-[color:var(--muted)]">
                이번 주 작업은 최대 3개만 먼저 제시합니다. 나머지는 첫 작업 완료 후 자동으로 이어집니다.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={primaryHref} className="w-full sm:w-auto">
              <Button type="button" className="w-full sm:w-auto">
                {plan.recovery ? "복구 작업 시작" : "이번 주 첫 작업 시작"}
              </Button>
            </Link>
            <Link href={`/app/review?mode=${mode}`} className="text-xs text-[color:var(--muted)] underline-offset-2 hover:underline">
              다른 작업 보기
            </Link>
          </div>
        </CardContent>
      </Card>

      <details className="group rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
        <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium text-[color:var(--foreground-strong)] sm:px-5">
          기록 보기 (보조 정보)
        </summary>
        <div className="grid gap-3 border-t border-[color:var(--border-subtle)] px-4 py-5 text-sm sm:px-5 lg:grid-cols-3">
          <SecondaryRecord label="대기 큐" value={`${plan.secondaryRecords.queueCount}개`} />
          <SecondaryRecord label="밀린 항목" value={`${plan.secondaryRecords.overdueCount}개`} />
          <SecondaryRecord label="최근 오답(14일)" value={`${plan.secondaryRecords.recentWrongCount}개`} />
        </div>
      </details>
      <Card className="border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] shadow-none">
        <CardHeader className="space-y-2 p-4 sm:p-5">
          <CardTitle className="text-base sm:text-lg">이번 주 반복 약점</CardTitle>
          <CardDescription>
            {weaknessProfile.repeatedGaps[0]
              ? `${weaknessProfile.repeatedGaps[0].label} 신호가 반복됩니다.`
              : "반복 신호를 수집 중입니다."}
          </CardDescription>
        </CardHeader>
      </Card>

      <ReviewOsFeedbackButton
        route="/app/weekly"
        pageContext={{
          mode,
          taskCount: plan.tasks.length,
          hasRecovery: Boolean(plan.recovery),
          overdueCount: plan.secondaryRecords.overdueCount,
        }}
        presentation="legacy"
      />
    </div>
  );
}

function WeeklyTaskItem({ task }: { task: WeeklyPlanTask }) {
  const actionLabel = task.action === "rewrite" ? "문단 다시쓰기" : task.action === "retry" ? "재시도" : "복습";
  return (
    <article className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-caption text-[color:var(--muted)]">우선순위 {task.priorityOrder}</p>
          <p className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">
            {task.subject} · {actionLabel}
          </p>
        </div>
        <span className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-2 py-1 text-xs text-[color:var(--muted)]">
          {task.estimatedDurationMinutes}분
        </span>
      </div>
      <p className="mt-2 text-sm leading-7 text-[color:var(--foreground-strong)]">{task.reason}</p>
      <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">목표: {task.target}</p>
    </article>
  );
}

function SecondaryRecord({ label, value, v3 = false }: { label: string; value: string; v3?: boolean }) {
  return (
    <div className={v3 ? "flex items-center justify-between gap-4 py-3" : "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4"}>
      <p className="text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}
