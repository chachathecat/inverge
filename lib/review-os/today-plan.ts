import type { LearningSignalEventRecord, ReviewQueueCard, WrongAnswerItemRecord } from "@/lib/review-os/types";

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
function resolveSourceReason(sourceType: string, subject: string | null | undefined) {
  const cleanSubject = subject?.trim();
  if (sourceType === "answer_review") return cleanSubject ? `최근 ${cleanSubject} 답안 검토 기록을 기준으로 오늘 작업을 정했습니다.` : "최근 답안 검토 기록을 기준으로 오늘 작업을 정했습니다.";
  if (sourceType === "wrong_answer") return cleanSubject ? `최근 ${cleanSubject} 오답 기록을 기준으로 오늘 작업을 정했습니다.` : "최근 오답 기록을 기준으로 오늘 작업을 정했습니다.";
  if (sourceType === "review_queue") return cleanSubject ? `최근 ${cleanSubject} 다시 볼 목록을 기준으로 오늘 작업을 정했습니다.` : "최근 다시 볼 목록을 기준으로 오늘 작업을 정했습니다.";
  return cleanSubject ? `최근 ${cleanSubject} 학습 기록을 기준으로 오늘 작업을 정했습니다.` : "최근 학습 기록을 기준으로 오늘 작업을 정했습니다.";
}

function resolveModeTaskLabel(mode: AppMode, signalTask: string | null) {
  if (signalTask && signalTask.trim().length > 0) return signalTask.trim();
  return mode === "second" ? "논점 1개를 다시 찾아 문단을 보강하세요." : "핵심 개념 1개를 회상하고 짧게 재시도하세요.";
}


function resolveCtaAction(mode: AppMode, task: string): Pick<TodayPlanCard, "ctaLabel" | "actionKind"> {
  if (mode === "second") {
    if (/기록 보기|비교/.test(task)) return { ctaLabel: "기록 보기", actionKind: "second_items" };
    if (/문단|rewrite|재작성|다시쓰기|구조|보강/.test(task)) return { ctaLabel: "문단 다시쓰기", actionKind: "second_review" };
    return { ctaLabel: "답안 작성 시작", actionKind: "second_write" };
  }

  if (/세트|유사|비슷/.test(task)) return { ctaLabel: "세트 풀이 열기", actionKind: "first_set" };
  if (/오답 기록/.test(task)) return { ctaLabel: "오답 기록 시작", actionKind: "first_capture" };
  return { ctaLabel: "짧은 재시도 시작", actionKind: "first_session" };
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
      reason: "아직 오늘 계획을 계산할 학습 기록이 없습니다.",
      estimatedDuration: "-",
      ctaLabel: input.mode === "second" ? "답안 작성 시작" : "오답 기록 시작",
      actionKind: input.mode === "second" ? "second_write" : "first_capture",
    };
  }

  if (!hasEnoughSignals) {
    return {
      hasPlan: false,
      primaryTask: EMPTY_STATE_COPY,
      reason: "최근 학습 기록이 부족해 먼저 입력 1개를 권장합니다.",
      estimatedDuration: "10분",
      ctaLabel: input.mode === "second" ? "답안 검토 1개 남기기" : "오답 기록 1개 남기기",
      actionKind: input.mode === "second" ? "second_write" : "first_capture",
    };
  }

  const topSignal = recentSignals[0];
  const primaryTask = resolveRecommendedTask(input.mode, topSignal.nextTask);
  const reason = resolveSourceReason(topSignal.sourceType, topSignal.subject);
  const estimatedDuration = input.mode === "second" ? "20분" : "15분";

  const cta = resolveCtaAction(input.mode, resolveModeTaskLabel(input.mode, topSignal.nextTask));

  return {
    hasPlan: true,
    primaryTask,
    reason,
    estimatedDuration,
    ...cta,
  };
}
