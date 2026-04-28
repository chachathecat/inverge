import Link from "next/link";

import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import type { WeeklyPlanTask } from "@/lib/review-os/types";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsWeeklyPage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/weekly", modeParam));
  if (!session.userId || !session.email) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const plan = await reviewOsService.getWeeklyPlan(session.userId, session.email, mode);
  const visibleTasks = plan.tasks.slice(0, 3);
  const primaryTask = plan.recovery?.task ?? plan.tasks[0] ?? null;
  const inputStartHref = mode === "second" ? `/app/write?mode=${mode}` : `/app/capture?mode=${mode}`;
  const primaryHref = primaryTask ? `/app/review?mode=${mode}` : inputStartHref;

  return (
    <div className="space-y-6 sm:space-y-7">
      <Card className="border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-none">
        <CardHeader className="space-y-3 p-4 sm:p-6">
          <div className="rounded-[var(--radius-md)] border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] px-4 py-3">
            <p className="text-caption text-[color:var(--brand-800)]">이번 주 우선 작업</p>
            <p className="mt-1 text-body-lg text-[color:var(--foreground-strong)]">{plan.primaryActionLabel}</p>
          </div>
          <CardTitle>{mode === "second" ? "이번 주 2차 실행 계획" : "이번 주 1차 실행 계획"}</CardTitle>
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

          {visibleTasks.length > 0 ? (
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
          ) : (
            <div className="space-y-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4">
              <p className="text-sm leading-7 text-[color:var(--muted)]">{config.emptyDescription}</p>
              <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">
                {mode === "second"
                  ? "오늘은 답안 1건만 입력해 주간 계획의 기준점을 만듭니다."
                  : "오늘은 오답 1건만 입력해 주간 계획의 기준점을 만듭니다."}
              </p>
              <Link href={inputStartHref}>
                <Button type="button">{config.primaryCta}</Button>
              </Link>
            </div>
          )}

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

      <ReviewOsFeedbackButton
        route="/app/weekly"
        pageContext={{
          mode,
          taskCount: plan.tasks.length,
          hasRecovery: Boolean(plan.recovery),
          overdueCount: plan.secondaryRecords.overdueCount,
        }}
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
        <span className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-2 py-1 text-[11px] text-[color:var(--muted)]">
          {task.estimatedDurationMinutes}분
        </span>
      </div>
      <p className="mt-2 text-sm leading-7 text-[color:var(--foreground-strong)]">{task.reason}</p>
      <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">목표: {task.target}</p>
    </article>
  );
}

function SecondaryRecord({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4">
      <p className="text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}
