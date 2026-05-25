import type { ConfidenceLevel, LearningSignalEventRecord, ReviewQueueCard } from "@/lib/review-os/types";

export type TodayPlanTaskType = "retry" | "rewrite" | "review" | "recall";
export type TodayPlanDueBucket = "overdue" | "today" | "upcoming";

export type TodayPlanTask = {
  itemId: string;
  title: string;
  subject: string;
  exam_mode: "first" | "second";
  due_bucket: TodayPlanDueBucket;
  reason: string;
  one_biggest_gap: string;
  one_next_action: string;
  task_type: TodayPlanTaskType;
  estimated_minutes: number;
  priority_reason: string;
  created_from_capture: boolean;
  source_label?: string;
};

type BuildInput = { mode: "first" | "second"; queue: ReviewQueueCard[]; learningSignals?: LearningSignalEventRecord[]; now?: Date };
type RepeatedGapSignal = { label: string; count: number };
type BuildWeaknessInput = BuildInput & { repeatedGaps?: RepeatedGapSignal[]; riskLevel?: "stable" | "watch" | "high" };

const DAY_MS = 86_400_000;

function parseTime(value: string) {
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : null;
}

function resolveDueBucket(dueAt: string | null | undefined, now: Date): TodayPlanDueBucket {
  if (!dueAt) return "upcoming";
  const dueTs = parseTime(dueAt);
  if (dueTs === null) return "upcoming";
  if (dueTs <= now.getTime()) return "overdue";
  if (dueTs <= now.getTime() + DAY_MS) return "today";
  return "upcoming";
}

function confidenceBoost(confidence: ConfidenceLevel) {
  if (confidence === "낮음") return 18;
  if (confidence === "중간") return 8;
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

function toProblemSnapTask(mode: "first" | "second", signal: LearningSignalEventRecord): TodayPlanTask {
  const taskType: TodayPlanTaskType = mode === "second" ? (signal.nextTaskType === "rewrite" ? "rewrite" : "retry") : "retry";
  return {
    itemId: `problem-snap-${signal.id}`,
    title: `${signal.subject} Problem Snap 다음 작업`,
    subject: signal.subject,
    exam_mode: mode,
    due_bucket: "today",
    reason: "문제 스냅으로 저장한 막힌 문제입니다.",
    one_biggest_gap: "막힌 지점 1개를 다시 해결합니다.",
    one_next_action: signal.nextTask || (mode === "second" ? "쟁점 1개를 다시 써서 검토합니다." : "핵심 조건 1개를 회상하고 다시 풉니다."),
    task_type: taskType,
    estimated_minutes: mode === "second" ? 15 : 10,
    priority_reason: "문제 스냅 최신 기록을 바로 재시도로 연결합니다.",
    created_from_capture: true,
    source_label: "Problem Snap 기반",
  };
}

function pickRecentProblemSnapSignal(learningSignals: LearningSignalEventRecord[], mode: "first" | "second", now: Date) {
  const cutoff = now.getTime() - DAY_MS * 3;
  const expectedExamMode = mode === "second" ? "감정평가사 2차" : "감정평가사 1차";
  return learningSignals
    .filter((signal) => signal.sourceType === "problem-snap" && signal.examMode === expectedExamMode)
    .filter((signal) => {
      const createdTs = parseTime(signal.createdAt);
      return createdTs !== null && createdTs >= cutoff && createdTs <= now.getTime();
    })
    .sort((a, b) => (parseTime(b.createdAt) ?? 0) - (parseTime(a.createdAt) ?? 0))[0] ?? null;
}

export function buildTodayPlanTasks({ mode, queue, learningSignals = [], now = new Date(), repeatedGaps = [], riskLevel = "stable" }: BuildWeaknessInput): TodayPlanTask[] {
  const topRepeatedGap = repeatedGaps[0] ?? null;
  const ranked = queue
    .map((item) => {
      const dueTs = parseTime(item.dueAt);
      const isOverdue = dueTs !== null && dueTs <= now.getTime();
      const overdueDays = isOverdue && dueTs !== null ? Math.max(1, Math.floor((now.getTime() - dueTs) / DAY_MS) + 1) : 0;
      const createdTs = parseTime(item.itemCreatedAt);
      const createdAgeMs = createdTs === null ? null : now.getTime() - createdTs;
      const createdRecently = createdAgeMs !== null && createdAgeMs >= 0 && createdAgeMs <= 2 * DAY_MS;
      const captureRecentBoost = item.createdFromCapture && createdRecently ? 9 : 0;
      const recurrenceBoost = Math.min(item.recurrenceCount, 4) * 7;
      const rewriteBoost = resolveTaskType(mode, item) === "rewrite" ? 14 : 0;
      const overdueBoost = isOverdue ? 50 + overdueDays * 6 : 0;
      const weaknessBoost =
        riskLevel === "high" && topRepeatedGap && topRepeatedGap.count >= 3 && `${item.subjectLabel} · ${item.mistakeType}` === topRepeatedGap.label ? 8 : 0;
      const score = item.priorityScore * 0.2 + overdueBoost + captureRecentBoost + confidenceBoost(item.confidence) + recurrenceBoost + rewriteBoost + weaknessBoost;
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
    .sort((a, b) => b.score - a.score || ((parseTime(a.item.dueAt) ?? Number.MAX_SAFE_INTEGER) - (parseTime(b.item.dueAt) ?? Number.MAX_SAFE_INTEGER)) || a.item.itemId.localeCompare(b.item.itemId));

  const queueTasks = ranked.slice(0, 3).map(({ item, priority_reason }) => {
    const taskType = resolveTaskType(mode, item);
    return {
      itemId: item.itemId,
      title: item.problemTitle,
      subject: item.subjectLabel,
      exam_mode: mode,
      due_bucket: resolveDueBucket(item.dueAt, now),
      reason: priority_reason,
      one_biggest_gap: toGap(item),
      one_next_action: toNextAction(mode, item, taskType),
      task_type: taskType,
      estimated_minutes: taskType === "rewrite" ? 20 : taskType === "retry" ? 15 : 12,
      priority_reason,
      created_from_capture: item.createdFromCapture,
      source_label: item.createdFromCapture ? "오늘 기록 기반" : "복습 큐 기반",
    };
  });

  const topQueueScore = ranked[0]?.score ?? -1;
  const topQueueDueTs = ranked[0] ? parseTime(ranked[0].item.dueAt) : null;
  const queueHasStrongDueTask = topQueueScore >= 80 || (topQueueDueTs !== null && topQueueDueTs <= now.getTime());
  if (queueHasStrongDueTask) return queueTasks;

  const recentProblemSnap = pickRecentProblemSnapSignal(learningSignals, mode, now);
  if (!recentProblemSnap) return queueTasks;

  const problemSnapTask = toProblemSnapTask(mode, recentProblemSnap);
  return [problemSnapTask, ...queueTasks].slice(0, 3);
}
