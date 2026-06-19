"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExecutionResultControls } from "@/components/review-os/execution-result-controls";
import { MicroPracticeCard } from "@/components/review-os/minimal-study-system";
import type { AppraisalMode } from "@/lib/review-os/appraisal";
import type { ExecutionReferenceSupport } from "@/lib/review-os/execution-reference-support";
import type { ReferenceSnippet } from "@/lib/review-os/reference-context";
import { buildSecondRewriteComparison } from "@/lib/review-os/second-rewrite-comparison";
import { SECOND_REWRITE_CASIO_UNSUPPORTED_MESSAGE } from "@/lib/review-os/second-answer-rewrite";
import { resolveAdaptiveReviewSchedule, type AdaptiveScheduleResult } from "@/lib/review-os/scheduling";
import {
  FIRST_STAGE_ERROR_REASON_OPTIONS,
  getSecondSubjectTemplate,
  type ReviewCompletionAction,
  type ReviewCompletionMetadata,
  type ReviewQueueCard,
  type TodayFocus,
} from "@/lib/review-os/types";

type SessionNote = {
  summary: string;
  weakPoint: string;
  weakStructurePoint?: string | null;
  missingIssue: string | null;
  rewriteInstruction: string | null;
  coreLine: string;
  nextReviewDate: string;
  calculationRisk?: string | null;
  unitRisk?: string | null;
  rewriteTaskType?: string | null;
  supportedCalculatorTemplateId?: string | null;
  casioKeystrokes?: string[] | null;
  casioUnsupportedMessage?: string | null;
  referenceSnippets?: ReferenceSnippet[];
};

type TodaySessionRunnerProps = {
  mode: AppraisalMode;
  modeLabel: string;
  focus: TodayFocus;
  queueItem: ReviewQueueCard | null;
  note: SessionNote | null;
  referenceSupport?: ExecutionReferenceSupport | null;
};

type TrapCard = { trapType: string; prompt: string; recallPoint: string; caution: string };
export const SECOND_LOOP_TOKENS = ["쟁점 회상", "가장 큰 간극 1개", "문단 1개만 다시 씁니다.", "전후 비교", "다음 보강 예약"] as const;
export const FIRST_LOOP_TOKENS = ["핵심 조건 회상", "짧은 재풀이", "틀린 이유 1개", "근거 1문장"] as const;
const FIRST_TRAP_CATEGORIES = ["요건 누락", "원칙/예외 혼동", "선지 끝 조건 오독", "계산/단위 실수", "그래프/공식 조건 혼동", "조문/절차 순서 혼동"] as const;

function buildFirstRoundTrapCards(subject: string, support: ExecutionReferenceSupport | null | undefined): TrapCard[] {
  if (!support) return [];
  const topic = support.topicCandidate ?? support.similarTopicSuggestion[0] ?? "핵심 조건";
  const hint = support.skeletonKeywordHint ?? support.skeletonKeywords[0] ?? support.skeletonKeywordHints[0] ?? "선지 판단 전 조건 표시";
  const gap = support.commonGaps[0] ?? "조건 문장 1개 회상";
  return FIRST_TRAP_CATEGORIES.slice(0, 3).map((trapType, index) => ({
    trapType,
    prompt: `[${subject}] ${topic} · ${trapType} 함정을 1문장으로 회상하세요.`,
    recallPoint: `${trapType} 관점으로 '${hint}'부터 확인합니다.`,
    caution: `주의: ${index === 0 ? gap : "공식 기출이 아닌 유사 함정 회상 카드입니다."}`,
  }));
}

export function TodaySessionRunner({ mode, modeLabel, focus, queueItem, note, referenceSupport }: TodaySessionRunnerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [adaptiveScheduleNote, setAdaptiveScheduleNote] = useState<AdaptiveScheduleResult | null>(null);

  const [retryDraft, setRetryDraft] = useState("");
  const [errorReason, setErrorReason] = useState("");
  const [retrievalSentence, setRetrievalSentence] = useState("");
  const [checkedTrapTypes, setCheckedTrapTypes] = useState<string[]>([]);

  const [issueRecall, setIssueRecall] = useState("");
  const [rewriteParagraph, setRewriteParagraph] = useState("");
  const secondTemplate = getSecondSubjectTemplate(queueItem?.subjectLabel ?? "");
  const secondRewriteComparison = useMemo(
    () =>
      mode === "second"
        ? buildSecondRewriteComparison({
            subject: queueItem?.subjectLabel ?? "",
            beforeWeakPoint: note?.weakPoint,
            missingIssue: note?.missingIssue,
            skeletonKeywordHint: referenceSupport?.skeletonKeywordHint ?? referenceSupport?.skeletonKeywordHints[0] ?? null,
            commonGaps: referenceSupport?.commonGaps,
            rewriteParagraph,
          })
        : null,
    [mode, note?.missingIssue, note?.weakPoint, queueItem?.subjectLabel, referenceSupport?.commonGaps, referenceSupport?.skeletonKeywordHint, referenceSupport?.skeletonKeywordHints, rewriteParagraph],
  );
  const hasQueueItem = Boolean(queueItem);
  const steps = useMemo(() => {
    if (!hasQueueItem) {
      return ["intro", "capture-guide", "done"] as const;
    }
    return mode === "second"
      ? (["intro", "issue-recall", "rewrite", "one-gap", "schedule", "done"] as const)
      : (["intro", "retrieval", "retry", "similar-practice", "error-reason", "schedule", "done"] as const);
  }, [hasQueueItem, mode]);

  const currentStep = steps[stepIndex];
  const biggestSignal =
    mode === "second"
      ? note?.missingIssue ?? note?.weakPoint ?? "누락 논점 1개를 먼저 보강할 시점입니다."
      : errorReason || note?.weakPoint || "선지 판단 전에 조건 확인이 필요합니다.";
  const completedWorkLabel = hasQueueItem
    ? mode === "second"
      ? "오늘은 여기까지 해도 됩니다."
      : "오늘은 여기까지 해도 됩니다."
    : mode === "second"
      ? "2차 작성 워크스페이스 시작 준비를 마쳤습니다."
      : "1차 입력 루프 시작 준비를 마쳤습니다.";
  const firstTrapCards = useMemo(() => (mode === "first" ? buildFirstRoundTrapCards(queueItem?.subjectLabel ?? "1차", referenceSupport) : []), [mode, queueItem?.subjectLabel, referenceSupport]);

  async function completeAndFinish(action: ReviewCompletionAction, metadata: ReviewCompletionMetadata = {}) {
    if (!queueItem) {
      setStepIndex(steps.length - 1);
      return;
    }

    setPending(true);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/os/review-queue/${queueItem.queueId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, metadata }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        setErrorMessage(data?.message ?? "복습 예약 중 문제가 있었습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const scheduleHint = resolveAdaptiveReviewSchedule({
        mode,
        confidence: queueItem.confidence,
        recurrenceCount: queueItem.recurrenceCount,
        mistakeType: queueItem.mistakeType,
        taskType: mode === "second" ? "rewrite" : "retry",
        completedAction: action,
        trapCardsCompleted: metadata.trapCardsCompleted,
        rewriteComparisonRisk: secondRewriteComparison?.remainingRisk,
      });
      setAdaptiveScheduleNote(scheduleHint);
      setStepIndex(steps.length - 1);
    } finally {
      setPending(false);
    }
  }

  const quietLinks = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[color:var(--muted)]">
      <Link href={`/app?mode=${mode}`} className="underline-offset-2 hover:underline">
        오늘 화면으로 돌아가기
      </Link>
      <Link href={`/app/review?mode=${mode}`} className="underline-offset-2 hover:underline">
        다른 작업 보기
        <span className="sr-only">rewrite 저장하러 이동</span>
      </Link>
    </div>
  );

  return (
    <Card className="border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-none">
      <CardHeader className="space-y-3 p-4 sm:p-6">
        <p className="text-caption text-[color:var(--muted)]">Today Session Runner · {modeLabel}</p>
        <CardTitle>오늘은 이것만 합니다.</CardTitle>
        <CardDescription>{focus.reason}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        {currentStep === "intro" ? (
          <section className="space-y-4">
            <MicroPracticeCard title="지금 시작할 작업">
              <p className="text-body-lg text-[color:var(--foreground-strong)]">{focus.primaryTaskLabel}</p>
              <p className="mt-2 text-sm text-[color:var(--textBody)]">예상 {focus.estimatedDurationMinutes}분</p>
            </MicroPracticeCard>
            <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">{focus.nextAction}</p>
            {mode === "second" ? (
              <section className="space-y-3 rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-4">
                <p className="text-caption text-[color:var(--muted)]">다시쓰기 목표 1개</p>
                <div className="grid gap-3">
                  <div>
                    <p className="text-xs text-[color:var(--muted)]">가장 큰 누락/위험 1개</p>
                    <p className="mt-1 text-sm font-medium leading-6 text-[color:var(--foreground-strong)]">{note?.missingIssue ?? note?.calculationRisk ?? "누락 논점 1개를 먼저 확인합니다."}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[color:var(--muted)]">약한 답안 구조 1개</p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-strong)]">{note?.weakStructurePoint ?? note?.weakPoint ?? "근거와 결론 연결을 한 문장으로 보강합니다."}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[color:var(--muted)]">다시쓰기 지시 1개</p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-strong)]">{note?.rewriteInstruction ?? secondTemplate.rewriteGuidance}</p>
                  </div>
                </div>
                <details className="rounded-[var(--radius-md)] border border-[color:var(--border-hairline)] bg-[color:var(--bg-surface)]">
                  <summary className="cursor-pointer px-3 py-2 text-xs text-[color:var(--muted)]">관련 학습 구조 / 참고 근거 보기 (선택)<span className="sr-only">참고 근거 힌트 보기 (선택)</span></summary>
                  <div className="border-t border-[color:var(--border-hairline)] px-3 py-3 text-xs leading-5 text-[color:var(--muted)]">
                    {note?.referenceSnippets?.length ? note.referenceSnippets.slice(0, 2).map((snippet) => (
                      <p key={snippet.referenceId} className="mb-2"><span className="font-medium text-[color:var(--foreground-strong)]">{snippet.title}</span> · {snippet.snippet}</p>
                    )) : <p>정답 확정이 아니라, 누락 논점 1개를 확인하는 짧은 참고 힌트입니다.</p>}
                  </div>
                </details>
                <details className="rounded-[var(--radius-md)] border border-[color:var(--border-hairline)] bg-[color:var(--bg-surface)]">
                  <summary className="cursor-pointer px-3 py-2 text-xs text-[color:var(--muted)]">계산/CASIO 세부 보기</summary>
                  <div className="space-y-2 border-t border-[color:var(--border-hairline)] px-3 py-3 text-xs leading-5 text-[color:var(--foreground-strong)]">
                    {note?.unitRisk ? <p>단위 위험: {note.unitRisk}</p> : null}
                    {note?.casioKeystrokes?.length ? (
                      <div>
                        <p>CASIO FX-9860GIII 타건 순서</p>
                        <ol className="mt-1 list-decimal space-y-1 pl-5">
                          {note.casioKeystrokes.map((step, index) => <li key={`${step}-${index}`}>{step}</li>)}
                        </ol>
                      </div>
                    ) : (
                      <p>{note?.casioUnsupportedMessage ?? SECOND_REWRITE_CASIO_UNSUPPORTED_MESSAGE}</p>
                    )}
                  </div>
                </details>
              </section>
            ) : null}
            <Button type="button" className="w-full sm:w-auto" onClick={() => setStepIndex((prev) => prev + 1)}>
              {hasQueueItem ? (mode === "second" ? "10분 다시 쓰기" : "추천 작업으로 시작") : mode === "second" ? "2차 작성 워크스페이스 시작" : "오늘 입력 작업 시작"}
            </Button>
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "retry" ? (
          <section className="space-y-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">2) 짧은 재풀이</p>
            <textarea
              className="min-h-28 w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm"
              value={retryDraft}
              onChange={(event) => setRetryDraft(event.target.value)}
              placeholder="핵심 근거 1~2줄로 다시 적습니다."
            />
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={retryDraft.trim().length < 4}
              onClick={() => setStepIndex((prev) => prev + 1)}
            >
              다음: 함정 카드 3개
            </Button>
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "error-reason" ? (
          <section className="space-y-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">2) 틀린 원인 1개만 지정합니다.</p>
            <div className="space-y-2">
              {FIRST_STAGE_ERROR_REASON_OPTIONS.map((reason) => (
                <label key={reason} className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] px-3 py-2 text-sm">
                  <input
                    type="radio"
                    className="mt-1"
                    name="session-error-reason"
                    checked={errorReason === reason}
                    onChange={() => setErrorReason(reason)}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={!errorReason}
              onClick={() => setStepIndex((prev) => prev + 1)}
            >
              다음: 회상 문장 작성
            </Button>
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "retrieval" ? (
          <section className="space-y-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">1) 해설 보기 전, 근거 1문장</p>
            <textarea
              className="min-h-24 w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm"
              value={retrievalSentence}
              onChange={(event) => setRetrievalSentence(event.target.value)}
              placeholder="예: 조건 A가 빠지면 결론이 달라진다."
            />
            {retrievalSentence.trim().length > 3 ? (
              <div className="rounded-[var(--radius-md)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] px-3 py-3 text-sm text-[color:var(--foreground-strong)]">
                설명: {note?.coreLine ?? "핵심 조건을 먼저 확인한 뒤 선지를 판단합니다."}
              </div>
            ) : null}
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={retrievalSentence.trim().length < 4}
              onClick={() => setStepIndex((prev) => prev + 1)}
            >
              근거 1문장 남기기
            </Button>
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "similar-practice" ? (
          <section className="space-y-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">3) 함정 카드 3개</p>
            {referenceSupport ? (
              <div className="space-y-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
                <p className="text-sm font-medium text-[color:var(--foreground-strong)]">함정 점검 카드</p>
                {firstTrapCards.map((card) => {
                  const checked = checkedTrapTypes.includes(card.trapType);
                  return (
                    <label key={card.trapType} className="block rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-3 text-sm">
                      <p className="font-medium text-[color:var(--foreground-strong)]">{card.prompt}</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-[color:var(--muted)]">기준/회상 포인트 보기</summary>
                        <p className="mt-1 text-xs text-[color:var(--foreground-strong)]">{card.recallPoint}</p>
                      </details>
                      <p className="mt-2 text-xs text-[color:var(--muted)]">{card.caution}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-[color:var(--foreground-strong)]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => setCheckedTrapTypes((prev) => event.target.checked ? [...prev, card.trapType] : prev.filter((type) => type !== card.trapType))}
                        />
                        확인
                      </div>
                    </label>
                  );
                })}
                <p className="text-xs text-[color:var(--muted)]">공식 기출 문제가 아니라, 같은 함정을 줄이기 위한 회상 카드입니다.</p>
              </div>
            ) : (
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3 text-sm text-[color:var(--foreground-strong)]">
                유사 지문 연습 준비
              </div>
            )}
            <Button type="button" className="w-full sm:w-auto" disabled={firstTrapCards.length === 3 && checkedTrapTypes.length !== 3} onClick={() => setStepIndex((prev) => prev + 1)}>
              다음: 틀린 이유 1개 선택
            </Button>
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "issue-recall" ? (
          <section className="space-y-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">1) 쟁점 1개 회상</p>
            <p className="text-sm leading-7 text-[color:var(--muted)]">이 과목은 먼저 이 구조로 답안을 잡습니다. {secondTemplate.structure}</p>
            <textarea
              className="min-h-28 w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm"
              value={issueRecall}
              onChange={(event) => setIssueRecall(event.target.value)}
              placeholder={secondTemplate.issueRecallPlaceholder}
            />
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={issueRecall.trim().length < 4}
              onClick={() => setStepIndex((prev) => prev + 1)}
            >
              다음: 문단 1개 다시쓰기
            </Button>
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "one-gap" ? (
          <section className="space-y-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">3) 전후 비교</p>
            <div className="rounded-[var(--radius-md)] border border-[color:var(--cue-risk)] bg-[color:var(--cue-risk-bg)] px-4 py-3">
              <p className="text-caption text-[color:var(--muted)]">one biggest gap</p>
              <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">{note?.missingIssue ?? note?.weakPoint ?? "누락 논점 1개"}</p>
            </div>
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              {note?.rewriteInstruction ?? secondTemplate.rewriteGuidance}
            </p>
            <Button type="button" className="w-full sm:w-auto" onClick={() => setStepIndex((prev) => prev + 1)}>
              다음 보강 예약
            </Button>
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "rewrite" ? (
          <section className="space-y-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">2) 문단 1개 다시쓰기</p>
            <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">
              가장 큰 간극 1개를 기준으로 문단 1개만 보강합니다.
            </p>
            <textarea
              className="min-h-24 w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm"
              value={rewriteParagraph}
              onChange={(event) => setRewriteParagraph(event.target.value)}
              placeholder="보강 문단 1개를 여기에 적습니다."
            />
            {referenceSupport ? (
              <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3 text-sm text-[color:var(--foreground-strong)]">
                <p className="text-caption text-[color:var(--muted)]">문단 보강 힌트</p>
                <p className="mt-1">키워드 힌트: {referenceSupport.skeletonKeywordHint ?? referenceSupport.skeletonKeywordHints[0] ?? "핵심 키워드 1개 먼저 고정"}</p>
                <p className="mt-1">누락 쟁점 후보: {referenceSupport.missingIssue ?? "누락 논점 1개"}</p>
                <p className="mt-1">자주 빠지는 간극: {referenceSupport.commonGaps[0] ?? "적용 문장 1개 추가"}</p>
                <p className="mt-1">시작 문장: 따라서 본 문단에서는 [요건]을 먼저 밝히고 [사실관계]에 연결한다.</p>
                <p className="mt-2 text-xs text-[color:var(--muted)]">점수 판정이 아니라, 문단 보강을 돕는 참고 힌트입니다.</p>
              </div>
            ) : null}
            <div className="rounded-[var(--radius-md)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] px-4 py-3 text-sm text-[color:var(--foreground-strong)]">
              <p className="text-caption text-[color:var(--muted)]">전후 비교</p>
              <p className="mt-1">before: {note?.missingIssue ?? note?.weakPoint ?? "보강할 약점 1개"}</p>
              <p className="mt-1">after: {rewriteParagraph.trim() || "작성한 보강 문단"}</p>
            </div>
            {secondRewriteComparison ? (
              <div className="rounded-[var(--radius-md)] border border-[color:var(--cue-review)] bg-[color:var(--cue-review-bg)] px-4 py-3 text-sm text-[color:var(--foreground-strong)]">
                <p className="font-medium">좋아진 점 1개</p>
                <p className="mt-1">{secondRewriteComparison.improvedPoint}</p>
                <p className="mt-3 font-medium">아직 위험한 점 1개</p>
                <p className="mt-1">{secondRewriteComparison.remainingRisk}</p>
                <p className="mt-3 font-medium">다음 문장 행동 1개</p>
                <p className="mt-1">{secondRewriteComparison.nextSentenceAction}</p>
                <p className="mt-3 font-medium">다음 보강 예약</p>
                <p className="mt-1">{note?.nextReviewDate ?? "복습 큐 기본 일정"}</p>
                <p className="mt-2 text-xs text-[color:var(--muted)]">{secondRewriteComparison.caution}</p>
              </div>
            ) : null}
            <button
              type="button"
              className="text-xs text-[color:var(--muted)] underline-offset-2 hover:underline"
              disabled={pending || rewriteParagraph.trim().length < 8}
              onClick={() => setStepIndex((prev) => prev + 1)}
            >
              {referenceSupport ? "힌트 보고 문단 1개 다시 쓰기" : "문단 1개만 보강"}
            </button>
            {errorMessage ? <p className="text-xs text-[color:var(--danger)]">{errorMessage}</p> : null}
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "schedule" ? (
          <section className="space-y-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">다음 복습은 기본값으로 자동 예약합니다.</p>
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3 text-sm text-[color:var(--foreground-strong)]">
              예정 시점: {note?.nextReviewDate ?? "복습 큐 기본 일정"}
              <p className="mt-2 text-xs text-[color:var(--muted)]">이유: {adaptiveScheduleNote?.explanation ?? "복습 신호를 기준으로 자동 조정됩니다."}</p>
            </div>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() =>
                void completeAndFinish(mode === "second" ? "second_paragraph_rewrite" : "first_short_retry", {
                  retryDraft,
                  errorReason,
                  retrievalSentence,
                  ...(mode === "second" ? { rewriteParagraph, rewriteInstruction: note?.rewriteInstruction ?? secondTemplate.rewriteGuidance } : {}),
                  ...(mode === "first" ? { trapCardsCompleted: checkedTrapTypes.length === 3, trapTypes: checkedTrapTypes } : {}),
                })
              }
            >
              {pending ? "예약 중" : mode === "second" ? "다음 보강 예약" : "다음 복습 예약"}
            </Button>
            {errorMessage ? <p className="text-xs text-[color:var(--danger)]">{errorMessage}</p> : null}
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "capture-guide" ? (
          <section className="space-y-4">
            {mode === "second" ? (
              <div className="space-y-3">
                <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">
                  오늘 queue가 아직 없어 먼저 기록 1건을 남기면 session 루프가 시작됩니다.
                </p>
                <div className="rounded-[var(--radius-md)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] px-4 py-3 text-sm text-[color:var(--foreground-strong)]">
                  <p>참고 정리 보기 전에 쟁점 3개를 먼저 떠올립니다.</p>
                  <p>전체 답안보다 목차를 먼저 잡습니다.</p>
                  <p>비교는 작성 이후에 합니다.</p>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">
                오늘 queue가 아직 없어 먼저 기록 1건을 남기면 session 루프가 시작됩니다.
              </p>
            )}
            <Link href={mode === "first" ? "/app/sets?mode=first" : `/app/write?mode=${mode}`} className="inline-flex w-full sm:w-auto">
              <Button type="button" className="w-full sm:w-auto">
                {mode === "second" ? "2차 작성 워크스페이스로 이동" : "세트 풀이 시작"}
              </Button>
            </Link>
            {mode === "first" ? (
              <Link
                href="/app/capture?mode=first"
                className="inline-flex text-xs text-[color:var(--muted)] underline-offset-2 hover:underline"
              >
                오답 1개만 빠르게 기록
              </Link>
            ) : null}
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "done" ? (
          <section className="space-y-4">
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-4">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">오늘은 여기까지 해도 됩니다.</p>
              <ul className="mt-2 space-y-1 text-sm text-[color:var(--foreground-strong)]">
                <li>오늘 한 일: {completedWorkLabel}</li>
                <li>가장 큰 신호: {biggestSignal}</li>
                <li>다음 복습: {adaptiveScheduleNote?.nextReviewDate ?? note?.nextReviewDate ?? "자동 예약 완료"}</li>
                <li>이유: {adaptiveScheduleNote?.explanation ?? "복습 신호를 기준으로 자동 조정됩니다."}</li>
              </ul>
              <p className="mt-2 text-sm text-[color:var(--foreground-strong)]">밀린 걸 전부 따라잡으려 하지 마세요.</p>
              <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">오늘은 가장 작은 것 1개만 복구합니다.</p>
              <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">새 범위보다 반복 실수 하나를 줄이는 게 우선입니다.</p>
            </div>
            <ExecutionResultControls
              examMode={mode}
              taskType={mode === "second" ? note?.rewriteTaskType ?? "rewrite" : "O/X"}
              subjectName={queueItem?.subjectLabel}
              unitName={queueItem?.topicTag}
              executionSource="session"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={`/app?mode=${mode}`} className="w-full sm:w-auto">
                <Button type="button" className="w-full sm:w-auto">
                  종료하고 오늘 화면으로
                </Button>
              </Link>
              <Link href={`/app/weekly?mode=${mode}`} className="text-xs text-[color:var(--muted)] underline-offset-2 hover:underline">
                주간 정리 보기
              </Link>
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
