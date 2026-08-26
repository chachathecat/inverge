import {
  AUDIT_RUN_VERSION,
  QUESTION_FOUNDRY_CONTRACT_VERSION,
  type AuditActorV1,
  type AuditRunV1,
  type AuditStepV1,
  type QuestionFoundryValidationResult,
  type ReleaseDecisionV1,
  type ReleaseEvidenceBundleV1,
  type ReleaseTrustContextV1,
} from "./contracts";
import {
  canonicalDigest,
  validateCandidateCalculation,
  validateMetaAuditBundle,
  validateTrustedSourceBindings,
} from "./validation";

const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,199}$/u;
const AUDIT_RUN_KEYS = [
  "schemaVersion",
  "auditRunId",
  "contractVersion",
  "inputDigest",
  "outputDigest",
  "actors",
  "steps",
  "startedAt",
  "completedAt",
  "offline",
  "providerCalls",
  "remoteMutations",
  "productionMutations",
  "rawPrivateBodiesStored",
  "auditDigest",
] as const;
const AUDIT_ACTOR_KEYS = ["actorId", "role", "version"] as const;
const AUDIT_STEP_KEYS = [
  "stepId",
  "kind",
  "actorId",
  "occurredAt",
  "evidenceDigest",
  "inputDigest",
  "outputDigest",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function closedKeysValid(value: unknown, allowed: readonly string[]) {
  return (
    isRecord(value) &&
    Object.keys(value).length === allowed.length &&
    allowed.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function assertClosedCreateInput(input: Readonly<{
  auditRunId: string;
  actors: readonly AuditActorV1[];
  steps: readonly AuditStepV1[];
}>) {
  if (!SAFE_ID.test(input.auditRunId)) throw new Error("invalid-audit-run-id");
  if (input.actors.some((actor) => !closedKeysValid(actor, AUDIT_ACTOR_KEYS))) {
    throw new Error("audit-actor-schema-must-be-closed");
  }
  if (input.steps.some((step) => !closedKeysValid(step, AUDIT_STEP_KEYS))) {
    throw new Error("audit-step-schema-must-be-closed");
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

function isIsoInstant(value: string) {
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && new Date(epoch).toISOString() === value;
}

function auditDigestProjection(run: Omit<AuditRunV1, "auditDigest">) {
  return {
    schemaVersion: run.schemaVersion,
    auditRunId: run.auditRunId,
    contractVersion: run.contractVersion,
    inputDigest: run.inputDigest,
    outputDigest: run.outputDigest,
    actors: run.actors,
    steps: run.steps,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    offline: run.offline,
    providerCalls: run.providerCalls,
    remoteMutations: run.remoteMutations,
    productionMutations: run.productionMutations,
    rawPrivateBodiesStored: run.rawPrivateBodiesStored,
  };
}

export function createAuditRun(input: Readonly<{
  auditRunId: string;
  input: unknown;
  output: unknown;
  actors: readonly AuditActorV1[];
  steps: readonly AuditStepV1[];
  startedAt: string;
  completedAt: string;
}>): AuditRunV1 {
  assertClosedCreateInput(input);
  const withoutDigest = deepFreeze({
    schemaVersion: AUDIT_RUN_VERSION,
    auditRunId: input.auditRunId,
    contractVersion: QUESTION_FOUNDRY_CONTRACT_VERSION,
    inputDigest: canonicalDigest(input.input),
    outputDigest: canonicalDigest(input.output),
    actors: input.actors.map((actor) => ({
      actorId: actor.actorId,
      role: actor.role,
      version: actor.version,
    })),
    steps: input.steps.map((step) => ({
      stepId: step.stepId,
      kind: step.kind,
      actorId: step.actorId,
      occurredAt: step.occurredAt,
      evidenceDigest: step.evidenceDigest,
      inputDigest: step.inputDigest,
      outputDigest: step.outputDigest,
    })),
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    offline: true as const,
    providerCalls: 0 as const,
    remoteMutations: 0 as const,
    productionMutations: 0 as const,
    rawPrivateBodiesStored: false as const,
  });
  const run = deepFreeze({
    ...withoutDigest,
    auditDigest: canonicalDigest(auditDigestProjection(withoutDigest)),
  });
  const validation = validateAuditRun(run);
  if (!validation.valid) {
    throw new Error(`invalid-audit-run:${validation.errors.join(",")}`);
  }
  return run;
}

const ALLOWED_ROLES_BY_STEP: Readonly<Record<AuditStepV1["kind"], readonly AuditActorV1["role"][]>> = {
  SOLUTION_COMMITTED: ["GENERATOR"],
  CANDIDATE_GENERATED: ["GENERATOR"],
  PERMUTED: ["DETERMINISTIC_VALIDATOR"],
  DETERMINISTIC_VALIDATED: ["DETERMINISTIC_VALIDATOR"],
  SOURCE_VALIDATED: ["DETERMINISTIC_VALIDATOR"],
  SIMILARITY_REVIEWED: ["JUDGE", "DETERMINISTIC_VALIDATOR"],
  BLIND_SOLVED: ["BLIND_SOLVER"],
  JUDGED: ["JUDGE"],
  META_AUDITED: ["JUDGE", "DETERMINISTIC_VALIDATOR"],
  TRANSFER_VALIDATED: ["TRANSFER_EVALUATOR", "DETERMINISTIC_VALIDATOR"],
  OWNER_ADJUDICATED: ["OWNER"],
  RELEASE_DECIDED: ["OWNER", "DETERMINISTIC_VALIDATOR"],
  QUARANTINED: ["OWNER", "DETERMINISTIC_VALIDATOR"],
  DISPUTED: ["OWNER"],
  REVISED: ["OWNER"],
  RETIRED: ["OWNER"],
};

export function validateAuditRun(run: AuditRunV1): QuestionFoundryValidationResult {
  const errors: string[] = [];
  try {
    if (!closedKeysValid(run, AUDIT_RUN_KEYS)) errors.push("AUDIT_RUN_SCHEMA_NOT_CLOSED");
    if (run.schemaVersion !== AUDIT_RUN_VERSION) errors.push("AUDIT_VERSION_INVALID");
    if (run.contractVersion !== QUESTION_FOUNDRY_CONTRACT_VERSION) errors.push("AUDIT_CONTRACT_INVALID");
    if (!SAFE_ID.test(run.auditRunId)) errors.push("AUDIT_RUN_ID_INVALID");
    if (![run.inputDigest, run.outputDigest, run.auditDigest].every((digest) => SHA256.test(digest))) {
      errors.push("AUDIT_DIGEST_INVALID");
    }
    if (
      run.offline !== true ||
      run.providerCalls !== 0 ||
      run.remoteMutations !== 0 ||
      run.productionMutations !== 0 ||
      run.rawPrivateBodiesStored !== false
    ) {
      errors.push("AUDIT_OFFLINE_ZERO_MUTATION_BOUNDARY_INVALID");
    }
    if (
      !isIsoInstant(run.startedAt) ||
      !isIsoInstant(run.completedAt) ||
      Date.parse(run.startedAt) > Date.parse(run.completedAt)
    ) {
      errors.push("AUDIT_TIME_WINDOW_INVALID");
    }
    if (run.actors.length === 0 || new Set(run.actors.map((actor) => actor.actorId)).size !== run.actors.length) {
      errors.push("AUDIT_ACTORS_MUST_HAVE_UNIQUE_IDENTITIES");
    }
    for (const [actorIndex, actor] of run.actors.entries()) {
      if (!closedKeysValid(actor, AUDIT_ACTOR_KEYS)) {
        errors.push(`AUDIT_ACTOR_SCHEMA_NOT_CLOSED:${actorIndex}`);
      }
      if (!SAFE_ID.test(actor.actorId) || !SAFE_ID.test(actor.version)) {
        errors.push(`AUDIT_ACTOR_IDENTITY_INVALID:${actorIndex}`);
      }
      if (!["GENERATOR", "BLIND_SOLVER", "JUDGE", "TRANSFER_EVALUATOR", "OWNER", "DETERMINISTIC_VALIDATOR"].includes(actor.role)) {
        errors.push(`AUDIT_ACTOR_ROLE_INVALID:${actorIndex}`);
      }
    }
    const actorsById = new Map(run.actors.map((actor) => [actor.actorId, actor]));
    const generatorIds = new Set(
      run.actors.filter((actor) => actor.role === "GENERATOR").map((actor) => actor.actorId),
    );
    if (new Set(run.steps.map((step) => step.stepId)).size !== run.steps.length) {
      errors.push("AUDIT_STEP_IDS_DUPLICATE");
    }
    let previousAt = Number.NEGATIVE_INFINITY;
    for (const [stepIndex, step] of run.steps.entries()) {
      if (!closedKeysValid(step, AUDIT_STEP_KEYS)) {
        errors.push(`AUDIT_STEP_SCHEMA_NOT_CLOSED:${stepIndex}`);
      }
      if (!SAFE_ID.test(step.stepId) || !SAFE_ID.test(step.actorId)) {
        errors.push(`AUDIT_STEP_IDENTITY_INVALID:${stepIndex}`);
      }
      const actor = actorsById.get(step.actorId);
      if (!actor) {
        errors.push(`AUDIT_STEP_ACTOR_UNRESOLVED:${step.stepId}`);
        continue;
      }
      if (!ALLOWED_ROLES_BY_STEP[step.kind]?.includes(actor.role)) {
        errors.push(`AUDIT_STEP_ROLE_INVALID:${step.stepId}`);
      }
      if (step.kind === "JUDGED" && generatorIds.has(step.actorId)) {
        errors.push(`AUDIT_GENERATOR_SELF_JUDGED:${step.actorId}`);
      }
      if (!isIsoInstant(step.occurredAt)) errors.push(`AUDIT_STEP_TIME_INVALID:${step.stepId}`);
      const epoch = Date.parse(step.occurredAt);
      if (epoch < previousAt) errors.push(`AUDIT_STEPS_NOT_MONOTONIC:${step.stepId}`);
      if (epoch < Date.parse(run.startedAt) || epoch > Date.parse(run.completedAt)) {
        errors.push(`AUDIT_STEP_OUTSIDE_RUN:${step.stepId}`);
      }
      previousAt = epoch;
      if (
        !SHA256.test(step.evidenceDigest) ||
        !SHA256.test(step.inputDigest) ||
        !SHA256.test(step.outputDigest)
      ) {
        errors.push(`AUDIT_STEP_DIGEST_INVALID:${step.stepId}`);
      }
      const expectedInputDigest =
        stepIndex === 0 ? run.inputDigest : run.steps[stepIndex - 1].outputDigest;
      if (step.inputDigest !== expectedInputDigest) {
        errors.push(`AUDIT_STEP_DIGEST_CHAIN_BROKEN:${step.stepId}`);
      }
    }
    const kinds = run.steps.map((step) => step.kind);
    const terminalKind = run.steps.at(-1)?.kind;
    if (terminalKind === "RELEASE_DECIDED") {
      const firstSolution = kinds.indexOf("SOLUTION_COMMITTED");
      const firstCandidate = kinds.indexOf("CANDIDATE_GENERATED");
      const firstQuarantine = kinds.indexOf("QUARANTINED");
      if (
        firstSolution < 0 ||
        firstCandidate < 0 ||
        firstQuarantine < 0 ||
        firstSolution >= firstCandidate ||
        firstCandidate >= firstQuarantine
      ) {
        errors.push("AUDIT_SOLUTION_GENERATION_QUARANTINE_SEQUENCE_INVALID");
      }
      const blindSolverActorIds = new Set(
        run.steps.filter((step) => step.kind === "BLIND_SOLVED").map((step) => step.actorId),
      );
      if (blindSolverActorIds.size < 2) {
        errors.push("AUDIT_TWO_BLIND_SOLVERS_REQUIRED");
      }
      for (const required of [
        "PERMUTED",
        "DETERMINISTIC_VALIDATED",
        "SOURCE_VALIDATED",
        "SIMILARITY_REVIEWED",
        "JUDGED",
        "META_AUDITED",
        "RELEASE_DECIDED",
      ] as const) {
        if (!kinds.includes(required)) errors.push(`AUDIT_REQUIRED_STEP_MISSING:${required}`);
      }
    } else if (["DISPUTED", "REVISED", "RETIRED"].includes(String(terminalKind))) {
      if (run.steps.length !== 1) {
        errors.push("AUDIT_LIFECYCLE_TRANSITION_MUST_BE_ONE_EXACT_STEP");
      }
    } else {
      errors.push("AUDIT_TERMINAL_STEP_INVALID");
    }
    if (run.steps.at(-1)?.outputDigest !== run.outputDigest) {
      errors.push("AUDIT_OUTPUT_DIGEST_NOT_BOUND_TO_TERMINAL_STEP");
    }
    if (canonicalDigest(auditDigestProjection(run)) !== run.auditDigest) {
      errors.push("AUDIT_DIGEST_MISMATCH");
    }
  } catch (error) {
    errors.push(`AUDIT_VALIDATOR_EXCEPTION:${error instanceof Error ? error.message : "unknown"}`);
  }
  return deepFreeze({ valid: errors.length === 0, errors: [...new Set(errors)].sort() });
}

export const QUESTION_FOUNDRY_DETERMINISTIC_VALIDATOR_ACTOR = deepFreeze({
  actorId: "question-foundry-deterministic-validator",
  role: "DETERMINISTIC_VALIDATOR" as const,
  version: QUESTION_FOUNDRY_CONTRACT_VERSION,
});

type ReleaseAuditEvidenceStep = Readonly<{
  kind: AuditStepV1["kind"];
  actor: AuditActorV1;
  occurredAt: string;
  evidenceDigest: string;
}>;

function releasePurposes(decision: ReleaseDecisionV1) {
  return [
    "QUESTION_BLUEPRINT_EXTRACTION",
    "QUESTION_GENERATION_CONTEXT",
    "PERSONAL_LEARNING_BANK",
    ...(decision.requestedTier === "TRANSFER_VERIFIED" ||
    decision.requestedTier === "MEASUREMENT_CALIBRATED"
      ? (["TRANSFER_BANK"] as const)
      : []),
    ...(decision.requestedTier === "MEASUREMENT_CALIBRATED"
      ? (["MEASUREMENT_BANK"] as const)
      : []),
  ] as const;
}

function latestInstant(values: readonly string[], fallback: string) {
  return values
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? fallback;
}

function releaseAuditEvidencePlan(
  bundle: ReleaseEvidenceBundleV1,
  decision: ReleaseDecisionV1,
  trustContext: ReleaseTrustContextV1,
  completedAt: string,
): readonly ReleaseAuditEvidenceStep[] {
  if (bundle.trustedSources.asOf !== completedAt) {
    throw new Error("release-source-registry-must-match-audit-completion");
  }
  const selectedCandidate = bundle.batch.candidates.find(
    (candidate) => candidate.candidateId === bundle.selectedCandidateId,
  );
  if (!selectedCandidate) throw new Error("release-audit-selected-candidate-missing");
  const generatorActor = (candidate: typeof selectedCandidate): AuditActorV1 => ({
    actorId: candidate.generatorId,
    role: "GENERATOR",
    version: candidate.generatorVersion,
  });
  const validator = QUESTION_FOUNDRY_DETERMINISTIC_VALIDATOR_ACTOR;
  const preBlueprintValidation = validateTrustedSourceBindings(
    bundle.batch.blueprint.sourceBindings,
    bundle.trustedSources,
    ["QUESTION_BLUEPRINT_EXTRACTION"],
    trustContext.sourceRegistryExportBinding,
    bundle.batch.blueprint.createdAt,
  );
  const generationValidation = validateTrustedSourceBindings(
    bundle.batch.blueprint.sourceBindings,
    bundle.trustedSources,
    ["QUESTION_GENERATION_CONTEXT"],
    trustContext.sourceRegistryExportBinding,
    selectedCandidate.generatedAt,
  );
  const releaseValidation = validateTrustedSourceBindings(
    bundle.batch.blueprint.sourceBindings,
    bundle.trustedSources,
    releasePurposes(decision),
    trustContext.sourceRegistryExportBinding,
  );
  const steps: ReleaseAuditEvidenceStep[] = [
    {
      kind: "SOURCE_VALIDATED",
      actor: validator,
      occurredAt: bundle.batch.blueprint.createdAt,
      evidenceDigest: canonicalDigest({
        phase: "PRE_BLUEPRINT",
        sourceBindings: bundle.batch.blueprint.sourceBindings,
        trustedSources: bundle.trustedSources,
        useAt: bundle.batch.blueprint.createdAt,
        purposes: ["QUESTION_BLUEPRINT_EXTRACTION"],
        validation: preBlueprintValidation,
      }),
    },
    {
      kind: "SOLUTION_COMMITTED",
      actor: generatorActor(selectedCandidate),
      occurredAt: bundle.batch.answerSpecification.createdAt,
      evidenceDigest: canonicalDigest(bundle.batch.answerSpecification),
    },
    {
      kind: "SOURCE_VALIDATED",
      actor: validator,
      occurredAt: selectedCandidate.generatedAt,
      evidenceDigest: canonicalDigest({
        phase: "GENERATION_CONTEXT",
        sourceBindings: bundle.batch.blueprint.sourceBindings,
        trustedSources: bundle.trustedSources,
        useAt: selectedCandidate.generatedAt,
        purposes: ["QUESTION_GENERATION_CONTEXT"],
        validation: generationValidation,
      }),
    },
  ];
  for (const candidate of bundle.batch.candidates) {
    steps.push({
      kind: "CANDIDATE_GENERATED",
      actor: generatorActor(candidate),
      occurredAt: candidate.generatedAt,
      evidenceDigest: canonicalDigest(candidate),
    });
    steps.push({
      kind: "QUARANTINED",
      actor: validator,
      occurredAt: candidate.generatedAt,
      evidenceDigest: canonicalDigest({
        candidateId: candidate.candidateId,
        initialState: candidate.initialState,
      }),
    });
  }
  steps.push(
    {
      kind: "PERMUTED",
      actor: validator,
      occurredAt: selectedCandidate.generatedAt,
      evidenceDigest: canonicalDigest({
        candidateOrderPermutations: bundle.batch.candidateOrderPermutations,
        optionOrderPermutations: bundle.batch.optionOrderPermutations,
      }),
    },
    {
      kind: "DETERMINISTIC_VALIDATED",
      actor: validator,
      occurredAt: selectedCandidate.generatedAt,
      evidenceDigest: canonicalDigest({
        candidateId: selectedCandidate.candidateId,
        validation: validateCandidateCalculation(
          selectedCandidate,
          bundle.batch.answerSpecification,
        ),
      }),
    },
    {
      kind: "SIMILARITY_REVIEWED",
      actor: validator,
      occurredAt: selectedCandidate.generatedAt,
      evidenceDigest: canonicalDigest({
        references: bundle.similarityReferences,
        review: bundle.similarityReview,
      }),
    },
  );
  for (const review of [...bundle.blindSolverReviews].sort((left, right) =>
    left.completedAt.localeCompare(right.completedAt) || left.reviewId.localeCompare(right.reviewId))) {
    steps.push({
      kind: "BLIND_SOLVED",
      actor: {
        actorId: review.solverId,
        role: "BLIND_SOLVER",
        version: review.solverVersion,
      },
      occurredAt: review.completedAt,
      evidenceDigest: canonicalDigest(review),
    });
  }
  for (const review of [...bundle.judgeReviews].sort((left, right) =>
    left.completedAt.localeCompare(right.completedAt) || left.reviewId.localeCompare(right.reviewId))) {
    steps.push({
      kind: "JUDGED",
      actor: {
        actorId: review.judgeId,
        role: "JUDGE",
        version: review.judgeVersion,
      },
      occurredAt: review.completedAt,
      evidenceDigest: canonicalDigest(review),
    });
  }
  const metaCompletedAt = latestInstant(
    [
      ...bundle.metaAudits.selfPreference.runs.map((run) => run.completedAt),
      ...bundle.metaAudits.orderBias.runs.map((run) => run.completedAt),
      ...bundle.metaAudits.repeatedStability.runs.map((run) => run.completedAt),
      ...bundle.metaAudits.judgeDrift.fixtures.flatMap((fixture) => [
        fixture.baseline.completedAt,
        fixture.current.completedAt,
      ]),
      ...bundle.blindSolverReviews.map((review) => review.completedAt),
      ...bundle.judgeReviews.map((review) => review.completedAt),
    ],
    selectedCandidate.generatedAt,
  );
  steps.push(
    {
      kind: "META_AUDITED",
      actor: validator,
      occurredAt: metaCompletedAt,
      evidenceDigest: canonicalDigest({
        metaAudits: bundle.metaAudits,
        validation: validateMetaAuditBundle(
          bundle.metaAudits,
          bundle.batch,
          bundle.selectedCandidateId,
        ),
      }),
    },
  );
  if (
    decision.requestedTier === "TRANSFER_VERIFIED" ||
    decision.requestedTier === "MEASUREMENT_CALIBRATED"
  ) {
    if (!bundle.transferEvidence || !bundle.ownerAdjudication) {
      throw new Error("release-audit-transfer-and-owner-evidence-required");
    }
    for (const receipt of [...bundle.transferEvidence.evaluatorReceipts].sort((left, right) =>
      left.evaluatedAt.localeCompare(right.evaluatedAt) || left.receiptId.localeCompare(right.receiptId))) {
      const execution = bundle.trustedModelExecutions.receipts.find(
        (entry) => entry.executionId === receipt.evaluatorExecutionId,
      );
      const model = execution
        ? bundle.trustedModelExecutions.models.find(
            (entry) => entry.registryModelId === execution.registryModelId,
          )
        : null;
      steps.push({
        kind: "TRANSFER_VALIDATED",
        actor: {
          actorId: receipt.evaluatorId,
          role: "TRANSFER_EVALUATOR",
          version: receipt.evaluatorVersion,
        },
        occurredAt: receipt.evaluatedAt,
        evidenceDigest: canonicalDigest({ receipt, execution, model }),
      });
    }
    steps.push(
      {
        kind: "TRANSFER_VALIDATED",
        actor: validator,
        occurredAt: bundle.transferEvidence.completedAt,
        evidenceDigest: canonicalDigest({
          transferEvidence: bundle.transferEvidence,
          evidenceDigestValid: bundle.transferEvidence.evidenceDigest === canonicalDigest({
            bundleId: bundle.transferEvidence.bundleId,
            candidateId: bundle.transferEvidence.candidateId,
            sealedBeforeEvaluation: bundle.transferEvidence.sealedBeforeEvaluation,
            sealedVariantRegistry: bundle.transferEvidence.sealedVariantRegistry,
            evaluatorReceipts: bundle.transferEvidence.evaluatorReceipts,
            completedAt: bundle.transferEvidence.completedAt,
          }),
        }),
      },
      {
        kind: "OWNER_ADJUDICATED",
        actor: {
          actorId: bundle.ownerAdjudication.adjudicatorId,
          role: "OWNER",
          version: bundle.ownerAdjudication.adjudicatorVersion,
        },
        occurredAt: bundle.ownerAdjudication.decidedAt,
        evidenceDigest: canonicalDigest(bundle.ownerAdjudication),
      },
    );
  }
  steps.push(
    {
      kind: "SOURCE_VALIDATED",
      actor: validator,
      occurredAt: completedAt,
      evidenceDigest: canonicalDigest({
        phase: "RELEASE",
        sourceBindings: bundle.batch.blueprint.sourceBindings,
        trustedSources: bundle.trustedSources,
        purposes: releasePurposes(decision),
        validation: releaseValidation,
      }),
    },
    {
      kind: "RELEASE_DECIDED",
      actor: validator,
      occurredAt: completedAt,
      evidenceDigest: canonicalDigest(decision),
    },
  );
  return steps;
}

export function createReleaseAuditRun(input: Readonly<{
  auditRunId: string;
  bundle: ReleaseEvidenceBundleV1;
  decision: ReleaseDecisionV1;
  trustContext: ReleaseTrustContextV1;
  completedAt: string;
}>): AuditRunV1 {
  const plan = releaseAuditEvidencePlan(
    input.bundle,
    input.decision,
    input.trustContext,
    input.completedAt,
  );
  const actorMap = new Map<string, AuditActorV1>();
  for (const entry of plan) {
    const prior = actorMap.get(entry.actor.actorId);
    if (prior && canonicalDigest(prior) !== canonicalDigest(entry.actor)) {
      throw new Error(`release-audit-actor-identity-drift:${entry.actor.actorId}`);
    }
    actorMap.set(entry.actor.actorId, entry.actor);
  }
  let priorDigest = canonicalDigest(input.bundle);
  const steps = plan.map((entry, index) => {
    const terminal = index === plan.length - 1;
    const outputDigest = terminal
      ? canonicalDigest(input.decision)
      : canonicalDigest({
          ordinal: index + 1,
          kind: entry.kind,
          actorId: entry.actor.actorId,
          inputDigest: priorDigest,
          evidenceDigest: entry.evidenceDigest,
        });
    const step: AuditStepV1 = {
      stepId: `${input.auditRunId}:${index + 1}:${entry.kind.toLowerCase()}`,
      kind: entry.kind,
      actorId: entry.actor.actorId,
      occurredAt: entry.occurredAt,
      evidenceDigest: entry.evidenceDigest,
      inputDigest: priorDigest,
      outputDigest,
    };
    priorDigest = outputDigest;
    return step;
  });
  const run = createAuditRun({
    auditRunId: input.auditRunId,
    input: input.bundle,
    output: input.decision,
    actors: [...actorMap.values()],
    steps,
    startedAt: input.bundle.batch.blueprint.createdAt,
    completedAt: input.completedAt,
  });
  const semanticValidation = validateReleaseAuditRun(
    run,
    input.bundle,
    input.decision,
    input.trustContext,
  );
  if (!semanticValidation.valid) {
    throw new Error(`invalid-release-audit:${semanticValidation.errors.join(",")}`);
  }
  return run;
}

export function validateReleaseAuditRun(
  run: AuditRunV1,
  bundle: ReleaseEvidenceBundleV1,
  decision: ReleaseDecisionV1,
  trustContext: ReleaseTrustContextV1,
): QuestionFoundryValidationResult {
  const errors = [...validateAuditRun(run).errors];
  if (run.inputDigest !== canonicalDigest(bundle)) errors.push("RELEASE_AUDIT_INPUT_NOT_BOUND");
  if (run.outputDigest !== canonicalDigest(decision)) errors.push("RELEASE_AUDIT_OUTPUT_NOT_BOUND");
  let plan: readonly ReleaseAuditEvidenceStep[] = [];
  try {
    plan = releaseAuditEvidencePlan(bundle, decision, trustContext, run.completedAt);
  } catch (error) {
    errors.push(`RELEASE_AUDIT_PLAN_INVALID:${error instanceof Error ? error.message : "unknown"}`);
  }
  if (run.steps.length !== plan.length) errors.push("RELEASE_AUDIT_STEP_CARDINALITY_MISMATCH");
  let priorDigest = canonicalDigest(bundle);
  for (const [index, expected] of plan.entries()) {
    const actual = run.steps[index];
    const expectedStepId = `${run.auditRunId}:${index + 1}:${expected.kind.toLowerCase()}`;
    const expectedOutputDigest = index === plan.length - 1
      ? canonicalDigest(decision)
      : canonicalDigest({
          ordinal: index + 1,
          kind: expected.kind,
          actorId: expected.actor.actorId,
          inputDigest: priorDigest,
          evidenceDigest: expected.evidenceDigest,
        });
    if (
      !actual ||
      actual.stepId !== expectedStepId ||
      actual.kind !== expected.kind ||
      actual.actorId !== expected.actor.actorId ||
      actual.occurredAt !== expected.occurredAt ||
      actual.evidenceDigest !== expected.evidenceDigest ||
      actual.inputDigest !== priorDigest ||
      actual.outputDigest !== expectedOutputDigest
    ) {
      errors.push(`RELEASE_AUDIT_STEP_NOT_SEMANTICALLY_BOUND:${index}`);
    }
    priorDigest = expectedOutputDigest;
  }
  const expectedActors = [...new Map(plan.map((entry) => [entry.actor.actorId, entry.actor])).values()]
    .sort((left, right) => left.actorId.localeCompare(right.actorId));
  const actualActors = [...run.actors].sort((left, right) => left.actorId.localeCompare(right.actorId));
  if (canonicalDigest(actualActors) !== canonicalDigest(expectedActors)) {
    errors.push("RELEASE_AUDIT_ACTORS_NOT_BOUND_TO_EVIDENCE");
  }
  return deepFreeze({ valid: errors.length === 0, errors: [...new Set(errors)].sort() });
}
