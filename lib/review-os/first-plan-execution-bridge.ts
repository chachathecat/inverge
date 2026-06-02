import { normalizeCurriculumTaskType } from "./curriculum-engine";
import { type AppraiserExamMode } from "./curriculum-reference";
import { normalizeWeakSubjectName } from "./beginner-first-plan";

export type FirstPlanExecutionBridgeSource = "onboarding" | "today_plan";

export type FirstPlanExecutionBridgeContext = {
  examMode: AppraiserExamMode;
  weakSubjectName?: string | null;
  source?: FirstPlanExecutionBridgeSource;
};

export type FirstPlanExecutionBridgeTask = {
  id?: string;
  taskType?: string | null;
};

export type FirstPlanExecutionBridgeItem<TTask extends FirstPlanExecutionBridgeTask = FirstPlanExecutionBridgeTask> = {
  task: TTask;
  href: string;
};

export type FirstPlanExecutionBridge<TTask extends FirstPlanExecutionBridgeTask = FirstPlanExecutionBridgeTask> = {
  primaryHref: string;
  tasks: Array<FirstPlanExecutionBridgeItem<TTask>>;
};

function appendQuery(pathname: string, params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

function safeSubjectForContext(context: FirstPlanExecutionBridgeContext) {
  return normalizeWeakSubjectName(context.examMode, context.weakSubjectName ?? undefined);
}

function firstFallbackHref(context: FirstPlanExecutionBridgeContext) {
  return appendQuery("/app/capture", {
    mode: "first",
    subject: safeSubjectForContext({ ...context, examMode: "first" }),
  });
}

function secondFallbackHref() {
  return "/app/write?mode=second";
}

export function buildExecutionHrefForTask(task: FirstPlanExecutionBridgeTask, context: FirstPlanExecutionBridgeContext) {
  const normalizedTaskType = normalizeCurriculumTaskType(task.taskType ?? "") ?? task.taskType;
  const firstSubject = safeSubjectForContext({ ...context, examMode: "first" });

  if (normalizedTaskType === "O/X") {
    return appendQuery("/app/first/ox", {
      mode: "first",
      subject: firstSubject,
    });
  }

  if (normalizedTaskType === "cloze") {
    return appendQuery("/app/session", {
      mode: "first",
      focus: "cloze",
      subject: firstSubject,
    });
  }

  if (normalizedTaskType === "accounting template") {
    return "/app/calculator?mode=first&context=accounting&focus=accounting_template";
  }

  if (normalizedTaskType === "rewrite") {
    return secondFallbackHref();
  }

  if (normalizedTaskType === "CASIO") {
    return "/app/calculator?mode=second&context=practice&focus=casio";
  }

  if (normalizedTaskType === "issue spotting") {
    return "/app/write?mode=second&focus=issue_spotting";
  }

  return context.examMode === "second" ? secondFallbackHref() : firstFallbackHref(context);
}

export function buildExecutionBridge<TTask extends FirstPlanExecutionBridgeTask>(
  plan: readonly TTask[],
  context: FirstPlanExecutionBridgeContext,
): FirstPlanExecutionBridge<TTask> {
  const tasks = plan.slice(0, 3).map((task) => ({
    task,
    href: buildExecutionHrefForTask(task, context),
  }));
  return {
    primaryHref: tasks[0]?.href ?? (context.examMode === "second" ? secondFallbackHref() : firstFallbackHref(context)),
    tasks,
  };
}
