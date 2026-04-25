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
  const primaryTask = plan.recovery?.task ?? plan.tasks[0] ?? null;
  const primaryHref = primaryTask ? `/app/review?mode=${mode}` : `/app/capture?mode=${mode}`;

  return (
    <div className="space-y-6">
      <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
        <CardHeader className="space-y-3">
          <div className="rounded-2xl border border-[color:var(--cue-risk)] bg-[color:var(--cue-risk-bg)] px-4 py-3">
            <p className="text-caption text-[color:var(--cue-risk)]">이번 주 우선 작업</p>
            <p className="mt-1 text-body-lg text-[color:var(--foreground-strong)]">{plan.primaryActionLabel}</p>
          </div>
          <CardTitle>{mode === "second" ? "이번 주 2차 실행 계획" : "이번 주 1차 실행 계획"}</CardTitle>
          <CardDescription>{plan.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {plan.recovery ? (
            <div className="rounded-2xl border border-[color:var(--cue-risk)] bg-[color:var(--cue-risk-bg)] p-4">
              <p className="text-sm text-[color:var(--foreground-strong)]">{plan.recovery.message}</p>
              <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">
                오늘은 {plan.recovery.task.estimatedDurationMinutes}분짜리 복구 작업 하나만 하세요.
              </p>
              <p className="mt-2 text-xs text-[color:var(--muted)]">
                밀린 항목 {plan.recovery.overdueCount}개 중 1개만 먼저 처리합니다.
              </p>
            </div>
          ) : null}

          {plan.tasks.length > 0 ? (
            <div className="space-y-3">
              {plan.tasks.map((task) => (
                <WeeklyTaskItem key={task.queueId} task={task} />
              ))}
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4">
              <p className="text-sm leading-7 text-[color:var(--muted)]">{config.emptyDescription}</p>
              <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">오늘은 오답 1건만 입력해 주간 계획의 기준점을 만듭니다.</p>
              <Link href={`/app/capture?mode=${mode}`}>
                <Button type="button">{config.primaryCta}</Button>
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={primaryHref}>
              <Button type="button">{plan.recovery ? "복구 작업 시작" : "이번 주 첫 작업 시작"}</Button>
            </Link>
            <Link href={`/app/review?mode=${mode}`} className="text-xs text-[color:var(--muted)] underline-offset-2 hover:underline">
              다른 작업 보기
            </Link>
          </div>
        </CardContent>
      </Card>

      <details className="group rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-[color:var(--foreground-strong)]">
          기록 보기 (보조 정보)
        </summary>
        <div className="grid gap-3 border-t border-[color:var(--border-subtle)] px-5 py-5 text-sm sm:grid-cols-3">
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
    <article className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-caption text-[color:var(--muted)]">우선순위 {task.priorityOrder}</p>
          <p className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">
            {task.subject} · {actionLabel}
          </p>
        </div>
        <span className="rounded-full border border-[color:var(--border-subtle)] px-2 py-1 text-[11px] text-[color:var(--muted)]">
          {task.estimatedDurationMinutes}분
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-strong)]">{task.reason}</p>
      <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">목표: {task.target}</p>
    </article>
  );
}

function SecondaryRecord({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-subtle)] p-4">
      <p className="text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}
