"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppraisalMode } from "@/lib/review-os/appraisal";
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
  missingIssue: string | null;
  rewriteInstruction: string | null;
  coreLine: string;
  nextReviewDate: string;
};

type TodaySessionRunnerProps = {
  mode: AppraisalMode;
  modeLabel: string;
  focus: TodayFocus;
  queueItem: ReviewQueueCard | null;
  note: SessionNote | null;
};

export function TodaySessionRunner({ mode, modeLabel, focus, queueItem, note }: TodaySessionRunnerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [retryDraft, setRetryDraft] = useState("");
  const [errorReason, setErrorReason] = useState("");
  const [retrievalSentence, setRetrievalSentence] = useState("");

  const [issueRecall, setIssueRecall] = useState("");
  const [rewriteParagraph, setRewriteParagraph] = useState("");
  const secondTemplate = getSecondSubjectTemplate(queueItem?.subjectLabel ?? "");
  const hasQueueItem = Boolean(queueItem);
  const steps = useMemo(() => {
    if (!hasQueueItem) {
      return ["intro", "capture-guide", "done"] as const;
    }
    return mode === "second"
      ? (["intro", "issue-recall", "one-gap", "rewrite", "schedule", "done"] as const)
      : (["intro", "retry", "error-reason", "retrieval", "similar-practice", "schedule", "done"] as const);
  }, [hasQueueItem, mode]);

  const currentStep = steps[stepIndex];
  const biggestSignal =
    mode === "second"
      ? note?.missingIssue ?? note?.weakPoint ?? "누락 논점 1개를 먼저 보강할 시점입니다."
      : errorReason || note?.weakPoint || "선지 판단 전에 조건 확인이 필요합니다.";
  const completedWorkLabel = hasQueueItem
    ? mode === "second"
      ? "오늘 선택한 2차 보강 작업 1건을 완료 처리했습니다."
      : "오늘 선택한 재시도 작업 1건을 완료 처리했습니다."
    : mode === "second"
      ? "2차 작성 워크스페이스 시작 준비를 마쳤습니다."
      : "1차 입력 루프 시작 준비를 마쳤습니다.";

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
      </Link>
    </div>
  );

  return (
    <Card className="border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-none">
      <CardHeader className="space-y-3 p-4 sm:p-6">
        <p className="text-caption text-[color:var(--muted)]">Today Session Runner · {modeLabel}</p>
        <CardTitle>오늘 최우선 작업을 한 번에 끝냅니다.</CardTitle>
        <CardDescription>{focus.reason}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        {currentStep === "intro" ? (
          <section className="space-y-4">
            <div className="rounded-[var(--radius-md)] border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] px-4 py-3">
              <p className="text-caption text-[color:var(--brand-800)]">지금 시작할 작업</p>
              <p className="mt-1 text-body-lg text-[color:var(--foreground-strong)]">
                {focus.primaryTaskLabel}
              </p>
              <p className="mt-2 text-sm text-[color:var(--foreground-strong)]">예상 {focus.estimatedDurationMinutes}분</p>
            </div>
            <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">{focus.nextAction}</p>
            <Button type="button" className="w-full sm:w-auto" onClick={() => setStepIndex((prev) => prev + 1)}>
              {hasQueueItem ? "추천 작업으로 시작" : mode === "second" ? "2차 작성 워크스페이스 시작" : "오늘 입력 작업 시작"}
            </Button>
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "retry" ? (
          <section className="space-y-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">1) 핵심 조건 회상 후 짧은 재풀이를 적습니다.</p>
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
              다음: 틀린 이유 1개 선택
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
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">3) 근거 1문장을 남깁니다.</p>
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
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">4) 유사 지문 3개 연습은 선택입니다.</p>
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3 text-sm text-[color:var(--foreground-strong)]">
              유사 지문 연습 준비
            </div>
            <Button type="button" className="w-full sm:w-auto" onClick={() => setStepIndex((prev) => prev + 1)}>
              다음 복습 예약
            </Button>
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "issue-recall" ? (
          <section className="space-y-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">1) 모범답안 보기 전, 쟁점 회상 문장을 적습니다.</p>
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
              다음: 가장 큰 간극 확인
            </Button>
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "one-gap" ? (
          <section className="space-y-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">2) 오늘은 가장 큰 간극 1개만 보강합니다.</p>
            <div className="rounded-[var(--radius-md)] border border-[color:var(--cue-risk)] bg-[color:var(--cue-risk-bg)] px-4 py-3">
              <p className="text-caption text-[color:var(--muted)]">one biggest gap</p>
              <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">{note?.missingIssue ?? note?.weakPoint ?? "누락 논점 1개"}</p>
            </div>
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              {note?.rewriteInstruction ?? secondTemplate.rewriteGuidance}
            </p>
            <Button type="button" className="w-full sm:w-auto" onClick={() => setStepIndex((prev) => prev + 1)}>
              다음: 문단 교정 작성
            </Button>
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "rewrite" ? (
          <section className="space-y-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">3) 문단 1개만 다시 씁니다.</p>
            <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">
              가장 큰 간극 1개를 기준으로 문단 1개만 보강합니다.
            </p>
            <textarea
              className="min-h-24 w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm"
              value={rewriteParagraph}
              onChange={(event) => setRewriteParagraph(event.target.value)}
              placeholder="보강 문단 1개를 여기에 적습니다."
            />
            <div className="rounded-[var(--radius-md)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] px-4 py-3 text-sm text-[color:var(--foreground-strong)]">
              <p className="text-caption text-[color:var(--muted)]">전후 비교</p>
              <p className="mt-1">before: {note?.missingIssue ?? note?.weakPoint ?? "보강할 약점 1개"}</p>
              <p className="mt-1">after: {rewriteParagraph.trim() || "작성한 보강 문단"}</p>
            </div>
            <button
              type="button"
              className="text-xs text-[color:var(--muted)] underline-offset-2 hover:underline"
              disabled={pending || rewriteParagraph.trim().length < 8}
              onClick={() => setStepIndex((prev) => prev + 1)}
            >
              문단 1개만 보강
            </button>
            {errorMessage ? <p className="text-xs text-[color:var(--danger)]">{errorMessage}</p> : null}
            {quietLinks}
          </section>
        ) : null}

        {currentStep === "schedule" ? (
          <section className="space-y-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">다음 복습은 기본값으로 자동 예약합니다.</p>
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3 text-sm text-[color:var(--foreground-strong)]">
              예정 시점: {note?.nextReviewDate ?? "review queue 기본 일정"}
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
                  <p>기준 답안 보기 전에 쟁점 3개를 먼저 떠올립니다.</p>
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
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">오늘 작업은 여기까지입니다.</p>
              <ul className="mt-2 space-y-1 text-sm text-[color:var(--foreground-strong)]">
                <li>오늘 한 일: {completedWorkLabel}</li>
                <li>가장 큰 신호: {biggestSignal}</li>
                <li>다음 복습: {note?.nextReviewDate ?? "자동 예약 완료"}</li>
              </ul>
              <p className="mt-2 text-sm text-[color:var(--foreground-strong)]">지금은 종료해도 됩니다.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={`/app?mode=${mode}`} className="w-full sm:w-auto">
                <Button type="button" className="w-full sm:w-auto">
                  종료하고 오늘 화면으로
                </Button>
              </Link>
              <Link href={`/app/review?mode=${mode}`} className="text-xs text-[color:var(--muted)] underline-offset-2 hover:underline">
                다시 볼 항목 확인
              </Link>
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
