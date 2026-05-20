import type { AppraisalMode } from "@/lib/review-os/appraisal";
import type { LearningSignalEventRecord, LearningSignalSummary, ReviewQueueCard, WrongAnswerItemRecord } from "@/lib/review-os/types";

type WeaknessDiagnosticInput = {
  learningSignalSummary?: LearningSignalSummary | null;
  learningSignalEvents?: LearningSignalEventRecord[];
  reviewQueue?: ReviewQueueCard[];
  wrongAnswerItems?: WrongAnswerItemRecord[];
  mode: AppraisalMode;
};

type WeaknessDiagnosticOutput = {
  topWeaknesses: Array<{ label: string; count: number; reason: string }>;
  weakestSubject: string | null;
  repeatedSignalCount: number;
  overdueReviewCount: number;
  nextTaskTypeLabel: string | null;
  primaryDiagnosticLine: string;
  nextActionLine: string;
};

const EMPTY_PRIMARY_LINE = "아직 반복 약점을 진단할 기록이 없습니다.";
const EMPTY_NEXT_ACTION_LINE = "오늘 한 것 하나를 남기면 다음 행동을 정리해 드립니다.";

const toCountMap = (values: Array<string | null | undefined>) => {
  const map = new Map<string, number>();
  values.forEach((value) => {
    const key = value?.trim();
    if (!key) return;
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return map;
};

const pickTop = (map: Map<string, number>, fallback = "기록 없음") => {
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0] ?? [fallback, 0];
};

const resolveTaskTypeLabel = (type: string | undefined, mode: AppraisalMode) => {
  if (!type) return null;
  if (type.includes("rewrite")) return "문단 다시쓰기";
  if (type.includes("review")) return "복습 큐 확인";
  if (type.includes("capture")) return mode === "second" ? "답안 비교 기록" : "오답 기록";
  if (type.includes("recall")) return "조건 회상 확인";
  return "다음 행동";
};

export function buildWeaknessDiagnostic(input: WeaknessDiagnosticInput): WeaknessDiagnosticOutput {
  const summary = input.learningSignalSummary;
  const events = input.learningSignalEvents ?? [];
  const queue = input.reviewQueue ?? [];
  const items = input.wrongAnswerItems ?? [];
  const now = Date.now();

  const derivedTagMap = toCountMap([
    ...(summary?.topTags ?? []),
    ...events.flatMap((event) => event.derivedTags),
    ...queue.map((entry) => entry.mistakeType),
    ...queue.map((entry) => entry.topicTag),
  ]);
  const [topTag, topTagCount] = pickTop(derivedTagMap);

  const subjectMap = toCountMap([...(summary?.topSubjects ?? []), ...events.map((event) => event.subject), ...queue.map((entry) => entry.subjectLabel)]);
  const [topSubject, topSubjectCount] = pickTop(subjectMap, "");

  const repeatedSignalCount = Math.max(topTagCount, events.length, 0);
  const overdueReviewCount = queue.filter((entry) => new Date(entry.dueAt).getTime() < now).length;

  const nextTaskType = summary?.nextTaskTypes?.[0]?.type ?? events[0]?.nextTaskType;
  const nextTaskTypeLabel = resolveTaskTypeLabel(nextTaskType, input.mode);

  const topWeaknesses = topTagCount
    ? [
        {
          label: "반복 약점",
          count: topTagCount,
          reason: `${topTag} 신호가 가장 자주 반복됩니다.`,
        },
        {
          label: "다시 볼 과목",
          count: topSubjectCount,
          reason: topSubject ? `${topSubject} 과목에서 복습 신호가 모였습니다.` : "복습 과목 기록이 더 필요합니다.",
        },
        {
          label: "오늘 줄일 실수",
          count: overdueReviewCount,
          reason: overdueReviewCount > 0 ? `미룬 복습 ${overdueReviewCount}개를 먼저 정리하세요.` : "오늘 미룬 복습은 없습니다.",
        },
      ]
    : [];

  if (topWeaknesses.length === 0 && items.length === 0 && queue.length === 0 && events.length === 0) {
    return {
      topWeaknesses: [],
      weakestSubject: null,
      repeatedSignalCount: 0,
      overdueReviewCount: 0,
      nextTaskTypeLabel: null,
      primaryDiagnosticLine: EMPTY_PRIMARY_LINE,
      nextActionLine: EMPTY_NEXT_ACTION_LINE,
    };
  }

  const primaryDiagnosticLine = topTagCount
    ? `최근 기록에서 ‘${topTag}’ 신호가 가장 많이 반복됩니다.`
    : "최근 기록을 바탕으로 반복 약점 신호를 모으는 중입니다.";

  const nextActionLine = nextTaskTypeLabel
    ? `다음 행동은 ‘${nextTaskTypeLabel}’부터 짧게 시작하세요.`
    : overdueReviewCount > 0
      ? `오늘은 복습 대기 ${overdueReviewCount}개 중 1개만 먼저 정리하세요.`
      : "오늘은 같은 조건을 묻는 문제 2개만 다시 확인하세요.";

  return {
    topWeaknesses,
    weakestSubject: topSubject || null,
    repeatedSignalCount,
    overdueReviewCount,
    nextTaskTypeLabel,
    primaryDiagnosticLine,
    nextActionLine,
  };
}
