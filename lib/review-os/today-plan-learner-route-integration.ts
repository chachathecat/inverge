import { getPersonalConceptGraphRepositoryMode } from "./personal-concept-graph-repository-adapter";
import { buildTodayPlanWithGatedDurableConceptGraph, type TodayPlanDurableGraphIntegrationInput } from "./today-plan-durable-graph-integration";
import { type TodayPlanUnifiedAction } from "./today-plan-source-union";
import { buildTodayPlanTasks, selectActiveTodayPlanTasks, TODAY_PLAN_MAX_PRIMARY_TASKS, type TodayPlanPrimaryCta, type TodayPlanTask, type TodayPlanTaskKind } from "./today-plan-engine";
import type { LearningSignalEventRecord, ReviewQueueCard, WrongAnswerItemRecord } from "./types";

type RepeatedGapSignal = { label: string; count: number };

type BuildLearnerTodayPlanTasksInput = {
  userId?: string | null;
  mode: "first" | "second";
  queue: ReviewQueueCard[];
  items?: WrongAnswerItemRecord[];
  learningSignals?: LearningSignalEventRecord[];
  now?: Date;
  repeatedGaps?: RepeatedGapSignal[];
  riskLevel?: "stable" | "watch" | "high";
  env?: NodeJS.ProcessEnv;
  durableReadHelper?: TodayPlanDurableGraphIntegrationInput["durableReadHelper"];
};

function areTodayPlanDurableGraphRouteGatesEnabled(input: {
  env: NodeJS.ProcessEnv;
  userId?: string | null;
  examMode: "first" | "second";
}): boolean {
  return (
    getPersonalConceptGraphRepositoryMode(input.env) === "supabase" &&
    input.env.PERSONAL_CONCEPT_GRAPH_DURABLE_READS === "1" &&
    input.env.PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT === "1" &&
    Boolean(input.userId?.trim()) &&
    (input.examMode === "first" || input.examMode === "second")
  );
}

function taskTypeFromDurableAction(action: TodayPlanUnifiedAction): TodayPlanTaskKind {
  const taskType = action.taskType.toLowerCase();
  if (taskType === "calculator_routine") return "calculator_routine";
  if (/rewrite|다시쓰기|문단/.test(taskType)) return "second_answer_rewrite";
  if (/ocr|확인/.test(taskType)) return "ocr_confirmation";
  if (/계산|산식|template|casio/.test(taskType)) return "accounting_template_retry";
  if (/cloze|빈칸/.test(taskType)) return "cloze_review";
  if (/concept|개념|retrieval|회상/.test(taskType)) return "concept_review";
  return action.examMode === "first" ? "first_ox_retry" : "second_answer_rewrite";
}

function primaryCtaForDurableAction(taskType: TodayPlanTaskKind, mode: "first" | "second"): TodayPlanPrimaryCta {
  if (taskType === "second_answer_rewrite") return { label: "10분 다시 쓰기", hrefKind: "review" };
  if (taskType === "ocr_confirmation" || taskType === "note_cleanup") return { label: "확인하고 정리", hrefKind: "capture" };
  if (taskType === "calculator_routine") return { label: "계산·검산 다시 하기", hrefKind: "calculator_template" };
  if (taskType === "accounting_template_retry") return { label: "계산 틀 재확인", hrefKind: "calculator_template" };
  if (taskType === "cloze_review") return { label: "빈칸 회상", hrefKind: "session" };
  if (taskType === "concept_review") return { label: "개념 1개 회상", hrefKind: "session" };
  return { label: mode === "first" ? "5분 O/X 재시도" : "다시 쓰기", hrefKind: mode === "first" ? "first_ox" : "session" };
}

function toUnifiedAction(task: TodayPlanTask): TodayPlanUnifiedAction {
  return {
    id: `learner-today-plan:${task.itemId}`,
    source: "review_queue",
    examMode: task.exam_mode,
    subjectId: task.subject,
    unitId: task.itemId,
    taskType: task.task_type,
    title: task.title,
    rationale: task.reason,
    primaryAction: task.one_next_action,
    estimatedMinutes: task.estimated_minutes,
    prioritySignals: [task.due_bucket, task.priority_reason, task.source_label].filter((value): value is string => Boolean(value)),
    isPrimaryTask: true,
    metadataOnly: true,
    displayReason: task.display_reason,
    displaySourceLabel: task.display_source_label,
    displayPrimaryCta: task.display_primary_cta,
    calculatorRoutineRecovery: task.calculator_routine_recovery,
  };
}

function toDurableTask(action: TodayPlanUnifiedAction, mode: "first" | "second"): TodayPlanTask {
  const taskType = taskTypeFromDurableAction(action);
  return {
    itemId: action.id,
    title: action.title,
    subject: action.subjectId ?? "개념",
    exam_mode: mode,
    due_bucket: "today",
    status: "due",
    reason: action.displayReason ?? action.rationale,
    one_biggest_gap: action.rationale,
    one_next_action: action.primaryAction,
    task_type: taskType,
    estimated_minutes: Math.min(Math.max(action.estimatedMinutes, 5), 30),
    priority_reason: action.prioritySignals[0] ?? "개념 그래프 메타데이터에서 오늘 확인할 신호입니다.",
    primary_cta: primaryCtaForDurableAction(taskType, mode),
    created_from_capture: false,
    source_label: action.displaySourceLabel ?? "개념 그래프 기반",
    display_reason: action.displayReason,
    display_source_label: action.displaySourceLabel,
    display_primary_cta: action.displayPrimaryCta,
    calculator_routine_recovery: action.calculatorRoutineRecovery,
  };
}

function mergeUnifiedActionsBackToTasks(actions: TodayPlanUnifiedAction[], baseTasks: TodayPlanTask[], mode: "first" | "second"): TodayPlanTask[] {
  const baseByUnifiedId = new Map<string, TodayPlanTask>(baseTasks.map((task) => [`learner-today-plan:${task.itemId}`, task]));
  return selectActiveTodayPlanTasks(
    actions.slice(0, TODAY_PLAN_MAX_PRIMARY_TASKS).map((action) => baseByUnifiedId.get(action.id) ?? toDurableTask(action, mode)),
    TODAY_PLAN_MAX_PRIMARY_TASKS,
  );
}

export async function buildLearnerTodayPlanTasksWithGatedDurableConceptGraph(input: BuildLearnerTodayPlanTasksInput): Promise<TodayPlanTask[]> {
  const now = input.now ?? new Date();
  const baseTasks = selectActiveTodayPlanTasks(
    buildTodayPlanTasks({
      mode: input.mode,
      queue: input.queue,
      items: input.items,
      learningSignals: input.learningSignals,
      now,
      repeatedGaps: input.repeatedGaps,
      riskLevel: input.riskLevel,
    }),
    TODAY_PLAN_MAX_PRIMARY_TASKS,
  );
  const env = input.env ?? process.env;

  if (!areTodayPlanDurableGraphRouteGatesEnabled({ env, userId: input.userId, examMode: input.mode })) {
    return baseTasks;
  }

  const result = await buildTodayPlanWithGatedDurableConceptGraph({
    userId: input.userId,
    sourceUnionInput: { conceptGraphActions: [], context: { now: now.toISOString(), examMode: input.mode } },
    existingActions: baseTasks.map(toUnifiedAction),
    context: { now: now.toISOString(), examMode: input.mode, env },
    durableReadHelper: input.durableReadHelper,
  });

  if (!result.durableGraph.ok || result.durableGraph.skipped) {
    return baseTasks;
  }

  return mergeUnifiedActionsBackToTasks(result.actions, baseTasks, input.mode);
}
