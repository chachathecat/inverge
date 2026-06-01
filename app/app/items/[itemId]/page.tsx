import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { Button } from "@/components/ui/button";
import { getAppraisalMode, parseAppraisalMode } from "@/lib/review-os/appraisal";
import { getCalculatorWorkflowForSubject, hasCalculationSignal } from "@/lib/review-os/calculator-workflow";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { buildAnswerSkeletonGuide, mapCaptureNoteToPastExamReferenceMatches } from "@/lib/review-os/past-exam-reference";
import { getSimilarQuestionReferenceCandidates } from "@/lib/review-os/question-reference";
import { reviewOsService } from "@/lib/review-os/service";
import { buildDetailStudyNote, buildRewriteComparisonNote } from "@/lib/review-os/study-note";
import type { ConceptReviewCardPayload, WrongAnswerItemRecord } from "@/lib/review-os/types";

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
  const resolvedDetail = detail;

  const mode =
    parseAppraisalMode(typeof resolvedDetail.item.rawPayload?.mode === "string" ? resolvedDetail.item.rawPayload.mode : null) ??
    getAppraisalMode(resolvedDetail.item.examName);
  const isSecond = mode === "second";
  const note = buildDetailStudyNote(resolvedDetail);
  const rewriteSourceItemId =
    typeof resolvedDetail.item.rawPayload?.rewrite_source_item_id === "string"
      ? resolvedDetail.item.rawPayload.rewrite_source_item_id
      : typeof resolvedDetail.item.rawPayload?.user_confirmed_fields === "object" &&
          resolvedDetail.item.rawPayload.user_confirmed_fields &&
          typeof (resolvedDetail.item.rawPayload.user_confirmed_fields as Record<string, unknown>).rewrite_source_item_id === "string"
        ? ((resolvedDetail.item.rawPayload.user_confirmed_fields as Record<string, unknown>).rewrite_source_item_id as string)
        : null;
  const rewriteSourceDetail =
    isSecond && rewriteSourceItemId
      ? await reviewOsService.getWrongAnswerDetail(session.userId, session.email, rewriteSourceItemId)
      : null;
  const rewriteComparison = buildRewriteComparisonNote(resolvedDetail, note, rewriteSourceDetail);
  const title = resolvedDetail.item.problemTitle ?? resolvedDetail.item.problemIdentifier ?? note.title;
  const calculatorWorkflow = getCalculatorWorkflowForSubject(resolvedDetail.item.subjectLabel);
  const hasCalculationMistake = hasCalculationSignal([
    resolvedDetail.item.userReasonText,
    resolvedDetail.item.userReasonPreset,
    resolvedDetail.item.problemTitle,
    resolvedDetail.item.correctAnswer,
    resolvedDetail.item.userAnswer,
    note.weakPoint,
    note.coreLine,
    note.missingIssue,
    note.weakStructurePoint,
    note.rewriteInstruction,
    ...resolvedDetail.tags.flatMap((tag) => [tag.topicTag, tag.mistakeType, tag.taskType]),
  ]);
  const secondCompletionWork = rewriteComparison
    ? "문단 다시쓰기를 저장하고 전/후 비교까지 확인했습니다."
    : "2차 작성 기록을 저장하고 비교 노트를 만들었습니다.";
  const secondCompletionSignal = note.missingIssue ?? note.weakPoint;
  const secondCompletionNext = rewriteComparison
    ? `다음 review는 ${note.nextReviewDate}로 자동 예약됩니다.`
    : `다음 cue: ${note.rewriteInstruction ?? "가장 큰 간극 1개를 문단 다시쓰기로 보강합니다."}`;
  const biggestSignal = isSecond ? note.missingIssue ?? note.weakPoint : note.weakPoint;
  const nextActionLine = isSecond
    ? note.rewriteInstruction ?? "문단 하나를 다시 쓰고 오늘 작업을 끝냅니다."
    : "이번 항목에서는 이 조건 하나만 다시 확인합니다.";
  const payloadTaxonomy =
    readTaxonomyClassificationPayload(resolvedDetail.item.derivedPayload) ??
    readTaxonomyClassificationPayload(resolvedDetail.item.rawPayload);
  const taxonomyCandidate = resolveTaxonomyCandidate(payloadTaxonomy);
  const captureNoteEngine =
    typeof resolvedDetail.item.derivedPayload?.capture_note_engine_v2 === "object" && resolvedDetail.item.derivedPayload.capture_note_engine_v2
      ? (resolvedDetail.item.derivedPayload.capture_note_engine_v2 as Record<string, unknown>)
      : typeof resolvedDetail.item.derivedPayload?.capture_note_engine_v1 === "object" && resolvedDetail.item.derivedPayload.capture_note_engine_v1
        ? (resolvedDetail.item.derivedPayload.capture_note_engine_v1 as Record<string, unknown>)
      : null;

  const captureReferenceCandidates = captureNoteEngine
    ? mapCaptureNoteToPastExamReferenceMatches({
        ...captureNoteEngine,
        mode,
        subject: resolvedDetail.item.subjectLabel,
      })
    : [];
  const questionReferenceHints = await getSimilarQuestionReferenceCandidates({
    examMode: mode,
    subject: resolvedDetail.item.subjectLabel,
    topicCandidate: String(captureNoteEngine?.topic_candidate ?? title),
    conceptCandidate: biggestSignal,
    mistakeType: String(captureNoteEngine?.mistake_type ?? resolvedDetail.item.userReasonPreset ?? ""),
    issueTags: [biggestSignal, note.missingIssue, note.weakStructurePoint].filter((value): value is string => typeof value === "string" && value.length > 0),
    derivedTags: resolvedDetail.tags.flatMap((tag) => [tag.topicTag, tag.mistakeType, tag.taskType]).filter(Boolean),
    safeSkeletonIds: [String(resolvedDetail.item.supportedCalculatorTemplateId ?? ""), isSecond ? "second_law_requirement_subsumption" : ""].filter(Boolean),
  });
  const firstOxReview = !isSecond ? buildFirstOxReviewDetail(resolvedDetail.item) : null;
  const firstOxNextActionLine = firstOxReview ? "같은 선지를 근거 1줄로 다시 판단합니다." : nextActionLine;

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-6 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[66ch] space-y-3">
            <div className="flex flex-wrap gap-2">
              <QuietPill>{isSecond ? "감평 2차" : "감평 1차"}</QuietPill>
              <QuietPill>{resolvedDetail.item.subjectLabel}</QuietPill>
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

      <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-5">
        <p className="text-caption text-[color:var(--muted)]">이번 항목의 핵심</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <MiniArtifact label="가장 큰 신호 1개" value={biggestSignal} />
          <MiniArtifact label="다음 행동 1개" value={firstOxNextActionLine} />
        </div>
      </section>

      {captureNoteEngine ? (
        <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
          <p className="text-caption text-[color:var(--muted)]">정리된 초안</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <MiniArtifact label="가장 큰 간극" value={String(captureNoteEngine.one_biggest_gap ?? "-")} />
            <MiniArtifact label="다음 행동" value={String(captureNoteEngine.one_next_action ?? "-")} />
            <MiniArtifact label="논점 후보" value={String(captureNoteEngine.topic_candidate ?? "-")} />
            <MiniArtifact label="오류 유형" value={String(captureNoteEngine.mistake_type ?? "-")} />
            {isSecond ? <MiniArtifact label="다시쓰기 지시" value={String(captureNoteEngine.rewrite_instruction ?? "-")} /> : null}
            <MiniArtifact label="다음 과제 유형" value={String(captureNoteEngine.next_task_type ?? "-")} />
          </div>
          <p className="mt-3 text-xs text-[color:var(--muted)]">AI 정리는 초안입니다. 저장 전 직접 확인해 주세요.</p>
          <p className="mt-3 text-xs text-[color:var(--muted)]">원문 OCR/텍스트는 사용자 소유 입력으로 보관되며, 이 화면에 학습 데이터처럼 노출하지 않습니다.</p>
        </section>
      ) : null}

      {questionReferenceHints.length > 0 || captureReferenceCandidates.length > 0 ? (
        <details className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-5">
          <summary className="cursor-pointer list-none text-sm font-medium text-[color:var(--foreground-strong)]">비슷한 기출 기준</summary>
          <p className="mt-2 text-xs text-[color:var(--muted)]">원문 탐색이 아니라 태그·skeleton·약점 단위 매핑을 위한 선택 참고입니다. 기본은 지금 항목의 retry/rewrite입니다.</p>
          {questionReferenceHints.length > 0 ? (
            <div className="mt-3 space-y-2">
              {questionReferenceHints.slice(0, 2).map((hint) => (
                <div key={hint.referenceId} className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3">
                  <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{hint.title}</p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">{hint.reason}</p>
                  {hint.skeletonId ? <p className="mt-1 text-xs text-[color:var(--muted)]">관련 skeleton: {hint.skeletonId}</p> : null}
                  <p className="mt-1 text-xs text-[color:var(--muted)]">권리 상태: {hint.sourceRightsStatus} · 원문 사용: {hint.rawTextAvailable ? "제한된 정책 확인 필요" : "사용 안 함"}</p>
                </div>
              ))}
            </div>
          ) : null}
          {captureReferenceCandidates.length > 0 ? (
          <div className="mt-3 space-y-3">
            {captureReferenceCandidates.slice(0, 2).map((match) => (
              (() => {
                const guide = buildAnswerSkeletonGuide(match.reference);
                return (
              <div
                key={match.reference.id}
                className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4"
              >
                <p className="text-sm font-medium text-[color:var(--foreground-strong)]">
                  {match.reference.exam_year} · {match.reference.subject} · {match.reference.question_number}번
                </p>
                <p className="mt-2 text-xs text-[color:var(--muted)]">1) 연결 이유: {match.reason}</p>
                <p className="mt-2 text-xs text-[color:var(--muted)]">2) 연결된 신호: {formatMatchedFieldLabels(match.matched_fields).join(" · ")}</p>
                <p className="mt-2 text-xs text-[color:var(--muted)]">3) 자주 엮이는 논점: {match.reference.issue_tags.join(" · ")}</p>
                <div className="mt-3 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-3">
                  <p className="text-xs font-medium text-[color:var(--foreground-strong)]">{guide.title}</p>
                  <p className="mt-2 text-xs text-[color:var(--muted)]">학습용 skeleton 단계</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-[color:var(--muted)]">
                    {guide.skeleton_steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-[color:var(--muted)]">자가 점검 질문</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-[color:var(--muted)]">
                    {guide.checkpoint_questions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-[color:var(--muted)]">자주 발생하는 간극</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-[color:var(--muted)]">
                    {guide.common_gap_warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs font-medium text-[color:var(--foreground-strong)]">다음 행동: {guide.next_action}</p>
                </div>
              </div>
                );
              })()
            ))}
          </div>
          ) : null}
          <p className="mt-3 text-xs text-[color:var(--muted)]">모범답안이나 확정 평가가 아닌 학습용 구조 참고입니다.</p>
        </details>
      ) : null}

      {firstOxReview ? (
        <section className="space-y-4">
          <section className="rounded-[var(--radius-card)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] p-6">
            <p className="text-caption text-[color:var(--cue-focus)]">원문 선지</p>
            <p className="mt-3 whitespace-pre-wrap text-body-lg font-semibold leading-8 text-[color:var(--foreground-strong)]">
              {firstOxReview.statement}
            </p>
            {firstOxReview.stem ? (
              <details className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3 text-sm leading-7 text-[color:var(--muted)]">
                <summary className="cursor-pointer font-medium text-[color:var(--foreground-strong)]">문항 줄기 펼쳐보기</summary>
                <p className="mt-2 whitespace-pre-wrap">{firstOxReview.stem}</p>
              </details>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <MiniArtifact label="내 선택" value={firstOxReview.userChoice} />
              {firstOxReview.expectedChoice ? <MiniArtifact label="기대 판단" value={firstOxReview.expectedChoice} /> : null}
              <MiniArtifact label="상태" value={firstOxReview.statusLabel} />
            </div>
            <p className="mt-3 text-sm leading-7 text-[color:var(--foreground-strong)]">{firstOxReview.statusCopy}</p>
          </section>

          <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-5">
            <p className="text-caption text-[color:var(--muted)]">상태</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <MiniArtifact label="가장 큰 신호 1개" value={firstOxReview.biggestSignal} />
              <MiniArtifact label="다음 행동 1개" value="같은 선지를 근거 1줄로 다시 판단합니다." />
            </div>
          </section>

          {firstOxReview.conceptCard ? (
            <ArtifactBlock tone="focus" eyebrow="핵심 개념 카드" title={firstOxReview.conceptCard.coreRule}>
              <div className="grid gap-3 text-sm leading-7 text-[color:var(--foreground-strong)] md:grid-cols-2">
                <p className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4">
                  {firstOxReview.conceptCard.minimalExplanation}
                </p>
                <p className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4">
                  {firstOxReview.conceptCard.examTrapExplanation}
                </p>
              </div>
              <p className="mt-3 text-sm leading-7 text-[color:var(--foreground-strong)]">다음 행동: {firstOxReview.conceptCard.nextReviewAction}</p>
            </ArtifactBlock>
          ) : null}

          <ArtifactBlock tone="review" eyebrow="다음 행동" title="같은 선지 다시 판단하기">
            <p className="text-sm leading-7 text-[color:var(--muted)]">같은 유형의 선지부터 다시 판단합니다.</p>
            <div className="mt-4">
              <Link href={firstOxReview.retryHref}>
                <Button type="button">같은 선지 다시 판단하기</Button>
              </Link>
            </div>
          </ArtifactBlock>

          <details className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
            <summary className="cursor-pointer list-none text-sm font-medium text-[color:var(--foreground-strong)]">세부 기록 펼쳐보기</summary>
            <div className="mt-4 space-y-4">
              <ArtifactBlock tone="neutral" eyebrow="기록 요약" title={note.summary}>
                <p className="text-sm leading-7 text-[color:var(--muted)]">판정 기록은 보조 정보입니다. 기본 작업은 같은 선지 판단 재시도입니다.</p>
              </ArtifactBlock>
              <ArtifactBlock tone="neutral" eyebrow="헷갈린 비교 포인트" title={note.comparisonPoint ?? note.weakPoint}>
                <p className="text-sm leading-7 text-[color:var(--muted)]">기대 판단은 학습 기준일 뿐 확정 정답이나 최종 판정이 아닙니다.</p>
              </ArtifactBlock>
              <section className="grid gap-4 lg:grid-cols-2">
                {firstOxReview.expectedChoice ? <SourceBlock label="기대 판단" value={firstOxReview.expectedChoice} /> : null}
                <SourceBlock label="내 선택" value={firstOxReview.userChoice} />
              </section>
              <ArtifactBlock tone="review" eyebrow="리뷰 노트" title={note.noteCard}>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <p className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 text-sm leading-7 text-[color:var(--foreground-strong)]">{note.notebookLine}</p>
                  <p className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4 text-sm leading-7 text-[color:var(--foreground-strong)]">{note.recurrenceText}</p>
                </div>
              </ArtifactBlock>
            </div>
          </details>
        </section>
      ) : isSecond ? (
        <section className="space-y-4">
          <SessionCompletionSummary
            completedWork={secondCompletionWork}
            biggestSignal={secondCompletionSignal}
            nextSchedule={secondCompletionNext}
            primaryHref={`/app?mode=${mode}`}
            primaryLabel="종료하고 오늘 화면으로"
            quietLinks={
              <>
                <Link href={`/app/review?mode=${mode}`} className="underline-offset-2 hover:underline">
                  다시 볼 항목 확인
                </Link>
                <Link href={`/app/write?mode=${mode}`} className="underline-offset-2 hover:underline">
                  다른 답안 작업 보기
                </Link>
              </>
            }
          />
          <section className="grid gap-4 md:grid-cols-3">
            <MiniArtifact label="누락 논점" value={note.missingIssue ?? note.weakPoint} />
            <MiniArtifact label="문단 다시쓰기" value={note.rewriteInstruction ?? "문단 하나를 다시 쓰고 근거 문장을 보강합니다."} />
            <MiniArtifact label="다음 review" value={note.nextReviewDate} />
          </section>
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
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[color:var(--muted)]">
                  <Link href={`/app/review?mode=${mode}`} className="underline-offset-2 hover:underline">
                    다시 볼 항목 확인
                  </Link>
                  <Link
                    href={`/app/capture?mode=${mode}&rewriteFrom=${rewriteSourceItemId ?? itemId}`}
                    className="underline-offset-2 hover:underline"
                  >
                    문단 한 번 더 다시쓰기
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
                <ArtifactBlock tone="brand" eyebrow="기록 요약" title={note.summary}>
                  <p className="text-sm leading-7 text-[color:var(--muted)]">
                    기록에서 다음 review/rewrite에 필요한 신호만 정리합니다. 최종 판정이나 자동 채점 결과는 제공하지 않습니다.
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
                        <StudyCue>{resolvedDetail.item.subjectLabel}</StudyCue>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <SourceBlock label="기준 답안 / 강평" value={resolvedDetail.item.correctAnswer} />
                <SourceBlock label="내 답안" value={resolvedDetail.item.userAnswer} />
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
          <section className="grid gap-4 md:grid-cols-3">
            <MiniArtifact label="놓친 조건" value={note.weakPoint} />
            <MiniArtifact label="핵심 개념" value={note.coreLine} />
            <MiniArtifact label="다음 재시도" value={note.nextAction} />
          </section>

          <ArtifactBlock tone="review" eyebrow="실행 안내" title="이번 항목에서는 이 조건 하나만 다시 확인합니다.">
            <p className="text-sm leading-7 text-[color:var(--muted)]">조건 확인 후 1문항만 짧게 재시도하고 오늘 review를 마칩니다.</p>
            <div className="mt-4">
              <Link href={`/app/capture?mode=${mode}`}>
                <Button type="button">짧은 재시도 시작</Button>
              </Link>
            </div>
          </ArtifactBlock>

          <details className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
            <summary className="cursor-pointer list-none text-sm font-medium text-[color:var(--foreground-strong)]">세부 기록 펼쳐보기</summary>
            <div className="mt-4 space-y-4">
              <ArtifactBlock tone="neutral" eyebrow="기록 요약" title={note.summary}>
                <p className="text-sm leading-7 text-[color:var(--muted)]">
                  기록에서 다음 복습 신호를 정리합니다. 판정이나 자동 채점 결과를 제공하지 않습니다.
                </p>
              </ArtifactBlock>

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
                        <StudyCue>{resolvedDetail.item.subjectLabel}</StudyCue>
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
                <SourceBlock label="정답 / 근거" value={resolvedDetail.item.correctAnswer} />
                <SourceBlock label="내 답 / 선택" value={resolvedDetail.item.userAnswer} />
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
            </div>
          </details>
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

      {taxonomyCandidate ? (
        <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
          <p className="text-caption text-[color:var(--muted)]">시험 범위 후보</p>
          <p className="mt-1 text-xs leading-6 text-[color:var(--muted)]">
            이 분류는 자동 제안이며, 확정 분류가 아닙니다.
          </p>
          <p className="mt-3 text-sm text-[color:var(--foreground-strong)]">
            {taxonomyCandidate.subject} · {taxonomyCandidate.unit} · {taxonomyCandidate.topic}
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">평가 스킬: {taxonomyCandidate.examSkill}</p>
        </section>
      ) : null}

      {!firstOxReview ? (
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
      ) : null}

      <ReviewOsFeedbackButton route={`/app/items/${itemId}`} pageContext={{ itemId, isSecond }} />
    </div>
  );
}

function formatMatchedFieldLabels(
  fields: Array<"subject" | "topic_candidate" | "mistake_type" | "weak_structure_point" | "issue_tags" | "skill_tags" | "skeleton">,
) {
  const fieldLabelMap: Record<(typeof fields)[number], string> = {
    subject: "과목",
    topic_candidate: "논점 후보",
    mistake_type: "오류 유형",
    weak_structure_point: "구조 약점",
    issue_tags: "논점 태그",
    skill_tags: "답안 기술",
    skeleton: "학습용 skeleton",
  };
  return fields.map((field) => fieldLabelMap[field]);
}

type FirstOxReviewDetail = {
  statement: string;
  stem: string | null;
  userChoice: string;
  expectedChoice: string | null;
  statusLabel: "낮은 확신" | "확신 오답" | "오답" | "근거 확인 필요";
  statusCopy: string;
  biggestSignal: string;
  retryHref: string;
  conceptCard?: ConceptReviewCardPayload;
};

function isKnownOx(value: string | undefined | null): value is "O" | "X" {
  return value === "O" || value === "X";
}

function splitFirstOxRawQuestionText(rawQuestionText: string | undefined | null) {
  const lines = (rawQuestionText ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { statement: "저장된 원문 선지가 없습니다. 다음 retry에서 선지를 다시 확인합니다.", stem: null };
  if (lines.length === 1) return { statement: lines[0], stem: null };
  return { statement: lines.at(-1) ?? lines.join("\n"), stem: lines.slice(0, -1).join("\n") };
}

function resolveFirstOxStatus(item: WrongAnswerItemRecord): Pick<FirstOxReviewDetail, "statusLabel" | "statusCopy" | "biggestSignal"> {
  const expectedKnown = isKnownOx(item.correctAnswer);
  const userKnown = isKnownOx(item.userAnswer);
  const lowConfidence = item.confidence === "낮음";
  if (!expectedKnown || !userKnown) {
    return {
      statusLabel: "근거 확인 필요",
      statusCopy: "정답 확정 전, 판단 기준을 먼저 확인하는 항목입니다.",
      biggestSignal: "기대 판단 확정 전 기준 확인",
    };
  }
  if (item.userAnswer === item.correctAnswer && lowConfidence) {
    return {
      statusLabel: "낮은 확신",
      statusCopy: "맞혔더라도 다시 볼 가치가 있습니다.",
      biggestSignal: "맞혔지만 흔들린 조건 표현",
    };
  }
  if (item.userAnswer !== item.correctAnswer && !lowConfidence) {
    return {
      statusLabel: "확신 오답",
      statusCopy: "맞다고 믿은 기준이 실제 판단과 달랐습니다.",
      biggestSignal: "확신한 판단 기준의 불일치",
    };
  }
  return {
    statusLabel: "오답",
    statusCopy: "내 판단과 기대 판단이 달랐습니다.",
    biggestSignal: "내 선택과 기대 판단의 차이",
  };
}

function buildFirstOxReviewDetail(item: WrongAnswerItemRecord): FirstOxReviewDetail | null {
  const isFirstOx = item.conceptCard?.sourceType === "first_ox" || item.sourceLabel === "1차 O/X 역공학";
  if (!isFirstOx) return null;
  const raw = splitFirstOxRawQuestionText(item.rawQuestionText);
  const status = resolveFirstOxStatus(item);
  const expectedChoice = isKnownOx(item.correctAnswer) ? item.correctAnswer : null;
  const retryItemId = item.problemIdentifier ?? item.conceptCard?.statement_id ?? item.id;
  return {
    ...raw,
    userChoice: item.userAnswer === "unknown" ? "모름" : item.userAnswer,
    expectedChoice,
    ...status,
    retryHref: retryItemId ? `/app/first/ox?retryItemId=${encodeURIComponent(retryItemId)}` : "/app/first/ox",
    conceptCard: item.conceptCard,
  };
}

type ItemTaxonomyCandidate = {
  taxonomyNodeId: string | undefined;
  subject: string;
  unit: string;
  topic: string;
  examSkill: string;
};

function readTaxonomyClassificationPayload(
  payload: Record<string, unknown> | null | undefined,
): { primaryNodeId: string | null; candidates: ItemTaxonomyCandidate[] } | null {
  if (!payload || typeof payload !== "object") return null;
  const taxonomy = payload.taxonomyClassification;
  if (!taxonomy || typeof taxonomy !== "object") return null;
  const taxonomyRow = taxonomy as Record<string, unknown>;
  const candidates = Array.isArray(taxonomyRow.candidates)
    ? taxonomyRow.candidates
        .map((candidate) => {
          if (!candidate || typeof candidate !== "object") return null;
          const row = candidate as Record<string, unknown>;
          if (
            typeof row.subject !== "string" ||
            typeof row.unit !== "string" ||
            typeof row.topic !== "string" ||
            typeof row.examSkill !== "string"
          ) {
            return null;
          }
          return {
            taxonomyNodeId: typeof row.taxonomyNodeId === "string" ? row.taxonomyNodeId : undefined,
            subject: row.subject,
            unit: row.unit,
            topic: row.topic,
            examSkill: row.examSkill,
          } satisfies ItemTaxonomyCandidate;
        })
        .filter((candidate): candidate is ItemTaxonomyCandidate => Boolean(candidate))
    : [];

  return {
    primaryNodeId: typeof taxonomyRow.primaryNodeId === "string" ? taxonomyRow.primaryNodeId : null,
    candidates,
  };
}

function resolveTaxonomyCandidate(payload: { primaryNodeId: string | null; candidates: ItemTaxonomyCandidate[] } | null) {
  if (!payload) return null;
  if (payload.primaryNodeId) {
    const matched = payload.candidates.find((candidate) => candidate.taxonomyNodeId === payload.primaryNodeId);
    if (matched) return matched;
  }
  return payload.candidates[0] ?? null;
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

function SessionCompletionSummary({
  completedWork,
  biggestSignal,
  nextSchedule,
  primaryHref,
  primaryLabel,
  quietLinks,
}: {
  completedWork: string;
  biggestSignal: string;
  nextSchedule: string;
  primaryHref: string;
  primaryLabel: string;
  quietLinks: ReactNode;
}) {
  return (
    <section
      className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-5"
      data-testid="second-item-completion-summary"
    >
      <p className="text-sm font-medium text-[color:var(--foreground-strong)]">오늘 작업은 여기까지입니다.</p>
      <ul className="mt-2 space-y-1 text-sm text-[color:var(--foreground-strong)]">
        <li>오늘 한 일: {completedWork}</li>
        <li>가장 큰 신호: {biggestSignal}</li>
        <li>다음 예약 / 다음 복습: {nextSchedule}</li>
      </ul>
      <p className="mt-2 text-sm text-[color:var(--foreground-strong)]">지금은 종료해도 됩니다.</p>
      <div className="mt-4 space-y-3">
        <Link href={primaryHref} className="inline-flex w-full sm:w-auto">
          <Button type="button" className="w-full sm:w-auto">
            {primaryLabel}
          </Button>
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[color:var(--muted)]">{quietLinks}</div>
      </div>
    </section>
  );
}
