import {
  FirstStageKernelError,
  exactObject,
  requiredSafeInteger,
  requiredUtcInstant,
  type FirstStageKernelState,
  type FirstStageSubjectId,
  type QuestionReference,
} from "./domain";

export type TodayQueueItem = Readonly<{
  schemaVersion: "first_stage.today_queue_item.v1";
  queueItemId: string;
  kind: "active_attempt" | "independent_retry" | "new_question";
  subjectId: FirstStageSubjectId;
  questionReference: QuestionReference;
  attemptId: string | null;
  reviewTaskId: string | null;
  dueAt: string | null;
  priority: "active" | "critical" | "high" | "normal" | "new";
  primaryAction: "continue_attempt" | "start_independent_retry" | "start_question";
}>;

export type TodayQueue = Readonly<{
  schemaVersion: "first_stage.today_queue.v1";
  kernelRevision: number;
  generatedAt: string;
  items: readonly TodayQueueItem[];
  omittedPriorityItemCount: number;
  notYetDueReviewCount: number;
  oneScreenOnePrimaryTask: true;
}>;

const PRIORITY = Object.freeze({ critical: 0, high: 1, normal: 2 });

function codeUnitCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function reviewQueueItems(state: FirstStageKernelState, generatedAt: string) {
  const now = Date.parse(generatedAt);
  const pending = state.reviewTasks.filter((task) => task.status === "pending");
  const due = pending.filter((task) => Date.parse(task.dueAt) <= now);
  due.sort((left, right) =>
    PRIORITY[left.priority] - PRIORITY[right.priority] ||
    Date.parse(left.dueAt) - Date.parse(right.dueAt) ||
    codeUnitCompare(left.reviewTaskId, right.reviewTaskId),
  );
  return {
    items: due.map((task): TodayQueueItem => Object.freeze({
      schemaVersion: "first_stage.today_queue_item.v1",
      queueItemId: `review:${task.reviewTaskId}`,
      kind: "independent_retry",
      subjectId: task.questionReference.subjectId,
      questionReference: task.questionReference,
      attemptId: null,
      reviewTaskId: task.reviewTaskId,
      dueAt: task.dueAt,
      priority: task.priority,
      primaryAction: "start_independent_retry",
    })),
    notYetDueReviewCount: pending.length - due.length,
  };
}

function activeQueueItems(state: FirstStageKernelState) {
  return state.attempts
    .filter((attempt) => attempt.state === "in_progress")
    .sort((left, right) =>
      codeUnitCompare(left.startedAt, right.startedAt) ||
      codeUnitCompare(left.attemptId, right.attemptId))
    .map((attempt): TodayQueueItem => Object.freeze({
      schemaVersion: "first_stage.today_queue_item.v1",
      queueItemId: `attempt:${attempt.attemptId}`,
      kind: "active_attempt",
      subjectId: attempt.questionReference.subjectId,
      questionReference: attempt.questionReference,
      attemptId: attempt.attemptId,
      reviewTaskId: attempt.reviewTaskId,
      dueAt: attempt.startedAt,
      priority: "active",
      primaryAction: "continue_attempt",
    }));
}

function newQuestionQueueItems(state: FirstStageKernelState) {
  const attempted = new Set(
    state.attempts
      .filter((attempt) => attempt.kind === "initial")
      .map((attempt) => `${attempt.questionReference.questionId}@${attempt.questionReference.questionVersion}`),
  );
  return state.examCycle.questionReferences
    .filter((reference) => !attempted.has(`${reference.questionId}@${reference.questionVersion}`))
    .map((reference): TodayQueueItem => Object.freeze({
      schemaVersion: "first_stage.today_queue_item.v1",
      queueItemId: `question:${reference.questionId}@${reference.questionVersion}`,
      kind: "new_question",
      subjectId: reference.subjectId,
      questionReference: reference,
      attemptId: null,
      reviewTaskId: null,
      dueAt: null,
      priority: "new",
      primaryAction: "start_question",
    }));
}

export function buildTodayQueue(
  state: FirstStageKernelState,
  input: Readonly<{ trustedGeneratedAt: string; limit?: number }>,
): TodayQueue {
  const keys = input && typeof input === "object" && Object.hasOwn(input, "limit")
    ? ["trustedGeneratedAt", "limit"]
    : ["trustedGeneratedAt"];
  const row = exactObject(input, keys);
  if (state.schemaVersion !== "dabangil.first_stage.common_mcq_kernel.v1") {
    throw new FirstStageKernelError("invalid_input");
  }
  const generatedAt = requiredUtcInstant(row.trustedGeneratedAt);
  const maximum = state.examCycle.mode === "today" ? 100 : 200;
  const limit = row.limit === undefined
    ? maximum
    : requiredSafeInteger(row.limit, 1, maximum);
  const active = activeQueueItems(state);
  if (active.length > 1) throw new FirstStageKernelError("invalid_transition");
  const reviews = reviewQueueItems(state, generatedAt);
  const eligible = Object.freeze([
    ...active,
    ...reviews.items,
    ...newQuestionQueueItems(state),
  ]);
  return Object.freeze({
    schemaVersion: "first_stage.today_queue.v1",
    kernelRevision: state.revision,
    generatedAt,
    items: Object.freeze(eligible.slice(0, limit)),
    omittedPriorityItemCount: Math.max(0, active.length + reviews.items.length - limit),
    notYetDueReviewCount: reviews.notYetDueReviewCount,
    oneScreenOnePrimaryTask: true,
  });
}
