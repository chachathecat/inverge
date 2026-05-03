import type { ConfidenceLevel, ReviewQueueCard } from "@/lib/review-os/types";

export type TodayPlanTaskType = "retry" | "rewrite" | "review" | "recall";

export type TodayPlanTask = {
  itemId: string;
  title: string;
  reason: string;
  one_biggest_gap: string;
  one_next_action: string;
  task_type: TodayPlanTaskType;
  estimated_minutes: number;
  priority_reason: string;
};

type BuildInput = { mode: "first" | "second"; queue: ReviewQueueCard[]; now?: Date };

const DAY_MS = 86_400_000;

function confidenceBoost(confidence: ConfidenceLevel) {
  if (confidence === "낮음") return 18;
  if (confidence === "보통") return 8;
  return 0;
}

function resolveTaskType(mode: "first" | "second", item: ReviewQueueCard): TodayPlanTaskType {
  const rewriteSignal = /rewrite|재작성|다시쓰기|문단|논점 누락|누락/.test(`${item.reviewReason} ${item.mistakeType}`);
  if (mode === "second" && rewriteSignal) return "rewrite";
  if (/재시도|retry/.test(item.reviewReason)) return "retry";
  if (mode === "first" && item.confidence === "낮음") return "recall";
  return "review";
}

function toGap(item: ReviewQueueCard) {
  return `${item.mistakeType} 관련 간극 1개`;
}

function toNextAction(mode: "first" | "second", item: ReviewQueueCard, taskType: TodayPlanTaskType) {
  if (taskType === "rewrite") return `${item.problemTitle}에서 누락 논점 1개를 문단으로 다시 씁니다.`;
  if (taskType === "retry") return `${item.problemTitle}을 다시 풀고 근거 1줄을 남깁니다.`;
  if (taskType === "recall") return mode === "first" ? `${item.problemTitle} 핵심 조건 1개를 회상 후 재시도합니다.` : `${item.problemTitle} 핵심 논점 1개를 회상합니다.`;
  return `${item.problemTitle} 핵심 포인트 1개를 다시 확인합니다.`;
}

export function buildTodayPlanTasks({ mode, queue, now = new Date() }: BuildInput): TodayPlanTask[] {
  const ranked = queue
    .map((item) => {
      const dueTs = Date.parse(item.dueAt);
      const isOverdue = dueTs <= now.getTime();
      const overdueDays = isOverdue ? Math.max(1, Math.floor((now.getTime() - dueTs) / DAY_MS) + 1) : 0;
      const createdTs = Date.parse(item.itemCreatedAt);
      const createdRecently = now.getTime() - createdTs <= 2 * DAY_MS;
      const captureRecentBoost = item.createdFromCapture && createdRecently ? 9 : 0;
      const recurrenceBoost = Math.min(item.recurrenceCount, 4) * 7;
      const rewriteBoost = resolveTaskType(mode, item) === "rewrite" ? 14 : 0;
      const overdueBoost = isOverdue ? 50 + overdueDays * 6 : 0;
      const score = item.priorityScore * 0.2 + overdueBoost + captureRecentBoost + confidenceBoost(item.confidence) + recurrenceBoost + rewriteBoost;
      const priority_reason = isOverdue
        ? `예정 복습 시점이 지나 ${overdueDays}일 밀린 항목입니다.`
        : captureRecentBoost > 0
          ? "방금 남긴 캡처 기록이라 기억이 남아 있을 때 바로 연결합니다."
          : item.confidence === "낮음"
            ? "확신이 낮았던 항목이라 먼저 고정합니다."
            : item.recurrenceCount >= 2
              ? "반복 실수가 누적되어 먼저 줄입니다."
              : "오늘 학습 흐름을 유지하기 좋은 항목입니다.";
      return { item, score, priority_reason };
    })
    .sort((a, b) => b.score - a.score || Date.parse(a.item.dueAt) - Date.parse(b.item.dueAt));

  return ranked.slice(0, 3).map(({ item, priority_reason }) => {
    const taskType = resolveTaskType(mode, item);
    return {
      itemId: item.itemId,
      title: item.problemTitle,
      reason: priority_reason,
      one_biggest_gap: toGap(item),
      one_next_action: toNextAction(mode, item, taskType),
      task_type: taskType,
      estimated_minutes: taskType === "rewrite" ? 20 : taskType === "retry" ? 15 : 12,
      priority_reason,
    };
  });
}
