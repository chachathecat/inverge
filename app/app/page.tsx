import Link from "next/link";
import { redirect } from "next/navigation";

import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { TodayFirstSubjectSelector } from "@/components/review-os/today-first-subject-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModeConfig, normalizeSubjectForMode, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import { buildNotebookPreview } from "@/lib/review-os/study-note";
import { APPRAISAL_FIRST_SUBJECTS } from "@/lib/review-os/types";
import { buildTodayPlanCard, type TodayPlanActionKind } from "@/lib/review-os/today-plan";

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
  const [focus, weekly, allItems, learningSignal, learningSignalEvents] = await Promise.all([
    reviewOsService.getTodayFocus(session.userId, session.email, mode),
    reviewOsService.getWeeklySummary(session.userId, session.email),
    reviewOsService.listWrongAnswerItems(session.userId, session.email, 12),
    reviewOsService.getLearningSignalSummary(session.userId, session.email, mode).catch(() => null),
    reviewOsService.listLearningSignalEvents(session.userId, session.email, mode, 10).catch(() => []),
  ]);

  const items = allItems.filter((item) => item.examName === config.label).slice(0, 5);
  const queue = focus.queue.filter((item) => item.examName === config.label);
  const firstUse = items.length === 0;
  const selectedQueueItem = queue.find((item) => item.queueId === focus.sourceQueueId) ?? queue[0] ?? null;
  const todayPlan = buildTodayPlanCard({ mode, learningSignals: learningSignalEvents, queue, items });
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

  const primaryHref = todayPlan.hasPlan ? resolveTodayPlanHref(todayPlan.actionKind) : defaultPrimaryHref;
  const diagnosedWeakPoint = selectedQueueItem?.mistakeType ?? (items[0] ? buildNotebookPreview(items[0]).weakPoint : config.emptyTitle);
  const notebookPreview = items.slice(0, 3).map((item) => buildNotebookPreview(item));
  const shouldShowFirstSubjectSelector = mode === "first" && isFirstSetStart;
  let recentStudyLog: Awaited<ReturnType<typeof reviewOsService.getRecentStudyLog>> | null = null;
  if (mode === "first") {
    try {
      recentStudyLog = await reviewOsService.getRecentStudyLog(session.userId, session.email, "first");
    } catch (error) {
      console.warn("[review-os] failed to load optional recent study log", error);
    }
  }

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
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-medium tracking-[-0.04em] text-[color:var(--foreground-strong)] sm:text-2xl">{config.pageTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
            {mode === "first"
              ? "오답 기록·세트 풀이·공부 기록 입력을 기준으로 오늘 할 일을 정리합니다."
              : "답안 작성·기준답안 비교·문단 다시쓰기 입력을 기준으로 오늘 할 일을 정리합니다."}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        {firstUse ? (
          <Card className="border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] shadow-none">
            <CardHeader className="space-y-3 p-4 sm:p-6">
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--brand-050)] px-4 py-3">
                <p className="text-caption text-[color:var(--muted)]">오늘 입력 시작</p>
                <p className="mt-1 text-body-lg text-[color:var(--foreground-strong)]">
                  {mode === "first" ? "틀린 문제 하나만 남겨도 다시 볼 목록이 만들어집니다." : "답안 하나를 넣으면 보강할 간극 하나로 줄입니다."}
                </p>
              </div>
              <CardTitle>오늘 무엇을 입력할까요?</CardTitle>
              <CardDescription className="max-w-[66ch]">
                {mode === "first"
                  ? "입력을 남기면 다음 복습 신호와 재시도 순서가 정리됩니다."
                  : "입력을 남기면 비교와 다시쓰기로 이어질 다음 교정 작업이 정리됩니다."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">
              <Link href={inputOptions[0].href} className="w-full sm:w-auto">
                <Button type="button" className="w-full sm:w-auto">
                  {inputOptions[0].hrefLabel}
                </Button>
              </Link>
              <div className="grid gap-2.5">
                <p className="text-xs text-[color:var(--muted)]">다른 입력 선택지</p>
                {inputOptions.slice(1).map((option) => (
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
                <p className="text-caption text-[color:var(--muted)]">오늘 최우선 작업</p>
                <p className="mt-1 text-body-lg text-[color:var(--foreground-strong)]">{todayPlan.primaryTask}</p>
              </div>
              <CardTitle>지금 해야 할 한 가지에만 집중합니다.</CardTitle>
              <CardDescription className="max-w-[66ch]">
                이미 남긴 입력 기록에서 다음 복습 신호를 정리했습니다. 먼저 실행하고, 이후 입력·복습을 차분히 이어갑니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">
              <p className="text-sm text-[color:var(--foreground-strong)]">{nextAction}</p>
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
                      {todayPlan.ctaLabel}
                    </Button>
                  </Link>
                  <details className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] sm:w-auto sm:min-w-[20rem]">
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
                        {config.secondaryCta}
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
                    최근 기록: {recentStudyLog.subject} {recentStudyLog.sourceLabel} / 확신도 {recentStudyLog.confidence}
                  </p>
                  {recentStudyTaxonomyLine ? <p className="mt-1 text-xs text-[color:var(--muted)]">{recentStudyTaxonomyLine}</p> : null}
                  <p className="mt-1 text-xs text-[color:var(--muted)]">기록을 기준으로 다음 복습 범위를 정리했습니다.</p>
                </div>
              ) : null}
              <details className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
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
              </details>
            </CardContent>
          </Card>
        )}



        <details className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">학습 신호 요약 보기</summary>
          <div className="space-y-2 border-t border-[color:var(--border-subtle)] p-4 text-sm">
            <p>누적 {learningSignal?.totalCount ?? 0}건 · 최근 {learningSignal?.latestEventAt ? new Date(learningSignal.latestEventAt).toLocaleDateString("ko-KR") : "-"}</p>
            <p>주요 과목: {(learningSignal?.topSubjects ?? []).join(", ") || "-"}</p>
            <p>주요 태그: {(learningSignal?.topTags ?? []).join(", ") || "-"}</p>
          </div>
        </details>

        <section className="space-y-3">
          <details className="group rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
            <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium text-[color:var(--foreground-strong)] sm:px-5">
              기록 요약 보기
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
                    <p className="text-sm text-[color:var(--muted)]">아직 주간 정리가 없습니다. 기록이 쌓이면 우선순위가 만들어집니다.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[color:var(--border-subtle)] shadow-none">
                <CardHeader>
                  <CardTitle>정리된 기록</CardTitle>
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
