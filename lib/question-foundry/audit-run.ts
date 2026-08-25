import {
  AUDIT_RUN_VERSION,
  QUESTION_FOUNDRY_CONTRACT_VERSION,
  type AuditActorV1,
  type AuditRunV1,
  type AuditStepV1,
  type QuestionFoundryValidationResult,
} from "./contracts";
import { canonicalDigest } from "./validation";

const SHA256 = /^[a-f0-9]{64}$/u;

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
  const withoutDigest = deepFreeze({
    schemaVersion: AUDIT_RUN_VERSION,
    auditRunId: input.auditRunId,
    contractVersion: QUESTION_FOUNDRY_CONTRACT_VERSION,
    inputDigest: canonicalDigest(input.input),
    outputDigest: canonicalDigest(input.output),
    actors: input.actors.map((actor) => ({ ...actor })),
    steps: input.steps.map((step) => ({ ...step })),
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
  RELEASE_DECIDED: ["OWNER", "DETERMINISTIC_VALIDATOR"],
  QUARANTINED: ["OWNER", "DETERMINISTIC_VALIDATOR"],
  DISPUTED: ["OWNER"],
  REVISED: ["OWNER"],
  RETIRED: ["OWNER"],
};

export function validateAuditRun(run: AuditRunV1): QuestionFoundryValidationResult {
  const errors: string[] = [];
  try {
    if (run.schemaVersion !== AUDIT_RUN_VERSION) errors.push("AUDIT_VERSION_INVALID");
    if (run.contractVersion !== QUESTION_FOUNDRY_CONTRACT_VERSION) errors.push("AUDIT_CONTRACT_INVALID");
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
    const actorsById = new Map(run.actors.map((actor) => [actor.actorId, actor]));
    const generatorIds = new Set(
      run.actors.filter((actor) => actor.role === "GENERATOR").map((actor) => actor.actorId),
    );
    if (new Set(run.steps.map((step) => step.stepId)).size !== run.steps.length) {
      errors.push("AUDIT_STEP_IDS_DUPLICATE");
    }
    let previousAt = Number.NEGATIVE_INFINITY;
    for (const [stepIndex, step] of run.steps.entries()) {
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
      if (!SHA256.test(step.inputDigest) || !SHA256.test(step.outputDigest)) {
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
