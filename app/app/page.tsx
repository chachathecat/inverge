import Link from "next/link";
import { redirect } from "next/navigation";

import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { CALCULATOR_WORKFLOWS } from "@/lib/review-os/calculator-workflow";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import { buildNotebookPreview } from "@/lib/review-os/study-note";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsDashboardPage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app", modeParam));
  if (!session.userId || !session.email) return null;

  if (!profile && !modeParam) redirect("/app/onboarding");
  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const [focus, weekly, allItems] = await Promise.all([
    reviewOsService.getTodayFocus(session.userId, session.email),
    reviewOsService.getWeeklySummary(session.userId, session.email),
    reviewOsService.listWrongAnswerItems(session.userId, session.email, 12),
  ]);

  const items = allItems.filter((item) => item.examName === config.label).slice(0, 5);
  const queue = focus.queue.filter((item) => item.examName === config.label);
  const firstUse = items.length === 0;
  const nextAction = queue[0]?.reviewReason ?? config.nextActionFallback;
  const primaryHref = `/app/capture?mode=${mode}`;
  const secondaryHref = mode === "second" ? `/app/items?mode=${mode}` : `/app/review?mode=${mode}`;
  const diagnosedWeakPoint = queue[0]?.mistakeType ?? (items[0] ? buildNotebookPreview(items[0]).weakPoint : config.emptyTitle);
  const notebookPreview = items.slice(0, 3).map((item) => buildNotebookPreview(item));
  const calculatorWorkflow = mode === "second" ? CALCULATOR_WORKFLOWS.practice : CALCULATOR_WORKFLOWS.accounting;

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-medium tracking-[-0.04em] text-[color:var(--foreground-strong)]">
            {config.pageTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">{config.pageDescription}</p>
        </div>
      </section>

      {firstUse ? (
        <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
          <CardHeader>
            <CardTitle>{config.emptyTitle}</CardTitle>
            <CardDescription>{config.emptyDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Link href={primaryHref}>
              <Button type="button">문제/답안 올리기</Button>
            </Link>
            <Link href="/app/settings">
              <Button type="button" variant="outline">
                수험 설정 확인
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,700px)_minmax(260px,1fr)] lg:items-start">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>오늘의 우선순위</CardTitle>
              <CardDescription>{config.priorityCopy}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-[color:var(--cue-risk)] bg-[color:var(--cue-risk-bg)] px-4 py-3">
                <p className="text-caption text-[color:var(--cue-risk)]">진단된 약점 1개</p>
                <p className="mt-1 text-sm leading-7 text-[color:var(--foreground-strong)]">{diagnosedWeakPoint}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-4 py-3 text-sm leading-7 text-[color:var(--foreground-strong)]">
                {queue[0] ? `${queue[0].subjectLabel}: ${queue[0].reviewReason}` : focus.lines[0]}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[color:var(--brand-700)] bg-[color:var(--brand-050)]">
            <CardHeader>
              <CardTitle>다음 행동 1개</CardTitle>
              <CardDescription>오늘 무엇을, 얼마나, 어떤 방식으로 할지만 남깁니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-body-lg max-w-[60ch] text-[color:var(--foreground-strong)]">{nextAction}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={primaryHref}>
                  <Button type="button">문제/답안 올리기</Button>
                </Link>
                <Link href={secondaryHref}>
                  <Button type="button" variant="outline">
                    {config.secondaryCta}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>자동 정리 노트</CardTitle>
              <CardDescription>
                업로드한 흔적을 오답노트와 교정노트로 정리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notebookPreview.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-[color:var(--muted)]">{config.emptyDescription}</p>
                  <Link href={primaryHref}>
                    <Button type="button" variant="outline">
                      문제/답안 올리기
                    </Button>
                  </Link>
                </div>
              ) : (
                notebookPreview.map((note, index) => (
                  <Link
                    key={`${note.title}-${index}`}
                    href={`/app/items/${items[index].id}?mode=${mode}`}
                    className="block rounded-2xl border border-[color:var(--border-subtle)] px-4 py-4 text-sm transition duration-150 hover:bg-[color:var(--bg-subtle)]"
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
                    <div className="mt-4 grid gap-2">
                      <p className="rounded-2xl border border-[color:var(--cue-risk)] bg-[color:var(--cue-risk-bg)] px-3 py-2 text-xs leading-5 text-[color:var(--foreground-strong)]">
                        부족한 부분: {note.weakPoint}
                      </p>
                      <p className="rounded-2xl border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] px-3 py-2 text-xs leading-5 text-[color:var(--foreground-strong)]">
                        {note.mode === "second" ? "핵심 문장" : "핵심 공식"}: {note.coreLine}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {note.keyTerms.map((term) => (
                        <span key={term} className="rounded-full bg-[color:var(--cue-focus-bg)] px-2.5 py-1 text-[11px] text-[color:var(--cue-focus)]">
                          {term}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[color:var(--muted)]">다음 review: {note.nextReviewDate}</p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>이번 주 학습 정리</CardTitle>
              <CardDescription>반복된 실수와 다음 주 우선순위를 짧게 확인합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle>현재 흐름</CardTitle>
              <CardDescription>운영에 필요한 최소 정보만 유지합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-2xl border border-[color:var(--border-subtle)] p-4">
                <p className="text-[color:var(--muted)]">현재 모드</p>
                <p className="mt-1 text-[color:var(--foreground-strong)]">{config.label}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--border-subtle)] p-4">
                <p className="text-[color:var(--muted)]">우선 과목</p>
                <p className="mt-1 text-[color:var(--foreground-strong)]">
                  {profile?.preferredSubjects.filter((subject) => (config.subjects as readonly string[]).includes(subject)).join(", ") ||
                    config.subjects[0]}
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--border-subtle)] p-4">
                <p className="text-[color:var(--muted)]">오늘 다시 볼 항목</p>
                <p className="mt-1 tabular-nums text-[color:var(--foreground-strong)]">{queue.length}개</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] p-4">
                <p className="text-[color:var(--cue-focus)]">계산형 실행 aid</p>
                <p className="mt-1 text-[color:var(--foreground-strong)]">{calculatorWorkflow.subject} 계산기 스텝</p>
                <Link className="mt-3 inline-flex" href={`/app/calculator?context=${calculatorWorkflow.context}&mode=${mode}`}>
                  <Button type="button" variant="outline">
                    계산기 스텝 보기
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>

      <ReviewOsFeedbackButton route="/app" pageContext={{ section: "today", firstUse, mode }} />
    </div>
  );
}
