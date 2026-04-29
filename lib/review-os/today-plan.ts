import type { LearningSignalEventRecord, ReviewQueueCard, WrongAnswerItemRecord } from "@/lib/review-os/types";

type AppMode = "first" | "second";

export type TodayPlanCard = {
  hasPlan: boolean;
  primaryTask: string;
  reason: string;
  estimatedDuration: string;
  ctaLabel: string;
};

const EMPTY_STATE_COPY = "답안 검토나 오답 기록을 1개 남기면 오늘 할 일을 제안합니다.";

function resolveModeTaskLabel(mode: AppMode, signalTask: string | null) {
  if (signalTask && signalTask.trim().length > 0) return signalTask.trim();
  return mode === "second" ? "논점 1개를 다시 찾아 문단을 보강하세요." : "핵심 개념 1개를 회상하고 짧게 재시도하세요.";
}

function resolveRecommendedTask(mode: AppMode, task: string) {
  if (mode === "second") {
    if (/문단|rewrite|재작성|다시쓰기/.test(task)) return "문단 다시쓰기";
    if (/목차|구조|구성/.test(task)) return "답안 구조 보강";
    return "논점 포착 재시도";
  }
  if (/유사|비슷/.test(task)) return "유사 문제 1개 재도전";
  if (/회상|개념/.test(task)) return "개념 회상 1세트";
  return "짧은 재시도 시작";
}

export function buildTodayPlanCard(input: {
  mode: AppMode;
  learningSignals: LearningSignalEventRecord[];
  queue: ReviewQueueCard[];
  items: WrongAnswerItemRecord[];
}): TodayPlanCard {
  const recentSignals = input.learningSignals.slice(0, 5);
  const hasEnoughSignals = recentSignals.length > 0;
  const hasAnyLearningData = hasEnoughSignals || input.queue.length > 0 || input.items.length > 0;

  if (!hasAnyLearningData) {
    return {
      hasPlan: false,
      primaryTask: EMPTY_STATE_COPY,
      reason: "아직 오늘 계획을 계산할 학습 신호가 없습니다.",
      estimatedDuration: "-",
      ctaLabel: input.mode === "second" ? "답안 작성 시작" : "오답 기록 시작",
    };
  }

  if (!hasEnoughSignals) {
    return {
      hasPlan: false,
      primaryTask: EMPTY_STATE_COPY,
      reason: "review queue와 기록은 있지만 최근 학습 신호가 부족합니다.",
      estimatedDuration: "10분",
      ctaLabel: input.mode === "second" ? "답안 검토 1개 남기기" : "오답 기록 1개 남기기",
    };
  }

  const topSignal = recentSignals[0];
  const primaryTask = resolveRecommendedTask(input.mode, topSignal.nextTask);
  const reason = `${topSignal.subject} 최근 신호를 기준으로 가장 먼저 보강할 작업입니다.`;
  const estimatedDuration = input.mode === "second" ? "20분" : "15분";

  return {
    hasPlan: true,
    primaryTask,
    reason,
    estimatedDuration,
    ctaLabel: resolveModeTaskLabel(input.mode, topSignal.nextTask),
  };
}

