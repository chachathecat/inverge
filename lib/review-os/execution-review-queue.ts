import { normalizeCurriculumTaskType } from "./curriculum-engine";
import {
  buildLearningSignalFromExecutionResult,
  buildReviewCandidateFromExecutionSignal,
  type ExecutionLearningSignal,
  type ExecutionLearningSignalInput,
  type ExecutionLearningSignalResult,
  type ExecutionLearningSignalSource,
  type ExecutionReviewDueHint,
} from "./execution-learning-signal";
import { type AppraiserExamMode } from "./curriculum-reference";

export type ReviewQueueDueBucket = "soon" | "tomorrow" | "three_days" | "one_week";

export type ExecutionReviewQueueItem = {
  id: string;
  examMode: AppraiserExamMode;
  subjectId?: string;
  subjectName?: string;
  unitId?: string;
  unitName?: string;
  taskType: string;
  source: "execution_result";
  sourceResult: ExecutionLearningSignalResult;
  executionSource: ExecutionLearningSignalSource;
  dueHint: ExecutionReviewDueHint;
  dueBucket: ReviewQueueDueBucket;
  prioritySignals: string[];
  title: string;
  rationale: string;
  primaryAction: string;
  createdFromDerivedSignal: true;
  metadataOnly: true;
  createdAt?: string;
  priorityScore: number;
};

export type ReviewQueueItem = ExecutionReviewQueueItem;

const DUE_BUCKET_RANK: Record<ReviewQueueDueBucket, number> = {
  soon: 0,
  tomorrow: 1,
  three_days: 2,
  one_week: 3,
};

const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "rawText",
  "rawOcrText",
  "ocrText",
  "userAnswer",
  "userAnswerText",
  "answerText",
  "rawAnswerText",
  "problemText",
  "questionText",
  "rawQuestionText",
  "uploadedProblemText",
  "fullText",
  "sourceText",
  "copyrightedText",
  "originalText",
]);

const FORBIDDEN_RAW_FIELD_PATTERN =
  /(rawText|rawOcrText|ocrText|userAnswer|userAnswerText|answerText|rawAnswerText|problemText|questionText|rawQuestionText|uploadedProblemText|fullText|sourceText|copyrightedText|originalText)/i;

const FORBIDDEN_COPY_PATTERNS = [
  /instructor/i,
  /\/instructor/i,
  /결제/,
  /payment/i,
  /archive/i,
  /아카이브/,
  /native app/i,
  /네이티브 앱/,
  /공식 채점/,
  /공식 점수/,
  /실패자/,
  /게으름/,
  /망했/,
  /불합격/,
  /공포/,
  /부끄럽/,
];

function normalizeTaskType(taskType: string) {
  return normalizeCurriculumTaskType(taskType) ?? taskType.trim();
}

function cleanOptionalText(value: string | undefined) {
  const normalized = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return normalized.length > 0 ? normalized : undefined;
}

function safeIdPart(value: string | undefined, fallback: string) {
  const normalized = cleanOptionalText(value)?.toLowerCase().replace(/[^a-z0-9가-힣/_-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return normalized && normalized.length > 0 ? normalized.slice(0, 80) : fallback;
}

function unique(values: string[]) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0))];
}

function isRewriteItem(item: Pick<ReviewQueueItem, "sourceResult" | "taskType" | "prioritySignals">) {
  return item.sourceResult === "needs_rewrite" || normalizeTaskType(item.taskType) === "rewrite" || item.prioritySignals.includes("rewrite_candidate");
}

function isRecoveryItem(item: Pick<ReviewQueueItem, "sourceResult" | "prioritySignals">) {
  return item.sourceResult === "skipped" || item.prioritySignals.includes("recovery_candidate");
}

function assertNoSecondRewriteOxCopy(item: ReviewQueueItem) {
  if (item.examMode === "second" && isRewriteItem(item)) {
    if (/O\/X/i.test(item.title) || /O\/X/i.test(item.primaryAction)) {
      throw new Error("Second-exam rewrite review queue copy must not include O/X.");
    }
  }
}

export function assertNoRawTextKeys(value: unknown): void {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach(assertNoRawTextKeys);
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_RAW_FIELD_NAMES.has(key) || FORBIDDEN_RAW_FIELD_PATTERN.test(key)) {
      throw new Error(`Raw text field is not accepted by execution review queue helper: ${key}`);
    }
    assertNoRawTextKeys(nestedValue);
  }
}

export function assertNoForbiddenCopy(value: unknown): void {
  if (typeof value === "string") {
    const forbidden = FORBIDDEN_COPY_PATTERNS.find((pattern) => pattern.test(value));
    if (forbidden) throw new Error(`Forbidden learner copy is not accepted by execution review queue helper: ${String(forbidden)}`);
    return;
  }

  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenCopy);
    return;
  }

  for (const nestedValue of Object.values(value as Record<string, unknown>)) {
    assertNoForbiddenCopy(nestedValue);
  }
}

export function normalizeDueBucket(dueHint: ExecutionReviewDueHint): ReviewQueueDueBucket {
  if (dueHint === "soon" || dueHint === "tomorrow" || dueHint === "three_days" || dueHint === "one_week") return dueHint;
  return "one_week";
}

export function buildStableReviewQueueItemId(signal: ExecutionLearningSignal) {
  assertNoRawTextKeys(signal);
  const subjectPart = safeIdPart(signal.subjectId ?? signal.subjectName, "subject");
  const unitPart = safeIdPart(signal.unitId ?? signal.unitName, "unit");
  const taskPart = safeIdPart(normalizeTaskType(signal.nextRecommendedTaskType ?? signal.taskType), "task");
  const dueBucket = normalizeDueBucket(signal.reviewDueHint);
  return [
    "execution-result",
    signal.examMode,
    subjectPart,
    unitPart,
    taskPart,
    signal.result,
    signal.executionSource,
    dueBucket,
  ].join(":");
}

export function calculateReviewQueuePriorityScore(item: Pick<ReviewQueueItem, "dueBucket" | "prioritySignals" | "sourceResult" | "taskType">) {
  let score = 100 - DUE_BUCKET_RANK[item.dueBucket] * 20;
  if (item.prioritySignals.includes("fail_risk_subject")) score += 40;
  if (item.prioritySignals.includes("exam_proximity")) score += 30;
  if (isRewriteItem(item)) score += 18;
  if (isRecoveryItem(item)) score += 16;
  if (item.prioritySignals.includes("calculator_recovery")) score += 12;
  if (item.prioritySignals.includes("issue_spotting_gap")) score += 10;
  if (item.prioritySignals.includes("accounting_template_review")) score += 8;
  if (item.prioritySignals.includes("review_candidate")) score += 6;
  if (item.prioritySignals.includes("confidence:needs_check")) score += 4;
  return score;
}

export function buildReviewQueueItemFromExecutionSignal(signal: ExecutionLearningSignal): ReviewQueueItem | null {
  assertNoRawTextKeys(signal);
  assertNoForbiddenCopy(signal.feedbackCopy);
  if (signal.derivedStatus === "completed") return null;

  const candidate = buildReviewCandidateFromExecutionSignal(signal);
  if (!candidate) return null;

  const dueBucket = normalizeDueBucket(candidate.dueHint);
  const item: ReviewQueueItem = {
    id: buildStableReviewQueueItemId(signal),
    examMode: candidate.examMode,
    subjectId: candidate.subjectId,
    subjectName: candidate.subjectName,
    unitId: candidate.unitId,
    unitName: candidate.unitName,
    taskType: normalizeTaskType(candidate.taskType),
    source: "execution_result",
    sourceResult: candidate.sourceResult,
    executionSource: candidate.executionSource,
    dueHint: candidate.dueHint,
    dueBucket,
    prioritySignals: unique(candidate.prioritySignals),
    title: candidate.title,
    rationale: candidate.rationale,
    primaryAction: candidate.primaryAction,
    createdFromDerivedSignal: true,
    metadataOnly: true,
    priorityScore: 0,
  };
  item.priorityScore = calculateReviewQueuePriorityScore(item);

  assertNoRawTextKeys(item);
  assertNoForbiddenCopy(item);
  assertNoSecondRewriteOxCopy(item);
  return item;
}

export function mergeExecutionReviewCandidate(existingItem: ReviewQueueItem, incomingItem: ReviewQueueItem): ReviewQueueItem {
  assertNoRawTextKeys(existingItem);
  assertNoRawTextKeys(incomingItem);
  assertNoForbiddenCopy(existingItem);
  assertNoForbiddenCopy(incomingItem);

  const dueBucket = DUE_BUCKET_RANK[incomingItem.dueBucket] < DUE_BUCKET_RANK[existingItem.dueBucket] ? incomingItem.dueBucket : existingItem.dueBucket;
  const prioritySignals = unique([...existingItem.prioritySignals, ...incomingItem.prioritySignals]);
  const preferIncomingCopy =
    incomingItem.sourceResult === "skipped" ||
    (!isRecoveryItem(existingItem) && isRewriteItem(incomingItem)) ||
    (!isRecoveryItem(existingItem) && !isRewriteItem(existingItem) && !isRecoveryItem(incomingItem));

  const copySource = preferIncomingCopy ? incomingItem : existingItem;
  const merged: ReviewQueueItem = {
    ...existingItem,
    dueBucket,
    dueHint: dueBucket,
    prioritySignals,
    sourceResult: copySource.sourceResult,
    taskType: copySource.taskType,
    title: copySource.title,
    rationale: copySource.rationale,
    primaryAction: copySource.primaryAction,
  };
  merged.priorityScore = calculateReviewQueuePriorityScore(merged);

  assertNoRawTextKeys(merged);
  assertNoForbiddenCopy(merged);
  assertNoSecondRewriteOxCopy(merged);
  return merged;
}

export function buildReviewQueueItemsFromExecutionResults(inputs: ExecutionLearningSignalInput[]): ReviewQueueItem[] {
  assertNoRawTextKeys(inputs);
  const itemMap = new Map<string, ReviewQueueItem>();

  for (const input of inputs) {
    const signal = buildLearningSignalFromExecutionResult(input);
    const item = buildReviewQueueItemFromExecutionSignal(signal);
    if (!item) continue;

    const existing = itemMap.get(item.id);
    itemMap.set(item.id, existing ? mergeExecutionReviewCandidate(existing, item) : item);
  }

  return rankExecutionReviewQueueItems([...itemMap.values()]);
}

export function rankExecutionReviewQueueItems(items: ReviewQueueItem[]) {
  return [...items].sort((left, right) => {
    const dueDiff = DUE_BUCKET_RANK[left.dueBucket] - DUE_BUCKET_RANK[right.dueBucket];
    if (dueDiff !== 0) return dueDiff;

    const failRiskDiff = Number(right.prioritySignals.includes("fail_risk_subject")) - Number(left.prioritySignals.includes("fail_risk_subject"));
    if (failRiskDiff !== 0) return failRiskDiff;

    const examProximityDiff = Number(right.prioritySignals.includes("exam_proximity")) - Number(left.prioritySignals.includes("exam_proximity"));
    if (examProximityDiff !== 0) return examProximityDiff;

    const rewriteRecoveryDiff = Number(isRewriteItem(right) || isRecoveryItem(right)) - Number(isRewriteItem(left) || isRecoveryItem(left));
    if (rewriteRecoveryDiff !== 0) return rewriteRecoveryDiff;

    const reviewDiff = Number(right.prioritySignals.includes("review_candidate")) - Number(left.prioritySignals.includes("review_candidate"));
    if (reviewDiff !== 0) return reviewDiff;

    return left.id.localeCompare(right.id);
  });
}
