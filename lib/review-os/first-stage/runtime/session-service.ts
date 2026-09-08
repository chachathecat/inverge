import crypto from "node:crypto";
import { activeOwnerLocalR3TrialCatalog, acceptsOwnerLocalR3PreviousCatalog } from "./owner-local-trial-context";
import { OWNER_LOCAL_R3_TRIAL_NOTICE } from "./owner-local-trial-boundary";

import {
  FirstStageKernelError,
  exactObject,
  requiredIdentifier,
  requiredSafeInteger,
  requiredUtcInstant,
  type FirstStageKernelState,
  type QuestionReference,
} from "../kernel/domain";
import {
  beginAttempt,
  beginIndependentRetry,
  createExamCycleState,
  presentAttemptQuestion,
  submitAnswer,
  validateFirstStageKernelState,
} from "../kernel/mcq-kernel";
import type { SubjectAdapterRegistry } from "../subject-adapter/subject-adapter";

export type PrivateSessionCommand = Readonly<{
  requestId: string;
  requestDigest: string;
  resultingRevision: number;
}>;

/** Bodyless private learning state, never a question/reference body store. */
export type PrivateFirstStageSession = Readonly<{
  schemaVersion: "first_stage.private_session.v1" | "first_stage.owner_local_trial_session.v1";
  sessionId: string;
  ownerId: string;
  catalogDigest: string;
  state: FirstStageKernelState;
  commands: readonly PrivateSessionCommand[];
}>;

export interface PrivateFirstStageSessionStore {
  load(ownerId: string, sessionId: string): Promise<PrivateFirstStageSession | null>;
  /** One bounded database statement, not a concatenation of mutable offset pages.
   * Overflow is explicit and cannot authorize new-study absence claims. */
  listOwnerSnapshot?(ownerId: string, schema: PrivateFirstStageSession["schemaVersion"]): Promise<{
    sessions: readonly PrivateFirstStageSession[]; complete: boolean;
  }>;
  /** Atomic insert-if-absent. Return the actually persisted winner. */
  create(value: PrivateFirstStageSession): Promise<PrivateFirstStageSession>;
  /** Trial-planner insert under the same per-original lock as ordinary inserts.
   * A different prior session returns null; never manufacture a second original. */
  createOriginalIfAbsent?(value: PrivateFirstStageSession): Promise<PrivateFirstStageSession | null>;
  /** Atomic owner/session/revision compare-and-swap; no partial state writes. */
  replace(value: PrivateFirstStageSession, expectedRevision: number): Promise<boolean>;
}

/** Supplied only by the server's reviewed-content loader, never HTTP input. */
export interface PrivateFirstStageCatalog {
  readonly digest: string;
  readonly registry: SubjectAdapterRegistry;
  readonly initialReferences: readonly QuestionReference[];
  questionAttributions?(reference: QuestionReference): readonly string[];
  retryAvailability(reference: QuestionReference, usedQuestionIds: readonly string[]): "available" | "exhausted";
  explanation(reference: QuestionReference): Readonly<{
    text: string;
    sourceStatus: string;
    learningReferenceDisclaimer: true;
    attributions?: readonly string[];
  }>;
}

export function privateSessionDigest(value: unknown): string {
  function canonical(entry: unknown): string {
    if (entry === null || typeof entry !== "object") return JSON.stringify(entry);
    if (Array.isArray(entry)) return `[${entry.map(canonical).join(",")}]`;
    const row = entry as Record<string, unknown>;
    return `{${Object.keys(row).sort().map((key) =>
      `${JSON.stringify(key)}:${canonical(row[key])}`).join(",")}}`;
  }
  return crypto.createHash("sha256").update(canonical(value)).digest("hex");
}

function identity(kind: string, ...bindings: string[]) {
  return `${kind}-${privateSessionDigest(bindings).slice(0, 40)}`;
}

export function privateFirstStageSessionId(ownerId: string, requestId: string) {
  requiredIdentifier(ownerId); requiredIdentifier(requestId);
  return identity("first-session", ownerId, requestId);
}

function fail(code: FirstStageKernelError["code"] = "invalid_input"): never {
  throw new FirstStageKernelError(code);
}

const MAX_COMMANDS = 512;

export function createPrivateFirstStageSessionService(
  store: PrivateFirstStageSessionStore,
  catalog: PrivateFirstStageCatalog,
  now: () => string = () => new Date().toISOString(),
) {
  if (!/^[0-9a-f]{64}$/u.test(catalog.digest)) fail("adapter_mismatch");
  function isTrial() {
    return activeOwnerLocalR3TrialCatalog(catalog);
  }
  function sessionSchema() {
    return isTrial() ? "first_stage.owner_local_trial_session.v1" as const : "first_stage.private_session.v1" as const;
  }

  function validate(value: PrivateFirstStageSession, ownerId: string, sessionId: string) {
    exactObject(value, ["schemaVersion", "sessionId", "ownerId", "catalogDigest", "state", "commands"]);
    if (value.schemaVersion !== sessionSchema() ||
      value.ownerId !== ownerId || value.sessionId !== sessionId ||
      (value.catalogDigest !== catalog.digest && !acceptsOwnerLocalR3PreviousCatalog(catalog, value)) ||
      value.state.examCycle.examCycleId !== sessionId ||
      !Array.isArray(value.commands) || value.commands.length < 1 ||
      value.commands.length > MAX_COMMANDS ||
      value.commands.length !== value.state.revision) fail("adapter_mismatch");
    const ids = new Set<string>();
    for (const [index, command] of value.commands.entries()) {
      exactObject(command, ["requestId", "requestDigest", "resultingRevision"]);
      requiredIdentifier(command.requestId);
      if (ids.has(command.requestId) || !/^[0-9a-f]{64}$/u.test(command.requestDigest)) {
        fail("adapter_mismatch");
      }
      ids.add(command.requestId);
      if (command.resultingRevision !== index + 1) fail("adapter_mismatch");
    }
    const references = value.state.examCycle.questionReferences;
    if (references.length !== 1 || !catalog.initialReferences.some((item) =>
      privateSessionDigest(item) === privateSessionDigest(references[0]))) fail("adapter_mismatch");
    const first = value.commands[0];
    if (first.requestDigest !== privateSessionDigest({ action: "create",
      requestId: first.requestId, questionId: references[0].questionId }) ||
      identity("first-session", ownerId, first.requestId) !== sessionId) fail("adapter_mismatch");
    validateFirstStageKernelState(value.state, ownerId,
      value.state.examCycle.definitionSha256, catalog.registry);
    return value;
  }

  async function load(ownerId: string, sessionId: string) {
    requiredIdentifier(ownerId);
    requiredIdentifier(sessionId);
    const value = await store.load(ownerId, sessionId);
    if (!value) fail("not_found");
    return validate(value, ownerId, sessionId);
  }

  function assertReplay(value: PrivateFirstStageSession, requestId: string, digest: string) {
    const existing = value.commands.find((command) => command.requestId === requestId);
    if (existing && existing.requestDigest !== digest) fail("invalid_transition");
    return Boolean(existing);
  }

  async function create(ownerId: string, input: unknown, onlyUnattemptedOriginal = false) {
    requiredIdentifier(ownerId);
    const row = exactObject(input, ["requestId", "questionId"]);
    const requestId = requiredIdentifier(row.requestId);
    const questionId = requiredIdentifier(row.questionId);
    const requestDigest = privateSessionDigest({ action: "create", requestId, questionId });
    const sessionId = privateFirstStageSessionId(ownerId, requestId);
    const existing = await store.load(ownerId, sessionId);
    if (existing) {
      validate(existing, ownerId, sessionId);
      if (!assertReplay(existing, requestId, requestDigest)) fail("invalid_transition");
      return existing;
    }
    const references = catalog.initialReferences.filter((item) => item.questionId === questionId);
    if (references.length !== 1) fail("not_found");
    catalog.registry.require(references[0].subjectId).assertQuestionReference(references[0]);
    const state = createExamCycleState({ examCycleId: sessionId, ownerId,
      mode: "today", questionReferences: references });
    const value: PrivateFirstStageSession = {
      schemaVersion: sessionSchema(), sessionId, ownerId,
      catalogDigest: catalog.digest, state,
      commands: [{ requestId, requestDigest, resultingRevision: state.revision }],
    };
    if(onlyUnattemptedOriginal && (!isTrial() || !store.createOriginalIfAbsent)) fail("adapter_mismatch");
    const durable=onlyUnattemptedOriginal ? await store.createOriginalIfAbsent!(value) : await store.create(value);
    if(!durable) fail("stale_state");
    const saved = validate(durable, ownerId, sessionId);
    if (!assertReplay(saved, requestId, requestDigest)) fail("invalid_transition");
    return saved;
  }

  async function execute(ownerId: string, sessionId: string, input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input)) fail();
    const action = (input as Record<string, unknown>).action;
    const fields = action === "begin" ? ["questionId"]
      : action === "submit" ? ["attemptId", "submission"]
        : action === "retry" ? ["reviewTaskId"] : fail();
    const row = exactObject(input, ["action", "requestId", "expectedRevision", ...fields]);
    const requestId = requiredIdentifier(row.requestId);
    const expectedRevision = requiredSafeInteger(row.expectedRevision, 1, Number.MAX_SAFE_INTEGER);
    const requestDigest = privateSessionDigest(row);
    const current = await load(ownerId, sessionId);
    if (assertReplay(current, requestId, requestDigest)) return current;
    if (current.state.revision !== expectedRevision) fail("stale_state");
    if (current.commands.length >= MAX_COMMANDS) fail("invalid_transition");
    const trustedAt = requiredUtcInstant(now());
    const binding = { trustedOwnerId: ownerId,
      trustedExamCycleDefinitionSha256: current.state.examCycle.definitionSha256,
      expectedRevision };
    let state: FirstStageKernelState;
    if (action === "begin") {
      state = beginAttempt(current.state, { ...binding,
        questionId: requiredIdentifier(row.questionId),
        attemptId: identity("first-attempt", sessionId, requestId),
        trustedStartedAt: trustedAt }, catalog.registry);
    } else if (action === "retry") {
      state = beginIndependentRetry(current.state, { ...binding,
        reviewTaskId: requiredIdentifier(row.reviewTaskId),
        independentRetryId: identity("first-retry", sessionId, requestId),
        retryAttemptId: identity("first-attempt", sessionId, requestId),
        trustedStartedAt: trustedAt }, catalog.registry);
    } else {
      const attemptId = requiredIdentifier(row.attemptId);
      const attempt = current.state.attempts.find((item) => item.attemptId === attemptId);
      if (!attempt) fail("not_found");
      const submitted = exactObject(row.submission, ["selectedChoice", "confidence",
        "answerChanged", "previousChoice", "eliminatedChoiceIds", "workTrace"]);
      state = submitAnswer(current.state, { ...binding, attemptId,
        reviewTaskId: attempt.reviewTaskId ?? identity("first-review", sessionId, attemptId),
        trustedSubmittedAt: trustedAt,
        // The existing kernel seals elapsed/submission time from trusted clocks.
        submission: { schemaVersion: "first_stage.answer_submission.v1", ...submitted } }, catalog.registry);
    }
    const next: PrivateFirstStageSession = { ...current, state,
      commands: [...current.commands, { requestId, requestDigest, resultingRevision: state.revision }] };
    validate(next, ownerId, sessionId);
    if (!await store.replace(next, expectedRevision)) {
      const winner = await load(ownerId, sessionId);
      if (assertReplay(winner, requestId, requestDigest)) return winner;
      fail("stale_state");
    }
    // Read the durable winner; do not expose an optimistic in-memory result.
    const saved = await load(ownerId, sessionId);
    if (!assertReplay(saved, requestId, requestDigest)) fail("stale_state");
    return saved;
  }

  async function view(ownerId: string, sessionId: string) {
    const saved = await load(ownerId, sessionId);
    const active = saved.state.attempts.find((item) => item.state === "in_progress");
    const latest = saved.state.attempts.at(-1);
    const currentTime = Date.parse(requiredUtcInstant(now()));
    const trial = isTrial();
    // Construct reference assistance only from a durably evaluated attempt.
    const explanation = !active && latest?.state === "evaluated" &&
      (latest.evaluation?.evidenceEnvelope.reviewedFeedback.state === "reviewed_available" ||
        (trial && latest.evaluation?.evidenceEnvelope.reviewedFeedback.state === "human_unreviewed_owner_local"))
      ? catalog.explanation(latest.questionReference) : null;
    return {
      sessionId, revision: saved.state.revision, state: saved.state.examCycle.state,
      nextQuestionId: saved.state.examCycle.state === "ready"
        ? saved.state.examCycle.questionReferences[0].questionId : null,
      question: active ? presentAttemptQuestion(saved.state, active.attemptId, ownerId,
        saved.state.examCycle.definitionSha256, catalog.registry) : null,
      ...(active && catalog.questionAttributions ? { questionAttributions: catalog.questionAttributions(active.questionReference) } : {}),
      attempt: active ? { attemptId: active.attemptId, startedAt: active.startedAt }
        : latest ? { attemptId: latest.attemptId, decision: latest.evaluation?.decision } : null,
      explanation,
      reviewTasks: saved.state.reviewTasks.map((task) => {
        const retryAvailability = catalog.retryAvailability(task.questionReference,
          saved.state.independentRetries.filter(retry => retry.reviewTaskId === task.reviewTaskId)
            .map(retry => retry.questionReference.questionId));
        return { reviewTaskId: task.reviewTaskId, dueAt: task.dueAt, status: task.status,
          completedAt: task.completedAt, retryAvailability,
          canStartRetry: task.status === "pending" && !active && retryAvailability === "available" &&
            currentTime >= Date.parse(task.dueAt) };
      }),
      masteryClaim: false as const, transferEvidence: false as const,
      ...(trial ? { contentStatus: "human_unreviewed_owner_local" as const,
        notice: OWNER_LOCAL_R3_TRIAL_NOTICE, humanReviewComplete: false as const, measurementEvidence: false as const } : {}),
    };
  }

  function projectHistory(value: PrivateFirstStageSession, ownerId: string) {
    const saved = validate(value, ownerId, value.sessionId);
    const original = saved.state.examCycle.questionReferences[0];
    const active = saved.state.attempts.find(item => item.state === "in_progress");
    // Do not call view(): history/planning must never construct assistance.
    return {
      sessionId: saved.sessionId, revision: saved.state.revision,
      contentMode: saved.schemaVersion, questionId: original.questionId,
      questionNumber: original.questionNumber, questionVersion: original.questionVersion,
      ready: saved.state.examCycle.state === "ready",
      attempted: saved.state.attempts.length > 0,
      active: active ? { attemptId: active.attemptId, startedAt: active.startedAt } : null,
      committedAttempts: saved.state.attempts.filter(item => item.state === "evaluated")
        .map(item => ({ attemptId: item.attemptId, submittedAt: item.submission?.submittedAt,
          practiceDecision: item.evaluation?.decision })),
      reviews: saved.state.reviewTasks.map(task => ({ reviewTaskId: task.reviewTaskId,
        dueAt: task.dueAt, status: task.status, completedAt: task.completedAt,
        stock: catalog.retryAvailability(task.questionReference, saved.state.independentRetries
          .filter(retry => retry.reviewTaskId === task.reviewTaskId).map(retry => retry.questionReference.questionId)) })),
      masteryClaim: false as const, transferEvidence: false as const, measurementEvidence: false as const,
    };
  }

  return Object.freeze({ create, execute, view, projectHistory });
}

export type PrivateSessionHistory = ReturnType<ReturnType<typeof createPrivateFirstStageSessionService>["projectHistory"]>;

export type PrivateFirstStageSessionView = Awaited<ReturnType<
  ReturnType<typeof createPrivateFirstStageSessionService>["view"]>>;
