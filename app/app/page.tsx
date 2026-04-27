import Link from "next/link";
import { redirect } from "next/navigation";

import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { TodayFirstSubjectSelector } from "@/components/review-os/today-first-subject-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModeConfig, normalizeSubjectForMode, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { CALCULATOR_WORKFLOWS } from "@/lib/review-os/calculator-workflow";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import { buildNotebookPreview } from "@/lib/review-os/study-note";
import { APPRAISAL_FIRST_SUBJECTS } from "@/lib/review-os/types";

type PageProps = {
  searchParams?: Promise<{ mode?: string; subject?: string }>;
};

export default async function ReviewOsDashboardPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const modeParam = query?.mode;
  const subjectParam = query?.subject;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app", modeParam));
  if (!session.userId || !session.email) return null;

  if (!profile && !modeParam) redirect("/app/onboarding");
  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const [focus, weekly, allItems] = await Promise.all([
    reviewOsService.getTodayFocus(session.userId, session.email, mode),
    reviewOsService.getWeeklySummary(session.userId, session.email),
    reviewOsService.listWrongAnswerItems(session.userId, session.email, 12),
  ]);

  const items = allItems.filter((item) => item.examName === config.label).slice(0, 5);
  const queue = focus.queue.filter((item) => item.examName === config.label);
  const firstUse = items.length === 0;
  const selectedQueueItem = queue.find((item) => item.queueId === focus.sourceQueueId) ?? queue[0] ?? null;
  const nextAction = focus.nextAction ?? selectedQueueItem?.reviewReason ?? config.nextActionFallback;
  const isFirstSetStart = mode === "first" && focus.nextActionType === "capture_now";
  const selectedFirstSubject = normalizeSubjectForMode(subjectParam, "first");
  const firstSetHref = `/app/sets?mode=first&subject=${encodeURIComponent(selectedFirstSubject)}`;
  const firstCaptureHref = `/app/capture?mode=first&subject=${encodeURIComponent(selectedFirstSubject)}`;
  const primaryHref = isFirstSetStart ? firstSetHref : `/app/session?mode=${mode}`;
  const secondaryHref = mode === "second" ? `/app/items?mode=${mode}` : `/app/review?mode=${mode}`;
  const diagnosedWeakPoint = selectedQueueItem?.mistakeType ?? (items[0] ? buildNotebookPreview(items[0]).weakPoint : config.emptyTitle);
  const notebookPreview = items.slice(0, 3).map((item) => buildNotebookPreview(item));
  const calculatorWorkflow = mode === "second" ? CALCULATOR_WORKFLOWS.practice : CALCULATOR_WORKFLOWS.accounting;
  const primaryReason = focus.reason ?? selectedQueueItem?.reviewReason ?? focus.lines[0];
  const estimatedMinutes = focus.estimatedDurationMinutes ?? 25;
  const primaryTaskLabel = focus.primaryTaskLabel ?? (selectedQueueItem ? `${selectedQueueItem.subjectLabel} 복습` : config.nextActionFallback);
  let recentStudyLog: Awaited<ReturnType<typeof reviewOsService.getRecentStudyLog>> | null = null;
  if (mode === "first") {
    try {
      recentStudyLog = await reviewOsService.getRecentStudyLog(session.userId, session.email, "first");
    } catch (error) {
      console.warn("[review-os] failed to load optional recent study log", error);
    }
  }

  return (
    <div className="space-y-7 md:space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-medium tracking-[-0.04em] text-[color:var(--foreground-strong)] sm:text-2xl">
            {config.pageTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">{config.pageDescription}</p>
        </div>
      </section>

      <section className="space-y-6">
        <Card className="border-[color:var(--border-strong)] bg-[color:var(--bg-elevated)] shadow-none">
          <CardHeader className="space-y-3 p-4 sm:p-6">
            <div className="rounded-[var(--radius-md)] border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] px-4 py-3">
              <p className="text-caption text-[color:var(--brand-800)]">오늘 최우선 작업</p>
              <p className="mt-1 text-body-lg text-[color:var(--foreground-strong)]">{primaryTaskLabel}</p>
            </div>
            <CardTitle>오늘 우선순위 1개만 먼저 실행합니다.</CardTitle>
            <CardDescription className="max-w-[66ch]">{config.priorityCopy}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-sm text-[color:var(--foreground-strong)]">{nextAction}</p>
            {mode === "first" ? (
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
                    {isFirstSetStart ? "세트 풀이 시작" : "오늘 최우선 작업 시작"}
                  </Button>
                </Link>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[color:var(--muted)]">
                  <span>다른 작업 선택:</span>
                  <Link href={secondaryHref} className="underline-offset-2 hover:underline">
                    {config.secondaryCta}
                  </Link>
                  <Link href={`/app/weekly?mode=${mode}`} className="underline-offset-2 hover:underline">
                    주간 정리
                  </Link>
                  <Link href={`/app/calculator?context=${calculatorWorkflow.context}&mode=${mode}`} className="underline-offset-2 hover:underline">
                    계산기 스텝
                  </Link>
                </div>
              </div>
            )}
            {mode === "first" && recentStudyLog ? (
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-4 py-3 text-sm">
                <p className="text-[color:var(--foreground-strong)]">
                  최근 기록: {recentStudyLog.subject} {recentStudyLog.sourceLabel} / 확신도 {recentStudyLog.confidence}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">다음에는 이 범위를 먼저 다시 봅니다.</p>
              </div>
            ) : null}
            <details className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
              <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">
                우선순위 근거 보기
              </summary>
              <div className="grid gap-3 border-t border-[color:var(--border-subtle)] p-4 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-[color:var(--muted)]">선택 이유</p>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-strong)]">{primaryReason}</p>
                </div>
                <div>
                  <p className="text-xs text-[color:var(--muted)]">예상 소요 시간</p>
                  <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">{estimatedMinutes}분</p>
                </div>
                <div>
                  <p className="text-xs text-[color:var(--muted)]">진단된 약점</p>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-strong)]">{diagnosedWeakPoint}</p>
                </div>
              </div>
            </details>
            {firstUse ? (
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--muted)]">
                {config.emptyDescription}{" "}
                <Link href="/app/settings" className="underline-offset-2 hover:underline">
                  수험 설정 확인
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <section className="space-y-3">
          <details className="group rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
            <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium text-[color:var(--foreground-strong)] sm:px-5">
              기록·요약·현재 흐름 보기
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

              <Card>
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
                    <p className="text-sm text-[color:var(--muted)]">아직 주간 정리가 없습니다. 기록이 쌓이면 우선순위가 만들어집니다.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>자동 정리 노트</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {notebookPreview.length === 0 ? (
                    <p className="text-sm text-[color:var(--muted)]">{config.emptyDescription}</p>
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
                        <p className="mt-3 text-xs leading-5 text-[color:var(--muted)]">다음 review: {note.nextReviewDate}</p>
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
