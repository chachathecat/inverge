import crypto from "node:crypto";
import { activeOwnerOriginalCatalog, activeOwnerOriginalReference, ownerOriginalBankCandidates, compatibleOwnerOriginalReviewedCatalog } from "./owner-original-context";
import { OWNER_ORIGINAL_NOTICE, OWNER_ORIGINAL_SCOPE } from "./owner-original-boundary";
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
  recordOwnerLocalConceptHelp,
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

export type PrivateFirstStageTodayContinuation = Readonly<{
  schemaVersion: "first_stage.private_today_continuation.v1";
  state: "ready" | "history_incomplete" | "unavailable";
  action: Readonly<{
    kind: "resume_attempt" | "resume_ready" | "review_due" | "review_scheduled" | "review_blocked";
    sessionId: string;
    reviewTaskId: string | null;
    actionAt: string | null;
    priority: "critical" | "high" | "normal" | null;
  }> | null;
}>;

/** Supplied only by the server's reviewed-content loader, never HTTP input. */
export interface PrivateFirstStageCatalog {
  readonly digest: string;
  readonly registry: SubjectAdapterRegistry;
  readonly initialReferences: readonly QuestionReference[];
  curriculumBinding?(reference: QuestionReference): Readonly<{ unitId: string; topicId: string; title: string; mappingVersion: string }> | null;
  conceptAidDescriptor?(reference: QuestionReference, kind: "concept" | "prerequisite"): Readonly<{ id: string; version: string; sha256: string }> | null;
  conceptAid?(reference: QuestionReference, kind: "concept" | "prerequisite"): Readonly<{ text: string; kind: "concept" | "prerequisite"; humanReviewComplete: false }>;
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
    for(const attempt of value.state.attempts)for(const exposure of attempt.ownerLocalAssistance??[]) {
      const descriptor=isTrial()?catalog.conceptAidDescriptor?.(attempt.questionReference,exposure.kind):null;
      if(!descriptor || descriptor.id!==exposure.aidId || descriptor.version!==exposure.aidVersion || descriptor.sha256!==exposure.aidSha256)fail("adapter_mismatch");
    }
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
    if (activeOwnerOriginalCatalog(catalog) && !ownerOriginalBankCandidates(catalog)?.some(candidate => candidate.candidateId === questionId)) fail("adapter_unavailable");
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

  async function execute(ownerId: string, sessionId: string, input: unknown, assertTrustedStartTime?: (at: string) => void) {
    if (!input || typeof input !== "object" || Array.isArray(input)) fail();
    const action = (input as Record<string, unknown>).action;
    const useFields = activeOwnerOriginalCatalog(catalog) && (action === "begin" || action === "retry") ? ["ownerOriginalUse"] : [];
    const fields = action === "begin" ? ["questionId"]
      : action === "submit" ? ["attemptId", "submission"]
        : action === "retry" ? ["reviewTaskId"] : action === "help" ? ["attemptId","kind"] : fail();
    const row = exactObject(input, ["action", "requestId", "expectedRevision", ...fields, ...useFields]);
    const requestId = requiredIdentifier(row.requestId);
    const expectedRevision = requiredSafeInteger(row.expectedRevision, 1, Number.MAX_SAFE_INTEGER);
    const requestDigest = privateSessionDigest(row);
    const current = await load(ownerId, sessionId);
    if (assertReplay(current, requestId, requestDigest)) return current;
    if (current.state.revision !== expectedRevision) fail("stale_state");
    if (current.commands.length >= MAX_COMMANDS) fail("invalid_transition");
    const trustedAt = requiredUtcInstant(now());
    // Optional server-only planner guard, after durable load and replay checks.
    // It observes the exact timestamp the kernel seals; HTTP cannot supply it.
    if(action==="begin"||action==="retry")assertTrustedStartTime?.(trustedAt);
    const binding = { ...(useFields.length ? {ownerOriginalUse: row.ownerOriginalUse as import("../kernel/domain").OwnerOriginalUse} : {}), trustedOwnerId: ownerId,
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
    } else if(action === "help") {
      const attempt=current.state.attempts.find(item=>item.attemptId===row.attemptId);
      if(!isTrial()||!attempt||attempt.state!=="in_progress"||attempt.kind!=="initial"||
        (row.kind!=="concept"&&row.kind!=="prerequisite"))fail("invalid_transition");
      const descriptor=catalog.conceptAidDescriptor?.(attempt.questionReference,row.kind);
      if(!descriptor)fail("adapter_unavailable");
      state=recordOwnerLocalConceptHelp(current.state,{...binding,attemptId:attempt.attemptId,
        exposure:{kind:row.kind,aidId:descriptor.id,aidVersion:descriptor.version,aidSha256:descriptor.sha256,recordedAt:trustedAt}},catalog.registry);
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
        (trial && latest.evaluation?.evidenceEnvelope.reviewedFeedback.state === "human_unreviewed_owner_local") ||
        (activeOwnerOriginalCatalog(catalog) && activeOwnerOriginalReference(catalog.registry.require(latest.questionReference.subjectId), latest.questionReference) &&
          latest.evaluation?.evidenceEnvelope.reviewedFeedback.state === "machine_checked_owner_local"))
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
      // Owner-private readback, not a Today/QF metadata projection or a client
      // echo. load() validates the persisted aggregate and exact reference first.
      // Never return a prior response while another attempt is in progress.
      submittedResponse: !active && latest?.state === "evaluated" && latest.submission ? {
        attemptId: latest.attemptId, questionId: latest.questionReference.questionId,
        questionVersion: latest.questionReference.questionVersion,
        questionNumber: latest.questionReference.questionNumber,
        selectedChoice: latest.submission.selectedChoice,
        confidence: latest.submission.confidence, answerChanged: latest.submission.answerChanged,
        previousChoice: latest.submission.previousChoice, submittedAt: latest.submission.submittedAt,
        assistanceLevel: latest.assistanceLevel, contentMode: saved.schemaVersion,
        ...(latest.ownerOriginalUse ? { ownerOriginalUse: latest.ownerOriginalUse } : {}),
      } : null,
      explanation,
      ...(activeOwnerOriginalCatalog(catalog) ? { contentStatus: "machine_checked_owner_local" as const, notice: OWNER_ORIGINAL_NOTICE, scope: OWNER_ORIGINAL_SCOPE, humanReviewComplete: false as const, measurementEvidence: false as const } : {}),
      ...(trial && saved.state.examCycle.questionReferences[0].questionVersion==="issue883-economics-curriculum-v1" ? {assistanceLevel:active?.assistanceLevel??latest?.assistanceLevel??"none",
        availableConceptAids:active?.kind==="initial" ? (["concept","prerequisite"] as const).filter(kind=>
          !active.ownerLocalAssistance?.some(exposure=>exposure.kind===kind)&&Boolean(catalog.conceptAidDescriptor?.(active.questionReference,kind))) : [],
        // A successful command/GET returns the last specifically selected aid,
        // not all projections. This is read from the durable winner only.
        conceptAid:active?.ownerLocalAssistance?.length ? catalog.conceptAid?.(active.questionReference,active.ownerLocalAssistance.at(-1)!.kind)??null : null} : {}),
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
          assistanceLevel:item.assistanceLevel,
          ...(item.ownerOriginalUse ? { ownerOriginalUse: item.ownerOriginalUse, independentEvidence: false as const } : {}),
          practiceDecision: item.evaluation?.decision })),
      reviews: saved.state.reviewTasks.map(task => ({ reviewTaskId: task.reviewTaskId,
        dueAt: task.dueAt, status: task.status, completedAt: task.completedAt, priority: task.priority,
        stock: catalog.retryAvailability(task.questionReference, saved.state.independentRetries
          .filter(retry => retry.reviewTaskId === task.reviewTaskId).map(retry => retry.questionReference.questionId)) })),
      masteryClaim: false as const, transferEvidence: false as const, measurementEvidence: false as const,
    };
  }

  async function getTodayContinuation(
    ownerId: string,
    loadPeerCatalogs?: () => Promise<readonly PrivateFirstStageCatalog[]>,
  ): Promise<PrivateFirstStageTodayContinuation> {
    requiredIdentifier(ownerId);
    if (!store.listOwnerSnapshot) {
      return {
        schemaVersion: "first_stage.private_today_continuation.v1",
        state: "unavailable",
        action: null,
      };
    }

    const observed = await store.listOwnerSnapshot(ownerId, sessionSchema());
    if (!observed.complete) {
      return {
        schemaVersion: "first_stage.private_today_continuation.v1",
        state: "history_incomplete",
        action: null,
      };
    }

    const subjectIds = new Set(catalog.initialReferences.map((item) => item.subjectId));
    if (subjectIds.size !== 1) fail("adapter_mismatch");
    const [subjectId] = subjectIds;
    const histories: ReturnType<typeof projectHistory>[] = [];
    let peerValidators: { service: ReturnType<typeof createPrivateFirstStageSessionService>; sameSubject: boolean }[] | null = null;

    async function validatesAsPeer(candidate: PrivateFirstStageSession) {
      if (!loadPeerCatalogs) return false;
      if (!peerValidators) {
        const peers = await loadPeerCatalogs();
        peerValidators = peers.flatMap((peer) => {
          const peerSubjectIds = new Set(peer.initialReferences.map((item) => item.subjectId));
          if (peerSubjectIds.size !== 1) return [];
          const sameSubject = peerSubjectIds.has(subjectId);
          if (sameSubject && !compatibleOwnerOriginalReviewedCatalog(catalog, peer)) return [];
          return [{ service: createPrivateFirstStageSessionService(store, peer, now), sameSubject }];
        });
      }
      for (const peer of peerValidators) {
        try {
          const history = peer.service.projectHistory(candidate, ownerId);
          // Same-subject reviewed work remains a Today action, never silently skipped.
          if (peer.sameSubject) histories.push(history);
          return true;
        } catch {
          // A row may be ignored only after another server-loaded subject catalog
          // validates the complete persisted aggregate.
        }
      }
      return false;
    }

    for (const candidate of observed.sessions) {
      try {
        histories.push(projectHistory(candidate, ownerId));
      } catch {
        if (await validatesAsPeer(candidate)) continue;
        return {
          schemaVersion: "first_stage.private_today_continuation.v1",
          state: "history_incomplete",
          action: null,
        };
      }
    }

    const nowMs = Date.parse(requiredUtcInstant(now()));
    type TodayAction = NonNullable<PrivateFirstStageTodayContinuation["action"]>;
    const actions: TodayAction[] = [];
    for (const history of histories) {
      if (history.active) {
        actions.push({
          kind: "resume_attempt" as const,
          sessionId: history.sessionId,
          reviewTaskId: null,
          actionAt: history.active.startedAt,
          priority: null,
        });
        continue;
      }
      if (history.ready) {
        actions.push({
          kind: "resume_ready" as const,
          sessionId: history.sessionId,
          reviewTaskId: null,
          actionAt: null,
          priority: null,
        });
        continue;
      }
      for (const review of history.reviews) {
        if (review.status !== "pending") continue;
        actions.push({
          kind: Date.parse(review.dueAt) > nowMs
            ? "review_scheduled" as const
            : review.stock !== "available"
              ? "review_blocked" as const
              : "review_due" as const,
          sessionId: history.sessionId,
          reviewTaskId: review.reviewTaskId,
          actionAt: review.dueAt,
          priority: review.priority,
        });
      }
    }
    const rank = {
      resume_attempt: 0,
      review_due: 1,
      review_blocked: 1,
      resume_ready: 2,
      review_scheduled: 3,
    } as const;
    const reviewPriority = { critical: 0, high: 1, normal: 2 } as const;
    const isDueReview = (action: TodayAction) => action.kind === "review_due" || action.kind === "review_blocked";
    const compareId = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
    actions.sort((left, right) =>
      rank[left.kind] - rank[right.kind] ||
      (isDueReview(left) && isDueReview(right)
        ? reviewPriority[left.priority!] - reviewPriority[right.priority!]
        : 0) ||
      Date.parse(left.actionAt ?? "1970-01-01T00:00:00.000Z") - Date.parse(right.actionAt ?? "1970-01-01T00:00:00.000Z") ||
      compareId(left.reviewTaskId ?? "", right.reviewTaskId ?? "") ||
      compareId(left.sessionId, right.sessionId));

    return {
      schemaVersion: "first_stage.private_today_continuation.v1",
      state: "ready",
      action: actions[0] ?? null,
    };
  }

  return Object.freeze({ create, execute, view, projectHistory, getTodayContinuation });
}

export type PrivateSessionHistory = ReturnType<ReturnType<typeof createPrivateFirstStageSessionService>["projectHistory"]>;

export type PrivateFirstStageSessionView = Awaited<ReturnType<
  ReturnType<typeof createPrivateFirstStageSessionService>["view"]>>;
