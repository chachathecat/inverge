"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, RotateCcw } from "lucide-react";

import { FeedbackPrompt } from "@/components/inverge/feedback-prompt";
import { FocusAudioControl } from "@/components/inverge/focus-audio-control";
import { Button, buttonVariants } from "@/components/ui/button";
import { postAppraisalFirst } from "@/lib/appraisal-first/client";
import { normalizeAppraisalFirstSubjectId } from "@/lib/appraisal-first/subject-id";
import { useAuthSession } from "@/lib/auth/client";
import { logInvergeEvent } from "@/lib/inverge/event-client";
import { cn } from "@/lib/utils";

type SubjectId = "civil_law" | "economics" | "real_estate" | "appraisal_law" | "accounting";
type ChoiceId = "1" | "2" | "3" | "4" | "5";
type AbilityAxis = "accuracy" | "timeManagement" | "choiceJudgment" | "lawRecall" | "calculationStability";
type ReviewPriority = "high" | "medium" | "low";
type ReviewReason =
  | "wrongAnswer"
  | "lowConfidence"
  | "timeOverrun"
  | "manualBookmark"
  | "lawRecallGap"
  | "calculationInstability";
type ReviewStatus = "queued" | "inReview" | "completed" | "skipped";
type PageStatus = "loading" | "ready" | "submitting" | "completed" | "error";

type ReviewChoice = {
  id: ChoiceId;
  text: string;
};

type ReviewQueueItem = {
  id: string;
  subjectId: SubjectId;
  setId: string;
  questionId: string;
  questionNumber: number;
  sourceLabel: string;
  stem: string;
  choices: ReviewChoice[];
  correctChoiceId: ChoiceId;
  selectedChoiceId: ChoiceId | null;
  confidence: "high" | "medium" | "low" | null;
  timeSpentSeconds: number;
  expectedTimeSeconds: number;
  priority: ReviewPriority;
  reasons: ReviewReason[];
  linkedAbilityAxes: AbilityAxis[];
  repeatedCount: number;
  shortDiagnosis: string;
  correctionPrompt: string;
  status: ReviewStatus;
  createdAt: string;
  reviewedAt?: string | null;
};

type ReviewCompletionPayload = {
  reviewId: string;
  subjectId: SubjectId;
  setId: string;
  questionId: string;
  priority: ReviewPriority;
  linkedAbilityAxes: AbilityAxis[];
  originalSelectedChoiceId: ChoiceId | null;
  reviewSelectedChoiceId: ChoiceId;
  correctChoiceId: ChoiceId;
  isCorrectOnReview: boolean;
  selectedReasons: ReviewReason[];
  memo: string | null;
  timeSpentSeconds: number;
  reviewedAt: string;
};

type ServerReviewQueueItem = {
  id?: string;
  subjectId?: string;
  setId?: string;
  questionId?: string;
  selectedChoiceId?: ChoiceId | null;
  confidence?: "high" | "medium" | "low" | null;
  elapsedSecondsOnQuestion?: number;
  reasonCodes?: string[];
  priority?: "today" | "this_week" | "maintenance";
  reviewReasonSentence?: string;
  recommendedReviewAction?: string;
  status?: "queued" | "in_review" | "completed" | "skipped";
  createdAt?: string;
};

type ServerReviewQueueResponse = {
  ok: boolean;
  data?: ServerReviewQueueItem[];
};

const SUBJECT_LABELS: Record<SubjectId, string> = {
  civil_law: "민법",
  economics: "경제학원론",
  real_estate: "부동산학원론",
  appraisal_law: "감정평가관계법규",
  accounting: "회계학",
};

const ABILITY_LABELS: Record<AbilityAxis, string> = {
  accuracy: "정확도",
  timeManagement: "시간 운영",
  choiceJudgment: "선지 판단",
  lawRecall: "법령 기억",
  calculationStability: "계산 안정성",
};

const PRIORITY_LABELS: Record<ReviewPriority, string> = {
  high: "오늘 먼저",
  medium: "이번 주",
  low: "다음 차례",
};

const REASON_OPTIONS: { value: ReviewReason; label: string }[] = [
  { value: "wrongAnswer", label: "조건을 놓쳤음" },
  { value: "lowConfidence", label: "확신이 낮았음" },
  { value: "lawRecallGap", label: "법령 기억이 흔들림" },
  { value: "calculationInstability", label: "판단 과정이 불안정함" },
  { value: "timeOverrun", label: "시간이 부족했음" },
];

function normalizeSubjectId(subjectId: string): SubjectId {
  return normalizeAppraisalFirstSubjectId(subjectId);
}

function toReviewReason(code: string): ReviewReason {
  if (code === "low_confidence" || code === "medium_confidence") return "lowConfidence";
  if (code === "time_overuse") return "timeOverrun";
  if (code === "flagged") return "manualBookmark";
  return "wrongAnswer";
}

function toReviewPriority(priority: string): ReviewPriority {
  if (priority === "today") return "high";
  if (priority === "this_week") return "medium";
  return "low";
}

function abilityAxesForSubject(subjectId: SubjectId): AbilityAxis[] {
  if (subjectId === "appraisal_law") return ["lawRecall", "choiceJudgment"];
  if (subjectId === "accounting" || subjectId === "economics") return ["calculationStability", "timeManagement"];
  return ["choiceJudgment", "accuracy"];
}

function buildItemsFromServer(items: ServerReviewQueueItem[], subjectId: SubjectId): ReviewQueueItem[] {
  return items
    .filter((item): item is ServerReviewQueueItem & { questionId: string; setId: string } => Boolean(item.questionId && item.setId))
    .map((item, index) => {
      const normalizedSubjectId = normalizeSubjectId(item.subjectId ?? subjectId);
      const reasonCodes = Array.isArray(item.reasonCodes) ? item.reasonCodes : [];
      const reasons = Array.from(new Set(reasonCodes.map(toReviewReason)));

      return {
        id: item.id ?? `review-${item.questionId}`,
        subjectId: normalizedSubjectId,
        setId: item.setId,
        questionId: item.questionId,
        questionNumber: index + 1,
        sourceLabel: "최근 기출 세트",
        stem: `${SUBJECT_LABELS[normalizedSubjectId]} 최근 세트에서 다시 확인이 필요한 문항입니다.`,
        choices: [
          { id: "1", text: "조건을 먼저 분리한다." },
          { id: "2", text: "단어만 보고 판단한다." },
          { id: "3", text: "선지를 끝까지 비교한다." },
          { id: "4", text: "시간이 부족하면 바로 넘어간다." },
          { id: "5", text: "판단 기준을 먼저 적는다." },
        ],
        correctChoiceId: normalizedSubjectId === "appraisal_law" ? "3" : "1",
        selectedChoiceId: item.selectedChoiceId ?? null,
        confidence: item.confidence ?? null,
        timeSpentSeconds: item.elapsedSecondsOnQuestion ?? 0,
        expectedTimeSeconds: 90,
        priority: toReviewPriority(item.priority ?? "maintenance"),
        reasons: reasons.length > 0 ? reasons : ["wrongAnswer"],
        linkedAbilityAxes: abilityAxesForSubject(normalizedSubjectId),
        repeatedCount: reasonCodes.includes("time_overuse") ? 1 : 0,
        shortDiagnosis:
          item.reviewReasonSentence ??
          (normalizedSubjectId === "appraisal_law"
            ? "법령 기준과 선지 비교를 한 번 더 정리할 필요가 있습니다."
            : "판단 기준을 다시 세우면 흔들림을 줄일 수 있습니다."),
        correctionPrompt: item.recommendedReviewAction ?? "정답보다 판단 순서를 먼저 고정해서 다시 보세요.",
        status: item.status === "in_review" ? "inReview" : item.status ?? "queued",
        createdAt: item.createdAt ?? new Date().toISOString(),
      };
    });
}

async function fetchReviewQueue(subjectId: SubjectId) {
  const response = await fetch(`/api/appraisal-first/review-queue?subjectId=${subjectId}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("review-queue-fetch-failed");
  }

  const result = (await response.json()) as ServerReviewQueueResponse;
  if (!result.ok || !result.data) {
    throw new Error("review-queue-invalid-response");
  }

  return result.data;
}

function sortQueueItems(items: ReviewQueueItem[]) {
  const priorityRank: Record<ReviewPriority, number> = { high: 0, medium: 1, low: 2 };
  return [...items].sort((a, b) => {
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }
    if (a.repeatedCount !== b.repeatedCount) {
      return b.repeatedCount - a.repeatedCount;
    }
    return b.timeSpentSeconds - a.timeSpentSeconds;
  });
}

function buildCompletionPayload(
  item: ReviewQueueItem,
  reviewSelectedChoiceId: ChoiceId,
  selectedReasons: ReviewReason[],
  memo: string,
): ReviewCompletionPayload {
  return {
    reviewId: item.id,
    subjectId: item.subjectId,
    setId: item.setId,
    questionId: item.questionId,
    priority: item.priority,
    linkedAbilityAxes: item.linkedAbilityAxes,
    originalSelectedChoiceId: item.selectedChoiceId,
    reviewSelectedChoiceId,
    correctChoiceId: item.correctChoiceId,
    isCorrectOnReview: reviewSelectedChoiceId === item.correctChoiceId,
    selectedReasons,
    memo: memo.trim() ? memo.trim() : null,
    timeSpentSeconds: item.timeSpentSeconds,
    reviewedAt: new Date().toISOString(),
  };
}

function Header({ subjectId, remainingCount }: { subjectId: SubjectId; remainingCount: number }) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-caption font-medium text-[color:var(--muted)]">{SUBJECT_LABELS[subjectId]} · 리뷰 큐</p>
        <h1 className="mt-3 text-h1 font-medium text-[color:var(--foreground-strong)]">지금 다시 볼 문제만 정리합니다.</h1>
        <p className="mt-4 max-w-2xl text-body text-[color:var(--muted)]">
          많이 보여주기보다, 방금 만든 세트 기록에서 바로 다시 볼 문제만 조용하게 남깁니다.
        </p>
      </div>
      <div className="rounded-full border border-[var(--border)] bg-[color:var(--surface)] px-4 py-2 text-caption text-[color:var(--muted-strong)]">
        남은 항목 {remainingCount}개
      </div>
    </header>
  );
}

function PriorityBadge({ priority }: { priority: ReviewPriority }) {
  return (
    <span className="inline-flex rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-1 text-caption text-[color:var(--muted-strong)]">
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

function ActiveReviewCard({
  item,
  selectedChoiceId,
  selectedReasons,
  memo,
  hasSubmitted,
  onSelectChoice,
  onToggleReason,
  onMemoChange,
  onSubmitReview,
  onNext,
  canSubmit,
  isSubmitting,
}: {
  item: ReviewQueueItem;
  selectedChoiceId: ChoiceId | null;
  selectedReasons: ReviewReason[];
  memo: string;
  hasSubmitted: boolean;
  onSelectChoice: (choiceId: ChoiceId) => void;
  onToggleReason: (reason: ReviewReason) => void;
  onMemoChange: (memo: string) => void;
  onSubmitReview: () => void;
  onNext: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
}) {
  return (
    <section className="animate-in-up rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-soft)] sm:p-8">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={item.priority} />
            {item.linkedAbilityAxes.slice(0, 2).map((axis) => (
              <span key={axis} className="text-caption text-[color:var(--muted)]">
                {ABILITY_LABELS[axis]}
              </span>
            ))}
          </div>
          <h2 className="mt-4 text-h2 font-medium text-[color:var(--foreground-strong)]">오늘 다시 볼 항목</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{item.shortDiagnosis}</p>
        </div>
        <p className="text-caption text-[color:var(--muted)]">
          {item.sourceLabel} · {item.questionNumber}번
        </p>
      </div>

      <div className="py-6">
        <p className="text-caption font-medium text-[color:var(--muted)]">문항</p>
        <p className="mt-3 text-body font-medium text-[color:var(--foreground-strong)]">{item.stem}</p>
        <div className="mt-5 space-y-2">
          {item.choices.map((choice) => {
            const isSelected = selectedChoiceId === choice.id;
            const isCorrect = hasSubmitted && choice.id === item.correctChoiceId;
            const isOriginal = choice.id === item.selectedChoiceId;

            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => {
                  if (!hasSubmitted) onSelectChoice(choice.id);
                }}
                disabled={hasSubmitted}
                className={cn(
                  "flex w-full items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition",
                  isSelected
                    ? "border-[var(--primary)] bg-[color:var(--primary-soft)]"
                    : "border-[var(--border)] bg-[color:var(--surface)] hover:border-[var(--border-strong)]",
                  hasSubmitted && isCorrect ? "border-[color:var(--status-green)] bg-[color:var(--status-green-soft)]" : "",
                )}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-caption">
                  {choice.id}
                </span>
                <span className="flex-1 text-sm leading-6 text-[color:var(--foreground)]">{choice.text}</span>
                {isOriginal ? <span className="text-caption text-[color:var(--muted)]">이전 선택</span> : null}
                {hasSubmitted && isCorrect ? <Check className="mt-1 h-4 w-4 text-[color:var(--status-green)]" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {!hasSubmitted ? (
        <div className="border-t border-[var(--border)] pt-5">
          <p className="text-caption font-medium text-[color:var(--muted)]">다시 볼 기준</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{item.correctionPrompt}</p>
        </div>
      ) : (
        <>
          <ReviewResultPanel item={item} selectedChoiceId={selectedChoiceId} selectedReasons={selectedReasons} memo={memo} />
          <FeedbackPrompt
            trigger="first_review_completed"
            context={{
              examId: "appraisal_first",
              stage: "first",
              subjectId: item.subjectId,
              setId: item.setId,
              reviewId: item.id,
            }}
            className="mt-4"
          />
        </>
      )}

      <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        {!hasSubmitted ? (
          <>
            <ReviewReasonSelector selectedReasons={selectedReasons} onToggle={onToggleReason} />
            <Button type="button" onClick={onSubmitReview} disabled={!canSubmit || isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "정리 중" : "리뷰 완료"}
            </Button>
          </>
        ) : (
          <>
            <ReviewMemoField value={memo} onChange={onMemoChange} />
            <Button type="button" onClick={onNext} className="w-full sm:w-auto">
              다음 항목 보기
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

function ReviewReasonSelector({
  selectedReasons,
  onToggle,
}: {
  selectedReasons: ReviewReason[];
  onToggle: (reason: ReviewReason) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap gap-2">
        {REASON_OPTIONS.map((option) => {
          const selected = selectedReasons.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={cn(
                "rounded-full border px-3 py-2 text-caption transition",
                selected
                  ? "border-[var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--foreground-strong)]"
                  : "border-[var(--border)] text-[color:var(--muted)] hover:border-[var(--border-strong)]",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReviewMemoField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="min-w-0 flex-1">
      <span className="text-caption font-medium text-[color:var(--muted)]">짧은 메모</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={120}
        placeholder="다음 세트 전에 기억할 기준을 한 줄 남겨 보세요."
        className="mt-2 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 text-sm outline-none transition placeholder:text-[color:var(--muted)] focus:border-[var(--primary)]"
      />
    </label>
  );
}

function ReviewResultPanel({
  item,
  selectedChoiceId,
  selectedReasons,
  memo,
}: {
  item: ReviewQueueItem;
  selectedChoiceId: ChoiceId | null;
  selectedReasons: ReviewReason[];
  memo: string;
}) {
  const isCorrect = selectedChoiceId === item.correctChoiceId;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4">
      <p className="text-caption font-medium text-[color:var(--muted)]">리뷰 결과</p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-strong)]">
        {isCorrect ? "이번에는 판단 기준이 더 안정적으로 잡혔습니다." : "한 번 더 점검할 필요가 있습니다. 정답보다 판단 순서를 먼저 고정해 두세요."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-caption text-[color:var(--muted)]">
        <span>정답 {item.correctChoiceId}번</span>
        {selectedReasons.length ? <span>선택 이유 {selectedReasons.length}개</span> : null}
        {memo.trim() ? <span>메모 저장</span> : null}
      </div>
    </div>
  );
}

function QueueList({
  items,
  activeItemId,
  onSelectItem,
}: {
  items: ReviewQueueItem[];
  activeItemId: string | null;
  onSelectItem: (itemId: string) => void;
}) {
  if (!items.length) return null;

  return (
    <details className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-5 py-4">
      <summary className="cursor-pointer text-sm font-medium text-[color:var(--foreground-strong)]">남은 항목 보기</summary>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectItem(item.id)}
            className={cn(
              "flex w-full items-center justify-between gap-4 rounded-[var(--radius-sm)] px-3 py-3 text-left text-sm transition",
              activeItemId === item.id
                ? "bg-[color:var(--primary-soft)] text-[color:var(--foreground-strong)]"
                : "text-[color:var(--muted)] hover:bg-[color:var(--surface-soft)]",
            )}
          >
            <span className="min-w-0 truncate">
              {item.sourceLabel} · {item.questionNumber}번
            </span>
            <span className="shrink-0 text-caption">{PRIORITY_LABELS[item.priority]}</span>
          </button>
        ))}
      </div>
    </details>
  );
}

function LoadingState() {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8">
      <div className="h-3 w-28 rounded-full bg-[color:var(--surface-muted)]" />
      <div className="mt-6 h-8 w-3/4 rounded-full bg-[color:var(--surface-muted)]" />
      <div className="mt-4 h-3 w-full rounded-full bg-[color:var(--surface-muted)]" />
      <p className="mt-8 text-sm text-[color:var(--muted)]">다시 볼 항목을 정리하고 있습니다.</p>
    </section>
  );
}

function EmptyState({ subjectId }: { subjectId: SubjectId }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8 sm:p-10">
      <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">지금 바로 볼 리뷰 항목은 없습니다.</h2>
      <p className="mt-3 max-w-xl text-body text-[color:var(--muted)]">
        최근 세트 기록이 아직 없거나, 이번 세트에서 바로 다시 볼 문제를 남기지 않았습니다.
      </p>
      <Link href={`/exams/appraisal-first/${subjectId}/past-set/intro-10`} className={cn(buttonVariants({ size: "lg" }), "mt-7 w-full sm:w-auto")}>
        기출 세트로 이동
      </Link>
    </section>
  );
}

function CompletedState({ subjectId, completedCount }: { subjectId: SubjectId; completedCount: number }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8 sm:p-10">
      <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">오늘의 리뷰를 마쳤습니다.</h2>
      <p className="mt-3 max-w-xl text-body text-[color:var(--muted)]">
        완료한 항목은 기록과 주간 코칭에 반영됩니다. 다음 세트에서 같은 기준을 다시 확인할 수 있습니다.
      </p>
      <div className="mt-4 text-caption text-[color:var(--muted)]">완료한 항목 {completedCount}개</div>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link href={`/exams/appraisal-first/${subjectId}/past-set/intro-10`} className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
          기출 세트로 이동
        </Link>
        <Link href="/exams/appraisal-first/weekly-coaching" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
          주간 코칭 보기
        </Link>
      </div>
    </section>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8">
      <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">리뷰 큐를 불러오지 못했습니다.</h2>
      <p className="mt-3 text-body text-[color:var(--muted)]">운영 데이터는 서버에서 다시 불러옵니다. 잠시 뒤 다시 시도해 주세요.</p>
      <Button type="button" onClick={onRetry} className="mt-6">
        다시 시도
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </Button>
    </section>
  );
}

export function AppraisalFirstReviewQueuePage({ subjectId }: { subjectId: string }) {
  const safeSubjectId = normalizeSubjectId(subjectId);
  const session = useAuthSession();
  const isAuthBlocked = session.authEnabled && !session.isAuthenticated;
  const [status, setStatus] = useState<PageStatus>("loading");
  const [queueItems, setQueueItems] = useState<ReviewQueueItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<ChoiceId | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<ReviewReason[]>([]);
  const [memo, setMemo] = useState("");
  const [hasSubmittedCurrentReview, setHasSubmittedCurrentReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      if (isAuthBlocked) {
        if (!cancelled) {
          setQueueItems([]);
          setActiveItemId(null);
          setStatus("error");
        }
        return;
      }

      if (!cancelled) {
        setStatus("loading");
        setQueueItems([]);
        setActiveItemId(null);
      }

      try {
        const serverItems = await fetchReviewQueue(safeSubjectId);
        if (cancelled) return;

        const items = sortQueueItems(buildItemsFromServer(serverItems, safeSubjectId));
        setQueueItems(items);
        setActiveItemId(items[0]?.id ?? null);
        setSelectedChoiceId(null);
        setSelectedReasons(items[0]?.reasons.slice(0, 1) ?? []);
        setMemo("");
        setHasSubmittedCurrentReview(false);
        setStatus(items.length ? "ready" : "completed");
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [isAuthBlocked, safeSubjectId, session.userId]);

  const activeItem = useMemo(() => queueItems.find((item) => item.id === activeItemId) ?? null, [activeItemId, queueItems]);
  const remainingItems = queueItems.filter((item) => item.status === "queued" || item.status === "inReview");
  const completedCount = queueItems.filter((item) => item.status === "completed").length;
  const canSubmit = Boolean(activeItem && selectedChoiceId && status !== "submitting");

  function resetCurrentInput(nextItem?: ReviewQueueItem | null) {
    setSelectedChoiceId(null);
    setSelectedReasons(nextItem?.reasons.slice(0, 1) ?? []);
    setMemo("");
    setHasSubmittedCurrentReview(false);
  }

  function handleSelectItem(itemId: string) {
    const nextItem = queueItems.find((item) => item.id === itemId) ?? null;
    setActiveItemId(itemId);
    resetCurrentInput(nextItem);
  }

  function handleToggleReason(reason: ReviewReason) {
    setSelectedReasons((current) =>
      current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason],
    );
  }

  function handleSubmitReview() {
    if (!activeItem || !selectedChoiceId) return;

    setStatus("submitting");
    window.setTimeout(async () => {
      try {
        const payload = buildCompletionPayload(activeItem, selectedChoiceId, selectedReasons, memo);
        const saved = await postAppraisalFirst<ReviewCompletionPayload>("/api/appraisal-first/review-completions", payload);
        if (!saved) {
          throw new Error("review-completion-save-failed");
        }

        logInvergeEvent("first.review_item.completed", {
          examId: "appraisal_first",
          subjectId: safeSubjectId,
          setId: payload.setId,
          questionId: payload.questionId,
          reviewId: payload.reviewId,
          stage: "first",
          properties: {
            priority: payload.priority,
            isCorrectOnReview: payload.isCorrectOnReview,
            selectedReasonCount: payload.selectedReasons.length,
            linkedAbilityAxisCount: payload.linkedAbilityAxes.length,
          },
        });

        setQueueItems((current) =>
          current.map((item) =>
            item.id === activeItem.id ? { ...item, status: "completed", reviewedAt: payload.reviewedAt } : item,
          ),
        );
        setHasSubmittedCurrentReview(true);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }, 250);
  }

  function handleNext() {
    const nextItem = queueItems.find((item) => item.status === "queued");
    if (!nextItem) {
      setActiveItemId(null);
      setStatus("completed");
      return;
    }

    setActiveItemId(nextItem.id);
    resetCurrentInput(nextItem);
  }

  function handleRetry() {
    setStatus("loading");
    setActiveItemId(null);
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-6 text-[color:var(--foreground)] sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6">
        <Header subjectId={safeSubjectId} remainingCount={remainingItems.length} />
        <div className="flex justify-end">
          <FocusAudioControl />
        </div>

        {status === "loading" ? <LoadingState /> : null}
        {status === "error" ? <ErrorState onRetry={handleRetry} /> : null}
        {status === "completed" ? <CompletedState subjectId={safeSubjectId} completedCount={completedCount} /> : null}
        {status === "ready" || status === "submitting" ? (
          activeItem ? (
            <>
              <ActiveReviewCard
                item={activeItem}
                selectedChoiceId={selectedChoiceId}
                selectedReasons={selectedReasons}
                memo={memo}
                hasSubmitted={hasSubmittedCurrentReview}
                onSelectChoice={setSelectedChoiceId}
                onToggleReason={handleToggleReason}
                onMemoChange={setMemo}
                onSubmitReview={handleSubmitReview}
                onNext={handleNext}
                canSubmit={canSubmit}
                isSubmitting={status === "submitting"}
              />
              <QueueList items={remainingItems} activeItemId={activeItemId} onSelectItem={handleSelectItem} />
            </>
          ) : (
            <EmptyState subjectId={safeSubjectId} />
          )
        ) : null}
      </div>
    </main>
  );
}
