import type { LearningSignalEventRecord, ReviewQueueCard, WrongAnswerItemRecord } from "@/lib/review-os/types";
import { buildTodayPlanTasks } from "./today-plan-engine";

type AppMode = "first" | "second";

export type TodayPlanActionKind = "first_capture" | "first_set" | "first_session" | "second_write" | "second_review" | "second_items";

export type TodayPlanCard = {
  hasPlan: boolean;
  primaryTask: string;
  reason: string;
  estimatedDuration: string;
  ctaLabel: string;
  actionKind: TodayPlanActionKind;
};

const EMPTY_STATE_COPY = "답안 검토나 오답 기록을 1개 남기면 오늘 할 일을 제안합니다.";

function resolveAction(mode: AppMode, taskType: "retry" | "rewrite" | "review" | "recall"): Pick<TodayPlanCard, "ctaLabel" | "actionKind"> {
  if (mode === "second") {
    if (taskType === "rewrite") return { ctaLabel: "다시 쓰기", actionKind: "second_review" };
    if (taskType === "retry") return { ctaLabel: "다시보기 큐 열기", actionKind: "second_review" };
    if (taskType === "review") return { ctaLabel: "핵심 논점 다시 보기", actionKind: "second_review" };
    if (taskType === "recall") return { ctaLabel: "쟁점 회상", actionKind: "second_review" };
    return { ctaLabel: "다시 쓰기", actionKind: "second_write" };
  }
  if (taskType === "recall") return { ctaLabel: "근거 회상 후 다시 풀기", actionKind: "first_session" };
  if (taskType === "review") return { ctaLabel: "다시 풀기", actionKind: "first_session" };
  return { ctaLabel: "다시 풀기", actionKind: "first_session" };
}

export function buildTodayPlanCard(input: {
  mode: AppMode;
  learningSignals: LearningSignalEventRecord[];
  queue: ReviewQueueCard[];
  items: WrongAnswerItemRecord[];
}): TodayPlanCard {
  const tasks = buildTodayPlanTasks({ mode: input.mode, queue: input.queue, learningSignals: input.learningSignals });
  if (tasks.length === 0) {
    const hasAnyLearningData = input.learningSignals.length > 0 || input.items.length > 0;
    if (!hasAnyLearningData) {
      return {
        hasPlan: false,
        primaryTask: EMPTY_STATE_COPY,
        reason: "아직 오늘 계획을 계산할 학습 기록이 없습니다.",
        estimatedDuration: "-",
        ctaLabel: input.mode === "second" ? "답안 작성 시작" : "오답 기록 시작",
        actionKind: input.mode === "second" ? "second_write" : "first_capture",
      };
    }
    return {
      hasPlan: false,
      primaryTask: EMPTY_STATE_COPY,
      reason: "최근 학습 기록이 부족해 먼저 입력 1개를 권장합니다.",
      estimatedDuration: "10분",
      ctaLabel: input.mode === "second" ? "답안 검토 1개 남기기" : "오답 기록 1개 남기기",
      actionKind: input.mode === "second" ? "second_write" : "first_capture",
    };
  }

  const top = tasks[0];
  const action = resolveAction(input.mode, top.task_type);
  return {
    hasPlan: true,
    primaryTask: top.title,
    reason: top.reason,
    estimatedDuration: `${top.estimated_minutes}분`,
    ...action,
  };
}
