import {
  applyLearningStateTransition,
  rankLearningStateRisk,
  type PersonalLearningStateSnapshot,
  type PersonalLearningStateTransition,
} from "./personal-learning-state-engine";
import {
  assertNoForbiddenPersonalLearningStateFields,
  assertSupportedPersonalLearningExamMode,
  type PersonalLearningStateRecord,
  type PersonalLearningStateRepository,
  type StoredPersonalLearningStateRecord,
} from "./personal-learning-state-repository";
import {
  areDurablePersonalLearningStateWritesEnabled,
  getPersonalLearningStateRepository,
} from "./personal-learning-state-repository-adapter";

export type PersonalLearningStateDurableWriteInput = {
  userId?: string | null;
  transition: PersonalLearningStateTransition;
  previousState?: PersonalLearningStateSnapshot | null;
  env?: NodeJS.ProcessEnv;
  repository?: PersonalLearningStateRepository & { mode?: string };
};

export type PersonalLearningStateDurableWriteResult =
  | { ok: true; skipped: true; reason: "durable_writes_disabled" | "missing_authenticated_user" | "non_supabase_repository" }
  | { ok: true; skipped: false; repositoryMode: "supabase"; state: StoredPersonalLearningStateRecord; metadataOnly: true };

function snapshotFromTransition(transition: PersonalLearningStateTransition): PersonalLearningStateSnapshot {
  return {
    metadataOnly: true,
    userId: transition.userId,
    conceptNodeId: transition.conceptNodeId,
    examMode: transition.examMode,
    subject: transition.subject,
    status: transition.previousStatus,
    priority: rankLearningStateRisk(transition.previousStatus),
    correctStreak: 0,
  };
}

export async function maybePersistPersonalLearningStateUpdate(input: PersonalLearningStateDurableWriteInput): Promise<PersonalLearningStateDurableWriteResult> {
  assertNoForbiddenPersonalLearningStateFields(input);
  const env = input.env ?? process.env;

  if (!areDurablePersonalLearningStateWritesEnabled(env)) {
    return { ok: true, skipped: true, reason: "durable_writes_disabled" };
  }

  const userId = typeof input.userId === "string" && input.userId.trim() ? input.userId.trim() : input.transition.userId.trim();
  if (!userId) return { ok: true, skipped: true, reason: "missing_authenticated_user" };
  assertSupportedPersonalLearningExamMode(input.transition.examMode);

  const repository = input.repository ?? getPersonalLearningStateRepository(env);
  if (repository.mode !== "supabase") return { ok: true, skipped: true, reason: "non_supabase_repository" };

  const previousState = input.previousState ?? snapshotFromTransition({ ...input.transition, userId });
  const nextState = applyLearningStateTransition({ ...previousState, userId }, { ...input.transition, userId });
  const record: PersonalLearningStateRecord = {
    userId,
    conceptNodeId: nextState.conceptNodeId,
    examMode: input.transition.examMode,
    subject: nextState.subject,
    status: nextState.status ?? input.transition.nextStatus,
    previousStatus: input.transition.previousStatus,
    wrongCount: input.transition.nextStatus === "wrong" || input.transition.nextStatus === "confident_wrong" ? 1 : 0,
    correctStreak: nextState.correctStreak ?? 0,
    lastSeenAt: nextState.lastSeenAt,
    nextReviewAt: nextState.nextReviewAt,
    lastSourceEventType: input.transition.sourceEventType,
    lastTaskType: input.transition.nextReviewPattern,
    lastReason: input.transition.reason,
    priorityScore: nextState.priority ?? rankLearningStateRisk(input.transition.nextStatus),
    metadata: {
      metadataOnly: true,
      nextReviewPattern: input.transition.nextReviewPattern,
      safeSummary: input.transition.safeSummary,
      confidenceDelta: input.transition.confidenceDelta,
      priorityDelta: input.transition.priorityDelta,
    },
  };
  assertNoForbiddenPersonalLearningStateFields(record);

  const written = await repository.upsertLearningState(record);
  return { ok: true, skipped: false, repositoryMode: "supabase", state: written, metadataOnly: true };
}
