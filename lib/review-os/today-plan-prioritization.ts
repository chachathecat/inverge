import {
  assertNoForbiddenCopy,
  assertNoRawTextKeys,
  type ReviewQueueDueBucket,
  type ReviewQueueItem,
} from "./execution-review-queue";
import { normalizeCurriculumTaskType } from "./curriculum-engine";
import { type AppraiserExamMode } from "./curriculum-reference";
import { rankLearningStateRisk, type PersonalLearningStatus, type PersonalLearningSourceEventType } from "./personal-learning-state-engine";

export type TodayPlanPrioritizationContext = {
  examMode?: AppraiserExamMode | "mixed";
  dailyAvailableMinutes?: 30 | 60 | 90 | 180;
  daysUntilExam?: number;
  weakSubjectName?: string;
  recentMissCount?: number;
  preferredTaskType?: string;
  source?: "onboarding" | "review_queue" | "morning_brief";
};

export type BuildTodayPlanFromReviewQueueInput = {
  reviewQueueItems: ReviewQueueItem[];
  context?: TodayPlanPrioritizationContext;
};

export type TodayPlanPrioritySignal =
  | "fail_risk_subject"
  | "exam_proximity"
  | "review_candidate"
  | "rewrite_candidate"
  | "recovery_candidate"
  | "confidence:needs_check"
  | "first_plan_loop"
  | string;

export type TodayPlanTask = {
  id: string;
  examMode: AppraiserExamMode;
  subjectId?: string;
  subjectName?: string;
  unitId?: string;
  unitName?: string;
  taskType: string;
  title: string;
  rationale: string;
  primaryAction: string;
  estimatedMinutes: number;
  prioritySignals: TodayPlanPrioritySignal[];
  source: "review_queue";
  sourceReviewQueueItemId: string;
  dueBucket: ReviewQueueDueBucket;
  isPrimaryTask: true;
  metadataOnly: true;
  conceptNodeId?: string;
  previousStatus?: PersonalLearningStatus;
  targetStatus?: PersonalLearningStatus;
  sourceEventType?: PersonalLearningSourceEventType;
  reviewPattern?: string | null;
  dueAtCandidate?: string;
};

export type TodayPlanSelectionExplanation = {
  headline: string;
  reasonBullets: string[];
  fallbackLine: string;
};

type RankedCandidate = TodayPlanTask & {
  priorityScore: number;
  dueRank: number;
};

const DUE_BUCKET_RANK: Record<ReviewQueueDueBucket, number> = {
  soon: 0,
  tomorrow: 1,
  three_days: 2,
  one_week: 3,
};

const MINUTE_CAP_BY_DAILY_MINUTES: Record<NonNullable<TodayPlanPrioritizationContext["dailyAvailableMinutes"]>, number> = {
  30: 10,
  60: 15,
  90: 20,
  180: 30,
};

const FORBIDDEN_TODAY_PLAN_COPY_PATTERNS = [
  /실패자/,
  /게으름/,
  /망했/,
  /불합격\s*확정/,
  /지금\s*안\s*하면\s*끝/,
  /순위\s*하락/,
  /streak/i,
  /casino/i,
  /gacha/i,
  /random reward/i,
  /랜덤\s*보상/,
  /결제/,
  /payment/i,
  /archive/i,
  /아카이브/,
  /native app/i,
  /네이티브 앱/,
  /instructor/i,
  /\/instructor/i,
  /공식\s*채점/,
  /공식\s*점수\s*예측/,
];

function normalizeTaskType(taskType: string | undefined) {
  const normalized = normalizeCurriculumTaskType(taskType ?? "") ?? taskType?.trim();
  return normalized && normalized.length > 0 ? normalized : "review";
}

function unique<T extends string>(values: T[]) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0))];
}

function matchesWeakSubject(item: Pick<ReviewQueueItem, "subjectName">, context: TodayPlanPrioritizationContext) {
  return Boolean(context.weakSubjectName && item.subjectName && context.weakSubjectName.trim() === item.subjectName.trim());
}

function isExamProximity(context: TodayPlanPrioritizationContext) {
  return typeof context.daysUntilExam === "number" && context.daysUntilExam >= 0 && context.daysUntilExam <= 21;
}

function isFirstPlanLoop(context: TodayPlanPrioritizationContext) {
  return context.source === "onboarding" || context.source === "morning_brief";
}

function isRewriteTask(taskType: string, signals: string[]) {
  return normalizeTaskType(taskType) === "rewrite" || signals.includes("rewrite_candidate");
}

function isRecoveryTask(signals: string[]) {
  return signals.includes("recovery_candidate");
}

function isSevereFailRisk(candidate: Pick<TodayPlanTask, "prioritySignals" | "subjectName">, context: TodayPlanPrioritizationContext) {
  return (
    candidate.prioritySignals.includes("fail_risk_subject") &&
    (matchesWeakSubject(candidate, context) || (context.recentMissCount ?? 0) >= 3 || isExamProximity(context))
  );
}

function estimateMinutes(taskType: string, context: TodayPlanPrioritizationContext) {
  const cap = MINUTE_CAP_BY_DAILY_MINUTES[context.dailyAvailableMinutes ?? 60];
  const normalizedTaskType = normalizeTaskType(taskType);
  const base = normalizedTaskType === "rewrite" ? 20 : normalizedTaskType === "CASIO" ? 15 : normalizedTaskType === "accounting template" ? 15 : 10;
  return Math.min(base, cap);
}

function buildPrioritySignals(item: ReviewQueueItem, context: TodayPlanPrioritizationContext): TodayPlanPrioritySignal[] {
  const signals = [...item.prioritySignals];
  const taskType = normalizeTaskType(item.taskType);

  if (!signals.includes("review_candidate")) signals.push("review_candidate");
  if (item.targetStatus && !signals.includes(`learning_state:${item.targetStatus}`)) signals.push(`learning_state:${item.targetStatus}`);
  if (item.previousStatus && !signals.includes(`previous_learning_state:${item.previousStatus}`)) signals.push(`previous_learning_state:${item.previousStatus}`);
  if (item.targetStatus === "confident_wrong" && !signals.includes("confident_wrong_concept")) signals.push("confident_wrong_concept");
  if (item.targetStatus === "wrong" && !signals.includes("wrong_concept")) signals.push("wrong_concept");
  if (item.targetStatus === "confused" && !signals.includes("confused_concept")) signals.push("confused_concept");
  if (item.previousStatus === "recovering" && !signals.includes("recovering_due_review")) signals.push("recovering_due_review");
  if (/ocr_confirm/i.test(String(item.reviewPattern ?? item.taskType)) && !signals.includes("ocr_confirmation_pending")) signals.push("ocr_confirmation_pending");
  if (isRewriteTask(taskType, signals) && !signals.includes("rewrite_candidate")) signals.push("rewrite_candidate");
  if (matchesWeakSubject(item, context) && !signals.includes("fail_risk_subject")) signals.push("fail_risk_subject");
  if (isExamProximity(context) && !signals.includes("exam_proximity")) signals.push("exam_proximity");
  if ((context.recentMissCount ?? 0) > 0 && !signals.includes("confidence:needs_check")) signals.push("confidence:needs_check");
  if (isFirstPlanLoop(context) && !signals.includes("first_plan_loop")) signals.push("first_plan_loop");

  return unique(signals);
}

function topicLabel(item: Pick<ReviewQueueItem, "subjectName" | "unitName">) {
  return item.unitName ?? item.subjectName ?? "복습 항목";
}

function buildSafeCopy(item: ReviewQueueItem, signals: string[], context: TodayPlanPrioritizationContext) {
  const taskType = normalizeTaskType(item.taskType);
  const topic = topicLabel(item);
  const recoveryPrefix = isRecoveryTask(signals) ? "놓친 항목은 복구 신호로 보고, " : "";

  if (item.examMode === "second" && taskType === "rewrite") {
    return {
      title: `${topic} 답안 다시쓰기`,
      rationale: `${recoveryPrefix}오늘은 논점 흐름을 한 번만 다시 잡습니다.`,
      primaryAction: "핵심 논점 1개를 고르고 짧게 다시 쓰기",
    };
  }

  if (item.examMode === "second" && taskType === "CASIO") {
    return {
      title: `${topic} CASIO 계산 루틴 점검`,
      rationale: `${recoveryPrefix}계산기 조작 순서를 작게 확인해 실무 풀이 흔들림을 줄입니다.`,
      primaryAction: "CASIO 입력 순서 1개를 다시 실행하기",
    };
  }

  if (item.examMode === "second" && taskType === "issue spotting") {
    return {
      title: `${topic} 쟁점 찾기`,
      rationale: `${recoveryPrefix}답안 전체보다 먼저 빠진 쟁점 1개를 확인합니다.`,
      primaryAction: "쟁점 후보 3개를 적고 1개만 보완하기",
    };
  }

  if (item.examMode === "first" && taskType === "accounting template") {
    return {
      title: `${topic} 회계 계산틀 재시도`,
      rationale: `${recoveryPrefix}계산 흐름을 템플릿 단위로 다시 고정합니다.`,
      primaryAction: "계산틀 1개를 손으로 다시 채우기",
    };
  }

  if (item.examMode === "first" && taskType === "cloze") {
    return {
      title: `${topic} 핵심어 빈칸 회상`,
      rationale: `${recoveryPrefix}설명 전에 먼저 떠올리는 복습으로 기억을 확인합니다.`,
      primaryAction: "핵심어 3개를 가리고 다시 말하기",
    };
  }

  if (item.examMode === "first" && /^O\/X$/i.test(taskType)) {
    return {
      title: `${topic} O/X 재확인`,
      rationale: `${recoveryPrefix}헷갈린 판단 기준 1개만 다시 분리합니다.`,
      primaryAction: "O/X 5문항을 풀고 틀린 기준 1개 표시하기",
    };
  }

  if (taskType === "rewrite") {
    return {
      title: `${topic} 다시쓰기`,
      rationale: `${recoveryPrefix}가장 큰 빈틈 1개만 다시 실행합니다.`,
      primaryAction: "짧게 다시 쓰고 기준 1개 확인하기",
    };
  }

  return {
    title: `${topic} 회상 복습`,
    rationale: `${recoveryPrefix}예정된 복습 항목 중 지금 확인할 1개를 고정합니다.`,
    primaryAction: context.preferredTaskType ? `${context.preferredTaskType} 방식으로 1개 재시도하기` : "정답을 보기 전 1분 회상 후 다시 풀기",
  };
}

function assertNoForbiddenTodayPlanCopy(value: unknown): void {
  if (typeof value === "string") {
    const forbidden = FORBIDDEN_TODAY_PLAN_COPY_PATTERNS.find((pattern) => pattern.test(value));
    if (forbidden) throw new Error(`Forbidden Today Plan copy is not accepted: ${String(forbidden)}`);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenTodayPlanCopy);
    return;
  }
  Object.values(value as Record<string, unknown>).forEach(assertNoForbiddenTodayPlanCopy);
}

function toTodayPlanTask(item: ReviewQueueItem, context: TodayPlanPrioritizationContext): TodayPlanTask {
  const prioritySignals = buildPrioritySignals(item, context);
  const taskType = normalizeTaskType(item.taskType);
  const copy = buildSafeCopy(item, prioritySignals, context);
  const task: TodayPlanTask = {
    id: `today-plan:${item.id}`,
    examMode: item.examMode,
    subjectId: item.subjectId,
    subjectName: item.subjectName,
    unitId: item.unitId,
    unitName: item.unitName,
    taskType,
    ...copy,
    estimatedMinutes: estimateMinutes(taskType, context),
    prioritySignals,
    source: "review_queue",
    sourceReviewQueueItemId: item.id,
    dueBucket: item.dueBucket,
    isPrimaryTask: true,
    metadataOnly: true,
    ...(item.conceptNodeId ? { conceptNodeId: item.conceptNodeId } : {}),
    ...(item.previousStatus ? { previousStatus: item.previousStatus } : {}),
    ...(item.targetStatus ? { targetStatus: item.targetStatus } : {}),
    ...(item.sourceEventType ? { sourceEventType: item.sourceEventType } : {}),
    ...("reviewPattern" in item ? { reviewPattern: item.reviewPattern } : {}),
    ...(item.dueAtCandidate ? { dueAtCandidate: item.dueAtCandidate } : {}),
  };

  assertNoRawTextKeys(task);
  assertNoForbiddenCopy(task);
  assertNoForbiddenTodayPlanCopy(task);
  return task;
}

function calculateCandidateScore(candidate: TodayPlanTask, context: TodayPlanPrioritizationContext) {
  let score = 100 - DUE_BUCKET_RANK[candidate.dueBucket] * 28;
  if (candidate.prioritySignals.includes("fail_risk_subject")) score += isSevereFailRisk(candidate, context) ? 95 : 36;
  if (candidate.prioritySignals.includes("exam_proximity")) score += 30;
  if (candidate.prioritySignals.includes("ocr_confirmation_pending")) score += 130;
  if (candidate.prioritySignals.includes("confident_wrong_concept")) score += 82;
  if (candidate.prioritySignals.includes("wrong_concept")) score += 66;
  if (candidate.prioritySignals.includes("confused_concept")) score += 48;
  if (candidate.prioritySignals.includes("recovering_due_review")) score += candidate.dueBucket === "soon" || candidate.dueBucket === "tomorrow" ? 70 : 22;
  if (candidate.targetStatus) score += rankLearningStateRisk(candidate.targetStatus) * 0.35;
  if (candidate.prioritySignals.includes("rewrite_candidate")) score += 18;
  if (candidate.prioritySignals.includes("recovery_candidate")) score += 16;
  if (candidate.prioritySignals.includes("confidence:needs_check")) score += 10;
  if (candidate.prioritySignals.includes("first_plan_loop")) score += 8;
  if (candidate.prioritySignals.includes("review_candidate")) score += 6;
  if (normalizeTaskType(candidate.taskType) === normalizeTaskType(context.preferredTaskType)) score += 7;
  return score;
}

function similarityKey(candidate: Pick<TodayPlanTask, "examMode" | "subjectId" | "subjectName" | "unitId" | "unitName" | "taskType">) {
  return [
    candidate.examMode,
    candidate.subjectId ?? candidate.subjectName ?? "subject",
    candidate.unitId ?? candidate.unitName ?? "unit",
    normalizeTaskType(candidate.taskType),
  ].join("|");
}

export function rankTodayPlanCandidates(candidates: TodayPlanTask[], context: TodayPlanPrioritizationContext = {}): TodayPlanTask[] {
  assertNoRawTextKeys({ candidates, context });
  const ranked: RankedCandidate[] = candidates.map((candidate) => {
    const severeFailRisk = isSevereFailRisk(candidate, context);
    return {
      ...candidate,
      priorityScore: calculateCandidateScore(candidate, context),
      dueRank: severeFailRisk ? -1 : DUE_BUCKET_RANK[candidate.dueBucket],
    };
  });

  return ranked
    .sort((left, right) => {
      const dueDiff = left.dueRank - right.dueRank;
      if (dueDiff !== 0) return dueDiff;

      const scoreDiff = right.priorityScore - left.priorityScore;
      if (scoreDiff !== 0) return scoreDiff;

      const failRiskDiff = Number(right.prioritySignals.includes("fail_risk_subject")) - Number(left.prioritySignals.includes("fail_risk_subject"));
      if (failRiskDiff !== 0) return failRiskDiff;

      return left.id.localeCompare(right.id);
    })
    .map((candidate) => {
      const { priorityScore, dueRank, ...todayPlanTask } = candidate;
      void priorityScore;
      void dueRank;
      return todayPlanTask;
    });
}

export function compressTodayPlanToMaxThree(candidates: TodayPlanTask[], context: TodayPlanPrioritizationContext = {}): TodayPlanTask[] {
  const ranked = rankTodayPlanCandidates(candidates, context);
  const seen = new Set<string>();
  const compressed: TodayPlanTask[] = [];

  for (const candidate of ranked) {
    const key = similarityKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    compressed.push(candidate);
    if (compressed.length === 3) break;
  }

  assertNoRawTextKeys(compressed);
  assertNoForbiddenCopy(compressed);
  assertNoForbiddenTodayPlanCopy(compressed);
  return compressed;
}

export function buildTodayPlanFromReviewQueue(input: BuildTodayPlanFromReviewQueueInput): TodayPlanTask[] {
  assertNoRawTextKeys(input);
  assertNoForbiddenCopy(input.reviewQueueItems);
  const context = input.context ?? {};
  const candidates = input.reviewQueueItems
    .filter((item) => context.examMode === undefined || context.examMode === "mixed" || item.examMode === context.examMode)
    .map((item) => toTodayPlanTask(item, context));

  return compressTodayPlanToMaxThree(candidates, context);
}

export function explainTodayPlanSelection(plan: TodayPlanTask[], context: TodayPlanPrioritizationContext = {}): TodayPlanSelectionExplanation {
  assertNoRawTextKeys({ plan, context });
  const reasonBullets: string[] = [];
  const hasRecovery = plan.some((task) => task.prioritySignals.includes("recovery_candidate"));
  const hasFailRisk = plan.some((task) => task.prioritySignals.includes("fail_risk_subject"));
  const hasExamProximity = plan.some((task) => task.prioritySignals.includes("exam_proximity"));
  const hasDueSoon = plan.some((task) => task.dueBucket === "soon" || task.dueBucket === "tomorrow");

  if (context.dailyAvailableMinutes === 30) reasonBullets.push("30분 모드라서 과제를 작게 줄였습니다.");
  if (hasFailRisk) reasonBullets.push("과락 위험 과목은 오늘의 가장 큰 빈틈으로 먼저 확인합니다.");
  if (hasExamProximity) reasonBullets.push("시험이 가까워진 항목은 짧은 재시도로 우선순위를 올렸습니다.");
  if (hasDueSoon) reasonBullets.push("복습 예정일이 가까운 항목을 먼저 배치했습니다.");
  if (hasRecovery) reasonBullets.push("놓친 항목은 실패가 아니라 복구 신호로 처리합니다.");
  if (reasonBullets.length === 0) reasonBullets.push("예정된 복습 항목 중 바로 실행할 수 있는 과제만 남겼습니다.");

  const explanation: TodayPlanSelectionExplanation = {
    headline: plan.length > 0 ? `오늘은 복습 예정 항목 중 가장 위험한 ${plan.length}개만 고정합니다.` : "오늘은 먼저 복습 기록 1개를 남기면 계획을 고정할 수 있습니다.",
    reasonBullets,
    fallbackLine: "상황이 다르면 오늘 계획에서 항목을 바꾸어도 됩니다.",
  };

  assertNoForbiddenCopy(explanation);
  assertNoForbiddenTodayPlanCopy(explanation);
  return explanation;
}
