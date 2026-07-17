"use client";

import { useRouter } from "next/navigation";
import type { ButtonHTMLAttributes } from "react";
import { useState } from "react";

import { V3ActionButton, V3Surface } from "@/components/learner";
import { SmartClozeReview } from "@/components/review-os/smart-cloze-review";
import { Button } from "@/components/ui/button";
import {
  getRecallOutcomeCopy,
  getRetrievalPrompt,
  getSuggestedReviewIntervalCopy,
  RECALL_OUTCOME_OPTIONS,
} from "@/lib/review-os/retrieval-review";
import type { RecallOutcome, ReviewCompletionMetadata, ReviewQueueCard } from "@/lib/review-os/types";

function QueueActionButton({
  mode,
  tone = "primary",
  legacyVariant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  mode: "first" | "second";
  tone?: "primary" | "secondary" | "quiet";
  legacyVariant?: "default" | "outline" | "ghost";
}) {
  if (mode === "second") {
    return <V3ActionButton tone={tone} {...props} />;
  }
  return <Button variant={legacyVariant} {...props} />;
}

export function ReviewQueueClient({
  items,
  mode,
  captureReferenceLineByItemId = {},
}: {
  items: ReviewQueueCard[];
  mode: "first" | "second";
  captureReferenceLineByItemId?: Record<string, string>;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [inlineErrorByQueueId, setInlineErrorByQueueId] = useState<Record<string, string>>({});
  const [recallAttemptTextByQueueId, setRecallAttemptTextByQueueId] = useState<Record<string, string>>({});
  const [revealedHintByQueueId, setRevealedHintByQueueId] = useState<Record<string, boolean>>({});
  const [recallOutcomeByQueueId, setRecallOutcomeByQueueId] = useState<Record<string, RecallOutcome | null>>({});

  async function complete(queueId: string) {
    const item = items.find((candidate) => candidate.queueId === queueId);
    if (!item) return;
    const selectedAction = item.examName === "감정평가사 2차" ? "second_paragraph_rewrite" : "first_confirm_recall";
    const metadata = buildReviewCompletionMetadata(
      recallAttemptTextByQueueId[queueId] ?? "",
      recallOutcomeByQueueId[queueId] ?? null,
    );
    setInlineErrorByQueueId((prev) => ({ ...prev, [queueId]: "" }));
    setPendingId(queueId);
    try {
      const response = await fetch(`/api/os/review-queue/${queueId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: selectedAction, metadata }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        setInlineErrorByQueueId((prev) => ({
          ...prev,
          [queueId]: data?.message ?? "복습 완료 저장 중 문제가 있었습니다. 잠시 후 다시 시도해 주세요.",
        }));
        return;
      }
      router.refresh();
    } catch {
      setInlineErrorByQueueId((prev) => ({
        ...prev,
        [queueId]: "네트워크 연결을 확인한 뒤 다시 시도해 주세요. 복습 완료는 아직 저장되지 않았습니다.",
      }));
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    if (mode === "second") {
      return (
        <V3Surface tone="subtle" className="space-y-4">
          <div data-review-empty-state>
            <h2 className="v3-type-section text-[var(--color-text-primary)]">지금 복습할 항목이 없습니다.</h2>
            <p className="v3-type-body mt-2 text-[var(--color-text-secondary)]">오늘 한 것을 올리면 복습할 항목이 만들어집니다.</p>
            <p className="v3-type-compact mt-1 text-[var(--color-text-secondary)]">저장된 학습 노트의 가장 큰 약점과 다음 행동이 복습 예정으로 이어집니다.</p>
            <V3ActionButton
              type="button"
              onClick={() => router.push("/app/capture?mode=second")}
              className="mt-5"
            >
              오늘 한 것 올리기
            </V3ActionButton>
          </div>
        </V3Surface>
      );
    }
    return (
      <div
        className="rounded-[var(--radius-lg)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] p-6 text-sm leading-7 text-[color:var(--ink-muted)]"
        data-review-empty-state
      >
        <h2 className="text-base font-semibold text-[color:var(--foreground-strong)]">지금 복습할 항목이 없습니다.</h2>
        <p className="mt-2">오늘 한 것을 올리면 복습할 항목이 만들어집니다.</p>
        <p className="mt-1">저장된 학습 노트의 가장 큰 약점과 다음 행동이 복습 예정으로 이어집니다.</p>
        <Button
          type="button"
          onClick={() => router.push("/app/capture?mode=first")}
          className="mt-4 w-full sm:w-auto"
        >
          오늘 한 것 올리기
        </Button>
      </div>
    );
  }

  const primaryItem = items[0]!;
  const candidateItems = items.slice(1);
  const visibleCandidateItems = candidateItems.slice(0, 3);
  const hiddenCandidateCount = Math.max(candidateItems.length - visibleCandidateItems.length, 0);
  const primaryNextAction = getReviewNextAction(primaryItem);
  const primaryRecallText = recallAttemptTextByQueueId[primaryItem.queueId] ?? "";
  const primaryOutcome = recallOutcomeByQueueId[primaryItem.queueId] ?? null;
  const hasRevealedHint = Boolean(revealedHintByQueueId[primaryItem.queueId]) || primaryRecallText.trim().length > 0;
  const retrievalPrompt = getRetrievalPrompt(primaryItem, mode);

  return (
    <div
      className="space-y-4"
      data-s224v-surface-fragment="review-queue"
      data-s224v-primary-cta-count-above-fold="1"
      data-s224v-visible-primary-work-items-max="1"
      data-s232d4-review-queue
    >
      <section
        className={mode === "second"
          ? "rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-5 sm:p-6"
          : "rounded-[var(--radius-lg)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-elevated)] p-4 sm:p-5"}
        data-v3-component={mode === "second" ? "Surface" : undefined}
        data-review-primary-surface
        data-s232d4-review-primary
      >
        <div className="space-y-5">
          <header className="space-y-3" data-s232d4-review-meta>
            <span className={mode === "second"
              ? "v3-type-caption text-[var(--color-text-secondary)]"
              : "inline-flex w-fit rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-3 py-1 text-xs text-[color:var(--muted)]"}>
              지금 복습할 1개
            </span>
            <p className={mode === "second" ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-xs leading-5 text-[color:var(--muted)]"}>
              복습 예정 · {primaryItem.createdFromCapture ? "학습 노트에서 생성됨" : "미완료 항목"} · {primaryItem.subjectLabel}
            </p>
            <h2 className={mode === "second" ? "v3-type-section ko-keep text-[var(--color-text-primary)]" : "text-base font-medium leading-7 text-[color:var(--foreground-strong)] sm:text-lg"}>
              {primaryItem.problemTitle}
            </h2>
          </header>

          <div className="space-y-3" data-review-why-next>
            <section
              className={mode === "second"
                ? "border-t border-[var(--color-border-default)] pt-4"
                : "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3"}
              data-s232d4-review-reason
            >
              <p className={mode === "second" ? "v3-type-label text-[var(--color-text-secondary)]" : "text-xs font-medium text-[color:var(--muted)]"}>복습 이유</p>
              <p className={mode === "second" ? "v3-type-body ko-keep mt-1 text-[var(--color-text-primary)]" : "mt-1 text-sm leading-6 text-[color:var(--foreground-strong)]"}>{getReviewReason(primaryItem)}</p>
            </section>
            <section
              className={mode === "second"
                ? "border-t border-[var(--color-border-default)] pt-4"
                : "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3"}
              data-s232d4-review-next-action
            >
              <p className={mode === "second" ? "v3-type-label text-[var(--color-text-secondary)]" : "text-xs font-medium text-[color:var(--muted)]"}>다음 행동</p>
              <p className={mode === "second" ? "v3-type-body ko-keep mt-1 text-[var(--color-text-primary)]" : "mt-1 text-sm leading-6 text-[color:var(--foreground-strong)]"}>{primaryNextAction}</p>
            </section>
          </div>

          <section
            className={mode === "second"
              ? "rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-elevated)] p-4"
              : "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-4"}
            data-review-retrieval-step="recall"
            data-s232d4-review-recall
          >
            <p className={mode === "second" ? "v3-type-caption text-[var(--color-text-brand)]" : "text-xs font-semibold text-[color:var(--muted)]"}>1. 먼저 떠올리기</p>
            <p className={mode === "second" ? "v3-type-body-strong ko-keep mt-2 text-[var(--color-text-primary)]" : "mt-2 text-sm font-medium leading-6 text-[color:var(--foreground-strong)]"}>
              {mode === "second" ? "문단/기준 먼저 떠올리기" : "먼저 떠올리기"}
            </p>
            <p className={mode === "second" ? "v3-type-body ko-keep mt-1 text-[var(--color-text-primary)]" : "mt-1 text-sm leading-7 text-[color:var(--foreground-strong)]"}>{retrievalPrompt}</p>
            <textarea
              value={primaryRecallText}
              onChange={(event) =>
                setRecallAttemptTextByQueueId((prev) => ({
                  ...prev,
                  [primaryItem.queueId]: event.target.value,
                }))
              }
              rows={3}
              className={mode === "second"
                ? "v3-type-body mt-3 min-h-[var(--control-height)] w-full rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] px-4 py-3 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--focus-ring)]"
                : "mt-3 w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)] px-3 py-2 text-sm leading-6 text-[color:var(--foreground-strong)] outline-none focus:border-[color:var(--brand-700)]"}
              placeholder="답을 보기 전, 기억나는 기준을 먼저 적어보세요."
              aria-label="복습 전 먼저 떠올린 내용"
              data-review-recall-input
            />
            {!hasRevealedHint ? (
              <QueueActionButton
                mode={mode}
                type="button"
                onClick={() => setRevealedHintByQueueId((prev) => ({ ...prev, [primaryItem.queueId]: true }))}
                className="mt-3 w-full sm:w-auto"
                data-s224v-dominant-primary-action
                data-s232d4-confirm-action
              >
                확인하기
              </QueueActionButton>
            ) : mode === "second" ? (
              <p className="v3-type-caption mt-3 text-[var(--color-text-stable)]" role="status">
                먼저 떠올린 내용을 확인했습니다.
              </p>
            ) : null}
          </section>

          {hasRevealedHint ? (
            <section
              className={mode === "second"
                ? "rounded-[var(--v3-radius-control)] border border-[var(--color-border-focus)] bg-[var(--color-background-focus)] p-4"
                : "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-4"}
              data-review-retrieval-step="check"
              data-s232d4-review-check
            >
              <p className={mode === "second" ? "v3-type-caption text-[var(--color-text-brand)]" : "text-xs font-semibold text-[color:var(--muted)]"}>2. 확인하기</p>
              <div className={mode === "second" ? "v3-type-body ko-keep mt-2 space-y-2 text-[var(--color-text-primary)]" : "mt-2 space-y-2 text-sm leading-7 text-[color:var(--foreground-strong)]"}>
                <p>이유: {getReviewReason(primaryItem)}</p>
                <p>다음 행동: {primaryNextAction}</p>
              </div>
              {primaryItem.examName === "감정평가사 1차" &&
              primaryItem.rawQuestionText &&
              (primaryItem.conceptCard?.reviewStage === "빈칸" || primaryItem.clozeCandidate) ? (
                <div className="mt-3">
                  <SmartClozeReview
                    statement={primaryItem.rawQuestionText}
                    trapWords={primaryItem.conceptCard?.trapWords ?? (primaryItem.clozeCandidate ? [primaryItem.clozeCandidate] : [])}
                    conceptCandidate={primaryItem.clozeCandidate}
                  />
                </div>
              ) : null}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <QueueActionButton
                  mode={mode}
                  tone="secondary"
                  legacyVariant="outline"
                  type="button"
                  onClick={() => router.push(`/app/items/${primaryItem.itemId}?mode=${mode}`)}
                  className="w-full sm:w-auto"
                >
                  학습 노트 보기
                </QueueActionButton>
              </div>
              <details
                className={mode === "second"
                  ? "group mt-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-elevated)] p-3"
                  : "quiet-disclosure mt-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3"}
                data-v3-component={mode === "second" ? "QuietDisclosure" : undefined}
                data-review-extra-signals
                data-s224v-secondary-diagnostics
              >
                <summary className={mode === "second"
                  ? "v3-type-label-strong flex min-h-11 cursor-pointer items-center text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  : "cursor-pointer text-xs font-medium text-[color:var(--muted)]"}>복습 근거 보기</summary>
                <ul className={mode === "second" ? "v3-type-compact mt-2 space-y-1 text-[var(--color-text-secondary)]" : "mt-2 space-y-1 text-xs leading-5 text-[color:var(--muted)]"}>
                  {buildDetailedSignals(primaryItem, captureReferenceLineByItemId[primaryItem.itemId]).map((signal) => (
                    <li key={signal}>• {signal}</li>
                  ))}
                </ul>
              </details>
            </section>
          ) : (
            <p className={mode === "second"
              ? "v3-type-compact rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-4 text-[var(--color-text-secondary)]"
              : "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-3 text-xs leading-5 text-[color:var(--muted)]"}>
              복습 근거와 학습 노트는 먼저 떠올린 뒤 확인합니다.
            </p>
          )}

          {hasRevealedHint ? (
            <section
              className={mode === "second"
                ? "rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-4"
                : "rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-4"}
              data-review-retrieval-step="self-rating"
              data-s232d4-review-self-rating
            >
              <p className={mode === "second" ? "v3-type-caption text-[var(--color-text-brand)]" : "text-xs font-semibold text-[color:var(--muted)]"}>3. 자기평가</p>
              <p className={mode === "second" ? "v3-type-body ko-keep mt-2 text-[var(--color-text-primary)]" : "mt-2 text-sm leading-7 text-[color:var(--foreground-strong)]"}>
                이 평가는 점수가 아니라 다음 복습 간격을 정하기 위한 학습 신호입니다.
              </p>
              <div className={mode === "second" ? "mt-3 grid gap-2 lg:grid-cols-4" : "mt-3 grid gap-2 sm:grid-cols-4"} role="group" aria-label="복습 자기평가">
                {RECALL_OUTCOME_OPTIONS.map((option) => (
                  <QueueActionButton
                    mode={mode}
                    tone={mode === "second" ? "secondary" : primaryOutcome === option.value ? "primary" : "secondary"}
                    legacyVariant={primaryOutcome === option.value ? "default" : "outline"}
                    key={option.value}
                    type="button"
                    onClick={() => setRecallOutcomeByQueueId((prev) => ({ ...prev, [primaryItem.queueId]: option.value }))}
                    className={mode === "second" && primaryOutcome === option.value
                      ? "border-[var(--color-border-focus)] bg-[var(--color-background-brand-soft)] px-3 text-[var(--color-text-brand)] ring-2 ring-[var(--color-border-focus)]"
                      : "h-9 px-3 text-xs"}
                    aria-pressed={primaryOutcome === option.value}
                    data-review-recall-outcome={option.value}
                    data-v3-selected={mode === "second" && primaryOutcome === option.value ? "true" : undefined}
                  >
                    {mode === "second" && primaryOutcome === option.value ? <span aria-hidden="true">✓&nbsp;</span> : null}
                    {option.label}
                  </QueueActionButton>
                ))}
              </div>
              {primaryOutcome ? (
                <div
                  className={mode === "second"
                    ? "v3-type-compact mt-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] p-4 text-[var(--color-text-primary)]"
                    : "mt-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-3 text-xs leading-6 text-[color:var(--muted)]"}
                  data-review-interval-suggestion
                  data-v3-state={mode === "second" ? "interval-suggestion" : undefined}
                  role="status"
                >
                  <p>
                    선택: {getRecallOutcomeCopy(primaryOutcome)} · 제안: {getSuggestedReviewIntervalCopy(primaryOutcome)}
                  </p>
                  <p>표시된 간격은 학습 제안입니다. 복습 완료를 누르면 선택한 자기평가가 함께 저장됩니다.</p>
                </div>
              ) : null}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <QueueActionButton
                  mode={mode}
                  type="button"
                  onClick={() => void complete(primaryItem.queueId)}
                  disabled={pendingId === primaryItem.queueId || !primaryOutcome}
                  className="w-full sm:w-auto"
                  aria-label={`복습 완료: ${primaryItem.problemTitle}`}
                  data-s232d4-review-completion
                >
                  {pendingId === primaryItem.queueId ? "복습 완료 저장 중" : "복습 완료"}
                </QueueActionButton>
                {!primaryOutcome ? <p className={mode === "second" ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-xs text-[color:var(--muted)]"}>자기평가를 고르면 복습 완료를 저장할 수 있습니다.</p> : null}
              </div>
              {inlineErrorByQueueId[primaryItem.queueId] ? (
                <p
                  role="alert"
                  className={mode === "second" ? "v3-type-caption mt-2 text-[var(--color-text-risk)]" : "mt-2 text-xs text-[color:var(--danger)]"}
                >
                  {inlineErrorByQueueId[primaryItem.queueId]}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>

      {candidateItems.length > 0 ? (
        <details
          className={mode === "second"
            ? "group rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-elevated)] p-4"
            : "quiet-disclosure rounded-[var(--radius-lg)] border border-[color:var(--border-hairline)] bg-[color:var(--surface)] p-4"}
          data-v3-component={mode === "second" ? "QuietDisclosure" : undefined}
          data-review-secondary-list
          data-s224v-secondary-diagnostics
          data-s232d4-review-secondary-list
        >
          <summary className={mode === "second"
            ? "v3-type-label-strong flex min-h-11 cursor-pointer list-none items-center text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            : "cursor-pointer list-none text-sm font-semibold text-[color:var(--foreground-strong)]"}>
            다음 복습 보기
            {hiddenCandidateCount > 0 ? <span className={mode === "second" ? "v3-type-caption ml-2 text-[var(--color-text-secondary)]" : "ml-2 text-xs font-medium text-[color:var(--muted)]"}>외 {hiddenCandidateCount}개 접힘</span> : null}
          </summary>
          <ul className="mt-3 divide-y divide-[color:var(--border-hairline)]">
            {visibleCandidateItems.map((item) => (
              <li key={item.queueId} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className={mode === "second" ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-xs text-[color:var(--muted)]"}>
                    복습 예정 · {item.createdFromCapture ? "학습 노트에서 생성됨" : "미완료 항목"} · {item.subjectLabel}
                  </p>
                  <p className={mode === "second" ? "v3-type-body-strong mt-1 truncate text-[var(--color-text-primary)]" : "mt-1 truncate text-sm font-medium text-[color:var(--foreground-strong)]"}>{item.problemTitle}</p>
                  <p className={mode === "second" ? "v3-type-compact mt-1 text-[var(--color-text-secondary)]" : "mt-1 text-xs text-[color:var(--muted)]"}>복습 이유: {getReviewReason(item)}</p>
                  <p className={mode === "second" ? "v3-type-compact mt-1 text-[var(--color-text-secondary)]" : "mt-1 text-xs text-[color:var(--muted)]"}>다음 행동: {getReviewNextAction(item)}</p>
                </div>
                <div className={mode === "second" ? "flex flex-col gap-2 sm:shrink-0 sm:flex-row" : "flex gap-2 sm:shrink-0"}>
                  <QueueActionButton mode={mode} tone="secondary" legacyVariant="outline" type="button" onClick={() => router.push(`/app/items/${item.itemId}?mode=${mode}`)} className={mode === "second" ? "min-h-11 px-3 text-xs" : "h-9 px-3 text-xs"}>
                    학습 노트 보기
                  </QueueActionButton>
                  <QueueActionButton
                    mode={mode}
                    tone="quiet"
                    legacyVariant="ghost"
                    type="button"
                    onClick={() => void complete(item.queueId)}
                    disabled={pendingId === item.queueId}
                    className={mode === "second" ? "min-h-11 px-3 text-xs" : "h-9 px-3 text-xs"}
                    aria-label={`복습 완료: ${item.problemTitle}`}
                  >
                    {pendingId === item.queueId ? "처리 중" : "복습 완료"}
                  </QueueActionButton>
                </div>
                {inlineErrorByQueueId[item.queueId] ? (
                  <p
                    role="alert"
                    className={mode === "second" ? "v3-type-caption text-[var(--color-text-risk)]" : "text-xs text-[color:var(--danger)]"}
                  >
                    {inlineErrorByQueueId[item.queueId]}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function buildReviewCompletionMetadata(recallAttemptText: string, recallOutcome: RecallOutcome | null): ReviewCompletionMetadata {
  const retrievalSentence = recallAttemptText.trim();
  return {
    ...(retrievalSentence ? { retrievalSentence } : {}),
    ...(recallOutcome
      ? {
          recallOutcome,
          suggestedReviewInterval: getSuggestedReviewIntervalCopy(recallOutcome),
          retrievalReviewVersion: "v1" as const,
        }
      : {}),
  };
}

function getReviewNextAction(item: ReviewQueueCard) {
  return item.examName === "감정평가사 2차" ? "문단 하나 다시쓰기" : "놓친 조건 1개 회상 후 짧은 재시도";
}

function getReviewReason(item: ReviewQueueCard) {
  return item.createdFromCapture ? "방금 남긴 기록이라 기억이 남아 있을 때 바로 연결합니다." : item.reviewReason;
}

function buildDetailedSignals(item: ReviewQueueCard, captureReferenceLine?: string): string[] {
  const signals = [
    `상태: 복습 예정`,
    `출처: ${item.createdFromCapture ? "학습 노트에서 생성됨" : "미완료 항목"}`,
    `복습 이유: ${item.reviewReason}`,
    `실수 유형: ${item.mistakeType}`,
  ];
  if (item.recurrenceCount >= 2) signals.push(`반복 신호: ${item.recurrenceCount}회`);
  if (item.confidence) signals.push(`확신도: ${item.confidence}`);
  if (typeof item.timeSpentSeconds === "number") signals.push(`풀이 시간: ${item.timeSpentSeconds}초`);
  if (captureReferenceLine) signals.push(`오늘 한 것 참고: ${captureReferenceLine}`);
  signals.push("복습 완료를 누르면 이 항목은 현재 복습 목록에서 빠집니다.");
  return signals;
}
