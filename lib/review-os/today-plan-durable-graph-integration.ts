import {
  maybeBuildTodayPlanActionsFromDurableConceptGraph,
  type DurableGraphTodayPlanReadContext,
  type DurableGraphTodayPlanReadResult,
} from "./durable-graph-today-plan-read-adapter";
import { getPersonalConceptGraphRepositoryMode } from "./personal-concept-graph-repository-adapter";
import {
  buildTodayPlanSourceUnion,
  compressUnifiedTodayPlanToMaxThree,
  type BuildTodayPlanSourceUnionInput,
  type TodayPlanSourceUnionContext,
  type TodayPlanUnifiedAction,
} from "./today-plan-source-union";

type DurableTodayPlanSkipReason =
  | "repository_not_supabase"
  | "durable_reads_disabled"
  | "today_plan_rollout_disabled"
  | "missing_user_id"
  | "unsupported_exam_mode"
  | "durable_read_skipped"
  | "durable_read_failed";

export type TodayPlanDurableGraphIntegrationContext = TodayPlanSourceUnionContext & {
  env?: NodeJS.ProcessEnv;
};

export type TodayPlanDurableGraphIntegrationInput = {
  userId?: string | null;
  sourceUnionInput: BuildTodayPlanSourceUnionInput;
  existingActions?: TodayPlanUnifiedAction[];
  context?: TodayPlanDurableGraphIntegrationContext;
  durableReadHelper?: (
    userId: string,
    context: DurableGraphTodayPlanReadContext,
  ) => Promise<DurableGraphTodayPlanReadResult>;
};

export type TodayPlanDurableGraphIntegrationResult = {
  actions: TodayPlanUnifiedAction[];
  durableGraph: {
    attempted: boolean;
    addedActionCount: number;
    metadataOnly: true;
  } & (
    | {
        ok: true;
        skipped: false;
        repositoryMode: "supabase";
      }
    | {
        ok: true;
        skipped: true;
        reason: DurableTodayPlanSkipReason;
      }
    | {
        ok: false;
        skipped: true;
        reason: "durable_read_failed";
      }
  );
};


const FORBIDDEN_DURABLE_TODAY_PLAN_FIELD_NAMES = new Set([
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

const FORBIDDEN_DURABLE_TODAY_PLAN_FIELD_PATTERN =
  /(raw|ocr|answerText|problemText|questionText|copyright|originalText|fullText|sourceText|officialAnswer|modelAnswer|scorePrediction|instructorComment)/i;

function assertNoForbiddenDurableTodayPlanFields(value: unknown, path = "durableTodayPlan"): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenDurableTodayPlanFields(entry, `${path}[${index}]`));
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_DURABLE_TODAY_PLAN_FIELD_NAMES.has(key) || FORBIDDEN_DURABLE_TODAY_PLAN_FIELD_PATTERN.test(key)) {
      throw new Error(`Forbidden raw/copyrighted learner text field is not accepted by gated Today Plan durable graph integration: ${path}.${key}`);
    }
    assertNoForbiddenDurableTodayPlanFields(nested, `${path}.${key}`);
  }
}

function isExplicitTodayPlanRolloutEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT === "1";
}

function resolveContext(input: TodayPlanDurableGraphIntegrationInput): TodayPlanDurableGraphIntegrationContext {
  return {
    ...(input.sourceUnionInput.context ?? {}),
    ...(input.context ?? {}),
  };
}

function isSupportedLearnerExamMode(examMode: unknown): examMode is "first" | "second" {
  return examMode === "first" || examMode === "second";
}

function skipped(
  actions: TodayPlanUnifiedAction[],
  reason: DurableTodayPlanSkipReason,
  attempted = false,
): TodayPlanDurableGraphIntegrationResult {
  return {
    actions,
    durableGraph: {
      ok: true,
      skipped: true,
      attempted,
      reason,
      addedActionCount: 0,
      metadataOnly: true,
    },
  };
}

function fallbackAfterFailure(actions: TodayPlanUnifiedAction[]): TodayPlanDurableGraphIntegrationResult {
  return {
    actions,
    durableGraph: {
      ok: false,
      skipped: true,
      attempted: true,
      reason: "durable_read_failed",
      addedActionCount: 0,
      metadataOnly: true,
    },
  };
}

function baseActionsFor(input: TodayPlanDurableGraphIntegrationInput): TodayPlanUnifiedAction[] {
  return input.existingActions
    ? compressUnifiedTodayPlanToMaxThree(input.existingActions)
    : buildTodayPlanSourceUnion(input.sourceUnionInput);
}

export async function buildTodayPlanWithGatedDurableConceptGraph(
  input: TodayPlanDurableGraphIntegrationInput,
): Promise<TodayPlanDurableGraphIntegrationResult> {
  const context = resolveContext(input);
  const env = context.env ?? process.env;
  const baseActions = baseActionsFor(input);

  if (getPersonalConceptGraphRepositoryMode(env) !== "supabase") {
    return skipped(baseActions, "repository_not_supabase");
  }
  if (env.PERSONAL_CONCEPT_GRAPH_DURABLE_READS !== "1") {
    return skipped(baseActions, "durable_reads_disabled");
  }
  if (!isExplicitTodayPlanRolloutEnabled(env)) {
    return skipped(baseActions, "today_plan_rollout_disabled");
  }
  if (!input.userId || input.userId.trim().length === 0) {
    return skipped(baseActions, "missing_user_id");
  }
  if (!isSupportedLearnerExamMode(context.examMode)) {
    return skipped(baseActions, "unsupported_exam_mode");
  }

  const durableReadHelper = input.durableReadHelper ?? maybeBuildTodayPlanActionsFromDurableConceptGraph;

  try {
    const durableResult = await durableReadHelper(input.userId, {
      ...context,
      env,
      examMode: context.examMode,
    });

    if (durableResult.skipped) {
      return skipped(baseActions, "durable_read_skipped", true);
    }

    assertNoForbiddenDurableTodayPlanFields(durableResult.actions);
    const durableActions = durableResult.actions.filter(
      (action) => action.metadataOnly === true && action.isPrimaryTask === true && action.examMode === context.examMode,
    );
    const actions = compressUnifiedTodayPlanToMaxThree([...baseActions, ...durableActions]);

    return {
      actions,
      durableGraph: {
        ok: true,
        skipped: false,
        attempted: true,
        repositoryMode: "supabase",
        addedActionCount: Math.max(0, actions.length - baseActions.length),
        metadataOnly: true,
      },
    };
  } catch {
    return fallbackAfterFailure(baseActions);
  }
}
