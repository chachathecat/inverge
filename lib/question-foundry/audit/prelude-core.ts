import { types as utilTypes } from "node:util";

import * as qf0a1 from "../quarantine/bounded-canonical-json";
import * as qf0iContracts from "../quarantine/candidate-contracts";
import * as qf0iCore from "../quarantine/candidate-core";
import type { QuarantinedQuestionCandidateV1 } from "../quarantine/candidate-contracts";
import * as qf0a2Contracts from "../quarantine/trust-contracts";
import type { ModelExecutionIdentityV1 } from "../quarantine/trust-contracts";
import {
  QFS2_CONTRACT_VERSION,
  QFS2_LIMITS,
  QFS2_SOURCE_ONLY_BOUNDARY_RECEIPT,
  type CandidateAuditActorV1,
  type CandidateAuditPreludeV1,
  type CandidateAuditStepKindV1,
  type CandidateAuditStepV1,
  type ModelExecutionAuditActorV1,
  type SystemComponentAuditActorV1,
} from "./prelude-contracts";

const PRELUDE_FIELDS = Object.freeze([
  "contractVersion",
  "preludeId",
  "preludeDigest",
  "candidateId",
  "candidateDigest",
  "qf0DependencyDigest",
  "actors",
  "steps",
  "startedAt",
  "completedAt",
] as const);

const SYSTEM_ACTOR_FIELDS = Object.freeze([
  "actorRefId",
  "kind",
  "componentId",
  "contractVersion",
  "implementationOrBoundaryDigest",
] as const);

const MODEL_ACTOR_FIELDS = Object.freeze([
  "actorRefId",
  "kind",
  "role",
  "executionId",
  "identityDigest",
  "modelArtifactDigest",
  "executionArtifactDigest",
  "executedAt",
] as const);

const STEP_FIELDS = Object.freeze([
  "stepId",
  "kind",
  "actorRefId",
  "occurredAt",
  "evidenceDigest",
  "dependsOnStepIds",
  "dependencyOutputDigests",
  "stepDigest",
] as const);

const ACTOR_KINDS = Object.freeze([
  "SYSTEM_COMPONENT",
  "MODEL_EXECUTION",
] as const);

const STEP_KINDS = Object.freeze([
  "SOURCE_DECISION_BOUND",
  "GENERATION_RIGHTS_REVALIDATED",
  "GENERATOR_EXECUTION_BOUND",
  "INDEPENDENT_EXECUTION_IDENTITY_BOUND",
  "MATERIALIZATION_RIGHTS_REVALIDATED",
  "CANDIDATE_QUARANTINED",
] as const);

const PHASE_RANK: Readonly<Record<CandidateAuditStepKindV1, number>> =
  Object.freeze({
    SOURCE_DECISION_BOUND: 0,
    GENERATION_RIGHTS_REVALIDATED: 1,
    GENERATOR_EXECUTION_BOUND: 2,
    INDEPENDENT_EXECUTION_IDENTITY_BOUND: 3,
    MATERIALIZATION_RIGHTS_REVALIDATED: 4,
    CANDIDATE_QUARANTINED: 5,
  });

const QF0A1_EXPORTS = Object.freeze([
  "QF0A1_LIMITS",
  "QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT",
  "canonicalizeBoundedJsonV1",
  "compareUtf8BytesV1",
  "digestCanonicalJsonV1",
] as const);

const QF0I_CONTRACT_EXPORTS = Object.freeze([
  "QF0I_CANDIDATE_LIFECYCLES",
  "QF0I_CONTRACT_VERSION",
  "QF0I_LIMITS",
  "QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT",
] as const);

const QF0I_CORE_EXPORTS = Object.freeze([
  "assertQuarantinedQuestionCandidateV1",
  "createQuarantinedQuestionCandidateV1",
] as const);

const QF0I_PUBLIC_EXPORTS = Object.freeze([
  "QF0I_CONTRACT_VERSION",
  "QF0I_CANDIDATE_LIFECYCLES",
  "QF0I_LIMITS",
  "QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT",
  "createQuarantinedQuestionCandidateV1",
  "assertQuarantinedQuestionCandidateV1",
] as const);

const QF0_DEPENDENCY_RECEIPT = Object.freeze({
  resultingMainSha: "7b21551b0ec2a6b78286fb861b9acd0d1f8ca8c2",
  resultingMainTree: "9ad60b9ece4931d7172cdc0462e079ed8d9a53fa",
  aggregateConfigSha256:
    "34722851960a8818876a95ce189d8074727337efed0d9d8040f034a119935993",
  sixPathIdentity:
    "sha256:4452ad1a5e28bcba5409081a366e1d615db46bb20bc9bfae1c9381e49ea038aa",
  candidateContractsSha256:
    "9ff5f6ebdf0e2700591a789dacd096643406c445541b07898ba10559b202ff05",
  candidateCoreSha256:
    "c122e610734b6e51fd68b8e821838cac225130d30cddf7723127d9bd78d15452",
  sourceOnlyBoundaryReceiptDigest:
    "sha256:0062eb9c6987ddda8bc7ade7f94f61b555483b4c508397663b5069ead9798cb7",
  contractExportsExactly: QF0I_CONTRACT_EXPORTS,
  coreExportsExactly: QF0I_CORE_EXPORTS,
  publicExportsExactly: QF0I_PUBLIC_EXPORTS,
});

const QF0_DEPENDENCY_DIGEST =
  "sha256:b1b7fca1085519351e1275c81bd2c39cbcf45799e252778be7b8bd2938d06a14";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const CANDIDATE_ID_PATTERN = /^qfc_[a-f0-9]{64}$/u;
const PRELUDE_ID_PATTERN = /^qfap_[a-f0-9]{64}$/u;
const ACTOR_REF_ID_PATTERN = /^qfaa_[a-f0-9]{64}$/u;
const STEP_ID_PATTERN = /^qfas_[a-f0-9]{64}$/u;
const EXECUTION_ID_PATTERN = /^exec_[a-f0-9]{32}$/u;
const CANONICAL_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function fail(code: string): never {
  throw new Error(`QFS2_FAIL_CLOSED:${code}`);
}

function readClosedRecord(
  value: unknown,
  fields: readonly string[],
  label: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    fail(`${label}_RECORD_REQUIRED`);
  }
  if (utilTypes.isProxy(value)) fail(`${label}_PROXY_UNSUPPORTED`);
  if (Array.isArray(value)) fail(`${label}_OBJECT_REQUIRED`);

  let prototype: object | null;
  let keys: (string | symbol)[];
  try {
    prototype = Object.getPrototypeOf(value);
    keys = Reflect.ownKeys(value);
  } catch {
    fail(`${label}_UNINSPECTABLE`);
  }
  if (prototype !== Object.prototype && prototype !== null) {
    fail(`${label}_PROTOTYPE_UNSUPPORTED`);
  }
  if (keys.some((key) => typeof key !== "string")) {
    fail(`${label}_SYMBOL_KEY_UNSUPPORTED`);
  }
  if (
    keys.length !== fields.length ||
    keys.some((key) => !fields.includes(key as string)) ||
    fields.some((field) => !keys.includes(field))
  ) {
    fail(`${label}_FIELD_SET_INVALID`);
  }

  const snapshot: Record<string, unknown> = {};
  for (const field of fields) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, field);
    } catch {
      fail(`${label}_DESCRIPTOR_UNINSPECTABLE`);
    }
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail(`${label}_DATA_PROPERTY_REQUIRED`);
    }
    snapshot[field] = descriptor.value;
  }
  return snapshot;
}

function readDiscriminator(value: unknown, label: string): unknown {
  if (value === null || typeof value !== "object") {
    fail(`${label}_RECORD_REQUIRED`);
  }
  if (utilTypes.isProxy(value)) fail(`${label}_PROXY_UNSUPPORTED`);
  if (Array.isArray(value)) fail(`${label}_OBJECT_REQUIRED`);
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(value, "kind");
  } catch {
    fail(`${label}_DESCRIPTOR_UNINSPECTABLE`);
  }
  if (
    descriptor === undefined ||
    !("value" in descriptor) ||
    descriptor.enumerable !== true
  ) {
    fail(`${label}_KIND_DATA_PROPERTY_REQUIRED`);
  }
  return descriptor.value;
}

function readDenseArray(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): unknown[] {
  if (value === null || typeof value !== "object") {
    fail(`${label}_ARRAY_REQUIRED`);
  }
  if (utilTypes.isProxy(value)) fail(`${label}_PROXY_UNSUPPORTED`);
  if (!Array.isArray(value)) fail(`${label}_ARRAY_REQUIRED`);
  let prototype: object | null;
  let keys: (string | symbol)[];
  let lengthDescriptor: PropertyDescriptor | undefined;
  try {
    prototype = Object.getPrototypeOf(value);
    keys = Reflect.ownKeys(value);
    lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  } catch {
    fail(`${label}_UNINSPECTABLE`);
  }
  if (prototype !== Array.prototype) fail(`${label}_PROTOTYPE_UNSUPPORTED`);
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < minimum ||
    lengthDescriptor.value > maximum ||
    keys.length !== lengthDescriptor.value + 1 ||
    keys.some((key) => typeof key !== "string")
  ) {
    fail(`${label}_DENSE_BOUNDED_ARRAY_REQUIRED`);
  }
  const output: unknown[] = [];
  for (let index = 0; index < lengthDescriptor.value; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail(`${label}_DATA_ELEMENT_REQUIRED`);
    }
    output.push(descriptor.value);
  }
  return output;
}

function readStringArray(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): string[] {
  return readDenseArray(value, minimum, maximum, label).map((entry) => {
    if (typeof entry !== "string") fail(`${label}_STRING_ELEMENT_REQUIRED`);
    return entry;
  });
}

function readClosedString<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(`${label}_INVALID`);
  }
  return value as T;
}

function readPattern(
  value: unknown,
  pattern: RegExp,
  label: string,
): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    fail(`${label}_FORMAT_INVALID`);
  }
  return value;
}

function readDigest(value: unknown, label: string): string {
  return readPattern(value, DIGEST_PATTERN, label);
}

function readCanonicalUtc(value: unknown, label: string): string {
  const timestamp = readPattern(value, CANONICAL_UTC_PATTERN, label);
  const milliseconds = Date.parse(timestamp);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== timestamp
  ) {
    fail(`${label}_INVALID`);
  }
  return timestamp;
}

function compareStrings(left: string, right: string): number {
  return qf0a1.compareUtf8BytesV1(left, right);
}

function orderStringsUtf8(values: readonly string[], label: string): string[] {
  const ordered: string[] = [];
  for (const value of values) {
    let index = 0;
    while (index < ordered.length && compareStrings(ordered[index], value) < 0) {
      index += 1;
    }
    if (ordered[index] === value) fail(`${label}_DUPLICATE`);
    ordered.splice(index, 0, value);
  }
  return ordered;
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  return (
    qf0a1.canonicalizeBoundedJsonV1(left) ===
    qf0a1.canonicalizeBoundedJsonV1(right)
  );
}

function plainQf0DependencyReceipt(): Record<string, unknown> {
  return {
    resultingMainSha: QF0_DEPENDENCY_RECEIPT.resultingMainSha,
    resultingMainTree: QF0_DEPENDENCY_RECEIPT.resultingMainTree,
    aggregateConfigSha256: QF0_DEPENDENCY_RECEIPT.aggregateConfigSha256,
    sixPathIdentity: QF0_DEPENDENCY_RECEIPT.sixPathIdentity,
    candidateContractsSha256: QF0_DEPENDENCY_RECEIPT.candidateContractsSha256,
    candidateCoreSha256: QF0_DEPENDENCY_RECEIPT.candidateCoreSha256,
    sourceOnlyBoundaryReceiptDigest:
      QF0_DEPENDENCY_RECEIPT.sourceOnlyBoundaryReceiptDigest,
    contractExportsExactly: [...QF0_DEPENDENCY_RECEIPT.contractExportsExactly],
    coreExportsExactly: [...QF0_DEPENDENCY_RECEIPT.coreExportsExactly],
    publicExportsExactly: [...QF0_DEPENDENCY_RECEIPT.publicExportsExactly],
  };
}

function plainQf0iBoundaryReceipt(): Record<string, unknown> {
  const receipt = qf0iContracts.QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT;
  return {
    contractVersion: receipt.contractVersion,
    scope: receipt.scope,
    storage: receipt.storage,
    runtimeActivation: receipt.runtimeActivation,
    providerExecution: receipt.providerExecution,
    network: receipt.network,
    databaseAndPersistence: receipt.databaseAndPersistence,
    remoteMutation: receipt.remoteMutation,
    productionMutation: receipt.productionMutation,
    rawCandidateBodyAbsent: receipt.rawCandidateBodyAbsent,
    quarantinedCandidateConstructionOnly:
      receipt.quarantinedCandidateConstructionOnly,
    releasableCandidateAuthorityAbsent:
      receipt.releasableCandidateAuthorityAbsent,
    similarityAuthorityAbsent: receipt.similarityAuthorityAbsent,
    auditAndChronologyAuthorityAbsent:
      receipt.auditAndChronologyAuthorityAbsent,
    learnerAssignmentAbsent: receipt.learnerAssignmentAbsent,
    bankAssignmentAbsent: receipt.bankAssignmentAbsent,
    publicLifecyclesExactly: [...receipt.publicLifecyclesExactly],
    publicExportsExactly: [...receipt.publicExportsExactly],
  };
}

function plainQfs2BoundaryReceipt(): Record<string, unknown> {
  const receipt = QFS2_SOURCE_ONLY_BOUNDARY_RECEIPT;
  return {
    contractVersion: receipt.contractVersion,
    scope: receipt.scope,
    storage: receipt.storage,
    runtimeActivation: receipt.runtimeActivation,
    rawCandidateBodyAbsent: receipt.rawCandidateBodyAbsent,
    network: receipt.network,
    providerExecution: receipt.providerExecution,
    databaseAndPersistence: receipt.databaseAndPersistence,
    remoteMutation: receipt.remoteMutation,
    productionMutation: receipt.productionMutation,
    releaseAuthorityAbsent: receipt.releaseAuthorityAbsent,
    transferAuthorityAbsent: receipt.transferAuthorityAbsent,
    similarityAuthorityAbsent: receipt.similarityAuthorityAbsent,
    learnerAssignmentAbsent: receipt.learnerAssignmentAbsent,
    bankAssignmentAbsent: receipt.bankAssignmentAbsent,
    evidenceClaimBoundary: { ...receipt.evidenceClaimBoundary },
    qfS3RequiredForLaterChronologyAggregation:
      receipt.qfS3RequiredForLaterChronologyAggregation,
    qf0SourceOnlyBoundaryReceiptDigest:
      receipt.qf0SourceOnlyBoundaryReceiptDigest,
    publicExportsExactly: [...receipt.publicExportsExactly],
    limits: { ...receipt.limits },
  };
}

function assertExactExportSurface(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  if (
    !canonicalEqual(
      orderStringsUtf8(actual, `${label}_ACTUAL_EXPORT`),
      orderStringsUtf8(expected, `${label}_EXPECTED_EXPORT`),
    )
  ) {
    fail(`${label}_EXPORT_SURFACE_DRIFT`);
  }
}

function assertDependenciesV1(): void {
  assertExactExportSurface(Object.keys(qf0a1), QF0A1_EXPORTS, "QF0A1");
  assertExactExportSurface(
    Object.keys(qf0iContracts),
    QF0I_CONTRACT_EXPORTS,
    "QF0I_CONTRACTS",
  );
  assertExactExportSurface(
    Object.keys(qf0iCore),
    QF0I_CORE_EXPORTS,
    "QF0I_CORE",
  );
  if (
    qf0iContracts.QF0I_CONTRACT_VERSION !==
      "QF0IQuarantinedQuestionCandidateIntegrationV1" ||
    !canonicalEqual([...qf0iContracts.QF0I_CANDIDATE_LIFECYCLES], ["QUARANTINED"]) ||
    qf0iContracts.QF0I_LIMITS.maxIndependentExecutions !==
      QFS2_LIMITS.maxIndependentExecutions ||
    qf0iContracts.QF0I_LIMITS.callerOverride !== false
  ) {
    fail("QF0I_CONTRACT_DRIFT");
  }
  if (
    qf0a1.digestCanonicalJsonV1(plainQf0iBoundaryReceipt()) !==
      QF0_DEPENDENCY_RECEIPT.sourceOnlyBoundaryReceiptDigest ||
    !canonicalEqual(
      [...qf0iContracts.QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT.publicExportsExactly],
      [...QF0I_PUBLIC_EXPORTS],
    )
  ) {
    fail("QF0I_SOURCE_ONLY_BOUNDARY_DRIFT");
  }
  if (
    qf0a1.digestCanonicalJsonV1(plainQf0DependencyReceipt()) !==
    QF0_DEPENDENCY_DIGEST
  ) {
    fail("QF0_DEPENDENCY_RECEIPT_DRIFT");
  }
}

function systemActorMaterial(): Omit<SystemComponentAuditActorV1, "actorRefId"> {
  return {
    kind: "SYSTEM_COMPONENT",
    componentId: "QF_S2_CANDIDATE_AUDIT_PRELUDE",
    contractVersion: QFS2_CONTRACT_VERSION,
    implementationOrBoundaryDigest: qf0a1.digestCanonicalJsonV1(
      plainQfs2BoundaryReceipt(),
    ),
  };
}

function modelActorMaterial(
  execution: ModelExecutionIdentityV1,
): Omit<ModelExecutionAuditActorV1, "actorRefId"> {
  return {
    kind: "MODEL_EXECUTION",
    role: execution.role,
    executionId: execution.executionId,
    identityDigest: execution.identityDigest,
    modelArtifactDigest: execution.modelArtifactDigest,
    executionArtifactDigest: execution.executionArtifactDigest,
    executedAt: execution.executedAt,
  };
}

function deriveActorRefId(
  material:
    | Omit<SystemComponentAuditActorV1, "actorRefId">
    | Omit<ModelExecutionAuditActorV1, "actorRefId">,
): string {
  const digest = qf0a1.digestCanonicalJsonV1({
    domain: "QFS2_AUDIT_ACTOR_REFERENCE_ID_V1",
    material,
  });
  return `qfaa_${digest.slice("sha256:".length)}`;
}

function createSystemActor(): SystemComponentAuditActorV1 {
  const material = systemActorMaterial();
  return Object.freeze({
    actorRefId: deriveActorRefId(material),
    ...material,
  });
}

function createModelActor(
  execution: ModelExecutionIdentityV1,
): ModelExecutionAuditActorV1 {
  const material = modelActorMaterial(execution);
  return Object.freeze({
    actorRefId: deriveActorRefId(material),
    ...material,
  });
}

function canonicalActorMaterial(actor: CandidateAuditActorV1): object {
  if (actor.kind === "SYSTEM_COMPONENT") {
    return {
      kind: actor.kind,
      componentId: actor.componentId,
      contractVersion: actor.contractVersion,
      implementationOrBoundaryDigest: actor.implementationOrBoundaryDigest,
    };
  }
  return {
    kind: actor.kind,
    role: actor.role,
    executionId: actor.executionId,
    identityDigest: actor.identityDigest,
    modelArtifactDigest: actor.modelArtifactDigest,
    executionArtifactDigest: actor.executionArtifactDigest,
    executedAt: actor.executedAt,
  };
}

function plainActor(actor: CandidateAuditActorV1): Record<string, unknown> {
  return { actorRefId: actor.actorRefId, ...canonicalActorMaterial(actor) };
}

function plainStep(step: CandidateAuditStepV1): Record<string, unknown> {
  return {
    stepId: step.stepId,
    kind: step.kind,
    actorRefId: step.actorRefId,
    occurredAt: step.occurredAt,
    evidenceDigest: step.evidenceDigest,
    dependsOnStepIds: [...step.dependsOnStepIds],
    dependencyOutputDigests: [...step.dependencyOutputDigests],
    stepDigest: step.stepDigest,
  };
}

function plainPrelude(prelude: CandidateAuditPreludeV1): Record<string, unknown> {
  return {
    contractVersion: prelude.contractVersion,
    preludeId: prelude.preludeId,
    preludeDigest: prelude.preludeDigest,
    candidateId: prelude.candidateId,
    candidateDigest: prelude.candidateDigest,
    qf0DependencyDigest: prelude.qf0DependencyDigest,
    actors: prelude.actors.map(plainActor),
    steps: prelude.steps.map(plainStep),
    startedAt: prelude.startedAt,
    completedAt: prelude.completedAt,
  };
}

function compareActors(
  left: CandidateAuditActorV1,
  right: CandidateAuditActorV1,
): number {
  if (left.kind !== right.kind) return left.kind === "SYSTEM_COMPONENT" ? -1 : 1;
  return compareStrings(left.actorRefId, right.actorRefId);
}

function orderActors(
  values: readonly CandidateAuditActorV1[],
): CandidateAuditActorV1[] {
  const ordered: CandidateAuditActorV1[] = [];
  for (const actor of values) {
    let index = 0;
    while (index < ordered.length && compareActors(ordered[index], actor) < 0) {
      index += 1;
    }
    ordered.splice(index, 0, actor);
  }
  return ordered;
}

function rightsEvidenceDigest(
  candidate: QuarantinedQuestionCandidateV1,
  phase: "GENERATION" | "MATERIALIZATION",
  occurredAt: string,
): string {
  return qf0a1.digestCanonicalJsonV1({
    domain: "QFS2_RIGHTS_REVALIDATION_EVIDENCE_V1",
    phase,
    candidateId: candidate.candidateId,
    candidateDigest: candidate.candidateDigest,
    sourceDecisionDigest: candidate.sourceDecision.decisionDigest,
    rightsManifestAtUseDigest: candidate.rightsManifestAtUse.manifestDigest,
    policyDigest: candidate.sourceDecision.policyDigest,
    occurredAt,
  });
}

interface StepSeed {
  readonly kind: CandidateAuditStepKindV1;
  readonly actor: CandidateAuditActorV1;
  readonly occurredAt: string;
  readonly evidenceDigest: string;
}

function deriveStepId(
  candidate: QuarantinedQuestionCandidateV1,
  seed: StepSeed,
): string {
  const digest = qf0a1.digestCanonicalJsonV1({
    domain: "QFS2_AUDIT_STEP_ID_V1",
    candidateId: candidate.candidateId,
    candidateDigest: candidate.candidateDigest,
    kind: seed.kind,
    actor: plainActor(seed.actor),
    occurredAt: seed.occurredAt,
    evidenceDigest: seed.evidenceDigest,
  });
  return `qfas_${digest.slice("sha256:".length)}`;
}

function compareStepsForTie(
  left: CandidateAuditStepV1,
  right: CandidateAuditStepV1,
): number {
  if (left.occurredAt !== right.occurredAt) {
    return compareStrings(left.occurredAt, right.occurredAt);
  }
  const phaseDifference = PHASE_RANK[left.kind] - PHASE_RANK[right.kind];
  if (phaseDifference !== 0) return phaseDifference;
  const leftTieDigest = qf0a1.digestCanonicalJsonV1({
    evidenceDigest: left.evidenceDigest,
    actorRefId: left.actorRefId,
  });
  const rightTieDigest = qf0a1.digestCanonicalJsonV1({
    evidenceDigest: right.evidenceDigest,
    actorRefId: right.actorRefId,
  });
  const digestOrder = compareStrings(leftTieDigest, rightTieDigest);
  return digestOrder === 0
    ? compareStrings(left.stepId, right.stepId)
    : digestOrder;
}

function createStep(
  candidate: QuarantinedQuestionCandidateV1,
  seed: StepSeed,
  predecessors: readonly CandidateAuditStepV1[],
): CandidateAuditStepV1 {
  const stepId = deriveStepId(candidate, seed);
  const predecessorById = new Map(
    predecessors.map((predecessor) => [predecessor.stepId, predecessor]),
  );
  if (predecessorById.size !== predecessors.length) {
    fail("STEP_PREDECESSOR_DUPLICATE");
  }
  const dependsOnStepIds = orderStringsUtf8(
    [...predecessorById.keys()],
    "STEP_PREDECESSOR_ID",
  );
  const dependencyOutputDigests = dependsOnStepIds.map(
    (predecessorId) => predecessorById.get(predecessorId)!.stepDigest,
  );
  const stepDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QFS2_AUDIT_STEP_DIGEST_V1",
    candidateId: candidate.candidateId,
    candidateDigest: candidate.candidateDigest,
    stepId,
    kind: seed.kind,
    actor: plainActor(seed.actor),
    occurredAt: seed.occurredAt,
    evidenceDigest: seed.evidenceDigest,
    dependsOnStepIds,
    dependencyOutputDigests,
  });
  return Object.freeze({
    stepId,
    kind: seed.kind,
    actorRefId: seed.actor.actorRefId,
    occurredAt: seed.occurredAt,
    evidenceDigest: seed.evidenceDigest,
    dependsOnStepIds: Object.freeze(dependsOnStepIds),
    dependencyOutputDigests: Object.freeze(dependencyOutputDigests),
    stepDigest,
  });
}

function deterministicStepOrder(
  values: readonly CandidateAuditStepV1[],
): CandidateAuditStepV1[] {
  const byId = new Map(values.map((step) => [step.stepId, step]));
  if (byId.size !== values.length) fail("STEP_ID_DUPLICATE");
  for (const step of values) {
    for (const predecessorId of step.dependsOnStepIds) {
      if (!byId.has(predecessorId)) fail("STEP_DEPENDENCY_MISSING");
    }
  }

  const remaining = new Map(byId);
  const emitted = new Set<string>();
  const ordered: CandidateAuditStepV1[] = [];
  while (remaining.size > 0) {
    const ready: CandidateAuditStepV1[] = [];
    for (const step of remaining.values()) {
      if (step.dependsOnStepIds.every((stepId) => emitted.has(stepId))) {
        ready.push(step);
      }
    }
    if (ready.length === 0) fail("STEP_DEPENDENCY_CYCLE");
    let selected = ready[0];
    for (let index = 1; index < ready.length; index += 1) {
      if (compareStepsForTie(ready[index], selected) < 0) selected = ready[index];
    }
    ordered.push(selected);
    emitted.add(selected.stepId);
    remaining.delete(selected.stepId);
  }
  return ordered;
}

function buildPrelude(
  candidate: QuarantinedQuestionCandidateV1,
): CandidateAuditPreludeV1 {
  const systemActor = createSystemActor();
  const generatorActor = createModelActor(candidate.generatorExecution);
  const independentActors = candidate.independentExecutions.map((execution) =>
    createModelActor(execution),
  );
  const actors = orderActors([
    systemActor,
    generatorActor,
    ...independentActors,
  ]);
  if (actors.length > QFS2_LIMITS.maxActors) fail("ACTOR_LIMIT_EXCEEDED");

  const sourceDecision = createStep(
    candidate,
    {
      kind: "SOURCE_DECISION_BOUND",
      actor: systemActor,
      occurredAt: candidate.sourceDecision.evaluatedAt,
      evidenceDigest: candidate.sourceDecision.decisionDigest,
    },
    [],
  );
  const generationRights = createStep(
    candidate,
    {
      kind: "GENERATION_RIGHTS_REVALIDATED",
      actor: systemActor,
      occurredAt: candidate.generatorExecution.executedAt,
      evidenceDigest: rightsEvidenceDigest(
        candidate,
        "GENERATION",
        candidate.generatorExecution.executedAt,
      ),
    },
    [sourceDecision],
  );
  const generatorExecution = createStep(
    candidate,
    {
      kind: "GENERATOR_EXECUTION_BOUND",
      actor: generatorActor,
      occurredAt: candidate.generatorExecution.executedAt,
      evidenceDigest: candidate.generatorExecution.identityDigest,
    },
    [generationRights],
  );
  const independentSteps = candidate.independentExecutions.map(
    (execution, index) =>
      createStep(
        candidate,
        {
          kind: "INDEPENDENT_EXECUTION_IDENTITY_BOUND",
          actor: independentActors[index],
          occurredAt: execution.executedAt,
          evidenceDigest: execution.identityDigest,
        },
        [generatorExecution],
      ),
  );
  const materializationRights = createStep(
    candidate,
    {
      kind: "MATERIALIZATION_RIGHTS_REVALIDATED",
      actor: systemActor,
      occurredAt: candidate.createdAt,
      evidenceDigest: rightsEvidenceDigest(
        candidate,
        "MATERIALIZATION",
        candidate.createdAt,
      ),
    },
    [sourceDecision, generatorExecution],
  );
  const quarantine = createStep(
    candidate,
    {
      kind: "CANDIDATE_QUARANTINED",
      actor: systemActor,
      occurredAt: candidate.createdAt,
      evidenceDigest: candidate.candidateDigest,
    },
    [materializationRights, generatorExecution, ...independentSteps],
  );
  const steps = deterministicStepOrder([
    sourceDecision,
    generationRights,
    generatorExecution,
    ...independentSteps,
    materializationRights,
    quarantine,
  ]);
  if (steps.length > QFS2_LIMITS.maxSteps) fail("STEP_LIMIT_EXCEEDED");

  let startedAt = steps[0].occurredAt;
  for (const step of steps) {
    if (step.occurredAt < startedAt) startedAt = step.occurredAt;
  }
  const completedAt = candidate.createdAt;
  const preludeMaterial = {
    contractVersion: QFS2_CONTRACT_VERSION,
    candidateId: candidate.candidateId,
    candidateDigest: candidate.candidateDigest,
    qf0DependencyDigest: QF0_DEPENDENCY_DIGEST,
    actors: actors.map(plainActor),
    steps: steps.map(plainStep),
    startedAt,
    completedAt,
  };
  const preludeIdentityDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QFS2_CANDIDATE_AUDIT_PRELUDE_ID_V1",
    material: preludeMaterial,
  });
  const preludeId = `qfap_${preludeIdentityDigest.slice("sha256:".length)}`;
  const preludeDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QFS2_CANDIDATE_AUDIT_PRELUDE_DIGEST_V1",
    preludeId,
    material: preludeMaterial,
  });
  return Object.freeze({
    contractVersion: QFS2_CONTRACT_VERSION,
    preludeId,
    preludeDigest,
    candidateId: candidate.candidateId,
    candidateDigest: candidate.candidateDigest,
    qf0DependencyDigest: QF0_DEPENDENCY_DIGEST,
    actors: Object.freeze(actors),
    steps: Object.freeze(steps),
    startedAt,
    completedAt,
  });
}

function parseActor(value: unknown): CandidateAuditActorV1 {
  const kind = readClosedString(
    readDiscriminator(value, "ACTOR"),
    ACTOR_KINDS,
    "ACTOR_KIND",
  );
  if (kind === "SYSTEM_COMPONENT") {
    const record = readClosedRecord(value, SYSTEM_ACTOR_FIELDS, "SYSTEM_ACTOR");
    const material = {
      kind,
      componentId: readClosedString(
        record.componentId,
        ["QF_S2_CANDIDATE_AUDIT_PRELUDE"] as const,
        "SYSTEM_COMPONENT_ID",
      ),
      contractVersion: readClosedString(
        record.contractVersion,
        [QFS2_CONTRACT_VERSION] as const,
        "SYSTEM_CONTRACT_VERSION",
      ),
      implementationOrBoundaryDigest: readDigest(
        record.implementationOrBoundaryDigest,
        "SYSTEM_IMPLEMENTATION_OR_BOUNDARY_DIGEST",
      ),
    };
    const actorRefId = readPattern(
      record.actorRefId,
      ACTOR_REF_ID_PATTERN,
      "SYSTEM_ACTOR_REF_ID",
    );
    const expected = createSystemActor();
    if (
      actorRefId !== deriveActorRefId(material) ||
      !canonicalEqual({ actorRefId, ...material }, expected)
    ) {
      fail("SYSTEM_ACTOR_IDENTITY_DRIFT");
    }
    return expected;
  }

  const record = readClosedRecord(value, MODEL_ACTOR_FIELDS, "MODEL_ACTOR");
  const material: Omit<ModelExecutionAuditActorV1, "actorRefId"> = {
    kind,
    role: readClosedString(
      record.role,
      qf0a2Contracts.QF0A2_MODEL_ROLES,
      "MODEL_ACTOR_ROLE",
    ),
    executionId: readPattern(
      record.executionId,
      EXECUTION_ID_PATTERN,
      "MODEL_ACTOR_EXECUTION_ID",
    ),
    identityDigest: readDigest(record.identityDigest, "MODEL_ACTOR_IDENTITY_DIGEST"),
    modelArtifactDigest: readDigest(
      record.modelArtifactDigest,
      "MODEL_ACTOR_MODEL_ARTIFACT_DIGEST",
    ),
    executionArtifactDigest: readDigest(
      record.executionArtifactDigest,
      "MODEL_ACTOR_EXECUTION_ARTIFACT_DIGEST",
    ),
    executedAt: readCanonicalUtc(record.executedAt, "MODEL_ACTOR_EXECUTED_AT"),
  };
  const actorRefId = readPattern(
    record.actorRefId,
    ACTOR_REF_ID_PATTERN,
    "MODEL_ACTOR_REF_ID",
  );
  if (actorRefId !== deriveActorRefId(material)) {
    fail("MODEL_ACTOR_IDENTITY_DRIFT");
  }
  return Object.freeze({ actorRefId, ...material });
}

function parseStep(value: unknown): CandidateAuditStepV1 {
  const record = readClosedRecord(value, STEP_FIELDS, "STEP");
  const dependsOnStepIds = readStringArray(
    record.dependsOnStepIds,
    0,
    QFS2_LIMITS.maxSteps - 1,
    "STEP_DEPENDENCIES",
  );
  const dependencyOutputDigests = readStringArray(
    record.dependencyOutputDigests,
    0,
    QFS2_LIMITS.maxSteps - 1,
    "STEP_DEPENDENCY_OUTPUT_DIGESTS",
  ).map((digest) => readDigest(digest, "STEP_DEPENDENCY_OUTPUT_DIGEST"));
  if (dependsOnStepIds.length !== dependencyOutputDigests.length) {
    fail("STEP_DEPENDENCY_OUTPUT_CARDINALITY_MISMATCH");
  }
  const orderedDependencyIds = orderStringsUtf8(
    dependsOnStepIds,
    "STEP_DEPENDENCY_ID",
  );
  if (!canonicalEqual(dependsOnStepIds, orderedDependencyIds)) {
    fail("STEP_DEPENDENCIES_NOT_UTF8_ORDERED");
  }
  return Object.freeze({
    stepId: readPattern(record.stepId, STEP_ID_PATTERN, "STEP_ID"),
    kind: readClosedString(record.kind, STEP_KINDS, "STEP_KIND"),
    actorRefId: readPattern(
      record.actorRefId,
      ACTOR_REF_ID_PATTERN,
      "STEP_ACTOR_REF_ID",
    ),
    occurredAt: readCanonicalUtc(record.occurredAt, "STEP_OCCURRED_AT"),
    evidenceDigest: readDigest(record.evidenceDigest, "STEP_EVIDENCE_DIGEST"),
    dependsOnStepIds: Object.freeze(dependsOnStepIds),
    dependencyOutputDigests: Object.freeze(dependencyOutputDigests),
    stepDigest: readDigest(record.stepDigest, "STEP_DIGEST"),
  });
}

function sameStringSet(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return canonicalEqual(
    orderStringsUtf8(actual, "ACTUAL_DEPENDENCY"),
    orderStringsUtf8(expected, "EXPECTED_DEPENDENCY"),
  );
}

function oneStepOfKind(
  steps: readonly CandidateAuditStepV1[],
  kind: CandidateAuditStepKindV1,
): CandidateAuditStepV1 {
  const matches = steps.filter((step) => step.kind === kind);
  if (matches.length !== 1) fail(`${kind}_CARDINALITY_INVALID`);
  return matches[0];
}

function validateClosedGraph(
  actors: readonly CandidateAuditActorV1[],
  steps: readonly CandidateAuditStepV1[],
  startedAt: string,
  completedAt: string,
  candidateId: string,
  candidateDigest: string,
): void {
  const actorById = new Map<string, CandidateAuditActorV1>();
  const executionIds = new Set<string>();
  const identityDigests = new Set<string>();
  for (const actor of actors) {
    if (actorById.has(actor.actorRefId)) fail("ACTOR_REF_ID_DUPLICATE");
    actorById.set(actor.actorRefId, actor);
    if (actor.kind === "MODEL_EXECUTION") {
      if (executionIds.has(actor.executionId)) fail("MODEL_EXECUTION_ID_DUPLICATE");
      if (identityDigests.has(actor.identityDigest)) fail("MODEL_IDENTITY_DUPLICATE");
      executionIds.add(actor.executionId);
      identityDigests.add(actor.identityDigest);
    }
  }
  const systemActors = actors.filter((actor) => actor.kind === "SYSTEM_COMPONENT");
  if (systemActors.length !== 1) fail("SYSTEM_ACTOR_CARDINALITY_INVALID");
  const systemActor = systemActors[0];

  const stepById = new Map<string, CandidateAuditStepV1>();
  for (const step of steps) {
    if (stepById.has(step.stepId)) fail("STEP_ID_DUPLICATE");
    stepById.set(step.stepId, step);
    if (!actorById.has(step.actorRefId)) fail("STEP_ACTOR_MISSING");
  }
  deterministicStepOrder(steps);

  for (const step of steps) {
    const actor = actorById.get(step.actorRefId)!;
    const expectedStepId = deriveStepId(
      { candidateId, candidateDigest } as QuarantinedQuestionCandidateV1,
      {
        kind: step.kind,
        actor,
        occurredAt: step.occurredAt,
        evidenceDigest: step.evidenceDigest,
      },
    );
    if (step.stepId !== expectedStepId) fail("STEP_ID_DERIVATION_MISMATCH");
    for (let index = 0; index < step.dependsOnStepIds.length; index += 1) {
      const predecessor = stepById.get(step.dependsOnStepIds[index]);
      if (predecessor === undefined) fail("STEP_DEPENDENCY_MISSING");
      if (step.dependencyOutputDigests[index] !== predecessor.stepDigest) {
        fail("STEP_DEPENDENCY_OUTPUT_DIGEST_MISMATCH");
      }
      if (predecessor.occurredAt > step.occurredAt) {
        fail("CAUSAL_PREDECESSOR_AFTER_CHILD");
      }
    }
    const expectedStepDigest = qf0a1.digestCanonicalJsonV1({
      domain: "QFS2_AUDIT_STEP_DIGEST_V1",
      candidateId,
      candidateDigest,
      stepId: step.stepId,
      kind: step.kind,
      actor: plainActor(actor),
      occurredAt: step.occurredAt,
      evidenceDigest: step.evidenceDigest,
      dependsOnStepIds: [...step.dependsOnStepIds],
      dependencyOutputDigests: [...step.dependencyOutputDigests],
    });
    if (step.stepDigest !== expectedStepDigest) {
      fail("STEP_DIGEST_DERIVATION_MISMATCH");
    }
    if (step.occurredAt < startedAt) fail("STEP_BEFORE_PRELUDE_START");
    if (step.occurredAt > completedAt) fail("STEP_AFTER_PRELUDE_COMPLETION");
  }

  const source = oneStepOfKind(steps, "SOURCE_DECISION_BOUND");
  const generationRights = oneStepOfKind(
    steps,
    "GENERATION_RIGHTS_REVALIDATED",
  );
  const generator = oneStepOfKind(steps, "GENERATOR_EXECUTION_BOUND");
  const materialization = oneStepOfKind(
    steps,
    "MATERIALIZATION_RIGHTS_REVALIDATED",
  );
  const quarantine = oneStepOfKind(steps, "CANDIDATE_QUARANTINED");
  const independent = steps.filter(
    (step) => step.kind === "INDEPENDENT_EXECUTION_IDENTITY_BOUND",
  );
  if (independent.length > QFS2_LIMITS.maxIndependentExecutions) {
    fail("INDEPENDENT_EXECUTION_LIMIT_EXCEEDED");
  }
  for (const step of [source, generationRights, materialization, quarantine]) {
    if (step.actorRefId !== systemActor.actorRefId) {
      fail("SYSTEM_STEP_ACTOR_INVALID");
    }
  }
  const generatorActor = actorById.get(generator.actorRefId)!;
  if (generatorActor.kind !== "MODEL_EXECUTION" || generatorActor.role !== "GENERATOR") {
    fail("GENERATOR_STEP_ACTOR_INVALID");
  }
  const independentActorIds = new Set<string>();
  for (const step of independent) {
    const actor = actorById.get(step.actorRefId)!;
    if (actor.kind !== "MODEL_EXECUTION" || actor.role === "GENERATOR") {
      fail("INDEPENDENT_STEP_ACTOR_INVALID");
    }
    if (independentActorIds.has(actor.actorRefId)) {
      fail("INDEPENDENT_ACTOR_REUSED");
    }
    independentActorIds.add(actor.actorRefId);
  }
  if (
    actors.length !== independent.length + 2 ||
    actors.some(
      (actor) =>
        actor.kind === "MODEL_EXECUTION" &&
        actor.actorRefId !== generator.actorRefId &&
        !independentActorIds.has(actor.actorRefId),
    )
  ) {
    fail("ACTOR_GRAPH_CARDINALITY_INVALID");
  }

  if (!sameStringSet(source.dependsOnStepIds, [])) {
    fail("SOURCE_DECISION_DEPENDENCIES_INVALID");
  }
  if (!sameStringSet(generationRights.dependsOnStepIds, [source.stepId])) {
    fail("GENERATION_RIGHTS_DEPENDENCIES_INVALID");
  }
  if (!sameStringSet(generator.dependsOnStepIds, [generationRights.stepId])) {
    fail("GENERATOR_DEPENDENCIES_INVALID");
  }
  for (const step of independent) {
    if (!sameStringSet(step.dependsOnStepIds, [generator.stepId])) {
      fail("INDEPENDENT_DEPENDENCIES_INVALID");
    }
  }
  if (
    !sameStringSet(materialization.dependsOnStepIds, [
      source.stepId,
      generator.stepId,
    ])
  ) {
    fail("MATERIALIZATION_DEPENDENCIES_INVALID");
  }
  if (
    !sameStringSet(quarantine.dependsOnStepIds, [
      materialization.stepId,
      generator.stepId,
      ...independent.map((step) => step.stepId),
    ])
  ) {
    fail("QUARANTINE_DEPENDENCIES_INVALID");
  }
  if (materialization.occurredAt !== completedAt || quarantine.occurredAt !== completedAt) {
    fail("COMPLETION_EVIDENCE_TIME_MISMATCH");
  }
  let earliest = steps[0].occurredAt;
  for (const step of steps) if (step.occurredAt < earliest) earliest = step.occurredAt;
  if (startedAt !== earliest) fail("STARTED_AT_NOT_EARLIEST_EVIDENCE");

  const deterministic = deterministicStepOrder(steps);
  for (let index = 0; index < steps.length; index += 1) {
    if (steps[index].stepId !== deterministic[index].stepId) {
      fail("STEP_ORDER_NONDETERMINISTIC");
    }
  }
  const orderedActors = orderActors(actors);
  for (let index = 0; index < actors.length; index += 1) {
    if (actors[index].actorRefId !== orderedActors[index].actorRefId) {
      fail("ACTOR_ORDER_NONDETERMINISTIC");
    }
  }
}

function parsePrelude(value: unknown): CandidateAuditPreludeV1 {
  const record = readClosedRecord(value, PRELUDE_FIELDS, "PRELUDE");
  if (record.contractVersion !== QFS2_CONTRACT_VERSION) {
    fail("PRELUDE_CONTRACT_VERSION_INVALID");
  }
  const preludeId = readPattern(record.preludeId, PRELUDE_ID_PATTERN, "PRELUDE_ID");
  const preludeDigest = readDigest(record.preludeDigest, "PRELUDE_DIGEST");
  const candidateId = readPattern(
    record.candidateId,
    CANDIDATE_ID_PATTERN,
    "CANDIDATE_ID",
  );
  const candidateDigest = readDigest(record.candidateDigest, "CANDIDATE_DIGEST");
  const qf0DependencyDigest = readDigest(
    record.qf0DependencyDigest,
    "QF0_DEPENDENCY_DIGEST",
  );
  if (qf0DependencyDigest !== QF0_DEPENDENCY_DIGEST) {
    fail("QF0_DEPENDENCY_DIGEST_MISMATCH");
  }
  const actors = readDenseArray(
    record.actors,
    2,
    QFS2_LIMITS.maxActors,
    "ACTORS",
  ).map(parseActor);
  const steps = readDenseArray(
    record.steps,
    5,
    QFS2_LIMITS.maxSteps,
    "STEPS",
  ).map(parseStep);
  const startedAt = readCanonicalUtc(record.startedAt, "PRELUDE_STARTED_AT");
  const completedAt = readCanonicalUtc(record.completedAt, "PRELUDE_COMPLETED_AT");
  if (startedAt > completedAt) fail("PRELUDE_INTERVAL_REVERSED");
  validateClosedGraph(
    actors,
    steps,
    startedAt,
    completedAt,
    candidateId,
    candidateDigest,
  );
  const material = {
    contractVersion: QFS2_CONTRACT_VERSION,
    candidateId,
    candidateDigest,
    qf0DependencyDigest,
    actors: actors.map(plainActor),
    steps: steps.map(plainStep),
    startedAt,
    completedAt,
  };
  const expectedIdentityDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QFS2_CANDIDATE_AUDIT_PRELUDE_ID_V1",
    material,
  });
  const expectedPreludeId = `qfap_${expectedIdentityDigest.slice("sha256:".length)}`;
  if (preludeId !== expectedPreludeId) fail("PRELUDE_ID_DERIVATION_MISMATCH");
  const expectedPreludeDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QFS2_CANDIDATE_AUDIT_PRELUDE_DIGEST_V1",
    preludeId,
    material,
  });
  if (preludeDigest !== expectedPreludeDigest) {
    fail("PRELUDE_DIGEST_DERIVATION_MISMATCH");
  }
  return Object.freeze({
    contractVersion: QFS2_CONTRACT_VERSION,
    preludeId,
    preludeDigest,
    candidateId,
    candidateDigest,
    qf0DependencyDigest,
    actors: Object.freeze(actors),
    steps: Object.freeze(steps),
    startedAt,
    completedAt,
  });
}

export function createCandidateAuditPreludeV1(value: unknown): CandidateAuditPreludeV1 {
  assertDependenciesV1();
  const candidate = qf0iCore.assertQuarantinedQuestionCandidateV1(value);
  return buildPrelude(candidate);
}

export function assertCandidateAuditPreludeV1(
  value: unknown,
  candidateValue: unknown,
): CandidateAuditPreludeV1 {
  assertDependenciesV1();
  const parsed = parsePrelude(value);
  const candidate = qf0iCore.assertQuarantinedQuestionCandidateV1(candidateValue);
  const expected = buildPrelude(candidate);
  if (!canonicalEqual(plainPrelude(parsed), plainPrelude(expected))) {
    fail("PRELUDE_CANDIDATE_BINDING_MISMATCH");
  }
  return expected;
}
