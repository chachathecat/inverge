import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { Button } from "@/components/ui/button";
import { getAppraisalMode, parseAppraisalMode } from "@/lib/review-os/appraisal";
import { getCalculatorWorkflowForSubject, hasCalculationSignal } from "@/lib/review-os/calculator-workflow";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import { buildDetailStudyNote, buildRewriteComparisonNote } from "@/lib/review-os/study-note";

type PageProps = {
  params: Promise<{ itemId: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsItemDetailPage({ params, searchParams }: PageProps) {
  const [{ itemId }, modeParam] = await Promise.all([params, searchParams?.then((value) => value.mode)]);
  const { session } = await getReviewOsServerContext(
    buildReviewOsReturnTo(`/app/items/${itemId}`, modeParam),
  );
  if (!session.userId || !session.email) return null;

  const detail = await reviewOsService.getWrongAnswerDetail(session.userId, session.email, itemId);
  if (!detail) notFound();

  const mode =
    parseAppraisalMode(typeof detail.item.rawPayload?.mode === "string" ? detail.item.rawPayload.mode : null) ??
    getAppraisalMode(detail.item.examName);
  const isSecond = mode === "second";
  const note = buildDetailStudyNote(detail);
  const rewriteSourceItemId =
    typeof detail.item.rawPayload?.rewrite_source_item_id === "string"
      ? detail.item.rawPayload.rewrite_source_item_id
      : typeof detail.item.rawPayload?.user_confirmed_fields === "object" &&
          detail.item.rawPayload.user_confirmed_fields &&
          typeof (detail.item.rawPayload.user_confirmed_fields as Record<string, unknown>).rewrite_source_item_id === "string"
        ? ((detail.item.rawPayload.user_confirmed_fields as Record<string, unknown>).rewrite_source_item_id as string)
        : null;
  const rewriteSourceDetail =
    isSecond && rewriteSourceItemId
      ? await reviewOsService.getWrongAnswerDetail(session.userId, session.email, rewriteSourceItemId)
      : null;
  const rewriteComparison = buildRewriteComparisonNote(detail, note, rewriteSourceDetail);
  const title = detail.item.problemTitle ?? detail.item.problemIdentifier ?? note.title;
  const calculatorWorkflow = getCalculatorWorkflowForSubject(detail.item.subjectLabel);
  const hasCalculationMistake = hasCalculationSignal([
    detail.item.userReasonText,
    detail.item.userReasonPreset,
    detail.item.problemTitle,
    detail.item.correctAnswer,
    detail.item.userAnswer,
    note.weakPoint,
    note.coreLine,
    note.missingIssue,
    note.weakStructurePoint,
    note.rewriteInstruction,
    ...detail.tags.flatMap((tag) => [tag.topicTag, tag.mistakeType, tag.taskType]),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-6 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[66ch] space-y-3">
            <div className="flex flex-wrap gap-2">
              <QuietPill>{isSecond ? "감평 2차" : "감평 1차"}</QuietPill>
              <QuietPill>{detail.item.subjectLabel}</QuietPill>
              <QuietPill>{note.noteLabel}</QuietPill>
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-[color:var(--foreground-strong)]">{title}</h2>
            <p className="text-sm leading-7 text-[color:var(--muted)]">{note.summaryLine}</p>
          </div>
          <Link href={`/app?mode=${mode}`}>
            <Button type="button" variant="outline">
              오늘로 돌아가기
            </Button>
          </Link>
        </div>
      </section>

      {isSecond ? (
        <section className="space-y-4">
          {rewriteComparison ? (
            <section className="rounded-[var(--radius-card)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] p-5">
              <p className="text-caption text-[color:var(--cue-review)]">2차 rewrite 전/후 비교</p>
              <div className="mt-3 space-y-3">
                <MiniArtifact label="source gap" value={rewriteComparison.sourceGap} />
                <details className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4">
                  <summary className="cursor-pointer list-none text-sm font-medium text-[color:var(--foreground-strong)]">
                    이전 문단 / 기준 답안 요약 펼쳐서 보기
                  </summary>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[color:var(--foreground-strong)]">
                    {rewriteComparison.previousParagraph}
                  </p>
                  <p className="mt-3 text-xs leading-6 text-[color:var(--muted)]">기준 요약: {rewriteComparison.sourceAnswerSummary}</p>
                </details>
                <SourceBlock label="다시 쓴 문단" value={rewriteComparison.rewrittenParagraph} />
                <div className="grid gap-3 md:grid-cols-2">
                  <MiniArtifact label="좋아진 점 1개" value={rewriteComparison.improvement} />
                  <MiniArtifact label="아직 남은 간극 1개" value={rewriteComparison.remainingNextGap} />
                </div>
                <p className="text-sm text-[color:var(--foreground-strong)]">다음에는 이 문장만 다시 확인합니다.</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href={`/app/review?mode=${mode}`}>
                    <Button type="button">다음 review 일정 잡기</Button>
                  </Link>
                  <Link href={`/app/review?mode=${mode}`}>
                    <Button type="button" variant="outline">
                      review queue 계속 보기
                    </Button>
                  </Link>
                  <Link href={`/app/capture?mode=${mode}&rewriteFrom=${rewriteSourceItemId ?? itemId}`}>
                    <Button type="button" variant="outline">
                      문단 한 번 더 다시쓰기
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          <ArtifactBlock tone="risk" eyebrow="가장 큰 간극" title={note.missingIssue ?? note.weakPoint}>
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              이번 비교에서는 이 한 가지를 먼저 메우는 데 집중합니다. 교정 답안은 문단 단위로 바로 다시 씁니다.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={`/app/capture?mode=${mode}&rewriteFrom=${itemId}`}>
                <Button type="button">문단 다시쓰기 시작</Button>
              </Link>
              <p className="text-xs text-[color:var(--muted)]">
                기준 답안과 내 답안을 옆에 두고, 누락 논점 1개를 먼저 넣어 작성합니다.
              </p>
            </div>
          </ArtifactBlock>

          <details className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
            <summary className="cursor-pointer list-none text-sm font-medium text-[color:var(--foreground-strong)]">
              세부 비교 기록 보기
            </summary>
            <p className="mt-2 text-xs leading-6 text-[color:var(--muted)]">
              점수/약점/구조 노트는 보조 기록으로 접어두고, 다시쓰기 실행 이후에 확인합니다.
            </p>

            <div className="mt-4 space-y-4">
              <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <ArtifactBlock tone="brand" eyebrow="AI 요약" title={note.summary}>
                  <p className="text-sm leading-7 text-[color:var(--muted)]">
                    AI는 점수를 판정하지 않고, 기록에서 다음 review/rewrite에 필요한 신호만 정리합니다.
                  </p>
                </ArtifactBlock>
                <ArtifactBlock tone="review" eyebrow="다시쓰기 지시" title={note.rewriteInstruction ?? note.nextAction}>
                  <p className="text-sm leading-7 text-[color:var(--muted)]">오늘은 이 행동 하나만 남기면 됩니다.</p>
                </ArtifactBlock>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <ArtifactBlock tone="focus" eyebrow="핵심 문장" title={note.coreLine}>
                  <p className="text-sm leading-7 text-[color:var(--muted)]">답안에 다시 넣어야 할 문장 단위 신호입니다.</p>
                </ArtifactBlock>
                <ArtifactBlock tone="neutral" eyebrow="구조 약한 부분" title={note.weakStructurePoint ?? "목차와 사례 적용 순서를 다시 정리합니다."}>
                  <p className="text-sm leading-7 text-[color:var(--muted)]">구조 메모는 보조 기록으로만 확인합니다.</p>
                </ArtifactBlock>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <MiniArtifact label="누락 논점" value={note.missingIssue ?? note.weakPoint} />
                <MiniArtifact label="사례 적용 문장" value={note.weakApplicationSentence ?? note.coreLine} />
                <MiniArtifact label="다음 review 시점" value={note.nextReviewDate} />
              </section>

              <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-caption text-[color:var(--muted)]">핵심 키워드</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {note.keyTerms.length > 0 ? (
                        note.keyTerms.map((term) => <StudyCue key={term}>{term}</StudyCue>)
                      ) : (
                        <StudyCue>{detail.item.subjectLabel}</StudyCue>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <SourceBlock label="기준 답안 / 강평" value={detail.item.correctAnswer} />
                <SourceBlock label="내 답안" value={detail.item.userAnswer} />
              </section>

              <ArtifactBlock tone="review" eyebrow="교정노트" title={note.noteCard}>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <p className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 text-sm leading-7 text-[color:var(--foreground-strong)]">
                    {note.notebookLine}
                  </p>
                  <p className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 text-sm leading-7 text-[color:var(--foreground-strong)]">
                    {note.recurrenceText}
                  </p>
                </div>
              </ArtifactBlock>
            </div>
          </details>
        </section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <ArtifactBlock tone="brand" eyebrow="AI 요약" title={note.summary}>
              <p className="text-sm leading-7 text-[color:var(--muted)]">
                AI는 점수를 판정하지 않고, 기록에서 다음 review/rewrite에 필요한 신호만 정리합니다.
              </p>
            </ArtifactBlock>
            <ArtifactBlock tone="review" eyebrow="다음 행동" title={note.nextAction}>
              <p className="text-sm leading-7 text-[color:var(--muted)]">오늘은 이 행동 하나만 남기면 됩니다.</p>
            </ArtifactBlock>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <ArtifactBlock tone="risk" eyebrow="부족한 부분" title={note.weakPoint}>
              <p className="text-sm leading-7 text-[color:var(--muted)]">다음 review에서 먼저 확인할 오답 원인입니다.</p>
            </ArtifactBlock>
            <ArtifactBlock tone="focus" eyebrow="핵심 공식" title={note.coreLine}>
              <p className="text-sm leading-7 text-[color:var(--muted)]">선지 판단 전에 먼저 고정할 구조입니다.</p>
            </ArtifactBlock>
          </section>

          <ArtifactBlock tone="neutral" eyebrow="헷갈린 비교 포인트" title={note.comparisonPoint ?? note.weakPoint}>
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              정답 근거와 내가 고른 판단이 갈라진 지점을 짧게 남깁니다.
            </p>
          </ArtifactBlock>

          <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-caption text-[color:var(--muted)]">핵심 키워드</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {note.keyTerms.length > 0 ? (
                    note.keyTerms.map((term) => <StudyCue key={term}>{term}</StudyCue>)
                  ) : (
                    <StudyCue>{detail.item.subjectLabel}</StudyCue>
                  )}
                </div>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] px-4 py-3">
                <p className="text-caption text-[color:var(--cue-review)]">다음 review 시점</p>
                <p className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">{note.nextReviewDate}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <SourceBlock label="정답 / 근거" value={detail.item.correctAnswer} />
            <SourceBlock label="내 답 / 선택" value={detail.item.userAnswer} />
          </section>

          <ArtifactBlock tone="review" eyebrow="오답노트" title={note.noteCard}>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <p className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 text-sm leading-7 text-[color:var(--foreground-strong)]">
                {note.notebookLine}
              </p>
              <p className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 text-sm leading-7 text-[color:var(--foreground-strong)]">
                {note.recurrenceText}
              </p>
            </div>
          </ArtifactBlock>
        </>
      )}

      {calculatorWorkflow && hasCalculationMistake ? (
        <ArtifactBlock tone="focus" eyebrow="계산 실수 연결" title={`${calculatorWorkflow.subject} 관련 계산기 스텝 보기`}>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              자동 풀이가 아니라, 다음 계산형 문제에서 적을 값과 검산 순서를 고정하는 실행 aid입니다.
            </p>
            <Link href={`/app/calculator?context=${calculatorWorkflow.context}&mode=${calculatorWorkflow.mode}`}>
              <Button type="button" variant="outline">
                관련 계산기 스텝 보기
              </Button>
            </Link>
          </div>
        </ArtifactBlock>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={`/app/review?mode=${mode}`}>
          <Button type="button">review queue 보기</Button>
        </Link>
        <Link href={`/app/capture?mode=${mode}`}>
          <Button type="button" variant="outline">
            {isSecond ? "답안 하나 더 올리기" : "문제 하나 더 올리기"}
          </Button>
        </Link>
      </div>

      <ReviewOsFeedbackButton route={`/app/items/${itemId}`} pageContext={{ itemId, isSecond }} />
    </div>
  );
}

function QuietPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-3 py-1 text-xs text-[color:var(--muted)]">
      {children}
    </span>
  );
}

function StudyCue({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] px-3 py-1 text-xs font-medium text-[color:var(--cue-focus)]">
      {children}
    </span>
  );
}

function ArtifactBlock({
  tone,
  eyebrow,
  title,
  children,
}: {
  tone: "brand" | "focus" | "neutral" | "review" | "risk";
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  const toneClass = {
    brand: "border-[color:var(--brand-700)] bg-[color:var(--brand-050)] text-[color:var(--brand-700)]",
    focus: "border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] text-[color:var(--cue-focus)]",
    neutral: "border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] text-[color:var(--muted)]",
    review: "border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] text-[color:var(--cue-review)]",
    risk: "border-[color:var(--cue-risk)] bg-[color:var(--cue-risk-bg)] text-[color:var(--cue-risk)]",
  }[tone];

  return (
    <section className={`rounded-[var(--radius-card)] border p-5 ${toneClass}`}>
      <p className="text-caption">{eyebrow}</p>
      <p className="mt-2 text-body-lg font-medium leading-8 text-[color:var(--foreground-strong)]">{title}</p>
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

function MiniArtifact({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 text-sm leading-7 text-[color:var(--foreground-strong)]">{value}</p>
    </section>
  );
}

function SourceBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[color:var(--foreground-strong)]">
        {value?.trim() ? value : "아직 원문이 없습니다. 다음 입력에서 업로드 또는 텍스트로 보강할 수 있습니다."}
      </p>
    </section>
  );
}
