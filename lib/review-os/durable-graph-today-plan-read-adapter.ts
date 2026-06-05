import { buildTodayPlanFromConceptGraphNodes } from "./concept-graph-today-plan-adapter";
import { arePersonalConceptGraphDurableReadsEnabled } from "./personal-concept-graph-feature-flags";
import { getPersonalConceptGraphRepositoryAdapter, type PersonalConceptGraphRepositoryAdapter } from "./personal-concept-graph-repository-adapter";
import { type PersonalConceptNode, type PersonalConceptTodayContext } from "./personal-concept-graph";
import { buildTodayPlanSourceUnion, type TodayPlanUnifiedAction } from "./today-plan-source-union";

export type DurableGraphTodayPlanReadContext = PersonalConceptTodayContext & {
  env?: NodeJS.ProcessEnv;
  repositoryAdapter?: Pick<PersonalConceptGraphRepositoryAdapter, "mode" | "listPersonalConceptNodesForToday">;
};

export type DurableGraphTodayPlanReadSkipped = {
  ok: true;
  skipped: true;
  reason: "durable_reads_disabled";
  actions: [];
};

export type DurableGraphTodayPlanReadResult =
  | DurableGraphTodayPlanReadSkipped
  | {
      ok: true;
      skipped: false;
      repositoryMode: "supabase";
      actions: TodayPlanUnifiedAction[];
      metadataOnly: true;
    };

const FORBIDDEN_DURABLE_READ_FIELD_NAMES = new Set([
  "rawUserText",
  "rawOcrText",
  "rawAnswerText",
  "answerText",
  "problemText",
  "questionText",
  "copyrightedText",
  "originalText",
  "fullText",
  "sourceText",
  "officialAnswer",
  "modelAnswer",
  "scorePrediction",
  "instructorComment",
]);

const FORBIDDEN_DURABLE_READ_FIELD_PATTERN =
  /(raw|ocr|answerText|problemText|questionText|copyright|originalText|fullText|sourceText|officialAnswer|modelAnswer|scorePrediction|instructorComment)/i;

const FORBIDDEN_DURABLE_READ_COPY_PATTERNS = [
  /공식\s*채점/,
  /공식\s*점수\s*예측/,
  /공식\s*모범\s*답안/,
  /official\s+grading/i,
  /official\s+score/i,
  /official\s+model\s+answer/i,
];

function assertNoForbiddenDurableReadFields(value: unknown, path = "input"): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenDurableReadFields(entry, `${path}[${index}]`));
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_DURABLE_READ_FIELD_NAMES.has(key) || FORBIDDEN_DURABLE_READ_FIELD_PATTERN.test(key)) {
      throw new Error(`Forbidden raw/copyrighted learner text field is not accepted by durable Personal Concept Graph reads: ${path}.${key}`);
    }
    assertNoForbiddenDurableReadFields(nested, `${path}.${key}`);
  }
}

function assertNoForbiddenDurableReadCopy(value: unknown): void {
  if (typeof value === "string") {
    const forbidden = FORBIDDEN_DURABLE_READ_COPY_PATTERNS.find((pattern) => pattern.test(value));
    if (forbidden) throw new Error(`Forbidden learner copy is not accepted by durable Personal Concept Graph reads: ${String(forbidden)}`);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenDurableReadCopy);
    return;
  }
  Object.values(value as Record<string, unknown>).forEach(assertNoForbiddenDurableReadCopy);
}

function assertSupportedExamMode(examMode: unknown): asserts examMode is "first" | "second" {
  if (examMode !== "first" && examMode !== "second") {
    throw new Error(`Durable Personal Concept Graph reads support only 감정평가사 1차/2차 examMode: ${String(examMode)}`);
  }
}

function sanitizeContext(context: DurableGraphTodayPlanReadContext): PersonalConceptTodayContext {
  const todayContext: PersonalConceptTodayContext = {
    now: context.now,
    examMode: context.examMode,
    daysUntilExam: context.daysUntilExam,
    highRiskUnitIds: Array.isArray(context.highRiskUnitIds) ? [...context.highRiskUnitIds] : undefined,
    highImportanceUnitIds: Array.isArray(context.highImportanceUnitIds) ? [...context.highImportanceUnitIds] : undefined,
    recentMissCountByUnitId: context.recentMissCountByUnitId ? { ...context.recentMissCountByUnitId } : undefined,
  };
  assertNoForbiddenDurableReadFields(todayContext);
  if (todayContext.examMode && todayContext.examMode !== "mixed") assertSupportedExamMode(todayContext.examMode);
  return todayContext;
}

function sanitizeNode(node: PersonalConceptNode): PersonalConceptNode {
  assertNoForbiddenDurableReadFields(node);
  assertSupportedExamMode(node.examMode);
  if (node.metadataOnly !== true) {
    throw new Error("Durable Personal Concept Graph reads accept metadataOnly nodes only.");
  }

  return {
    id: node.id,
    userId: node.userId,
    examMode: node.examMode,
    subjectId: node.subjectId,
    unitId: node.unitId,
    state: node.state,
    confidence: node.confidence,
    lastResult: node.lastResult,
    lastTaskType: node.lastTaskType,
    wrongCount: node.wrongCount,
    recoveryCount: node.recoveryCount,
    stableCount: node.stableCount,
    nextRecommendedTaskType: node.nextRecommendedTaskType,
    nextDueAt: node.nextDueAt,
    updatedAt: node.updatedAt,
    metadataOnly: true,
  };
}

function sanitizeActions(actions: TodayPlanUnifiedAction[]): TodayPlanUnifiedAction[] {
  const safeActions = actions.slice(0, 3).map((action) => {
    assertNoForbiddenDurableReadFields(action);
    assertNoForbiddenDurableReadCopy(action);
    assertSupportedExamMode(action.examMode);
    if (action.metadataOnly !== true || action.isPrimaryTask !== true) {
      throw new Error("Durable Personal Concept Graph reads return metadata-only primary Today Plan actions only.");
    }

    return {
      id: action.id,
      source: action.source,
      examMode: action.examMode,
      subjectId: action.subjectId,
      unitId: action.unitId,
      taskType: action.taskType,
      title: action.title,
      rationale: action.rationale,
      primaryAction: action.primaryAction,
      estimatedMinutes: action.estimatedMinutes,
      prioritySignals: [...action.prioritySignals],
      isPrimaryTask: true as const,
      metadataOnly: true as const,
      displayReason: action.displayReason,
      displaySourceLabel: action.displaySourceLabel,
      displayPrimaryCta: action.displayPrimaryCta,
    };
  });

  assertNoForbiddenDurableReadFields(safeActions);
  assertNoForbiddenDurableReadCopy(safeActions);
  return safeActions;
}

export async function maybeBuildTodayPlanActionsFromDurableConceptGraph(
  userId: string,
  context: DurableGraphTodayPlanReadContext = {},
): Promise<DurableGraphTodayPlanReadResult> {
  const env = context.env ?? process.env;
  if (!arePersonalConceptGraphDurableReadsEnabled(env)) {
    return { ok: true, skipped: true, reason: "durable_reads_disabled", actions: [] };
  }

  const todayContext = sanitizeContext(context);
  assertNoForbiddenDurableReadFields({ userId, context: todayContext });
  const repository = context.repositoryAdapter ?? getPersonalConceptGraphRepositoryAdapter(env);
  if (repository.mode !== "supabase") {
    return { ok: true, skipped: true, reason: "durable_reads_disabled", actions: [] };
  }

  const nodes = (await repository.listPersonalConceptNodesForToday(userId, todayContext)).map(sanitizeNode);
  const conceptGraphActions = buildTodayPlanFromConceptGraphNodes(nodes, todayContext);
  const actions = sanitizeActions(buildTodayPlanSourceUnion({ conceptGraphActions, context: todayContext }));

  return {
    ok: true,
    skipped: false,
    repositoryMode: "supabase",
    actions,
    metadataOnly: true,
  };
}
