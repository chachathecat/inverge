import { types as utilTypes } from "node:util";

import * as qf0a1 from "../quarantine/bounded-canonical-json";
import * as qf0a2Contracts from "../quarantine/trust-contracts";
import * as qf0a2Core from "../quarantine/trust-core";
import * as qf0bContracts from "../quarantine/scarcity-contracts";
import * as qf0bCore from "../quarantine/scarcity-core";
import * as qf0iContracts from "../quarantine/candidate-contracts";
import * as qf0iCore from "../quarantine/candidate-core";
import * as qfs1Contracts from "../similarity/similarity-contracts";
import * as qfs1Core from "../similarity/similarity-firewall";
import * as qfs2Contracts from "../audit/prelude-contracts";
import * as qfs2Core from "../audit/prelude-core";
import {
  QFS3_BLOCKING_REASONS,
  QFS3_COMPLETENESS_STATES,
  QFS3_CONTRACT_VERSION,
  QFS3_LIMITS,
  QFS3_RECEIPT_KINDS,
  QFS3_SOURCE_ONLY_BOUNDARY_RECEIPT,
  type DependencyRankedTransferChronologyInputV1,
  type DependencyRankedTransferChronologyV1,
  type DependencyRankedTransferReceiptV1,
  type ModelExecutionChronologyActorV1,
  type QFS3BlockingReason,
  type QFS3Completeness,
  type QFS3ReceiptKind,
  type SystemComponentChronologyActorV1,
  type TransferChronologyActorInputV1,
  type TransferChronologyActorV1,
  type TransferChronologyReceiptInputV1,
  type TransferVariantRequirementV1,
} from "./chronology-contracts";

const INPUT_FIELDS = Object.freeze([
  "contractVersion",
  "candidate",
  "qfS1Review",
  "qfS1AuthorityInput",
  "qfS2Prelude",
  "variants",
  "receipts",
] as const);
const VARIANT_FIELDS = Object.freeze([
  "variantId",
  "variantDigest",
  "declaredValidatorProfileRefs",
] as const);
const RECEIPT_INPUT_FIELDS = Object.freeze([
  "inputReceiptId",
  "kind",
  "variantId",
  "variantDigest",
  "artifactId",
  "artifactDigest",
  "actor",
  "occurredAt",
  "predecessorInputReceiptIds",
  "predecessorOutputDigests",
  "declaredValidatorProfileRef",
  "outputDigest",
] as const);
const SYSTEM_ACTOR_INPUT_FIELDS = Object.freeze([
  "actorKind",
  "componentId",
  "componentVersion",
  "componentArtifactDigest",
] as const);
const MODEL_ACTOR_INPUT_FIELDS = Object.freeze([
  "actorKind",
  "modelExecution",
] as const);
const CHRONOLOGY_FIELDS = Object.freeze([
  "contractVersion",
  "chronologyId",
  "chronologyDigest",
  "candidateId",
  "candidateDigest",
  "qfS1ReviewDigest",
  "qfS2PreludeDigest",
  "variantRequirementsDigest",
  "actors",
  "receipts",
  "startedAt",
  "completedAt",
  "completeness",
  "blockingReasons",
] as const);
const SYSTEM_ACTOR_FIELDS = Object.freeze([
  "actorRefId",
  "actorKind",
  "componentId",
  "componentVersion",
  "componentArtifactDigest",
] as const);
const MODEL_ACTOR_FIELDS = Object.freeze([
  "actorRefId",
  "actorKind",
  "role",
  "executionId",
  "identityDigest",
  "modelArtifactDigest",
  "executionArtifactDigest",
  "executedAt",
] as const);
const RECEIPT_FIELDS = Object.freeze([
  "contractVersion",
  "receiptId",
  "receiptDigest",
  "kind",
  "candidateId",
  "candidateDigest",
  "variantId",
  "variantDigest",
  "artifactId",
  "artifactDigest",
  "actorRefId",
  "occurredAt",
  "predecessorReceiptIds",
  "predecessorOutputDigests",
  "declaredValidatorProfileRef",
  "outputDigest",
] as const);

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const CANDIDATE_ID_PATTERN = /^qfc_[a-f0-9]{64}$/u;
const VARIANT_ID_PATTERN = /^qfv_[a-f0-9]{64}$/u;
const ARTIFACT_ID_PATTERN = /^qfta_[a-f0-9]{64}$/u;
const INPUT_RECEIPT_ID_PATTERN = /^qfri_[a-f0-9]{32}$/u;
const RECEIPT_ID_PATTERN = /^qftr_[a-f0-9]{64}$/u;
const ACTOR_REF_ID_PATTERN = /^qfca_[a-f0-9]{64}$/u;
const CHRONOLOGY_ID_PATTERN = /^qftc_[a-f0-9]{64}$/u;
const COMPONENT_ID_PATTERN = /^qfsc_[a-f0-9]{32}$/u;
const MACHINE_VERSION_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/u;
const CANONICAL_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

const PHASE_RANK: Readonly<Record<QFS3ReceiptKind, number>> = Object.freeze({
  CANDIDATE_PRELUDE_BOUND: 0,
  SIMILARITY_REVIEW_BOUND: 1,
  TRANSFER_VARIANT_SEALED: 2,
  DECLARED_VALIDATOR_COMPLETED: 3,
  BLIND_SOLVER_COMPLETED: 4,
  JUDGE_COMPLETED: 5,
  ADVERSARIAL_CRITIC_COMPLETED: 6,
  VARIANT_VALIDATION_AGGREGATED: 7,
  TRANSFER_EVIDENCE_AGGREGATED: 8,
  META_AUDIT_COMPLETED: 9,
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
const QF0A2_CONTRACT_EXPORTS = Object.freeze([
  "QF0A2_CONTRACT_VERSION",
  "QF0A2_DECISION_OUTCOMES",
  "QF0A2_DECISION_STATUSES",
  "QF0A2_DENIAL_REASONS",
  "QF0A2_ELIGIBLE_SOURCE_CLASSES",
  "QF0A2_MODEL_ROLES",
  "QF0A2_PURPOSE",
  "QF0A2_QF0A1_DEPENDENCY_RECEIPT",
  "QF0A2_RIGHTS_STATUSES",
  "QF0A2_SOURCE_CLASSES",
  "QF0A2_SOURCE_ONLY_BOUNDARY_RECEIPT",
] as const);
const QF0A2_CORE_EXPORTS = Object.freeze([
  "QF0A2_CONTRACT_VERSION",
  "assertDistinctModelExecutionIdentitiesV1",
  "assertModelExecutionIdentityV1",
  "assertQf0a1DependencyV1",
  "assertRightsManifestRefV1",
  "assertSourceEligibilityAtUseV1",
  "assertSourceEligibilityDecisionV1",
  "createModelExecutionIdentityV1",
  "createRightsManifestRefV1",
  "createSourceEligibilityDecisionV1",
] as const);
const QF0B_CONTRACT_EXPORTS = Object.freeze([
  "QF0B_CONTRACT_VERSION",
  "QF0B_LIMITS",
  "QF0B_REGISTRY_REF_KINDS",
  "QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT",
] as const);
const QF0B_CORE_EXPORTS = Object.freeze([
  "assertBodylessBankScarcityEventV1",
  "assertOpaqueRegistryRefV1",
  "createBodylessBankScarcityEventV1",
  "createOpaqueRegistryRefV1",
] as const);
const QFS1_CONTRACT_EXPORTS = Object.freeze([
  "QFS1_CONTRACT_VERSION",
  "QFS1_LIMITS",
  "QFS1_MATCH_KINDS",
  "QFS1_OUTCOMES",
  "QFS1_POLICY_DIGEST",
  "QFS1_POLICY_REFERENCE",
  "QFS1_QFS1A_DEPENDENCY_RECEIPT",
  "QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT",
  "QFS1_TRANSFORMATIONS",
] as const);
const QFS1_CORE_EXPORTS = Object.freeze([
  "assertSimilarityFirewallReviewV1",
  "createSimilarityFirewallReviewV1",
] as const);
const QFS2_CONTRACT_EXPORTS = Object.freeze([
  "QFS2_CONTRACT_VERSION",
  "QFS2_LIMITS",
  "QFS2_SOURCE_ONLY_BOUNDARY_RECEIPT",
] as const);
const QFS2_CORE_EXPORTS = Object.freeze([
  "assertCandidateAuditPreludeV1",
  "createCandidateAuditPreludeV1",
] as const);

const DEPENDENCIES = Object.freeze({
  qf0: Object.freeze({
    aggregateConfigSha256:
      "34722851960a8818876a95ce189d8074727337efed0d9d8040f034a119935993",
    sixPathIdentity:
      "sha256:4452ad1a5e28bcba5409081a366e1d615db46bb20bc9bfae1c9381e49ea038aa",
    sourceOnlyBoundaryReceiptDigest:
      "sha256:0062eb9c6987ddda8bc7ade7f94f61b555483b4c508397663b5069ead9798cb7",
  }),
  qf0a2: Object.freeze({
    sourceOnlyBoundaryReceiptDigest:
      "sha256:09ed5b0f3385cef65ec674af5e3b047df81df5ae53a6e17c023eb8be05a25f97",
  }),
  qf0b: Object.freeze({
    sourceOnlyBoundaryReceiptDigest:
      "sha256:397d051c5bd1fc158f0444563c402b8e792e414c88a3f6df44717caaae1ee9f8",
  }),
  qfS1: Object.freeze({
    configSha256:
      "b099a10a7b1381191e5431495315e948856fa8f5f03cd990a38db6f997cbbaf3",
    policyDigest:
      "sha256:e1f7397e3ed56b2d3095aed3daf9f64738a656ec7e9a74bd9f12c45b7f5416d9",
    sixPathIdentity:
      "sha256:e89f7e0dc2c1c95ce0997b97c9949e4d81629c91b1a9380b96b720093cfa2417",
    sourceOnlyBoundaryReceiptDigest:
      "sha256:d827b128218a8a8671de93ad1cd7d5485285c6729274cabd077432d3ba476c1e",
  }),
  qfS2: Object.freeze({
    configSha256:
      "b4861ada014ad37f4af78fb416c2cd2533774d89abec41fc70931ff19d63d31a",
    sixPathIdentity:
      "sha256:73f97341d31b7935bb7eb296cfab5bf1b2f9cdfe28849efefee06f7f98c12974",
    sourceOnlyBoundaryReceiptDigest:
      "sha256:7b97a2156f1243954929c7d750b881922840c39cc63a639b78903020f5f8c7e9",
  }),
});

function fail(code: string): never {
  throw new Error(`QFS3_FAIL_CLOSED:${code}`);
}

function readClosedRecord<T extends readonly string[]>(
  value: unknown,
  fields: T,
  label: string,
): Record<T[number], unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    utilTypes.isProxy(value)
  ) {
    fail(`${label}_PLAIN_RECORD_REQUIRED`);
  }
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
  if (keys.some((key) => typeof key === "symbol")) {
    fail(`${label}_SYMBOL_FORBIDDEN`);
  }
  if (
    keys.length !== fields.length ||
    keys.some((key) => !fields.includes(key as T[number])) ||
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
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      descriptor.enumerable !== true
    ) {
      fail(`${label}_DATA_FIELD_REQUIRED`);
    }
    snapshot[field] = descriptor.value;
  }
  return snapshot as Record<T[number], unknown>;
}

function readDenseArray(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): readonly unknown[] {
  if (value === null || typeof value !== "object" || utilTypes.isProxy(value)) {
    fail(`${label}_DENSE_ARRAY_REQUIRED`);
  }
  if (!Array.isArray(value)) fail(`${label}_DENSE_ARRAY_REQUIRED`);
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
  if (
    prototype !== Array.prototype ||
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
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      descriptor.enumerable !== true
    ) {
      fail(`${label}_DATA_ELEMENT_REQUIRED`);
    }
    output.push(descriptor.value);
  }
  return output;
}

function readPattern(value: unknown, pattern: RegExp, label: string): string {
  if (typeof value !== "string" || !pattern.test(value)) fail(`${label}_INVALID`);
  return value;
}

function readDigest(value: unknown, label: string): string {
  return readPattern(value, DIGEST_PATTERN, label);
}

function readNullablePattern(
  value: unknown,
  pattern: RegExp,
  label: string,
): string | null {
  return value === null ? null : readPattern(value, pattern, label);
}

function readCanonicalUtc(value: unknown, label: string): string {
  const timestamp = readPattern(value, CANONICAL_UTC_PATTERN, label);
  const milliseconds = Date.parse(timestamp);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== timestamp
  ) {
    fail(`${label}_NONCANONICAL`);
  }
  return timestamp;
}

function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(`${label}_INVALID`);
  }
  return value as T;
}

function readStringArray(
  value: unknown,
  minimum: number,
  maximum: number,
  pattern: RegExp,
  label: string,
): readonly string[] {
  return Object.freeze(
    readDenseArray(value, minimum, maximum, label).map((entry) =>
      readPattern(entry, pattern, `${label}_ELEMENT`),
    ),
  );
}

function sameCanonical(left: unknown, right: unknown): boolean {
  return (
    qf0a1.canonicalizeBoundedJsonV1(plain(left)) ===
    qf0a1.canonicalizeBoundedJsonV1(plain(right))
  );
}

function orderByUtf8<T>(values: readonly T[], key: (value: T) => string): T[] {
  const ordered: T[] = [];
  for (const value of values) {
    let index = 0;
    while (
      index < ordered.length &&
      qf0a1.compareUtf8BytesV1(key(ordered[index]), key(value)) < 0
    ) {
      index += 1;
    }
    ordered.splice(index, 0, value);
  }
  return ordered;
}

function assertUniqueStrings(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) fail(`${label}_DUPLICATE`);
}

function assertExactExports(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  if (
    !sameCanonical(
      orderByUtf8(actual, (value) => value),
      orderByUtf8(expected, (value) => value),
    )
  ) {
    fail(`${label}_EXPORT_SURFACE_DRIFT`);
  }
}

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertDependenciesV1(): void {
  assertExactExports(Object.keys(qf0a1), QF0A1_EXPORTS, "QF0A1");
  assertExactExports(Object.keys(qf0iContracts), QF0I_CONTRACT_EXPORTS, "QF0I_CONTRACTS");
  assertExactExports(Object.keys(qf0iCore), QF0I_CORE_EXPORTS, "QF0I_CORE");
  assertExactExports(Object.keys(qf0a2Contracts), QF0A2_CONTRACT_EXPORTS, "QF0A2_CONTRACTS");
  assertExactExports(Object.keys(qf0a2Core), QF0A2_CORE_EXPORTS, "QF0A2_CORE");
  assertExactExports(Object.keys(qf0bContracts), QF0B_CONTRACT_EXPORTS, "QF0B_CONTRACTS");
  assertExactExports(Object.keys(qf0bCore), QF0B_CORE_EXPORTS, "QF0B_CORE");
  assertExactExports(Object.keys(qfs1Contracts), QFS1_CONTRACT_EXPORTS, "QFS1_CONTRACTS");
  assertExactExports(Object.keys(qfs1Core), QFS1_CORE_EXPORTS, "QFS1_CORE");
  assertExactExports(Object.keys(qfs2Contracts), QFS2_CONTRACT_EXPORTS, "QFS2_CONTRACTS");
  assertExactExports(Object.keys(qfs2Core), QFS2_CORE_EXPORTS, "QFS2_CORE");
  if (
    qf0a1.digestCanonicalJsonV1(plain(qf0iContracts.QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT)) !==
      DEPENDENCIES.qf0.sourceOnlyBoundaryReceiptDigest ||
    qf0a1.digestCanonicalJsonV1(plain(qf0a2Contracts.QF0A2_SOURCE_ONLY_BOUNDARY_RECEIPT)) !==
      DEPENDENCIES.qf0a2.sourceOnlyBoundaryReceiptDigest ||
    qf0a1.digestCanonicalJsonV1(plain(qf0bContracts.QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT)) !==
      DEPENDENCIES.qf0b.sourceOnlyBoundaryReceiptDigest ||
    qf0a1.digestCanonicalJsonV1(plain(qfs1Contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT)) !==
      DEPENDENCIES.qfS1.sourceOnlyBoundaryReceiptDigest ||
    qf0a1.digestCanonicalJsonV1(plain(qfs2Contracts.QFS2_SOURCE_ONLY_BOUNDARY_RECEIPT)) !==
      DEPENDENCIES.qfS2.sourceOnlyBoundaryReceiptDigest ||
    qfs1Contracts.QFS1_POLICY_DIGEST !== DEPENDENCIES.qfS1.policyDigest
  ) {
    fail("DEPENDENCY_IDENTITY_DRIFT");
  }
}

function readActorInput(value: unknown, label: string): TransferChronologyActorInputV1 {
  if (value === null || typeof value !== "object" || utilTypes.isProxy(value)) {
    fail(`${label}_PLAIN_RECORD_REQUIRED`);
  }
  const actorKindDescriptor = Object.getOwnPropertyDescriptor(value, "actorKind");
  if (
    actorKindDescriptor === undefined ||
    !("value" in actorKindDescriptor) ||
    actorKindDescriptor.enumerable !== true
  ) {
    fail(`${label}_KIND_DATA_FIELD_REQUIRED`);
  }
  if (actorKindDescriptor.value === "SYSTEM_COMPONENT") {
    const record = readClosedRecord(value, SYSTEM_ACTOR_INPUT_FIELDS, label);
    return Object.freeze({
      actorKind: "SYSTEM_COMPONENT",
      componentId: readPattern(record.componentId, COMPONENT_ID_PATTERN, `${label}_COMPONENT_ID`),
      componentVersion: readPattern(
        record.componentVersion,
        MACHINE_VERSION_PATTERN,
        `${label}_COMPONENT_VERSION`,
      ),
      componentArtifactDigest: readDigest(
        record.componentArtifactDigest,
        `${label}_COMPONENT_ARTIFACT_DIGEST`,
      ),
    });
  }
  if (actorKindDescriptor.value === "MODEL_EXECUTION") {
    const record = readClosedRecord(value, MODEL_ACTOR_INPUT_FIELDS, label);
    return Object.freeze({
      actorKind: "MODEL_EXECUTION",
      modelExecution: qf0a2Core.assertModelExecutionIdentityV1(record.modelExecution),
    });
  }
  fail(`${label}_KIND_INVALID`);
}

function actorMaterial(
  input: TransferChronologyActorInputV1,
):
  | Omit<SystemComponentChronologyActorV1, "actorRefId">
  | Omit<ModelExecutionChronologyActorV1, "actorRefId"> {
  if (input.actorKind === "SYSTEM_COMPONENT") {
    return {
      actorKind: input.actorKind,
      componentId: input.componentId,
      componentVersion: input.componentVersion,
      componentArtifactDigest: input.componentArtifactDigest,
    };
  }
  const execution = input.modelExecution;
  return {
    actorKind: input.actorKind,
    role: execution.role,
    executionId: execution.executionId,
    identityDigest: execution.identityDigest,
    modelArtifactDigest: execution.modelArtifactDigest,
    executionArtifactDigest: execution.executionArtifactDigest,
    executedAt: execution.executedAt,
  };
}

function makeActor(input: TransferChronologyActorInputV1): TransferChronologyActorV1 {
  const material = actorMaterial(input);
  const digest = qf0a1.digestCanonicalJsonV1({
    domain: "QFS3_CHRONOLOGY_ACTOR_REFERENCE_V1",
    material,
  });
  return Object.freeze({
    actorRefId: `qfca_${digest.slice("sha256:".length)}`,
    ...material,
  } as TransferChronologyActorV1);
}

function makeGeneratorActor(
  candidate: ReturnType<typeof qf0iCore.assertQuarantinedQuestionCandidateV1>,
): ModelExecutionChronologyActorV1 {
  return makeActor({
    actorKind: "MODEL_EXECUTION",
    modelExecution: candidate.generatorExecution,
  }) as ModelExecutionChronologyActorV1;
}

function readVariant(value: unknown, index: number): TransferVariantRequirementV1 {
  const label = `VARIANT_${index}`;
  const record = readClosedRecord(value, VARIANT_FIELDS, label);
  const refs = readDenseArray(
    record.declaredValidatorProfileRefs,
    1,
    QFS3_LIMITS.maxDeclaredValidatorsPerVariant,
    `${label}_VALIDATOR_REFS`,
  ).map((ref) => qf0bCore.assertOpaqueRegistryRefV1(ref));
  for (const ref of refs) {
    if (ref.refKind !== "VALIDATOR_PROFILE") fail(`${label}_VALIDATOR_REF_KIND_INVALID`);
  }
  assertUniqueStrings(refs.map((ref) => ref.refDigest), `${label}_VALIDATOR_REF_DIGEST`);
  assertUniqueStrings(
    refs.map((ref) => `${ref.registryId}/${ref.objectId}/${ref.version}`),
    `${label}_VALIDATOR_REF_IDENTITY`,
  );
  return Object.freeze({
    variantId: readPattern(record.variantId, VARIANT_ID_PATTERN, `${label}_ID`),
    variantDigest: readDigest(record.variantDigest, `${label}_DIGEST`),
    declaredValidatorProfileRefs: Object.freeze(
      orderByUtf8(refs, (ref) => `${ref.refDigest}/${ref.registryId}/${ref.objectId}/${ref.version}`),
    ),
  });
}

function readReceiptInput(
  value: unknown,
  index: number,
): TransferChronologyReceiptInputV1 {
  const label = `RECEIPT_INPUT_${index}`;
  const record = readClosedRecord(value, RECEIPT_INPUT_FIELDS, label);
  const declaredValidatorProfileRef =
    record.declaredValidatorProfileRef === null
      ? null
      : qf0bCore.assertOpaqueRegistryRefV1(record.declaredValidatorProfileRef);
  if (
    declaredValidatorProfileRef !== null &&
    declaredValidatorProfileRef.refKind !== "VALIDATOR_PROFILE"
  ) {
    fail(`${label}_VALIDATOR_REF_KIND_INVALID`);
  }
  const predecessorInputReceiptIds = readStringArray(
    record.predecessorInputReceiptIds,
    0,
    QFS3_LIMITS.maxPredecessorsPerReceipt,
    INPUT_RECEIPT_ID_PATTERN,
    `${label}_PREDECESSOR_IDS`,
  );
  const predecessorOutputDigests = Object.freeze(
    readDenseArray(
      record.predecessorOutputDigests,
      0,
      QFS3_LIMITS.maxPredecessorsPerReceipt,
      `${label}_PREDECESSOR_OUTPUT_DIGESTS`,
    ).map((digest) => readDigest(digest, `${label}_PREDECESSOR_OUTPUT_DIGEST`)),
  );
  if (predecessorInputReceiptIds.length !== predecessorOutputDigests.length) {
    fail(`${label}_PREDECESSOR_CARDINALITY_MISMATCH`);
  }
  assertUniqueStrings(predecessorInputReceiptIds, `${label}_PREDECESSOR_ID`);
  return Object.freeze({
    inputReceiptId: readPattern(
      record.inputReceiptId,
      INPUT_RECEIPT_ID_PATTERN,
      `${label}_ID`,
    ),
    kind: readEnum(record.kind, QFS3_RECEIPT_KINDS, `${label}_KIND`),
    variantId: readNullablePattern(record.variantId, VARIANT_ID_PATTERN, `${label}_VARIANT_ID`),
    variantDigest:
      record.variantDigest === null
        ? null
        : readDigest(record.variantDigest, `${label}_VARIANT_DIGEST`),
    artifactId: readPattern(record.artifactId, ARTIFACT_ID_PATTERN, `${label}_ARTIFACT_ID`),
    artifactDigest: readDigest(record.artifactDigest, `${label}_ARTIFACT_DIGEST`),
    actor: readActorInput(record.actor, `${label}_ACTOR`),
    occurredAt: readCanonicalUtc(record.occurredAt, `${label}_OCCURRED_AT`),
    predecessorInputReceiptIds,
    predecessorOutputDigests,
    declaredValidatorProfileRef,
    outputDigest: readDigest(record.outputDigest, `${label}_OUTPUT_DIGEST`),
  });
}

interface BuiltReceipt {
  readonly inputId: string;
  readonly rank: number;
  readonly receipt: DependencyRankedTransferReceiptV1;
}

function makeReceipt(
  candidateId: string,
  candidateDigest: string,
  input: TransferChronologyReceiptInputV1,
  actor: TransferChronologyActorV1,
  predecessors: readonly BuiltReceipt[],
): DependencyRankedTransferReceiptV1 {
  const predecessorPairs = input.predecessorInputReceiptIds.map((inputId, index) => {
    const predecessor = predecessors.find((entry) => entry.inputId === inputId);
    if (predecessor === undefined) fail("RECEIPT_PREDECESSOR_RESOLUTION_INCOMPLETE");
    if (input.predecessorOutputDigests[index] !== predecessor.receipt.outputDigest) {
      fail("RECEIPT_PREDECESSOR_OUTPUT_DIGEST_DRIFT");
    }
    if (predecessor.receipt.occurredAt > input.occurredAt) {
      fail("CHILD_TIMESTAMP_BEFORE_PREDECESSOR");
    }
    return predecessor;
  });
  const orderedPredecessors = orderByUtf8(
    predecessorPairs,
    (entry) => entry.receipt.receiptId,
  );
  const material = {
    contractVersion: "DependencyRankedTransferReceiptV1" as const,
    kind: input.kind,
    candidateId,
    candidateDigest,
    variantId: input.variantId,
    variantDigest: input.variantDigest,
    artifactId: input.artifactId,
    artifactDigest: input.artifactDigest,
    actorRefId: actor.actorRefId,
    occurredAt: input.occurredAt,
    predecessorReceiptIds: orderedPredecessors.map((entry) => entry.receipt.receiptId),
    predecessorOutputDigests: orderedPredecessors.map(
      (entry) => entry.receipt.outputDigest,
    ),
    declaredValidatorProfileRef: input.declaredValidatorProfileRef,
    outputDigest: input.outputDigest,
  };
  const identityDigest = qf0a1.digestCanonicalJsonV1(plain({
    domain: "QFS3_TRANSFER_RECEIPT_ID_V1",
    material,
  }));
  const receiptId = `qftr_${identityDigest.slice("sha256:".length)}`;
  const receiptDigest = qf0a1.digestCanonicalJsonV1(plain({
    domain: "QFS3_TRANSFER_RECEIPT_DIGEST_V1",
    receiptId,
    material,
  }));
  return Object.freeze({
    ...material,
    receiptId,
    receiptDigest,
    predecessorReceiptIds: Object.freeze(material.predecessorReceiptIds),
    predecessorOutputDigests: Object.freeze(material.predecessorOutputDigests),
  });
}

function expectedArtifactId(digest: string): string {
  return `qfta_${digest.slice("sha256:".length)}`;
}

function sameRef(left: qf0bContracts.OpaqueRegistryRefV1, right: qf0bContracts.OpaqueRegistryRefV1): boolean {
  return left.refDigest === right.refDigest && sameCanonical(left, right);
}

function assertReceiptSemantics(
  input: TransferChronologyReceiptInputV1,
  actor: TransferChronologyActorV1,
  candidate: ReturnType<typeof qf0iCore.assertQuarantinedQuestionCandidateV1>,
  review: qfs1Contracts.SimilarityFirewallReviewV1,
  prelude: qfs2Contracts.CandidateAuditPreludeV1,
  variantById: ReadonlyMap<string, TransferVariantRequirementV1>,
): void {
  if (input.artifactId !== expectedArtifactId(input.artifactDigest)) {
    fail(`${input.kind}_ARTIFACT_ID_DIGEST_DRIFT`);
  }
  const globalKind =
    input.kind === "CANDIDATE_PRELUDE_BOUND" ||
    input.kind === "SIMILARITY_REVIEW_BOUND" ||
    input.kind === "TRANSFER_EVIDENCE_AGGREGATED" ||
    input.kind === "META_AUDIT_COMPLETED";
  if (globalKind) {
    if (input.variantId !== null || input.variantDigest !== null) {
      fail(`${input.kind}_VARIANT_BINDING_FORBIDDEN`);
    }
  } else {
    if (input.variantId === null || input.variantDigest === null) {
      fail(`${input.kind}_VARIANT_BINDING_REQUIRED`);
    }
    const requirement = variantById.get(input.variantId);
    if (requirement === undefined || requirement.variantDigest !== input.variantDigest) {
      fail(`${input.kind}_VARIANT_BINDING_DRIFT`);
    }
  }
  if (input.kind === "DECLARED_VALIDATOR_COMPLETED") {
    if (input.declaredValidatorProfileRef === null) {
      fail("DECLARED_VALIDATOR_PROFILE_REQUIRED");
    }
    const requirement = variantById.get(input.variantId!);
    if (
      requirement === undefined ||
      !requirement.declaredValidatorProfileRefs.some((ref) =>
        sameRef(ref, input.declaredValidatorProfileRef!),
      )
    ) {
      fail("DECLARED_VALIDATOR_PROFILE_NOT_REQUIRED");
    }
  } else if (input.declaredValidatorProfileRef !== null) {
    fail(`${input.kind}_DECLARED_VALIDATOR_PROFILE_FORBIDDEN`);
  }

  const mustBeSystem = [
    "CANDIDATE_PRELUDE_BOUND",
    "SIMILARITY_REVIEW_BOUND",
    "TRANSFER_VARIANT_SEALED",
    "DECLARED_VALIDATOR_COMPLETED",
    "VARIANT_VALIDATION_AGGREGATED",
    "TRANSFER_EVIDENCE_AGGREGATED",
  ].includes(input.kind);
  if (mustBeSystem && actor.actorKind !== "SYSTEM_COMPONENT") {
    fail(`${input.kind}_SYSTEM_ACTOR_REQUIRED`);
  }
  const requiredRole: Partial<Record<QFS3ReceiptKind, string>> = {
    BLIND_SOLVER_COMPLETED: "BLIND_SOLVER",
    JUDGE_COMPLETED: "JUDGE",
    ADVERSARIAL_CRITIC_COMPLETED: "ADVERSARIAL_CRITIC",
    META_AUDIT_COMPLETED: "META_AUDITOR",
  };
  if (requiredRole[input.kind] !== undefined) {
    if (
      actor.actorKind !== "MODEL_EXECUTION" ||
      actor.role !== requiredRole[input.kind]
    ) {
      fail(`${input.kind}_MODEL_ROLE_INVALID`);
    }
  }
  if (actor.actorKind === "MODEL_EXECUTION" && actor.executedAt !== input.occurredAt) {
    fail("MODEL_RECEIPT_TIME_IDENTITY_DRIFT");
  }
  if (input.kind === "CANDIDATE_PRELUDE_BOUND") {
    if (
      input.artifactDigest !== prelude.preludeDigest ||
      input.outputDigest !== prelude.preludeDigest ||
      input.artifactId !== expectedArtifactId(prelude.preludeDigest)
    ) {
      fail("CANDIDATE_PRELUDE_ARTIFACT_DRIFT");
    }
  }
  if (input.kind === "SIMILARITY_REVIEW_BOUND") {
    if (
      input.artifactDigest !== review.reviewDigest ||
      input.outputDigest !== review.reviewDigest ||
      input.artifactId !== expectedArtifactId(review.reviewDigest)
    ) {
      fail("SIMILARITY_REVIEW_ARTIFACT_DRIFT");
    }
  }
  if (input.kind === "TRANSFER_VARIANT_SEALED") {
    if (
      input.artifactDigest !== input.variantDigest ||
      input.artifactId !== expectedArtifactId(input.variantDigest!)
    ) {
      fail("TRANSFER_VARIANT_SEAL_ARTIFACT_DRIFT");
    }
  }
  if (
    (input.kind === "CANDIDATE_PRELUDE_BOUND" ||
      input.kind === "SIMILARITY_REVIEW_BOUND") &&
    input.occurredAt < candidate.createdAt
  ) {
    fail(`${input.kind}_BEFORE_CANDIDATE`);
  }
}

function sameIds(actual: readonly BuiltReceipt[], expected: readonly BuiltReceipt[]): boolean {
  return sameCanonical(
    orderByUtf8(actual.map((entry) => entry.receipt.receiptId), (value) => value),
    orderByUtf8(expected.map((entry) => entry.receipt.receiptId), (value) => value),
  );
}

function assertGraphAndCompleteness(
  built: readonly BuiltReceipt[],
  variants: readonly TransferVariantRequirementV1[],
): { readonly completeness: QFS3Completeness; readonly blockingReasons: readonly QFS3BlockingReason[] } {
  const byKind = (kind: QFS3ReceiptKind) => built.filter((entry) => entry.receipt.kind === kind);
  const exactlyOneRoot = (kind: QFS3ReceiptKind): BuiltReceipt => {
    const matches = byKind(kind);
    if (matches.length !== 1) fail(`${kind}_CARDINALITY_INVALID`);
    if (matches[0].receipt.predecessorReceiptIds.length !== 0) {
      fail(`${kind}_PREDECESSORS_FORBIDDEN`);
    }
    return matches[0];
  };
  const prelude = exactlyOneRoot("CANDIDATE_PRELUDE_BOUND");
  const similarity = exactlyOneRoot("SIMILARITY_REVIEW_BOUND");
  const reasons = new Set<QFS3BlockingReason>();
  const variantAggregates: BuiltReceipt[] = [];

  for (const variant of variants) {
    const forVariant = (kind: QFS3ReceiptKind) =>
      built.filter(
        (entry) => entry.receipt.kind === kind && entry.receipt.variantId === variant.variantId,
      );
    const atMostOne = (kind: QFS3ReceiptKind): BuiltReceipt | undefined => {
      const matches = forVariant(kind);
      if (matches.length > 1) fail(`${kind}_VARIANT_CARDINALITY_INVALID`);
      return matches[0];
    };
    const seal = atMostOne("TRANSFER_VARIANT_SEALED");
    if (seal === undefined) {
      reasons.add("MISSING_VARIANT_SEAL");
      for (const kind of QFS3_RECEIPT_KINDS.slice(3, 8)) {
        if (forVariant(kind).length > 0) fail(`${kind}_WITHOUT_VARIANT_SEAL`);
      }
      continue;
    }
    if (!sameIds([prelude], built.filter((entry) => seal.receipt.predecessorReceiptIds.includes(entry.receipt.receiptId)))) {
      fail("TRANSFER_VARIANT_SEAL_DEPENDENCIES_INVALID");
    }
    const validators = forVariant("DECLARED_VALIDATOR_COMPLETED");
    const byRefDigest = new Map<string, BuiltReceipt>();
    for (const validator of validators) {
      const ref = validator.receipt.declaredValidatorProfileRef!;
      if (byRefDigest.has(ref.refDigest)) fail("DECLARED_VALIDATOR_RECEIPT_DUPLICATE");
      byRefDigest.set(ref.refDigest, validator);
      const predecessors = built.filter((entry) =>
        validator.receipt.predecessorReceiptIds.includes(entry.receipt.receiptId),
      );
      if (!sameIds(predecessors, [seal])) fail("DECLARED_VALIDATOR_DEPENDENCIES_INVALID");
    }
    const requiredValidators = variant.declaredValidatorProfileRefs.map((ref) =>
      byRefDigest.get(ref.refDigest),
    );
    if (requiredValidators.some((entry) => entry === undefined)) {
      reasons.add("MISSING_DECLARED_VALIDATOR");
    }
    const completeValidators = requiredValidators.filter(
      (entry): entry is BuiltReceipt => entry !== undefined,
    );
    const solver = atMostOne("BLIND_SOLVER_COMPLETED");
    if (solver === undefined) reasons.add("MISSING_BLIND_SOLVER");
    else {
      const predecessors = built.filter((entry) =>
        solver.receipt.predecessorReceiptIds.includes(entry.receipt.receiptId),
      );
      if (!sameIds(predecessors, [seal])) fail("BLIND_SOLVER_DEPENDENCIES_INVALID");
    }
    const judge = atMostOne("JUDGE_COMPLETED");
    if (judge === undefined) reasons.add("MISSING_JUDGE");
    else {
      if (solver === undefined || completeValidators.length !== variant.declaredValidatorProfileRefs.length) {
        fail("JUDGE_BEFORE_COMPLETE_VALIDATION_EVIDENCE");
      }
      const predecessors = built.filter((entry) =>
        judge.receipt.predecessorReceiptIds.includes(entry.receipt.receiptId),
      );
      if (!sameIds(predecessors, [...completeValidators, solver])) {
        fail("JUDGE_DEPENDENCIES_INVALID");
      }
    }
    const critic = atMostOne("ADVERSARIAL_CRITIC_COMPLETED");
    if (critic === undefined) reasons.add("MISSING_ADVERSARIAL_CRITIC");
    else {
      if (judge === undefined || completeValidators.length !== variant.declaredValidatorProfileRefs.length) {
        fail("CRITIC_BEFORE_COMPLETE_JUDGE_EVIDENCE");
      }
      const predecessors = built.filter((entry) =>
        critic.receipt.predecessorReceiptIds.includes(entry.receipt.receiptId),
      );
      if (!sameIds(predecessors, [judge, ...completeValidators])) {
        fail("CRITIC_DEPENDENCIES_INVALID");
      }
    }
    const aggregate = atMostOne("VARIANT_VALIDATION_AGGREGATED");
    if (aggregate === undefined) reasons.add("MISSING_VARIANT_AGGREGATE");
    else {
      if (
        solver === undefined ||
        judge === undefined ||
        critic === undefined ||
        completeValidators.length !== variant.declaredValidatorProfileRefs.length
      ) {
        fail("VARIANT_AGGREGATE_BEFORE_FINAL_CAUSAL_RECEIPT");
      }
      const predecessors = built.filter((entry) =>
        aggregate.receipt.predecessorReceiptIds.includes(entry.receipt.receiptId),
      );
      if (!sameIds(predecessors, [...completeValidators, solver, judge, critic])) {
        fail("VARIANT_AGGREGATE_DEPENDENCIES_INVALID");
      }
      variantAggregates.push(aggregate);
    }
  }

  const transferAggregates = byKind("TRANSFER_EVIDENCE_AGGREGATED");
  if (transferAggregates.length > 1) fail("TRANSFER_AGGREGATE_CARDINALITY_INVALID");
  const transferAggregate = transferAggregates[0];
  if (transferAggregate === undefined) reasons.add("MISSING_TRANSFER_AGGREGATE");
  else {
    if (variantAggregates.length !== variants.length) {
      fail("TRANSFER_AGGREGATE_BEFORE_ALL_VARIANT_AGGREGATES");
    }
    const predecessors = built.filter((entry) =>
      transferAggregate.receipt.predecessorReceiptIds.includes(entry.receipt.receiptId),
    );
    if (!sameIds(predecessors, [similarity, ...variantAggregates])) {
      fail("TRANSFER_AGGREGATE_DEPENDENCIES_INVALID");
    }
  }
  const metaAudits = byKind("META_AUDIT_COMPLETED");
  if (metaAudits.length > 1) fail("META_AUDIT_CARDINALITY_INVALID");
  const metaAudit = metaAudits[0];
  if (metaAudit === undefined) reasons.add("MISSING_META_AUDIT");
  else {
    if (transferAggregate === undefined) fail("META_AUDIT_BEFORE_TRANSFER_AGGREGATE");
    const predecessors = built.filter((entry) =>
      metaAudit.receipt.predecessorReceiptIds.includes(entry.receipt.receiptId),
    );
    if (!sameIds(predecessors, [transferAggregate])) {
      fail("META_AUDIT_DEPENDENCIES_INVALID");
    }
  }
  const blockingReasons = Object.freeze(
    QFS3_BLOCKING_REASONS.filter((reason) => reasons.has(reason)),
  );
  return Object.freeze({
    completeness: blockingReasons.length === 0 ? "COMPLETE" : "INCOMPLETE",
    blockingReasons,
  });
}

function buildChronology(value: unknown): DependencyRankedTransferChronologyV1 {
  assertDependenciesV1();
  const record = readClosedRecord(value, INPUT_FIELDS, "INPUT");
  if (record.contractVersion !== "DependencyRankedTransferChronologyInputV1") {
    fail("INPUT_CONTRACT_VERSION_INVALID");
  }
  const candidate = qf0iCore.assertQuarantinedQuestionCandidateV1(record.candidate);
  const review = qfs1Core.assertSimilarityFirewallReviewV1(
    record.qfS1Review,
    record.qfS1AuthorityInput as never,
  );
  const prelude = qfs2Core.assertCandidateAuditPreludeV1(record.qfS2Prelude, candidate);
  if (
    review.candidateId !== candidate.candidateId ||
    review.candidateDigest !== candidate.candidateDigest ||
    prelude.candidateId !== candidate.candidateId ||
    prelude.candidateDigest !== candidate.candidateDigest
  ) {
    fail("CANDIDATE_QFS1_QFS2_CROSS_BINDING_DRIFT");
  }
  const variants = Object.freeze(
    orderByUtf8(
      readDenseArray(record.variants, 1, QFS3_LIMITS.maxVariants, "VARIANTS").map(
        readVariant,
      ),
      (variant) => `${variant.variantId}/${variant.variantDigest}`,
    ),
  );
  assertUniqueStrings(variants.map((variant) => variant.variantId), "VARIANT_ID");
  assertUniqueStrings(variants.map((variant) => variant.variantDigest), "VARIANT_DIGEST");
  const variantRequirementsDigest = qf0a1.digestCanonicalJsonV1(plain({
    domain: "QFS3_VARIANT_REQUIREMENTS_DIGEST_V1",
    variants,
  }));
  const variantById = new Map(variants.map((variant) => [variant.variantId, variant]));
  const receiptInputs = readDenseArray(
    record.receipts,
    2,
    QFS3_LIMITS.maxEvidenceReceipts,
    "RECEIPTS",
  ).map(readReceiptInput);
  assertUniqueStrings(receiptInputs.map((receipt) => receipt.inputReceiptId), "INPUT_RECEIPT_ID");
  const receiptByInputId = new Map(
    receiptInputs.map((receipt) => [receipt.inputReceiptId, receipt]),
  );
  for (const receipt of receiptInputs) {
    for (const predecessorId of receipt.predecessorInputReceiptIds) {
      if (!receiptByInputId.has(predecessorId)) fail("RECEIPT_PREDECESSOR_UNKNOWN");
      if (predecessorId === receipt.inputReceiptId) fail("RECEIPT_SELF_DEPENDENCY");
    }
  }

  const actorByInputId = new Map<string, TransferChronologyActorV1>();
  const allActors = new Map<string, TransferChronologyActorV1>();
  const generatorActor = makeGeneratorActor(candidate);
  const executionIds = new Set([generatorActor.executionId]);
  const identityDigests = new Set([generatorActor.identityDigest]);
  const executionArtifactDigests = new Set([generatorActor.executionArtifactDigest]);
  for (const receipt of receiptInputs) {
    const actor = makeActor(receipt.actor);
    assertReceiptSemantics(receipt, actor, candidate, review, prelude, variantById);
    actorByInputId.set(receipt.inputReceiptId, actor);
    if (actor.actorKind === "MODEL_EXECUTION") {
      if (
        executionIds.has(actor.executionId) ||
        identityDigests.has(actor.identityDigest) ||
        executionArtifactDigests.has(actor.executionArtifactDigest)
      ) {
        fail("MODEL_EXECUTION_OR_ARTIFACT_IDENTITY_REUSED");
      }
      executionIds.add(actor.executionId);
      identityDigests.add(actor.identityDigest);
      executionArtifactDigests.add(actor.executionArtifactDigest);
    }
    allActors.set(actor.actorRefId, actor);
  }
  if (allActors.size > QFS3_LIMITS.maxActors) fail("ACTOR_LIMIT_EXCEEDED");

  const remaining = new Map(receiptByInputId);
  const builtByInputId = new Map<string, BuiltReceipt>();
  while (remaining.size > 0) {
    const ready = [...remaining.values()].filter((input) =>
      input.predecessorInputReceiptIds.every((id) => builtByInputId.has(id)),
    );
    if (ready.length === 0) fail("RECEIPT_DEPENDENCY_CYCLE");
    const orderedReady = orderByUtf8(ready, (input) =>
      `${input.occurredAt}/${String(PHASE_RANK[input.kind]).padStart(2, "0")}/${input.artifactDigest}/${input.inputReceiptId}`,
    );
    for (const input of orderedReady) {
      const predecessors = input.predecessorInputReceiptIds.map(
        (id) => builtByInputId.get(id)!,
      );
      const actor = actorByInputId.get(input.inputReceiptId)!;
      const receipt = makeReceipt(
        candidate.candidateId,
        candidate.candidateDigest,
        input,
        actor,
        predecessors,
      );
      const rank = predecessors.length === 0 ? 0 : Math.max(...predecessors.map((entry) => entry.rank)) + 1;
      builtByInputId.set(input.inputReceiptId, Object.freeze({ inputId: input.inputReceiptId, rank, receipt }));
      remaining.delete(input.inputReceiptId);
    }
  }
  const built = [...builtByInputId.values()];
  assertUniqueStrings(built.map((entry) => entry.receipt.receiptId), "RECEIPT_ID");
  assertUniqueStrings(built.map((entry) => entry.receipt.receiptDigest), "RECEIPT_DIGEST");
  const completion = assertGraphAndCompleteness(built, variants);
  const orderedBuilt = orderByUtf8(built, (entry) =>
    `${String(entry.rank).padStart(4, "0")}/${entry.receipt.occurredAt}/${String(PHASE_RANK[entry.receipt.kind]).padStart(2, "0")}/${entry.receipt.artifactDigest}/${entry.receipt.receiptDigest}`,
  );
  const actors = Object.freeze(orderByUtf8([...allActors.values()], (actor) => actor.actorRefId));
  const receipts = Object.freeze(orderedBuilt.map((entry) => entry.receipt));
  let startedAt = receipts[0].occurredAt;
  let completedAt = receipts[0].occurredAt;
  for (const receipt of receipts) {
    if (receipt.occurredAt < startedAt) startedAt = receipt.occurredAt;
    if (receipt.occurredAt > completedAt) completedAt = receipt.occurredAt;
  }
  const material = {
    contractVersion: QFS3_CONTRACT_VERSION,
    candidateId: candidate.candidateId,
    candidateDigest: candidate.candidateDigest,
    qfS1ReviewDigest: review.reviewDigest,
    qfS2PreludeDigest: prelude.preludeDigest,
    variantRequirementsDigest,
    actors,
    receipts,
    startedAt,
    completedAt,
    completeness: completion.completeness,
    blockingReasons: completion.blockingReasons,
  };
  const identityDigest = qf0a1.digestCanonicalJsonV1(plain({
    domain: "QFS3_DEPENDENCY_RANKED_TRANSFER_CHRONOLOGY_ID_V1",
    material,
  }));
  const chronologyId = `qftc_${identityDigest.slice("sha256:".length)}`;
  const chronologyDigest = qf0a1.digestCanonicalJsonV1(plain({
    domain: "QFS3_DEPENDENCY_RANKED_TRANSFER_CHRONOLOGY_DIGEST_V1",
    chronologyId,
    material,
  }));
  return Object.freeze({ ...material, chronologyId, chronologyDigest });
}

function parseActor(value: unknown, index: number): TransferChronologyActorV1 {
  if (value === null || typeof value !== "object" || utilTypes.isProxy(value)) {
    fail(`OUTPUT_ACTOR_${index}_INVALID`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, "actorKind");
  if (descriptor === undefined || !("value" in descriptor)) {
    fail(`OUTPUT_ACTOR_${index}_KIND_INVALID`);
  }
  if (descriptor.value === "SYSTEM_COMPONENT") {
    const record = readClosedRecord(value, SYSTEM_ACTOR_FIELDS, `OUTPUT_ACTOR_${index}`);
    return Object.freeze({
      actorRefId: readPattern(record.actorRefId, ACTOR_REF_ID_PATTERN, "OUTPUT_ACTOR_REF_ID"),
      actorKind: "SYSTEM_COMPONENT",
      componentId: readPattern(record.componentId, COMPONENT_ID_PATTERN, "OUTPUT_COMPONENT_ID"),
      componentVersion: readPattern(record.componentVersion, MACHINE_VERSION_PATTERN, "OUTPUT_COMPONENT_VERSION"),
      componentArtifactDigest: readDigest(record.componentArtifactDigest, "OUTPUT_COMPONENT_DIGEST"),
    });
  }
  if (descriptor.value === "MODEL_EXECUTION") {
    const record = readClosedRecord(value, MODEL_ACTOR_FIELDS, `OUTPUT_ACTOR_${index}`);
    return Object.freeze({
      actorRefId: readPattern(record.actorRefId, ACTOR_REF_ID_PATTERN, "OUTPUT_ACTOR_REF_ID"),
      actorKind: "MODEL_EXECUTION",
      role: readEnum(record.role, qf0a2Contracts.QF0A2_MODEL_ROLES, "OUTPUT_MODEL_ROLE"),
      executionId: readPattern(record.executionId, /^exec_[a-f0-9]{32}$/u, "OUTPUT_EXECUTION_ID"),
      identityDigest: readDigest(record.identityDigest, "OUTPUT_IDENTITY_DIGEST"),
      modelArtifactDigest: readDigest(record.modelArtifactDigest, "OUTPUT_MODEL_ARTIFACT_DIGEST"),
      executionArtifactDigest: readDigest(record.executionArtifactDigest, "OUTPUT_EXECUTION_ARTIFACT_DIGEST"),
      executedAt: readCanonicalUtc(record.executedAt, "OUTPUT_EXECUTED_AT"),
    });
  }
  fail(`OUTPUT_ACTOR_${index}_KIND_INVALID`);
}

function parseReceipt(value: unknown, index: number): DependencyRankedTransferReceiptV1 {
  const record = readClosedRecord(value, RECEIPT_FIELDS, `OUTPUT_RECEIPT_${index}`);
  const ref =
    record.declaredValidatorProfileRef === null
      ? null
      : qf0bCore.assertOpaqueRegistryRefV1(record.declaredValidatorProfileRef);
  return Object.freeze({
    contractVersion: readEnum(
      record.contractVersion,
      ["DependencyRankedTransferReceiptV1"] as const,
      "OUTPUT_RECEIPT_VERSION",
    ),
    receiptId: readPattern(record.receiptId, RECEIPT_ID_PATTERN, "OUTPUT_RECEIPT_ID"),
    receiptDigest: readDigest(record.receiptDigest, "OUTPUT_RECEIPT_DIGEST"),
    kind: readEnum(record.kind, QFS3_RECEIPT_KINDS, "OUTPUT_RECEIPT_KIND"),
    candidateId: readPattern(record.candidateId, CANDIDATE_ID_PATTERN, "OUTPUT_CANDIDATE_ID"),
    candidateDigest: readDigest(record.candidateDigest, "OUTPUT_CANDIDATE_DIGEST"),
    variantId: readNullablePattern(record.variantId, VARIANT_ID_PATTERN, "OUTPUT_VARIANT_ID"),
    variantDigest: record.variantDigest === null ? null : readDigest(record.variantDigest, "OUTPUT_VARIANT_DIGEST"),
    artifactId: readPattern(record.artifactId, ARTIFACT_ID_PATTERN, "OUTPUT_ARTIFACT_ID"),
    artifactDigest: readDigest(record.artifactDigest, "OUTPUT_ARTIFACT_DIGEST"),
    actorRefId: readPattern(record.actorRefId, ACTOR_REF_ID_PATTERN, "OUTPUT_ACTOR_REF_ID"),
    occurredAt: readCanonicalUtc(record.occurredAt, "OUTPUT_OCCURRED_AT"),
    predecessorReceiptIds: readStringArray(
      record.predecessorReceiptIds,
      0,
      QFS3_LIMITS.maxPredecessorsPerReceipt,
      RECEIPT_ID_PATTERN,
      "OUTPUT_PREDECESSOR_IDS",
    ),
    predecessorOutputDigests: Object.freeze(
      readDenseArray(
        record.predecessorOutputDigests,
        0,
        QFS3_LIMITS.maxPredecessorsPerReceipt,
        "OUTPUT_PREDECESSOR_DIGESTS",
      ).map((digest) => readDigest(digest, "OUTPUT_PREDECESSOR_DIGEST")),
    ),
    declaredValidatorProfileRef: ref,
    outputDigest: readDigest(record.outputDigest, "OUTPUT_DIGEST"),
  });
}

function parseChronology(value: unknown): DependencyRankedTransferChronologyV1 {
  const record = readClosedRecord(value, CHRONOLOGY_FIELDS, "OUTPUT_CHRONOLOGY");
  const actors = Object.freeze(
    readDenseArray(record.actors, 1, QFS3_LIMITS.maxActors, "OUTPUT_ACTORS").map(parseActor),
  );
  const receipts = Object.freeze(
    readDenseArray(record.receipts, 2, QFS3_LIMITS.maxEvidenceReceipts, "OUTPUT_RECEIPTS").map(parseReceipt),
  );
  assertUniqueStrings(actors.map((actor) => actor.actorRefId), "OUTPUT_ACTOR_REF_ID");
  const usedActorRefIds = new Set(receipts.map((receipt) => receipt.actorRefId));
  for (const receipt of receipts) {
    if (!actors.some((actor) => actor.actorRefId === receipt.actorRefId)) {
      fail("OUTPUT_RECEIPT_ACTOR_UNKNOWN");
    }
  }
  for (const actor of actors) {
    if (!usedActorRefIds.has(actor.actorRefId)) fail("OUTPUT_ACTOR_ORPHAN");
  }
  return Object.freeze({
    contractVersion: readEnum(record.contractVersion, [QFS3_CONTRACT_VERSION] as const, "OUTPUT_VERSION"),
    chronologyId: readPattern(record.chronologyId, CHRONOLOGY_ID_PATTERN, "OUTPUT_ID"),
    chronologyDigest: readDigest(record.chronologyDigest, "OUTPUT_DIGEST"),
    candidateId: readPattern(record.candidateId, CANDIDATE_ID_PATTERN, "OUTPUT_CANDIDATE_ID"),
    candidateDigest: readDigest(record.candidateDigest, "OUTPUT_CANDIDATE_DIGEST"),
    qfS1ReviewDigest: readDigest(record.qfS1ReviewDigest, "OUTPUT_QFS1_DIGEST"),
    qfS2PreludeDigest: readDigest(record.qfS2PreludeDigest, "OUTPUT_QFS2_DIGEST"),
    variantRequirementsDigest: readDigest(
      record.variantRequirementsDigest,
      "OUTPUT_VARIANT_REQUIREMENTS_DIGEST",
    ),
    actors,
    receipts,
    startedAt: readCanonicalUtc(record.startedAt, "OUTPUT_STARTED_AT"),
    completedAt: readCanonicalUtc(record.completedAt, "OUTPUT_COMPLETED_AT"),
    completeness: readEnum(record.completeness, QFS3_COMPLETENESS_STATES, "OUTPUT_COMPLETENESS"),
    blockingReasons: Object.freeze(
      readDenseArray(record.blockingReasons, 0, QFS3_BLOCKING_REASONS.length, "OUTPUT_BLOCKING_REASONS").map(
        (reason) => readEnum(reason, QFS3_BLOCKING_REASONS, "OUTPUT_BLOCKING_REASON"),
      ),
    ),
  });
}

export function createDependencyRankedTransferChronologyV1(
  value: DependencyRankedTransferChronologyInputV1,
): DependencyRankedTransferChronologyV1 {
  return buildChronology(value);
}

export function assertDependencyRankedTransferChronologyV1(
  value: unknown,
  authorityInput: DependencyRankedTransferChronologyInputV1,
): DependencyRankedTransferChronologyV1 {
  const parsed = parseChronology(value);
  const expected = buildChronology(authorityInput);
  if (!sameCanonical(parsed, expected)) fail("CHRONOLOGY_AUTHORITY_RECOMPUTE_MISMATCH");
  return expected;
}

void QFS3_SOURCE_ONLY_BOUNDARY_RECEIPT;
void DEPENDENCIES;
