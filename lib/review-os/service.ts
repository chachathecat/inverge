import "server-only";

import { consumeRateLimit } from "@/lib/rate-limit";
import { generateWrongAnswerArtifacts } from "@/lib/review-os/ai";
import {
  getModeConfig,
  getModeLabel,
  normalizePreferredSubjectsForMode,
  normalizeSubjectForMode,
  type AppraisalMode,
  resolveAppraisalMode,
} from "@/lib/review-os/appraisal";
import { getEntitlementLimit } from "@/lib/review-os/entitlements";
import { assertCanCreateWrongAnswer } from "@/lib/review-os/entitlement-enforcement";
import { buildCaptureNoteSignals, structureCaptureNote } from "@/lib/review-os/capture-note-engine";
import { buildCaptureLearningSignal, buildCaptureReviewReason, computeCaptureQueuePriority } from "@/lib/review-os/capture-learning-signals";
import { buildConceptNodeCandidate, isConceptNodeCandidate } from "@/lib/review-os/concept-node-mapping";
import { sanitizeCaptureTelemetryMetadata } from "@/lib/review-os/telemetry-sanitizer";
import { buildLearningMetricEvent } from "@/lib/review-os/learning-metrics";
import { recordLearningMetricIfEnabled } from "@/lib/review-os/learning-metrics-sink";
import { buildSecondAnswerRewriteSignal } from "@/lib/review-os/second-answer-rewrite";
import { buildFirstToSecondMigrationSnapshot, buildSecondModeMigrationLearningSignal } from "@/lib/review-os/mode-migration";
import { getKstDayKey, isSameKstDay, isOverdueDueAt } from "@/lib/review-os/daily-study-state";
import { reviewOsRepository } from "@/lib/review-os/repository";
import { resolveReviewSchedule, resolveScheduleOverrideDate } from "@/lib/review-os/scheduling";
import {
  classifyStudyLogTaxonomy,
  classifyWrongAnswerTaxonomy,
  type TaxonomyClassificationCandidate,
} from "@/lib/review-os/taxonomy-classification";
import type {
  AccessState,
  AdminAlphaFeed,
  AdminBetaFunnel,
  FeedbackItemInput,
  LearningSignalEventInput,
  LearningSignalSummary,
  ReviewQueueCard,
  StudyProfile,
  TodayFocus,
  UsageEventRecord,
  UsageSummary,
  WeeklyPlan,
  WeeklyPlanTask,
  WeeklyPlanTaskAction,
  WeeklyLearningSummaryRecord,
  WrongAnswerDetail,
  ReviewCompletionAction,
  ReviewCompletionMetadata,
  WrongAnswerItemInput,
  WrongAnswerItemRecord,
  StudyLogInput,
} from "@/lib/review-os/types";

const globalCache = globalThis as typeof globalThis & {
  __reviewOsGenerationLocks?: Map<string, boolean>;
};

function getGenerationLockStore() {
  if (!globalCache.__reviewOsGenerationLocks) {
    globalCache.__reviewOsGenerationLocks = new Map();
  }
  return globalCache.__reviewOsGenerationLocks;
}

function getMonthStartIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function getWeekKey(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function containsSmokeSeedText(value: string | null | undefined) {
  if (!value) return false;
  return /e2e|smoke|스모크|test-user|test[ -]?data|qa[ -]?seed/i.test(value);
}

function isSmokeSeedItem(item: Pick<WrongAnswerItemRecord, "sourceLabel" | "problemTitle" | "rawQuestionText" | "rawAnswerText">) {
  return (
    containsSmokeSeedText(item.sourceLabel) ||
    containsSmokeSeedText(item.problemTitle) ||
    containsSmokeSeedText(item.rawQuestionText) ||
    containsSmokeSeedText(item.rawAnswerText)
  );
}

function isSmokeSeedQueueItem(item: Pick<ReviewQueueCard, "subjectLabel" | "problemTitle" | "reviewReason" | "topicTag">) {
  return (
    containsSmokeSeedText(item.subjectLabel) ||
    containsSmokeSeedText(item.problemTitle) ||
    containsSmokeSeedText(item.reviewReason) ||
    containsSmokeSeedText(item.topicTag)
  );
}

function isSmokeSeedStudyLog(log: { sourceLabel: string; notUnderstood: string; revisitNeeded: string }) {
  return containsSmokeSeedText(log.sourceLabel) || containsSmokeSeedText(log.notUnderstood) || containsSmokeSeedText(log.revisitNeeded);
}

function isSmokeSeedWeeklySummary(summary: WeeklyLearningSummaryRecord | null) {
  if (!summary) return false;
  if (containsSmokeSeedText(summary.summaryText)) return true;
  return [...summary.topMistakeTypes, ...summary.topTopics, ...summary.nextWeekFocus].some((value) => containsSmokeSeedText(value));
}

function readConceptNodeCandidateFromPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (isConceptNodeCandidate(payload.concept_node_candidate)) return payload.concept_node_candidate;
  if (isConceptNodeCandidate(payload.conceptNodeCandidate)) return payload.conceptNodeCandidate;
  return null;
}

function rankQueueItem(item: {
  recurrenceCount: number;
  confidence: string;
  timeSpentSeconds: number | null;
  createdAt?: string;
}) {
  const confidenceScore = item.confidence === "낮음" ? 16 : item.confidence === "중간" ? 8 : 0;
  const recurrenceScore = Math.min(item.recurrenceCount, 5) * 18;
  const timeScore =
    item.timeSpentSeconds && item.timeSpentSeconds >= 180
      ? 12
      : item.timeSpentSeconds && item.timeSpentSeconds >= 90
        ? 6
        : 0;
  const recencyScore = item.createdAt
    ? Math.max(0, 20 - Math.floor((Date.now() - Date.parse(item.createdAt)) / 86_400_000) * 4)
    : 0;
  return recurrenceScore + confidenceScore + timeScore + recencyScore + 20;
}

function getReviewReason(item: {
  recurrenceCount: number;
  confidence: string;
  timeSpentSeconds: number | null;
  mistakeType: string;
}) {
  if (item.recurrenceCount >= 3) return "같은 유형이 세 번 이상 반복된 항목입니다.";
  if (item.confidence === "낮음") return "확신 없이 맞히거나 틀린 항목이라 다시 볼 가치가 있습니다.";
  if (item.timeSpentSeconds && item.timeSpentSeconds >= 180) {
    return "시간이 오래 걸린 항목입니다. 정확도와 처리 순서를 함께 봐야 합니다.";
  }
  return `${item.mistakeType} 흐름을 다시 확인해야 합니다.`;
}

type TodayPriorityPlan = {
  queueItem: ReviewQueueCard | null;
  score: number;
  reason: string;
  estimatedDurationMinutes: number;
  nextActionType: TodayFocus["nextActionType"];
};

function getFocusMode(queue: ReviewQueueCard[], recentItems: WrongAnswerItemRecord[]) {
  const source = [...queue.map((item) => item.examName), ...recentItems.map((item) => item.examName)];
  return source.find((name) => name === "감정평가사 2차") ? "second" : "first";
}

function getDueScore(dueAt: string, now = new Date()) {
  const diff = now.getTime() - Date.parse(dueAt);
  const overdueDays = Math.max(0, Math.floor(diff / 86_400_000));
  if (diff >= 0) {
    return 36 + Math.min(4, overdueDays) * 10;
  }
  if (Math.abs(diff) <= 24 * 60 * 60 * 1000) {
    return 18;
  }
  return 4;
}

function getConfidenceScore(confidence: string) {
  if (confidence === "낮음") return 16;
  if (confidence === "중간") return 8;
  return 2;
}

function getTimeInstabilityScore(timeSpentSeconds: number | null) {
  if (!timeSpentSeconds) return 0;
  if (timeSpentSeconds >= 240) return 12;
  if (timeSpentSeconds >= 150) return 8;
  if (timeSpentSeconds <= 45) return 4;
  return 2;
}

function getMistakeTypeScore(mistakeType: string) {
  if (/누락|구조|논점|문단|적용/.test(mistakeType)) return 10;
  if (/계산|조건|개념|시간/.test(mistakeType)) return 7;
  return 4;
}

function resolveNextActionType(item: ReviewQueueCard, mode: "first" | "second"): TodayFocus["nextActionType"] {
  const rewriteSignal = /rewrite|재작성|문단/.test(item.reviewReason) || /구조|문단|논점 누락/.test(item.mistakeType);
  if (mode === "second" && rewriteSignal) return "rewrite_now";
  if (mode === "first" && /재시도|retry/.test(item.reviewReason)) return "retry_now";
  return "review_now";
}

function buildTodayPriorityPlan(
  queue: ReviewQueueCard[],
  mode: "first" | "second",
  now = new Date(),
): TodayPriorityPlan {
  if (queue.length === 0) {
    return {
      queueItem: null,
      score: 0,
      reason: "오늘은 이 작업 하나만 먼저 합니다.",
      estimatedDurationMinutes: 20,
      nextActionType: "capture_now",
    };
  }

  const scored = queue.map((item) => {
    const recurrenceScore = Math.min(item.recurrenceCount, 5) * 10;
    const dueScore = getDueScore(item.dueAt, now);
    const confidenceScore = getConfidenceScore(item.confidence);
    const instabilityScore = getTimeInstabilityScore(item.timeSpentSeconds);
    const mistakeScore = getMistakeTypeScore(item.mistakeType);
    const nextActionType = resolveNextActionType(item, mode);
    const rewriteRetryUrgency = nextActionType === "rewrite_now" || nextActionType === "retry_now" ? 14 : 0;
    const modeScore = mode === "second" && nextActionType === "rewrite_now" ? 8 : 4;
    const score =
      dueScore +
      recurrenceScore +
      confidenceScore +
      instabilityScore +
      mistakeScore +
      rewriteRetryUrgency +
      modeScore;
    return { item, score, nextActionType };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const dueDiff = Date.parse(a.item.dueAt) - Date.parse(b.item.dueAt);
    if (dueDiff !== 0) return dueDiff;
    return a.item.queueId.localeCompare(b.item.queueId);
  });

  const top = scored[0];
  const reason = top.item.recurrenceCount >= 3
    ? "최근 반복된 실수라 먼저 확인합니다."
    : top.nextActionType === "rewrite_now"
      ? "문단 다시쓰기 후속 확인이 필요합니다."
      : Date.parse(top.item.dueAt) <= now.getTime()
        ? "예정된 복습 시점이 도래했습니다."
        : "오늘은 이 작업 하나만 먼저 합니다.";
  const estimatedDurationMinutes = Math.max(
    mode === "second" ? 18 : 12,
    Math.min(35, Math.round(((top.item.timeSpentSeconds ?? (mode === "second" ? 22 * 60 : 15 * 60)) * 0.8) / 60)),
  );

  return {
    queueItem: top.item,
    score: top.score,
    reason,
    estimatedDurationMinutes,
    nextActionType: top.nextActionType,
  };
}

function makeTodayFocus(
  queue: ReviewQueueCard[],
  recentItems: WrongAnswerItemRecord[],
  preferredMode?: "first" | "second",
): TodayFocus {
  const mode = preferredMode ?? getFocusMode(queue, recentItems);
  const priority = buildTodayPriorityPlan(queue, mode);
  const top = priority.queueItem;
  const topMistake = top?.mistakeType ?? "반복 실수";
  const staleCount = queue.filter((item) => Date.now() - Date.parse(item.dueAt) > 2 * 86_400_000).length;
  const mistakeLine = mode === "second" ? `먼저 볼 보강 지점은 ${topMistake}입니다.` : `오늘 줄일 실수는 ${topMistake}입니다.`;
  const staleLine =
    staleCount > 0 ? `밀린 다시 볼 항목 ${staleCount}개 중 1개만 먼저 처리합니다.` : "한 번에 하나씩 실행하고 다음 항목으로 넘어갑니다.";
  const primaryTaskLabel = top
    ? mode === "second"
      ? `${top.subjectLabel} 문단 보강`
      : `${top.subjectLabel} 재시도 점검`
    : mode === "second"
      ? "2차 답안 1건 입력"
      : "1차 오답 1건 기록";

  const lines: [string, string, string] = [
    "오늘은 이 작업 하나만 먼저 합니다.",
    priority.reason,
    `${mistakeLine} ${staleLine}`,
  ];

  return {
    lines,
    nextAction: top
      ? mode === "second"
        ? `${top.problemTitle}에서 빠진 논점 1개를 표시하고 짧게 다시 작성하세요.`
        : `${top.problemTitle}을 다시 풀고, 놓친 조건 1개만 메모하세요.`
      : mode === "second"
        ? "2차 답안 한 건을 입력하고 compare 흐름을 시작하세요."
        : "오답 1개를 입력하고 첫 review queue를 만드세요.",
    nextActionType: priority.nextActionType,
    primaryTaskLabel,
    reason: priority.reason,
    estimatedDurationMinutes: priority.estimatedDurationMinutes,
    priorityScore: priority.score,
    sourceQueueId: top?.queueId ?? null,
    sourceItemId: top?.itemId ?? null,
    queue,
  };
}

function makeWeeklySummaryText(topMistakes: string[], topTopics: string[], slowCount: number, lowConfidenceCount: number) {
  const focusMistake = topMistakes[0] ?? "반복 실수";
  const focusTopic = topTopics[0] ?? "최근 항목";
  const first = `이번 주 감평 학습에서 ${focusMistake}이 가장 자주 반복되었습니다.`;
  const second = `${focusTopic} 관련 항목을 먼저 다시 보고, 새 범위 확장보다 같은 실수를 줄이는 쪽이 우선입니다.`;
  const third =
    slowCount > lowConfidenceCount
      ? "시간이 오래 걸린 항목은 풀이 순서를 줄이는 연습으로 다시 보세요."
      : "확신이 낮았던 항목은 근거 문장부터 다시 고정하세요.";
  return [first, second, third].join(" ");
}

function resolveWeeklyTaskAction(queueItem: ReviewQueueCard, mode: "first" | "second"): WeeklyPlanTaskAction {
  const rewriteSignal = /rewrite|재작성|문단/.test(queueItem.reviewReason) || /구조|문단|논점 누락|누락/.test(queueItem.mistakeType);
  if (mode === "second" && rewriteSignal) return "rewrite";
  if (mode === "first" && /재시도|retry/.test(queueItem.reviewReason)) return "retry";
  return "review";
}

function buildWeeklyTaskReason(queueItem: ReviewQueueCard, overdueDays: number) {
  if (overdueDays > 0) return `예정 복습 시점에서 ${overdueDays}일 지났습니다.`;
  if (queueItem.recurrenceCount >= 3) return "반복된 실수가 누적되어 이번 주에 먼저 줄여야 합니다.";
  if (queueItem.confidence === "낮음") return "확신이 낮았던 항목이라 근거를 다시 고정해야 합니다.";
  if ((queueItem.timeSpentSeconds ?? 0) >= 180) return "풀이 시간이 길어져 처리 순서 점검이 필요합니다.";
  return `${queueItem.mistakeType} 실수를 이번 주에 한 번 더 줄입니다.`;
}

function buildWeeklyTaskTarget(
  queueItem: ReviewQueueCard,
  action: WeeklyPlanTaskAction,
  mode: "first" | "second",
) {
  if (action === "rewrite") {
    return `${queueItem.problemTitle}에서 누락된 논점 1개를 문단으로 다시 작성`;
  }
  if (action === "retry") {
    return `${queueItem.problemTitle} 재시도 후 놓친 조건 1개 기록`;
  }
  return mode === "second"
    ? `${queueItem.problemTitle} 핵심 논점 1개 회상 후 근거 문장 확인`
    : `${queueItem.problemTitle} 핵심 개념 1개 회상 후 정답 근거 확인`;
}

function buildWeeklyTaskDuration(queueItem: ReviewQueueCard, action: WeeklyPlanTaskAction, mode: "first" | "second") {
  const baselineSeconds = queueItem.timeSpentSeconds ?? (mode === "second" ? 22 * 60 : 15 * 60);
  const multiplier = action === "rewrite" ? 1.0 : action === "retry" ? 0.9 : 0.75;
  const rawMinutes = Math.round((baselineSeconds * multiplier) / 60);
  const floor = action === "rewrite" ? 18 : 12;
  const ceil = action === "rewrite" ? 35 : 28;
  return Math.min(ceil, Math.max(floor, rawMinutes));
}

function buildWeeklyPlanSummary(
  mode: "first" | "second",
  tasks: WeeklyPlanTask[],
  overdueCount: number,
  recoveryTask: WeeklyPlanTask | null,
) {
  if (tasks.length === 0) {
    return mode === "second"
      ? "이번 주 기록이 아직 없습니다. 답안 1건을 입력하면 주간 계획이 생성됩니다."
      : "이번 주 기록이 아직 없습니다. 오답 1건을 입력하면 주간 계획이 생성됩니다.";
  }

  const retryCount = tasks.filter((task) => task.action === "retry").length;
  const rewriteCount = tasks.filter((task) => task.action === "rewrite").length;

  if (overdueCount > 0 && recoveryTask) {
    return `이번 주 계획이 조금 밀렸습니다. 오늘은 ${recoveryTask.estimatedDurationMinutes}분짜리 복구 작업 하나만 하세요.`;
  }

  if (mode === "second") {
    return `이번 주는 재시도 ${retryCount}개와 문단 다시쓰기 ${rewriteCount}개만 우선합니다.`;
  }

  return "새 범위를 넓히기보다 반복된 실수 하나를 줄입니다.";
}

function buildWeeklyPlan(
  queue: ReviewQueueCard[],
  recentItems: WrongAnswerItemRecord[],
  mode: "first" | "second",
): WeeklyPlan {
  const now = new Date();
  const overdueQueue = queue.filter((item) => Date.parse(item.dueAt) < now.getTime());
  const recentWindow = recentItems.filter((item) => now.getTime() - Date.parse(item.createdAt) <= 14 * 86_400_000);
  const sorted = queue
    .map((item) => {
      const dueScore = getDueScore(item.dueAt, now);
      const recurrenceScore = Math.min(item.recurrenceCount, 5) * 10;
      const confidenceScore = getConfidenceScore(item.confidence);
      const instabilityScore = getTimeInstabilityScore(item.timeSpentSeconds);
      const mistakeScore = getMistakeTypeScore(item.mistakeType);
      const dueTs = Date.parse(item.dueAt);
      const overdueDays = Math.max(0, Math.floor((now.getTime() - dueTs) / 86_400_000));
      const todayPriorityBonus = dueScore >= 36 ? 9 : 0;
      const priorityScore =
        dueScore + recurrenceScore + confidenceScore + instabilityScore + mistakeScore + todayPriorityBonus + item.priorityScore * 0.05;
      return { item, priorityScore, overdueDays };
    })
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      const dueDiff = Date.parse(a.item.dueAt) - Date.parse(b.item.dueAt);
      if (dueDiff !== 0) return dueDiff;
      return a.item.queueId.localeCompare(b.item.queueId);
    });

  const tasks: WeeklyPlanTask[] = sorted.slice(0, 3).map((entry, index) => {
    const action = resolveWeeklyTaskAction(entry.item, mode);
    return {
      queueId: entry.item.queueId,
      itemId: entry.item.itemId,
      action,
      subject: entry.item.subjectLabel,
      title: entry.item.problemTitle,
      reason: buildWeeklyTaskReason(entry.item, entry.overdueDays),
      estimatedDurationMinutes: buildWeeklyTaskDuration(entry.item, action, mode),
      target: buildWeeklyTaskTarget(entry.item, action, mode),
      priorityOrder: index + 1,
      dueAt: entry.item.dueAt,
      priorityScore: Math.round(entry.priorityScore),
    };
  });

  const recoveryCandidateEntry = sorted.find((entry) => entry.overdueDays >= 2) ?? sorted.find((entry) => entry.overdueDays >= 1) ?? null;
  const recoveryTask = recoveryCandidateEntry
    ? {
        queueId: recoveryCandidateEntry.item.queueId,
        itemId: recoveryCandidateEntry.item.itemId,
        action: resolveWeeklyTaskAction(recoveryCandidateEntry.item, mode),
        subject: recoveryCandidateEntry.item.subjectLabel,
        title: recoveryCandidateEntry.item.problemTitle,
        reason: "밀린 항목에서 가장 작은 단위 1개만 먼저 복구합니다.",
        estimatedDurationMinutes: Math.min(
          18,
          buildWeeklyTaskDuration(
            recoveryCandidateEntry.item,
            resolveWeeklyTaskAction(recoveryCandidateEntry.item, mode),
            mode,
          ),
        ),
        target: mode === "second" ? "문단 1개만 다시 작성 후 저장" : "재시도 1회 후 근거 1줄만 기록",
        priorityOrder: 1,
        dueAt: recoveryCandidateEntry.item.dueAt,
        priorityScore: Math.round(recoveryCandidateEntry.priorityScore),
      }
    : null;

  const summary = buildWeeklyPlanSummary(mode, tasks, overdueQueue.length, recoveryTask);
  const primaryActionLabel = tasks[0]
    ? `${tasks[0].subject} ${tasks[0].action === "rewrite" ? "문단 다시쓰기" : tasks[0].action === "retry" ? "재시도" : "복습"}`
    : mode === "second"
      ? "2차 답안 1건 입력"
      : "1차 오답 1건 입력";

  return {
    mode,
    summary,
    primaryActionLabel,
    tasks,
    recovery:
      overdueQueue.length > 0 && recoveryTask
        ? {
            message: "이번 주 계획이 조금 밀렸습니다.",
            task: recoveryTask,
            overdueCount: overdueQueue.length,
          }
        : null,
    secondaryRecords: {
      overdueCount: overdueQueue.length,
      queueCount: queue.length,
      recentWrongCount: recentWindow.length,
    },
  };
}

function normalizeAnswer(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeMeaningfulAnswer(value: string) {
  const normalized = normalizeAnswer(value);
  if (!normalized) return null;
  if (normalized === "-" || normalized === "–" || normalized === "—") return null;
  return normalized;
}

function isMeaningfullyCorrectAnswer(correctAnswer: string, userAnswer: string) {
  const normalizedCorrectAnswer = normalizeMeaningfulAnswer(correctAnswer);
  const normalizedUserAnswer = normalizeMeaningfulAnswer(userAnswer);
  return Boolean(normalizedCorrectAnswer && normalizedUserAnswer && normalizedCorrectAnswer === normalizedUserAnswer);
}

export class ReviewOsUsageLimitError extends Error {
  constructor() {
    super("review-os-usage-limit");
  }
}

export class ReviewOsBurstLimitError extends Error {
  constructor() {
    super("review-os-burst-limit");
  }
}

export class ReviewOsConcurrentGenerationError extends Error {
  constructor() {
    super("review-os-concurrent-generation");
  }
}

export class ReviewOsInviteRequiredError extends Error {
  constructor() {
    super("review-os-invite-required");
  }
}

export class ReviewOsInvalidCompletionActionError extends Error {
  constructor() {
    super("review-os-invalid-completion-action");
  }
}

export type DailyStudyActivity = {
  studiedToday: boolean;
  completedTodayTask: boolean;
  savedCaptureToday: boolean;
  recoveredOverdueToday: boolean;
  currentGentleStreak: number;
  missedRecently: boolean;
  savedToday: boolean;
  completedToday: boolean;
  startedExecutionToday: boolean;
  followupScheduledToday: boolean;
  hasDueQueue: boolean;
  hasOverdueQueue: boolean;
};

export const DEFAULT_DAILY_STUDY_ACTIVITY: DailyStudyActivity = {
  studiedToday: false,
  completedTodayTask: false,
  savedCaptureToday: false,
  recoveredOverdueToday: false,
  currentGentleStreak: 0,
  missedRecently: false,
  savedToday: false,
  completedToday: false,
  startedExecutionToday: false,
  followupScheduledToday: false,
  hasDueQueue: false,
  hasOverdueQueue: false,
};

export class ReviewOsService {
  async createLearningSignalEvent(userId: string, email: string | null, input: LearningSignalEventInput) {
    await this.ensureAccess(userId, email);
    return reviewOsRepository.createLearningSignalEvent(userId, input);
  }

  async countLearningSignalEvents(userId: string, email: string | null, mode: AppraisalMode) {
    await this.ensureAccess(userId, email);
    return reviewOsRepository.countLearningSignalEvents(userId, mode);
  }

  async listLearningSignalEvents(userId: string, email: string | null, mode: AppraisalMode, limit = 30) {
    await this.ensureAccess(userId, email);
    return reviewOsRepository.listLearningSignalEvents(userId, mode, limit);
  }

  async listReviewQueueForAgenda(userId: string, email: string | null, limit = 30): Promise<ReviewQueueCard[]> {
    await this.ensureAccess(userId, email);
    const queue = await reviewOsRepository.listReviewQueue(userId, limit);
    return queue.filter((item) => !isSmokeSeedQueueItem(item));
  }

  async listLearningAgendaUsageEvents(userId: string, email: string | null, sinceIso: string, limit = 120): Promise<UsageEventRecord[]> {
    await this.ensureAccess(userId, email);
    return reviewOsRepository.listRecentUsageEventsByNames(
      userId,
      [
        "capture_saved",
        "post_save_execution_completed",
        "today_task_completed",
        "today_plan_task_completed",
        "review_complete",
        "review_completed",
        "review_queue_task_completed",
        "overdue_recovery_completed",
        "weakness_recovered",
      ],
      sinceIso,
      limit,
    );
  }

  async getLearningSignalSummary(userId: string, email: string | null, mode: AppraisalMode): Promise<LearningSignalSummary> {
    await this.ensureAccess(userId, email);
    const events = await this.listLearningSignalEvents(userId, email, mode, 50);
    const totalCount = await this.countLearningSignalEvents(userId, email, mode);
    const tagCount = new Map<string, number>();
    const subjectCount = new Map<string, number>();
    const nextTaskTypeCount = new Map<string, number>();
    for (const event of events) {
      subjectCount.set(event.subject, (subjectCount.get(event.subject) ?? 0) + 1);
      nextTaskTypeCount.set(event.nextTaskType, (nextTaskTypeCount.get(event.nextTaskType) ?? 0) + 1);
      for (const tag of event.derivedTags) tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    }
    const rank = (map: Map<string, number>, limit = 3) =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
    return {
      totalCount,
      latestEventAt: events[0]?.createdAt ?? null,
      topTags: rank(tagCount).map(([tag]) => tag),
      topSubjects: rank(subjectCount).map(([subject]) => subject),
      nextTaskTypes: rank(nextTaskTypeCount).map(([type, count]) => ({ type, count })),
    };
  }
  private resolveFollowUpDueAtFromAction(
    action: ReviewCompletionAction,
    examName: string,
    existingNextReviewDate: string | null,
    now = new Date(),
  ) {
    const addDays = (days: number) => {
      const next = new Date(now);
      next.setUTCDate(next.getUTCDate() + days);
      return next.toISOString();
    };

    if (action === "first_short_retry") return addDays(2);
    if (action === "first_confirm_recall") return addDays(3);
    if (action === "second_paragraph_rewrite") return addDays(2);

    if (existingNextReviewDate) {
      return resolveScheduleOverrideDate(existingNextReviewDate, addDays(examName === "감정평가사 2차" ? 2 : 3));
    }

    return addDays(examName === "감정평가사 2차" ? 2 : 3);
  }

  private getCompletionReviewReason(action: ReviewCompletionAction, examName: string) {
    if (action === "first_short_retry") return "짧은 재시도를 완료한 뒤 2일 후 다시 확인합니다.";
    if (action === "first_confirm_recall") return "근거 회상을 확인했고 3일 후 다시 점검합니다.";
    if (action === "second_paragraph_rewrite") return "문단 재작성을 진행했고 2일 후 다시 보강합니다.";
    return examName === "감정평가사 2차"
      ? "예약된 재작성 일정을 유지해 다시 보강합니다."
      : "예약된 복습 일정을 유지해 같은 실수를 줄입니다.";
  }

  private isCompletionActionCompatible(examName: string, action: ReviewCompletionAction) {
    if (examName === "감정평가사 2차") {
      return action === "second_paragraph_rewrite" || action === "second_keep_scheduled_rewrite";
    }
    return (
      action === "first_short_retry" ||
      action === "first_confirm_recall" ||
      action === "first_keep_scheduled_review"
    );
  }

  private readPreservedNextReviewDate(
    context: Awaited<ReturnType<typeof reviewOsRepository.getReviewQueueItemContext>>,
  ) {
    if (!context) return null;

    const itemRawPayload =
      typeof context.item.rawPayload === "object" && context.item.rawPayload
        ? (context.item.rawPayload as Record<string, unknown>)
        : null;
    const queueRawPayload =
      typeof context.queueRow.raw_payload === "object" && context.queueRow.raw_payload
        ? (context.queueRow.raw_payload as Record<string, unknown>)
        : null;
    const userConfirmedFields =
      itemRawPayload?.user_confirmed_fields &&
      typeof itemRawPayload.user_confirmed_fields === "object"
        ? (itemRawPayload.user_confirmed_fields as Record<string, unknown>)
        : null;
    const normalizedDraft =
      itemRawPayload?.normalized_draft && typeof itemRawPayload.normalized_draft === "object"
        ? (itemRawPayload.normalized_draft as Record<string, unknown>)
        : null;

    const candidates = [
      context.item.nextReviewDate,
      typeof itemRawPayload?.nextReviewDate === "string" ? itemRawPayload.nextReviewDate : null,
      typeof normalizedDraft?.nextReviewDate === "string" ? normalizedDraft.nextReviewDate : null,
      typeof userConfirmedFields?.nextReviewDate === "string" ? userConfirmedFields.nextReviewDate : null,
      typeof queueRawPayload?.dueAt === "string" ? queueRawPayload.dueAt : null,
    ];
    return candidates.find((candidate) => typeof candidate === "string" && candidate.trim().length > 0) ?? null;
  }

  async ensureAccess(userId: string, email: string | null): Promise<AccessState> {
    const access = await reviewOsRepository.ensureAccess(userId, email);
    if (!access.allowed) throw new ReviewOsInviteRequiredError();
    return access;
  }

  getStudyProfile(userId: string) {
    return reviewOsRepository.getStudyProfile(userId);
  }

  async upsertStudyProfile(
    userId: string,
    email: string | null,
    input: Omit<StudyProfile, "userId" | "createdAt" | "updatedAt">,
  ) {
    await this.ensureAccess(userId, email);
    const mode = resolveAppraisalMode(null, input.examName);
    const normalizedInput = {
      ...input,
      examName: getModeLabel(mode),
      preferredSubjects: normalizePreferredSubjectsForMode(input.preferredSubjects, mode),
    }
    const profile = await reviewOsRepository.upsertStudyProfile(userId, normalizedInput);
    await reviewOsRepository.logUsageEvent(userId, "profile_create", "study_profile", userId, {
      examName: normalizedInput.examName,
      preferredSubjects: normalizedInput.preferredSubjects,
    });
    return profile;
  }

  async getUsageSummary(userId: string, email: string | null): Promise<UsageSummary> {
    const access = await this.ensureAccess(userId, email);
    const tier = access.entitlementTier;
    const limits = getEntitlementLimit(tier);
    const monthlyUsed = await reviewOsRepository.countMonthlyWrongAnswers(userId, getMonthStartIso());
    return {
      tier,
      monthlyLimit: limits.monthlyWrongAnswers,
      monthlyUsed,
      remaining: Math.max(0, limits.monthlyWrongAnswers - monthlyUsed),
      burstBlocked: false,
    };
  }

  async createWrongAnswerItem(userId: string, email: string | null, input: WrongAnswerItemInput) {
    await this.ensureAccess(userId, email);
    const mode = resolveAppraisalMode(null, input.examName);
    const config = getModeConfig(mode);
    const normalizedInput: WrongAnswerItemInput = {
      ...input,
      examName: getModeLabel(mode),
      subjectLabel: normalizeSubjectForMode(input.subjectLabel, mode),
    };

    const rate = consumeRateLimit(`review-os:${userId}`);
    if (!rate.allowed) throw new ReviewOsBurstLimitError();

    const usage = await this.getUsageSummary(userId, email);
    if (usage.remaining <= 0) throw new ReviewOsUsageLimitError();
    await assertCanCreateWrongAnswer(userId);

    const dedupeKey = reviewOsRepository.createDedupeKey(userId, normalizedInput);
    const existing = await reviewOsRepository.findExistingByDedupe(userId, dedupeKey);
    if (existing) return { item: existing, deduped: true };

    const locks = getGenerationLockStore();
    if (locks.get(userId)) throw new ReviewOsConcurrentGenerationError();
    locks.set(userId, true);

    try {
      const artifacts = await generateWrongAnswerArtifacts(normalizedInput);
      const recurrence = await reviewOsRepository.upsertRecurrenceFeature(userId, {
        examName: normalizedInput.examName,
        subjectLabel: normalizedInput.subjectLabel,
        topicTag: artifacts.tags.topicTag,
        mistakeType: artifacts.tags.mistakeType,
      });
      const schedule = resolveReviewSchedule({
        mode,
        isCorrect: isMeaningfullyCorrectAnswer(normalizedInput.correctAnswer, normalizedInput.userAnswer),
        confidence: normalizedInput.confidence,
        mistakeType: artifacts.tags.mistakeType,
        recurrenceCount: recurrence?.recurrenceCount ?? 1,
        hasWeakParagraph: mode === "second" && Boolean(normalizedInput.weakStructurePoint || normalizedInput.missingIssue),
      });
      const effectiveNextReviewDate = input.nextReviewDate ?? schedule.nextReviewDate;
      const queueDueAt = schedule.retryDueAt ?? resolveScheduleOverrideDate(effectiveNextReviewDate, schedule.reviewDueAt);

      const isCaptureCreated = input.createdFromCapture === true;
      if (isCaptureCreated) {
        recordLearningMetricIfEnabled(buildLearningMetricEvent({
          eventName: "capture_started",
          examMode: mode,
          subject: normalizedInput.subjectLabel,
          taskType: mode === "second" ? "answer_note" : "capture_note",
          sourceEventType: "capture",
          properties: { status: "started" },
        }));
        await reviewOsRepository.logUsageEvent(
          userId,
          "capture_started",
          "capture_session",
          null,
          sanitizeCaptureTelemetryMetadata({ mode, subject: normalizedInput.subjectLabel, createdFromCapture: true }),
        );
        await reviewOsRepository.logUsageEvent(
          userId,
          "capture_input_method_selected",
          "capture_session",
          null,
          sanitizeCaptureTelemetryMetadata({ mode, sourceType: input.sourceType, createdFromCapture: true }),
        );
      }
      const captureSignals = isCaptureCreated ? buildCaptureNoteSignals(mode, normalizedInput) : null;
      let captureSignalsV2: Record<string, unknown> | null = null;
      if (isCaptureCreated) {
        try {
          captureSignalsV2 = structureCaptureNote({
            mode,
            subject: normalizedInput.subjectLabel,
            confirmedText: normalizedInput.rawQuestionText ?? normalizedInput.userAnswer,
            problemText: normalizedInput.rawQuestionText,
            userAnswerText: normalizedInput.userAnswer,
            existingNormalizedDraft: normalizedInput.extractionPayload?.normalized_draft ?? null,
            userConfirmedFields: normalizedInput.extractionPayload?.user_confirmed_fields,
            itemInput: normalizedInput,
          }) as Record<string, unknown>;
          await reviewOsRepository.logUsageEvent(
            userId,
            "ocr_draft_generated",
            "capture_session",
            null,
            sanitizeCaptureTelemetryMetadata({ mode, subject: normalizedInput.subjectLabel, sourceType: input.sourceType, createdFromCapture: true }),
          );
        } catch (error) {
          await reviewOsRepository.logUsageEvent(
            userId,
            "ocr_draft_failed",
            "capture_session",
            null,
            sanitizeCaptureTelemetryMetadata({ mode, subject: normalizedInput.subjectLabel, sourceType: input.sourceType, createdFromCapture: true }),
          );
          console.warn("[review-os] capture note structuring fallback", error);
          captureSignalsV2 = captureSignals as Record<string, unknown> | null;
        }
      }

      let taxonomyClassification: {
        primaryNodeId: string | null;
        candidates: TaxonomyClassificationCandidate[];
        classificationStatus: "ai_suggested" | "needs_review";
        classificationConfidence: number;
        classifierSource: "local_taxonomy_v1";
      } | null = null;
      try {
        const taxonomy = classifyWrongAnswerTaxonomy({
          examName: normalizedInput.examName,
          mode,
          subjectLabel: normalizedInput.subjectLabel,
          problemTitle: normalizedInput.problemTitle,
          rawQuestionText: normalizedInput.rawQuestionText,
          userReasonText: normalizedInput.userReasonText,
          userReasonPreset: normalizedInput.userReasonPreset,
          keyConcepts: normalizedInput.keyConcepts,
          coreFormula: normalizedInput.coreFormula,
          comparisonPoint: normalizedInput.comparisonPoint,
          missingIssue: normalizedInput.missingIssue,
          weakStructurePoint: normalizedInput.weakStructurePoint,
          weakApplicationSentence: normalizedInput.weakApplicationSentence,
        });
        taxonomyClassification = {
          primaryNodeId: taxonomy.primary?.taxonomyNodeId ?? null,
          candidates: taxonomy.candidates,
          classificationStatus: taxonomy.classificationStatus,
          classificationConfidence: taxonomy.classificationConfidence,
          classifierSource: "local_taxonomy_v1",
        };
      } catch (error) {
        console.warn("[review-os] wrong answer taxonomy classification fallback", error);
      }

      if (isCaptureCreated) {
        await reviewOsRepository.logUsageEvent(
          userId,
          "draft_field_edited",
          "capture_session",
          null,
          sanitizeCaptureTelemetryMetadata({ mode, fieldName: "normalized_draft", fieldChanged: Boolean(input.extractionPayload?.user_confirmed_fields), createdFromCapture: true }),
        );
        await reviewOsRepository.logUsageEvent(
          userId,
          "draft_confirmed",
          "capture_session",
          null,
          sanitizeCaptureTelemetryMetadata({ mode, subject: normalizedInput.subjectLabel, confidence: normalizedInput.confidence, createdFromCapture: true }),
        );
      }

      const secondRewriteSignal = mode === "second" ? buildSecondAnswerRewriteSignal(normalizedInput) : null;
      const taxonomyNodeLabel = taxonomyClassification?.candidates[0]?.topic ?? taxonomyClassification?.primaryNodeId ?? null;
      const conceptNodeCandidate = buildConceptNodeCandidate({
        mode,
        subject: normalizedInput.subjectLabel,
        mistakeType: artifacts.tags.mistakeType,
        metadata: {
          topic_candidate: artifacts.tags.topicTag,
          mistake_type: artifacts.tags.mistakeType,
          weak_structure_point: input.weakStructurePoint,
          missing_issue: input.missingIssue,
          missingIssueCandidate: secondRewriteSignal?.missingIssueCandidate,
          keyConcepts: input.keyConcepts,
          nextAction: input.comparisonPoint ?? input.rewriteInstruction ?? input.biggestGap,
          calculationRisk: input.calculationRisk ?? secondRewriteSignal?.calculationRisk,
          unitRisk: input.unitRisk ?? secondRewriteSignal?.unitRisk,
          supportedCalculatorTemplateId: input.supportedCalculatorTemplateId ?? secondRewriteSignal?.supportedCalculatorTemplateId,
          taxonomy_node_label: taxonomyNodeLabel,
        },
      });

      const item = await reviewOsRepository.insertWrongAnswerItem(
        userId,
        normalizedInput,
        {
          captureMethod: input.sourceType,
          nextReviewDate: effectiveNextReviewDate,
          raw_ocr_text: input.extractionPayload?.raw_ocr_text ?? input.rawQuestionText ?? null,
          raw_extraction_json: input.extractionPayload?.raw_extraction_json ?? {},
          normalized_draft: input.extractionPayload?.normalized_draft ?? null,
          user_confirmed_fields: input.extractionPayload?.user_confirmed_fields ?? {
            subjectLabel: normalizedInput.subjectLabel,
            correctAnswer: normalizedInput.correctAnswer,
            userAnswer: normalizedInput.userAnswer,
            userReasonText: normalizedInput.userReasonText ?? null,
            userReasonPreset: normalizedInput.userReasonPreset ?? null,
            nextReviewDate: effectiveNextReviewDate,
          },
          mode,
          artifactType: config.artifactType,
          noteKind: config.noteKind,
          subjectLabel: normalizedInput.subjectLabel,
          aiDraft: {
            keyConcepts: input.keyConcepts ?? [],
            coreFormula: input.coreFormula ?? null,
            comparisonPoint: input.comparisonPoint ?? null,
            missingIssue: input.missingIssue ?? null,
            weakStructurePoint: input.weakStructurePoint ?? null,
            weakApplicationSentence: input.weakApplicationSentence ?? null,
            rewriteInstruction: input.rewriteInstruction ?? null,
            calculationRisk: input.calculationRisk ?? secondRewriteSignal?.calculationRisk ?? null,
            unitRisk: input.unitRisk ?? secondRewriteSignal?.unitRisk ?? null,
            rewriteTaskType: secondRewriteSignal?.rewriteTaskType ?? null,
            supportedCalculatorTemplateId: secondRewriteSignal?.supportedCalculatorTemplateId ?? null,
            referenceStructure: input.referenceStructure ?? null,
            myAnswerSummary: input.myAnswerSummary ?? null,
            caseSummary: input.caseSummary ?? null,
          },
          taxonomyClassification,
          rewrite_source_item_id: input.rewriteSourceItemId ?? null,
          rewrite_source_gap: input.rewriteSourceGap ?? null,
          rewrite_instruction: input.rewriteInstruction ?? null,
          rewrite_paragraph: input.rewriteParagraph ?? null,
          rewrite_completed: input.rewriteCompleted ?? null,
          concept_card: input.conceptCard ?? null,
          review_stage: input.conceptCard?.reviewStage ?? null,
          due_at: input.conceptCard?.dueAt ?? null,
          issue_recall: input.issueRecall ?? null,
          outline_draft: input.outlineDraft ?? null,
          production_before_comparison: input.productionBeforeComparison ?? null,
          produced_answer_before_reference: input.productionBeforeComparison ?? null,
          reference_answer_added_after_production: input.referenceAnswerAddedAfterProduction ?? null,
          biggest_gap: input.biggestGap ?? input.missingIssue ?? null,
          created_from_capture: isCaptureCreated,
          capture_intent: isCaptureCreated ? (input.captureIntent ?? "save") : null,
        },
        {
          topicTag: artifacts.tags.topicTag,
          mistakeType: artifacts.tags.mistakeType,
          recurrenceCount: recurrence?.recurrenceCount ?? 1,
          taxonomyClassification,
          created_from_capture: isCaptureCreated,
          capture_note_engine_v1: captureSignals,
          capture_note_engine_v2: captureSignalsV2 ?? captureSignals,
          concept_node_candidate: conceptNodeCandidate,
          conceptNodeId: conceptNodeCandidate.conceptNodeId,
          conceptFamily: conceptNodeCandidate.conceptFamily,
          retrievalPrompt: conceptNodeCandidate.retrievalPrompt,
          conceptNextTaskType: conceptNodeCandidate.nextTaskType,
          concept_card: input.conceptCard ?? null,
          review_stage: input.conceptCard?.reviewStage ?? null,
          cloze_candidate: input.conceptCard?.trapWords?.[0] ?? input.keyConcepts?.[0] ?? null,
          rewriteTaskType: secondRewriteSignal?.rewriteTaskType ?? null,
          missingIssueCandidate: secondRewriteSignal?.missingIssueCandidate ?? null,
          weakStructurePoint: secondRewriteSignal?.weakStructurePoint ?? null,
          calculationRisk: secondRewriteSignal?.calculationRisk ?? null,
          unitRisk: secondRewriteSignal?.unitRisk ?? null,
          supportedCalculatorTemplateId: secondRewriteSignal?.supportedCalculatorTemplateId ?? null,
        },
      );

      if (!item) throw new Error("review-os-item-missing-after-insert");

      await reviewOsRepository.insertWrongAnswerNote(userId, item.id, artifacts.note);
      await reviewOsRepository.insertWrongAnswerTag(userId, item.id, artifacts.tags);

      const confirmedFields = input.extractionPayload?.user_confirmed_fields as Record<string, unknown> | undefined;
      const rawLowConfidenceCapture = Boolean(confirmedFields?.lowConfidenceFlag)
        || /low_confidence|ocr_failed|manual_fallback/.test(String(confirmedFields?.captureQualityIssue ?? ""));
      const lowConfidenceCapture = rawLowConfidenceCapture && confirmedFields?.ocrConfirmedByLearner !== true;
      const priorityScore = isCaptureCreated
        ? computeCaptureQueuePriority({
            examName: item.examName,
            confidence: item.confidence,
            timeSpentSeconds: item.timeSpentSeconds ?? null,
            mistakeOrWeakPoint: `${artifacts.tags.mistakeType} ${input.weakStructurePoint ?? ""} ${input.missingIssue ?? ""}`,
            weakStructurePoint: input.weakStructurePoint,
            missingIssue: input.missingIssue,
          })
        : rankQueueItem({
            recurrenceCount: recurrence?.recurrenceCount ?? 1,
            confidence: item.confidence,
            timeSpentSeconds: item.timeSpentSeconds ?? null,
            createdAt: item.createdAt,
          });
      const reviewReason = isCaptureCreated
        ? lowConfidenceCapture
          ? "OCR 숫자/용어 확인 필요"
          : buildCaptureReviewReason({
              examName: item.examName,
              confidence: item.confidence,
              mistakeReason: artifacts.tags.mistakeType,
              weakStructurePoint: input.weakStructurePoint,
              missingIssue: input.missingIssue,
            })
        : getReviewReason({
            recurrenceCount: recurrence?.recurrenceCount ?? 1,
            confidence: item.confidence,
            timeSpentSeconds: item.timeSpentSeconds ?? null,
            mistakeType: artifacts.tags.mistakeType,
          });

      await reviewOsRepository.logUsageEvent(
        userId,
        "capture_saved",
        "wrong_answer_item",
        item.id,
        sanitizeCaptureTelemetryMetadata({
          mode,
          subject: item.subjectLabel,
          sourceType: input.sourceType,
          confidence: item.confidence,
          nextTaskType: mode === "second" ? "rewrite" : "retry",
          topicCandidate: artifacts.tags.topicTag,
          mistakeType: artifacts.tags.mistakeType,
          weakStructurePoint: input.weakStructurePoint ?? null,
          missingIssue: input.missingIssue ?? null,
          createdFromCapture: isCaptureCreated,
        }),
      );
      if (isCaptureCreated) {
        recordLearningMetricIfEnabled(buildLearningMetricEvent({
          eventName: "capture_saved",
          examMode: mode,
          subject: item.subjectLabel,
          conceptNodeId: conceptNodeCandidate.conceptNodeId,
          taskType: mode === "second" ? "rewrite" : "review_candidate",
          sourceEventType: "capture",
          properties: { status: "saved", confidenceBand: item.confidence },
        }));
      }
      await reviewOsRepository.logUsageEvent(userId, "post_save_execution_started", "wrong_answer_item", item.id, sanitizeCaptureTelemetryMetadata({ mode, nextTaskType: mode === "second" ? "rewrite" : "retry", createdFromCapture: isCaptureCreated }));

      await reviewOsRepository.insertReviewQueueEntry(userId, item, reviewReason, priorityScore, queueDueAt, {
        topicTag: artifacts.tags.topicTag,
        mistakeType: artifacts.tags.mistakeType,
        recurrenceCount: recurrence?.recurrenceCount ?? 1,
        concept_node_candidate: conceptNodeCandidate,
        conceptNodeId: conceptNodeCandidate.conceptNodeId,
        conceptFamily: conceptNodeCandidate.conceptFamily,
        retrievalPrompt: conceptNodeCandidate.retrievalPrompt,
        conceptNextTaskType: conceptNodeCandidate.nextTaskType,
        schedulingPolicy: schedule.policy,
        retryDueAt: schedule.retryDueAt,
        followUpReviewAt: schedule.followUpReviewAt,
        nextReviewDate: effectiveNextReviewDate,
      });
      if (isCaptureCreated) {
        recordLearningMetricIfEnabled(buildLearningMetricEvent({
          eventName: "adaptive_today_plan_generated",
          examMode: mode,
          subject: item.subjectLabel,
          conceptNodeId: conceptNodeCandidate.conceptNodeId,
          taskType: mode === "second" ? "rewrite" : "review_candidate",
          sourceEventType: "capture",
          properties: { candidateCount: 1, selectedCount: 1 },
        }));
      }
      await reviewOsRepository.logUsageEvent(userId, "post_save_execution_completed", "wrong_answer_item", item.id, sanitizeCaptureTelemetryMetadata({ mode, createdFromCapture: isCaptureCreated }));
      await reviewOsRepository.logUsageEvent(userId, "review_followup_scheduled", "review_queue_item", item.id, sanitizeCaptureTelemetryMetadata({ mode, nextTaskType: mode === "second" ? "rewrite" : "retry", createdFromCapture: isCaptureCreated }));

      if (isCaptureCreated) {
        try {
          await reviewOsRepository.createLearningSignalEvent(
            userId,
            buildCaptureLearningSignal({
              itemId: item.id,
              examName: item.examName,
              subject: item.subjectLabel,
              sourceType: input.sourceType,
              confidence: item.confidence,
              timeSpentSeconds: item.timeSpentSeconds ?? undefined,
              biggestGap: input.biggestGap ?? input.missingIssue,
              nextAction: input.comparisonPoint,
              mistakeReason: artifacts.tags.mistakeType,
              keyConcepts: input.keyConcepts,
              weakStructurePoint: input.weakStructurePoint,
              missingIssue: input.missingIssue,
              rewriteInstruction: input.rewriteInstruction,
              calculationRisk: secondRewriteSignal?.calculationRisk ?? undefined,
              unitRisk: secondRewriteSignal?.unitRisk ?? undefined,
              supportedCalculatorTemplateId: secondRewriteSignal?.supportedCalculatorTemplateId ?? undefined,
              createdFromCapture: true,
            }),
          );
        } catch (error) {
          console.warn("[review-os] capture learning signal event skipped", error);
        }
      }

      await reviewOsRepository.logUsageEvent(userId, "wrong_answer_create", "wrong_answer_item", item.id, {
        examName: item.examName,
        subjectLabel: item.subjectLabel,
      });
      await reviewOsRepository.logUsageEvent(userId, "ai_note_generate", "wrong_answer_item", item.id, {
        generationSource: artifacts.note.generationSource,
      });
      await reviewOsRepository.logUsageEvent(userId, "tag_generate", "wrong_answer_item", item.id, {
        topicTag: artifacts.tags.topicTag,
        mistakeType: artifacts.tags.mistakeType,
      });
      if (mode === "second" && input.rewriteSourceItemId) {
        await reviewOsRepository.logUsageEvent(userId, "second_stage_rewrite_completed", "wrong_answer_item", item.id, {
          rewrite_source_item_id: input.rewriteSourceItemId,
          rewrite_source_gap: input.rewriteSourceGap ?? null,
          rewrite_completed: input.rewriteCompleted ?? true,
        });
      }

      return { item, deduped: false };
    } finally {
      locks.delete(userId);
    }
  }

  listWrongAnswerItems(userId: string, email: string | null, limit = 20) {
    return this.ensureAccess(userId, email)
      .then((access) =>
        reviewOsRepository.listWrongAnswerItems(userId, Math.max(limit + 20, limit)).then((items) => {
          const historyDays = getEntitlementLimit(access.entitlementTier).historyDays;
          const cutoffMs = historyDays ? Date.now() - historyDays * 86_400_000 : null;
          return items
            .filter((item) => !isSmokeSeedItem(item))
            .filter((item) => {
              if (!cutoffMs) return true;
              const ts = Date.parse(item.createdAt);
              return Number.isFinite(ts) && ts >= cutoffMs;
            })
            .slice(0, limit);
        }),
      );
  }

  getWrongAnswerDetail(userId: string, email: string | null, itemId: string): Promise<WrongAnswerDetail | null> {
    return this.ensureAccess(userId, email).then(() => reviewOsRepository.getWrongAnswerDetail(userId, itemId));
  }

  async getReviewQueue(userId: string, email: string | null) {
    await this.ensureAccess(userId, email);
    const queue = await reviewOsRepository.listReviewQueue(userId, 10);
    const now = Date.now();
    const recentCaptureWindowMs = 1000 * 60 * 60 * 24;
    const getRecentCaptureBoost = (queueItem: (typeof queue)[number]) => {
      if (!queueItem.createdFromCapture) {
        return 0;
      }
      const parsedCreatedAt = Date.parse(queueItem.itemCreatedAt);
      if (Number.isFinite(parsedCreatedAt)) {
        return now >= parsedCreatedAt && now - parsedCreatedAt <= recentCaptureWindowMs ? 15 : 0;
      }
      const parsedDueAt = Date.parse(queueItem.dueAt);
      return Number.isFinite(parsedDueAt) && now >= parsedDueAt && now - parsedDueAt <= recentCaptureWindowMs ? 15 : 0;
    };
    const prioritizedQueue = [...queue].sort((left, right) => {
      const leftRecentCaptureBoost = getRecentCaptureBoost(left);
      const rightRecentCaptureBoost = getRecentCaptureBoost(right);
      return right.priorityScore + rightRecentCaptureBoost - (left.priorityScore + leftRecentCaptureBoost);
    });
    await reviewOsRepository.logUsageEvent(userId, "review_queue_view", "review_queue", null, { itemCount: queue.length });
    return prioritizedQueue;
  }

  async completeReview(
    userId: string,
    email: string | null,
    queueId: string,
    action: ReviewCompletionAction,
    metadata: ReviewCompletionMetadata = {},
  ) {
    await this.ensureAccess(userId, email);
    const context = await reviewOsRepository.getReviewQueueItemContext(userId, queueId);
    if (context && !this.isCompletionActionCompatible(context.item.examName, action)) {
      throw new ReviewOsInvalidCompletionActionError();
    }
    await reviewOsRepository.completeReviewQueueItem(userId, queueId);
    if (context) {
      const derivedPayload =
        typeof context.queueRow.derived_payload === "object" && context.queueRow.derived_payload
          ? (context.queueRow.derived_payload as Record<string, unknown>)
          : {};
      const followUpDueAt = this.resolveFollowUpDueAtFromAction(
        action,
        context.item.examName,
        this.readPreservedNextReviewDate(context),
      );
      const recurrenceCount = typeof derivedPayload.recurrenceCount === "number" ? derivedPayload.recurrenceCount : 1;
      const followUpPriority = Math.max(
        32,
        rankQueueItem({
          recurrenceCount,
          confidence: context.item.confidence,
          timeSpentSeconds: context.item.timeSpentSeconds ?? null,
          createdAt: context.item.createdAt,
        }),
      );
      const rawRewriteParagraph =
        action === "second_paragraph_rewrite" && typeof metadata.rewriteParagraph === "string"
          ? metadata.rewriteParagraph.trim()
          : "";
      const conceptNodeCandidate = readConceptNodeCandidateFromPayload(derivedPayload);
      await reviewOsRepository.createFollowUpReviewQueueEntry(
        userId,
        context.item,
        action,
        followUpDueAt,
        this.getCompletionReviewReason(action, context.item.examName),
        followUpPriority,
        {
          recurrenceCount,
          mistakeType: context.primaryTag?.mistakeType ?? "반복 실수",
          topicTag: context.primaryTag?.topicTag ?? context.item.subjectLabel,
          ...(conceptNodeCandidate
            ? {
                concept_node_candidate: conceptNodeCandidate,
                conceptNodeId: conceptNodeCandidate.conceptNodeId,
                conceptFamily: conceptNodeCandidate.conceptFamily,
                retrievalPrompt: conceptNodeCandidate.retrievalPrompt,
                conceptNextTaskType: conceptNodeCandidate.nextTaskType,
              }
            : {}),
          rewriteTaskType: context.item.examName === "감정평가사 2차" ? "second_answer_rewrite" : undefined,
          rewriteInstruction: metadata.rewriteInstruction ?? context.item.rewriteInstruction ?? null,
        },
        rawRewriteParagraph
          ? {
              rewrite_paragraph: rawRewriteParagraph,
              original_answer_item_id: context.item.id,
              original_answer_preserved: true,
            }
          : {},
      );
    }
    const { rewriteParagraph: _rewriteParagraph, ...safeMetadata } = metadata;
    await reviewOsRepository.logUsageEvent(userId, "review_complete", "review_queue_item", queueId, {
      action,
      ...safeMetadata,
      rewriteParagraphStoredSeparately: Boolean(_rewriteParagraph),
    });
    const metricConceptNodeCandidate = context ? readConceptNodeCandidateFromPayload(context.queueRow.derived_payload) : null;
    recordLearningMetricIfEnabled(buildLearningMetricEvent({
      eventName: "review_queue_task_completed",
      examMode: context?.item.examName === "감정평가사 2차" ? "second" : "first",
      subject: context?.item.subjectLabel,
      conceptNodeId: metricConceptNodeCandidate?.conceptNodeId ?? context?.primaryTag?.topicTag ?? context?.item.subjectLabel,
      taskType: action,
      sourceEventType: "review",
      properties: { status: "completed", wasDue: true },
    }));
  }

  async migrateFirstToSecondMode(userId: string, email: string | null) {
    await this.ensureAccess(userId, email);
    const [profile, rawItems, rawQueue, firstSignals] = await Promise.all([
      reviewOsRepository.getStudyProfile(userId),
      reviewOsRepository.listWrongAnswerItems(userId, 120),
      reviewOsRepository.listReviewQueue(userId, 80),
      reviewOsRepository.listLearningSignalEvents(userId, "first", 80),
    ]);
    const firstItems = rawItems.filter((item) => item.examName === "감정평가사 1차" && !isSmokeSeedItem(item));
    const firstQueue = rawQueue.filter((item) => item.examName === "감정평가사 1차" && !isSmokeSeedQueueItem(item));
    const snapshot = buildFirstToSecondMigrationSnapshot({ firstItems, firstQueue, firstLearningSignals: firstSignals });
    await reviewOsRepository.archiveReviewQueueItemsForMode(userId, firstQueue.map((item) => item.queueId));
    const preferredSubjects = normalizePreferredSubjectsForMode(profile?.preferredSubjects, "second");
    const nextProfile = await reviewOsRepository.upsertStudyProfile(userId, {
      examName: getModeLabel("second"),
      examDate: profile?.examDate ?? null,
      preferredSubjects,
    });
    await reviewOsRepository.createLearningSignalEvent(userId, buildSecondModeMigrationLearningSignal(snapshot));
    await reviewOsRepository.logUsageEvent(userId, "first_to_second_mode_migration_confirmed", "study_profile", userId, {
      activeMode: "second",
      archivedMode: "first",
      archivedTodayPlanQueueCount: snapshot.archivedTodayPlanQueueCount,
      containsRawContent: false,
    });
    return { profile: nextProfile, migration: snapshot };
  }

  async getTodayFocus(userId: string, email: string | null, preferredMode?: "first" | "second"): Promise<TodayFocus> {
    await this.ensureAccess(userId, email);
    const [rawQueue, rawRecentItems] = await Promise.all([
      reviewOsRepository.listReviewQueue(userId, 30),
      reviewOsRepository.listWrongAnswerItems(userId, 8),
    ]);
    const targetExamName = preferredMode ? getModeLabel(preferredMode) : null;
    const queue = targetExamName ? rawQueue.filter((item) => item.examName === targetExamName) : rawQueue;
    const recentItems = targetExamName
      ? rawRecentItems.filter((item) => item.examName === targetExamName)
      : rawRecentItems;
    const visibleQueue = queue.filter((item) => !isSmokeSeedQueueItem(item));
    const visibleRecentItems = recentItems.filter((item) => !isSmokeSeedItem(item));
    const focus = makeTodayFocus(visibleQueue, visibleRecentItems, preferredMode);
    await reviewOsRepository.insertActionSeed(userId, {
      sourceType: "today_focus",
      seedType: "summary",
      priorityScore: focus.priorityScore,
      renderedText: focus.lines.join(" "),
      rawPayload: {
        lines: focus.lines,
        nextAction: focus.nextAction,
        reason: focus.reason,
        estimatedDurationMinutes: focus.estimatedDurationMinutes,
        sourceQueueId: focus.sourceQueueId,
        sourceItemId: focus.sourceItemId,
      },
    });
    await reviewOsRepository.insertActionSeed(userId, {
      sourceType: "next_action",
      seedType: "action",
      priorityScore: focus.priorityScore,
      renderedText: focus.nextAction,
      rawPayload: { nextActionType: focus.nextActionType, sourceQueueId: focus.sourceQueueId, sourceItemId: focus.sourceItemId },
    });
    await reviewOsRepository.logUsageEvent(userId, "today_focus_view", "today_focus", null, { queueCount: visibleQueue.length });
    return focus;
  }

  async getWeeklyPlan(userId: string, email: string | null, preferredMode: "first" | "second"): Promise<WeeklyPlan> {
    await this.ensureAccess(userId, email);
    const targetExamName = getModeLabel(preferredMode);
    const [rawQueue, rawItems] = await Promise.all([
      reviewOsRepository.listReviewQueue(userId, 30),
      reviewOsRepository.listWrongAnswerItems(userId, 60),
    ]);
    const queue = rawQueue.filter((item) => item.examName === targetExamName);
    const recentItems = rawItems.filter((item) => item.examName === targetExamName);
    const plan = buildWeeklyPlan(queue, recentItems, preferredMode);
    await reviewOsRepository.insertActionSeed(userId, {
      sourceType: "weekly_focus",
      seedType: "summary",
      priorityScore: plan.tasks[0]?.priorityScore ?? 0,
      renderedText: plan.summary,
      rawPayload: {
        mode: preferredMode,
        primaryActionLabel: plan.primaryActionLabel,
        tasks: plan.tasks.map((task) => ({
          queueId: task.queueId,
          action: task.action,
          subject: task.subject,
          reason: task.reason,
          estimatedDurationMinutes: task.estimatedDurationMinutes,
          target: task.target,
          priorityOrder: task.priorityOrder,
          dueAt: task.dueAt,
        })),
        recovery: plan.recovery
          ? {
              overdueCount: plan.recovery.overdueCount,
              queueId: plan.recovery.task.queueId,
              estimatedDurationMinutes: plan.recovery.task.estimatedDurationMinutes,
            }
          : null,
      },
    });
    await reviewOsRepository.logUsageEvent(userId, "weekly_plan_view", "weekly_summary", null, {
      mode: preferredMode,
      queueCount: plan.secondaryRecords.queueCount,
      overdueCount: plan.secondaryRecords.overdueCount,
      taskCount: plan.tasks.length,
    });
    return plan;
  }

  async getWeeklySummary(userId: string, email: string | null): Promise<WeeklyLearningSummaryRecord | null> {
    await this.ensureAccess(userId, email);
    const weekKey = getWeekKey();
    const existing = await reviewOsRepository.getWeeklySummary(userId, weekKey);
    if (existing && !isSmokeSeedWeeklySummary(existing)) {
      await reviewOsRepository.logUsageEvent(userId, "weekly_summary_view", "weekly_summary", existing.id, { weekKey });
      return existing;
    }

    const items = (await reviewOsRepository.listWrongAnswerItems(userId, 70)).filter((item) => !isSmokeSeedItem(item));
    const recentWeekItems = items.filter((item) => Date.now() - Date.parse(item.createdAt) <= 7 * 86_400_000);
    if (recentWeekItems.length === 0) return null;

    const details = await Promise.all(
      recentWeekItems.slice(0, 20).map((item) => reviewOsRepository.getWrongAnswerDetail(userId, item.id)),
    );
    const tags = details.flatMap((detail) => (detail?.tags[0] ? [detail.tags[0]] : []));
    const tagCounts = new Map<string, number>();
    const topicCounts = new Map<string, number>();
    tags.forEach((tag) => {
      tagCounts.set(tag.mistakeType, (tagCounts.get(tag.mistakeType) ?? 0) + 1);
      topicCounts.set(tag.topicTag, (topicCounts.get(tag.topicTag) ?? 0) + 1);
    });
    const topMistakeTypes = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => key);
    const topTopics = [...topicCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => key);
    const slowCount = recentWeekItems.filter((item) => (item.timeSpentSeconds ?? 0) >= 180).length;
    const lowConfidenceCount = recentWeekItems.filter((item) => item.confidence === "낮음").length;
    const nextWeekFocus = [
      topMistakeTypes[0] ? `${topMistakeTypes[0]}부터 다시 정리하기` : "반복 실수부터 다시 정리하기",
      topTopics[0] ? `${topTopics[0]} 관련 항목 먼저 보기` : "최근 항목 먼저 보기",
      slowCount > 0 ? "시간이 오래 걸린 문제의 풀이 순서 줄이기" : "확신 낮은 항목의 근거 문장 다시 보기",
    ];
    const summaryText = makeWeeklySummaryText(topMistakeTypes, topTopics, slowCount, lowConfidenceCount);
    const summary = await reviewOsRepository.upsertWeeklySummary(
      userId,
      weekKey,
      summaryText,
      topMistakeTypes,
      topTopics,
      nextWeekFocus,
    );
    await reviewOsRepository.insertActionSeed(userId, {
      sourceType: "weekly_focus",
      seedType: "summary",
      priorityScore: 50,
      renderedText: summary?.summaryText ?? summaryText,
      rawPayload: { topMistakeTypes, topTopics, nextWeekFocus },
    });
    await reviewOsRepository.logUsageEvent(userId, "weekly_summary_view", "weekly_summary", summary?.id ?? null, { weekKey });
    return summary;
  }

  async submitFeedback(userId: string, email: string | null, input: FeedbackItemInput) {
    await this.ensureAccess(userId, email);
    await reviewOsRepository.createFeedback(userId, input);
    await reviewOsRepository.logUsageEvent(userId, "feedback_submit", "feedback_item", null, { route: input.route });
  }

  async createStudyLog(userId: string, email: string | null, input: StudyLogInput) {
    await this.ensureAccess(userId, email);
    const normalizedMode = input.mode === "second" ? "second" : "first";
    const normalizedInput: StudyLogInput = {
      ...input,
      mode: normalizedMode,
      subject: normalizeSubjectForMode(input.subject, normalizedMode),
      sourceLabel: input.sourceLabel.trim(),
      notUnderstood: input.notUnderstood.trim(),
      revisitNeeded: input.revisitNeeded.trim(),
      timeSpentMinutes: input.timeSpentMinutes ?? null,
    };
    const taxonomy = classifyStudyLogTaxonomy({
      mode: normalizedInput.mode,
      subject: normalizedInput.subject,
      studyType: normalizedInput.studyType,
      sourceLabel: normalizedInput.sourceLabel,
      notUnderstood: normalizedInput.notUnderstood,
      revisitNeeded: normalizedInput.revisitNeeded,
    });

    const log = await reviewOsRepository.createStudyLog(userId, normalizedInput, {
      taxonomyNodeId: taxonomy.primary?.taxonomyNodeId ?? null,
      taxonomyCandidates: taxonomy.candidates,
      taxonomyClassificationStatus: taxonomy.classificationStatus,
      taxonomyClassificationConfidence: taxonomy.classificationConfidence,
    });
    if (!log) throw new Error("review-os-study-log-missing-after-insert");
    await reviewOsRepository.logUsageEvent(userId, "study_log_create", "study_log", log.id, {
      mode: normalizedMode,
      subject: log.subject,
      studyType: log.studyType,
    });
    return log;
  }

  async listStudyLogs(userId: string, email: string | null, mode?: "first" | "second", limit = 10) {
    await this.ensureAccess(userId, email);
    const logs = await reviewOsRepository.listStudyLogs(userId, mode, Math.max(limit + 10, limit));
    return logs.filter((log) => !isSmokeSeedStudyLog(log)).slice(0, limit);
  }

  async getRecentStudyLog(userId: string, email: string | null, mode: "first" | "second") {
    const logs = await this.listStudyLogs(userId, email, mode, 1);
    return logs[0] ?? null;
  }

  async getDailyStudyActivity(userId: string, email: string | null, mode: "first" | "second"): Promise<DailyStudyActivity> {
    await this.ensureAccess(userId, email);
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const kstDayKey = getKstDayKey(now);
    const yesterdayKstDayKey = getKstDayKey(yesterday);
    const nowIso = now.toISOString();
    const dayStartUtcIso = new Date(`${kstDayKey}T00:00:00+09:00`).toISOString();
    const yesterdayStartUtcIso = new Date(`${yesterdayKstDayKey}T00:00:00+09:00`).toISOString();
    const modeLabel = getModeLabel(mode);

    const [items, queue, recentUsageEvents] = await Promise.all([
      reviewOsRepository.listWrongAnswerItems(userId, 40),
      reviewOsRepository.listReviewQueue(userId, 40),
      reviewOsRepository.listRecentUsageEventsByNames(
        userId,
        ["capture_saved", "post_save_execution_started", "post_save_execution_completed", "review_followup_scheduled", "review_complete"],
        yesterdayStartUtcIso,
        120,
      ),
    ]);

    const modeItems = items.filter((item) => item.examName === modeLabel);
    const modeQueue = queue.filter((item) => item.examName === modeLabel);
    const savedCaptureToday =
      modeItems.some((item) => isSameKstDay(item.createdAt, now)) ||
      recentUsageEvents.some((event) => event.eventName === "capture_saved" && isSameKstDay(event.createdAt, now));
    const startedExecutionToday = recentUsageEvents.some((event) => event.eventName === "post_save_execution_started" && isSameKstDay(event.createdAt, now));
    const completedTodayTask =
      recentUsageEvents.some((event) => (event.eventName === "post_save_execution_completed" || event.eventName === "review_complete") && isSameKstDay(event.createdAt, now));
    const followupScheduledToday = recentUsageEvents.some((event) => event.eventName === "review_followup_scheduled" && isSameKstDay(event.createdAt, now));
    const recoveredOverdueToday = recentUsageEvents.some((event) => event.eventName === "review_complete" && isSameKstDay(event.createdAt, now));
    const hasDueQueue = modeQueue.length > 0;
    const hasOverdueQueue = modeQueue.some((item) => isOverdueDueAt(item.dueAt, Date.parse(nowIso)));
    const studiedToday = savedCaptureToday || startedExecutionToday || completedTodayTask || followupScheduledToday;
    const currentGentleStreak = studiedToday ? 1 : 0;
    const studiedYesterday =
      modeItems.some((item) => isSameKstDay(item.createdAt, yesterday)) ||
      recentUsageEvents.some((event) =>
        ["capture_saved", "post_save_execution_started", "post_save_execution_completed", "review_followup_scheduled", "review_complete"].includes(event.eventName) &&
        isSameKstDay(event.createdAt, yesterday),
      );
    const missedRecently = !studiedToday && studiedYesterday;
    const savedToday = savedCaptureToday;
    const completedToday = completedTodayTask;

    return {
      studiedToday,
      completedTodayTask,
      savedCaptureToday,
      recoveredOverdueToday,
      currentGentleStreak,
      missedRecently,
      savedToday,
      completedToday,
      startedExecutionToday,
      followupScheduledToday,
      hasDueQueue,
      hasOverdueQueue,
    };
  }

  async hasMeaningfulLearningData(userId: string, email: string | null, mode: "first" | "second") {
    await this.ensureAccess(userId, email);
    const [items, queue, learningSignals, recentStudyLog] = await Promise.all([
      this.listWrongAnswerItems(userId, email, 1).catch(() => []),
      this.getReviewQueue(userId, email).catch(() => []),
      this.listLearningSignalEvents(userId, email, mode, 1).catch(() => []),
      this.getRecentStudyLog(userId, email, mode).catch(() => null),
    ]);
    const modeLabel = getModeLabel(mode);
    const hasItems = items.some((item) => item.examName === modeLabel);
    const hasQueue = queue.some((item) => item.examName === modeLabel);
    return hasItems || hasQueue || learningSignals.length > 0 || Boolean(recentStudyLog);
  }

  getAdminFeed(): Promise<AdminAlphaFeed> {
    return reviewOsRepository.getAdminAlphaFeed(80);
  }

  async getAdminBetaFunnel(): Promise<AdminBetaFunnel> {
    const events = await reviewOsRepository.listRecentUsageEvents(1200);
    const captureSteps = [
      "capture_started",
      "ocr_draft_generated",
      "draft_confirmed",
      "capture_saved",
      "post_save_execution_started",
      "post_save_execution_completed",
      "review_followup_scheduled",
    ] as const;
    const ritualSteps = ["home_view", "today_task_started", "today_task_completed", "overdue_recovery_started", "weekly_summary_view"] as const;

    const countByEvent = new Map<string, number>();
    const breakdownKeys = ["mode", "subject", "sourceType", "confidence", "nextTaskType", "hasReferenceSupport", "hasOverdueQueue", "dailyState"] as const;
    const breakdowns = Object.fromEntries(breakdownKeys.map((key) => [key, new Map<string, number>()])) as Record<(typeof breakdownKeys)[number], Map<string, number>>;

    for (const event of events) {
      countByEvent.set(event.eventName, (countByEvent.get(event.eventName) ?? 0) + 1);
      for (const key of breakdownKeys) {
        const rawValue = event.metadataJson[key];
        if (rawValue === null || rawValue === undefined || rawValue === "") continue;
        const value = String(rawValue);
        const map = breakdowns[key];
        map.set(value, (map.get(value) ?? 0) + 1);
      }
    }

    const toFunnel = (steps: readonly string[]) =>
      steps.map((eventName, index) => {
        const count = countByEvent.get(eventName) ?? 0;
        const previousCount = index > 0 ? countByEvent.get(steps[index - 1]) ?? 0 : 0;
        const conversionFromPrevious = index === 0 ? null : previousCount > 0 ? Number(((count / previousCount) * 100).toFixed(1)) : 0;
        return { eventName, count, conversionFromPrevious };
      });

    const safeRate = (numerator: number, denominator: number) => (denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(1)) : 0);

    const friction = [
      {
        key: "ocr_failed_rate",
        label: "OCR 실패율",
        count: countByEvent.get("ocr_failed") ?? 0,
        rate: safeRate(countByEvent.get("ocr_failed") ?? 0, countByEvent.get("capture_started") ?? 0),
      },
      {
        key: "pdf_manual_fallback_rate",
        label: "PDF 수동 전환율",
        count: countByEvent.get("pdf_manual_fallback") ?? 0,
        rate: safeRate(countByEvent.get("pdf_manual_fallback") ?? 0, countByEvent.get("capture_started") ?? 0),
      },
      {
        key: "saved_without_execution_start",
        label: "저장 후 실행 미시작",
        count: Math.max(0, (countByEvent.get("capture_saved") ?? 0) - (countByEvent.get("post_save_execution_started") ?? 0)),
        rate: safeRate(Math.max(0, (countByEvent.get("capture_saved") ?? 0) - (countByEvent.get("post_save_execution_started") ?? 0)), countByEvent.get("capture_saved") ?? 0),
      },
      {
        key: "execution_started_not_completed",
        label: "실행 시작 후 미완료",
        count: Math.max(0, (countByEvent.get("post_save_execution_started") ?? 0) - (countByEvent.get("post_save_execution_completed") ?? 0)),
        rate: safeRate(Math.max(0, (countByEvent.get("post_save_execution_started") ?? 0) - (countByEvent.get("post_save_execution_completed") ?? 0)), countByEvent.get("post_save_execution_started") ?? 0),
      },
      {
        key: "overdue_shown_not_started",
        label: "연체 복구 미시작",
        count: Math.max(0, (countByEvent.get("overdue_recovery_shown") ?? 0) - (countByEvent.get("overdue_recovery_started") ?? 0)),
        rate: safeRate(Math.max(0, (countByEvent.get("overdue_recovery_shown") ?? 0) - (countByEvent.get("overdue_recovery_started") ?? 0)), countByEvent.get("overdue_recovery_shown") ?? 0),
      },
    ].sort((a, b) => b.count - a.count);

    const toRows = (map: Map<string, number>) => [...map.entries()].map(([value, count]) => ({ key: value, value, count })).sort((a, b) => b.count - a.count).slice(0, 12);

    type CohortUser = { cohortDate: string; eventDays: Set<string>; counts: Record<string, number>; studiedToday: boolean };
    const cohortByUser = new Map<string, CohortUser>();
    const nowDay = getKstDayKey(new Date());
    for (const event of events) {
      const day = getKstDayKey(new Date(event.createdAt));
      const existing = cohortByUser.get(event.userId);
      const countsInit = {
        capture_saved: 0,
        post_save_execution_started: 0,
        post_save_execution_completed: 0,
        review_followup_scheduled: 0,
        overdue_recovery_shown: 0,
        overdue_recovery_completed: 0,
      };
      const row = existing ?? { cohortDate: day, eventDays: new Set<string>(), counts: countsInit, studiedToday: false };
      if (day < row.cohortDate) row.cohortDate = day;
      row.eventDays.add(day);
      if (day === nowDay && (event.metadataJson.dailyState === "studiedToday" || event.eventName === "today_task_completed")) {
        row.studiedToday = true;
      }
      if (event.eventName in row.counts) {
        row.counts[event.eventName as keyof typeof countsInit] += 1;
      }
      cohortByUser.set(event.userId, row);
    }

    const cohortMap = new Map<string, CohortUser[]>();
    for (const user of cohortByUser.values()) {
      if (!cohortMap.has(user.cohortDate)) cohortMap.set(user.cohortDate, []);
      cohortMap.get(user.cohortDate)?.push(user);
    }
    const dayDiff = (a: string, b: string) => Math.floor((Date.parse(`${b}T00:00:00+09:00`) - Date.parse(`${a}T00:00:00+09:00`)) / 86_400_000);
    const pct = (num: number, den: number) => (den > 0 ? Number(((num / den) * 100).toFixed(1)) : 0);
    const cohortAnalytics = [...cohortMap.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 14)
      .map(([cohortDate, users]) => {
        const total = users.length;
        const d1 = users.filter((u) => [...u.eventDays].some((day) => dayDiff(cohortDate, day) === 1)).length;
        const d3 = users.filter((u) => [...u.eventDays].some((day) => dayDiff(cohortDate, day) === 3)).length;
        const maturedForD1 = dayDiff(cohortDate, nowDay) >= 1;
        const maturedForD3 = dayDiff(cohortDate, nowDay) >= 3;
        const maturedForD7 = dayDiff(cohortDate, nowDay) >= 7;
        const d7 = maturedForD7 ? users.filter((u) => [...u.eventDays].some((day) => dayDiff(cohortDate, day) === 7)).length : 0;
        const firstCaptureSaved = users.filter((u) => u.counts.capture_saved > 0).length;
        const firstExecutionCompleted = users.filter((u) => u.counts.post_save_execution_completed > 0).length;
        const firstFollowupScheduled = users.filter((u) => u.counts.review_followup_scheduled > 0).length;
        const captureUsers = users.filter((u) => u.counts.capture_saved > 0);
        const executionStartedUsers = users.filter((u) => u.counts.post_save_execution_started > 0);
        const executionCompletedUsers = users.filter((u) => u.counts.post_save_execution_completed > 0);
        const overdueShownUsers = users.filter((u) => u.counts.overdue_recovery_shown > 0);
        const captureAndExecutionStartedUsers = captureUsers.filter((u) => u.counts.post_save_execution_started > 0);
        const executionStartedAndCompletedUsers = executionStartedUsers.filter((u) => u.counts.post_save_execution_completed > 0);
        const executionCompletedAndFollowupUsers = executionCompletedUsers.filter((u) => u.counts.review_followup_scheduled > 0);
        const overdueShownAndCompletedUsers = overdueShownUsers.filter((u) => u.counts.overdue_recovery_completed > 0);
        return {
          cohortDate,
          users: total,
          activation: { firstCaptureSaved, firstExecutionCompleted, firstFollowupScheduled },
          retention: {
            d1ReturnRate: maturedForD1 ? pct(d1, total) : null,
            d3ReturnRate: maturedForD3 ? pct(d3, total) : null,
            d7ReturnRate: maturedForD7 ? pct(d7, total) : null,
            studiedTodayRate: pct(users.filter((u) => u.studiedToday).length, total),
          },
          loopConversion: {
            captureSavedToExecutionStarted: pct(captureAndExecutionStartedUsers.length, captureUsers.length),
            executionStartedToExecutionCompleted: pct(executionStartedAndCompletedUsers.length, executionStartedUsers.length),
            executionCompletedToFollowupScheduled: pct(executionCompletedAndFollowupUsers.length, executionCompletedUsers.length),
            overdueRecoveryShownToCompleted: pct(overdueShownAndCompletedUsers.length, overdueShownUsers.length),
          },
        };
      });

    return {
      captureFunnel: toFunnel(captureSteps),
      dailyRitualFunnel: toFunnel(ritualSteps),
      topFrictionSignals: friction.slice(0, 5),
      cohortAnalytics,
      breakdowns: {
        mode: toRows(breakdowns.mode),
        subject: toRows(breakdowns.subject),
        sourceType: toRows(breakdowns.sourceType),
        confidence: toRows(breakdowns.confidence),
        nextTaskType: toRows(breakdowns.nextTaskType),
        hasReferenceSupport: toRows(breakdowns.hasReferenceSupport),
        hasOverdueQueue: toRows(breakdowns.hasOverdueQueue),
        dailyState: toRows(breakdowns.dailyState),
      },
    };
  }
}

export const reviewOsService = new ReviewOsService();
