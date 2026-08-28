import { createHash } from "node:crypto";

import {
  QF0_CANDIDATE_LIFECYCLES,
  QF0_CONTRACT_VERSION,
  QF0_MODEL_ROLES,
  QF0_SOURCE_CLASSES,
  type BodylessBankScarcityEventV1,
  type ModelExecutionIdentityV1,
  type QuarantinedQuestionCandidateV1,
  type RightsManifestRefV1,
  type SourceEligibilityDecisionV1,
} from "./quarantine-contracts";

const ELIGIBLE_SOURCE_CLASSES = new Set<(typeof QF0_SOURCE_CLASSES)[number]>([
  "INVERGE_ORIGINAL",
  "RIGHTS_CLEARED_OFFICIAL",
  "CONTRACTED_EXPERT_ORIGINAL",
  "CLEARED_DETERMINISTIC_TEMPLATE",
]);

const PURPOSE = "QUARANTINED_CANDIDATE_CREATION" as const;
const MAX_TEXT_LENGTH = 256;
const MAX_CONTENT_BYTES = 256_000;
const MAX_SCARCITY_COUNT = 100_000;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;

type CandidateInputV1 = {
  candidateId: string;
  lifecycle: "QUARANTINED";
  candidateContent: Readonly<Record<string, unknown>>;
  contentDigest: string;
  blueprintRef: Readonly<{
    blueprintId: string;
    blueprintVersion: string;
    blueprintDigest: string;
  }>;
  answerSpecificationDigest: string;
  sourceEligibilityDecision: SourceEligibilityDecisionV1;
  generatorExecutionIdentity: ModelExecutionIdentityV1;
  independentExecutionIdentities: readonly ModelExecutionIdentityV1[];
  validatorProfileRefs: readonly Readonly<{
    validatorProfileId: string;
    validatorProfileVersion: string;
    validatorProfileDigest: string;
  }>[];
  createdAt: string;
  policyVersion: string;
};

type ScarcityInputV1 = Omit<
  BodylessBankScarcityEventV1,
  "contractVersion" | "eventChecksum"
>;

function fail(code: string): never {
  throw new Error(`QF0_FAIL_CLOSED:${code}`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    fail(`${label}_MUST_BE_PLAIN_OBJECT`);
  }
  return value as Record<string, unknown>;
}

function assertExactKeys(
  value: unknown,
  expected: readonly string[],
  label: string,
): Record<string, unknown> {
  const candidate = record(value, label);
  const actual = Object.keys(candidate).sort();
  const required = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(required)) {
    fail(`${label}_FIELDS_MISMATCH`);
  }
  return candidate;
}

function assertText(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length === 0 ||
    value.length > MAX_TEXT_LENGTH
  ) {
    fail(`${label}_INVALID`);
  }
}

function assertDigest(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    fail(`${label}_INVALID_DIGEST`);
  }
}

function assertCanonicalInstant(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string") fail(`${label}_INVALID_TIME`);
  const instant = Date.parse(value);
  if (!Number.isFinite(instant) || new Date(instant).toISOString() !== value) {
    fail(`${label}_INVALID_TIME`);
  }
}

function assertSourceClass(
  value: unknown,
): asserts value is (typeof QF0_SOURCE_CLASSES)[number] {
  if (!QF0_SOURCE_CLASSES.includes(value as (typeof QF0_SOURCE_CLASSES)[number])) {
    fail("UNDECLARED_SOURCE_CLASS");
  }
}

function canonicalValue(value: unknown, path = "$", seen = new Set<object>()): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(`NON_FINITE_NUMBER_AT_${path}`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object") fail(`NON_JSON_VALUE_AT_${path}`);
  if (seen.has(value)) fail(`CYCLIC_VALUE_AT_${path}`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry, index) =>
        canonicalValue(entry, `${path}[${index}]`, seen),
      );
    }
    const source = record(value, `JSON_VALUE_AT_${path}`);
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] === undefined) fail(`UNDEFINED_VALUE_AT_${path}.${key}`);
      normalized[key] = canonicalValue(source[key], `${path}.${key}`, seen);
    }
    return normalized;
  } finally {
    seen.delete(value);
  }
}

function immutableJson<T>(value: T): T {
  const clone = JSON.parse(canonicalizeQf0ValueV1(value)) as T;
  const freeze = (entry: unknown): void => {
    if (entry === null || typeof entry !== "object" || Object.isFrozen(entry)) return;
    for (const child of Object.values(entry)) freeze(child);
    Object.freeze(entry);
  };
  freeze(clone);
  return clone;
}

export function canonicalizeQf0ValueV1(value: unknown): string {
  const serialized = JSON.stringify(canonicalValue(value));
  if (Buffer.byteLength(serialized, "utf8") > MAX_CONTENT_BYTES) {
    fail("BOUNDED_CONTENT_LIMIT_EXCEEDED");
  }
  return serialized;
}

export function digestDeterministicQf0ValueV1(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(canonicalizeQf0ValueV1(value), "utf8")
    .digest("hex")}`;
}

function rightsMaterial(
  value: Omit<RightsManifestRefV1, "manifestDigest">,
): Omit<RightsManifestRefV1, "manifestDigest"> {
  return value;
}

export function createRightsManifestRefV1(
  input: Omit<RightsManifestRefV1, "contractVersion" | "manifestDigest">,
): RightsManifestRefV1 {
  assertExactKeys(
    input,
    [
      "manifestId",
      "manifestVersionId",
      "sourceClass",
      "status",
      "permittedPurpose",
      "validFrom",
      "validUntil",
      "policyVersion",
    ],
    "RIGHTS_MANIFEST_INPUT",
  );
  assertText(input.manifestId, "MANIFEST_ID");
  assertText(input.manifestVersionId, "MANIFEST_VERSION_ID");
  assertSourceClass(input.sourceClass);
  if (
    !["ACTIVE", "STALE", "DISPUTED", "BLOCKED", "REVOKED", "EXPIRED"].includes(
      input.status,
    )
  ) {
    fail("RIGHTS_STATUS_INVALID");
  }
  if (input.permittedPurpose !== PURPOSE) fail("RIGHTS_PURPOSE_INVALID");
  assertCanonicalInstant(input.validFrom, "RIGHTS_VALID_FROM");
  assertCanonicalInstant(input.validUntil, "RIGHTS_VALID_UNTIL");
  if (Date.parse(input.validFrom) > Date.parse(input.validUntil)) {
    fail("RIGHTS_VALIDITY_WINDOW_INVALID");
  }
  assertText(input.policyVersion, "RIGHTS_POLICY_VERSION");
  const material = rightsMaterial({
    contractVersion: "RightsManifestRefV1",
    ...input,
  });
  return immutableJson({
    ...material,
    manifestDigest: digestDeterministicQf0ValueV1(material),
  });
}

export function validateRightsManifestRefV1(
  input: RightsManifestRefV1,
): RightsManifestRefV1 {
  assertExactKeys(
    input,
    [
      "contractVersion",
      "manifestId",
      "manifestVersionId",
      "manifestDigest",
      "sourceClass",
      "status",
      "permittedPurpose",
      "validFrom",
      "validUntil",
      "policyVersion",
    ],
    "RIGHTS_MANIFEST",
  );
  if (input.contractVersion !== "RightsManifestRefV1") {
    fail("RIGHTS_CONTRACT_VERSION_MISMATCH");
  }
  const rebuilt = createRightsManifestRefV1({
    manifestId: input.manifestId,
    manifestVersionId: input.manifestVersionId,
    sourceClass: input.sourceClass,
    status: input.status,
    permittedPurpose: input.permittedPurpose,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    policyVersion: input.policyVersion,
  });
  assertDigest(input.manifestDigest, "MANIFEST");
  if (input.manifestDigest !== rebuilt.manifestDigest) {
    fail("RIGHTS_MANIFEST_DIGEST_MISMATCH");
  }
  return immutableJson(input);
}

export function createSourceEligibilityDecisionV1(input: {
  sourceClass: (typeof QF0_SOURCE_CLASSES)[number];
  decisionStatus: SourceEligibilityDecisionV1["decisionStatus"];
  evaluatedAt: string;
  policyVersion: string;
  rightsManifestRef: RightsManifestRefV1 | null;
}): SourceEligibilityDecisionV1 {
  assertExactKeys(
    input,
    [
      "sourceClass",
      "decisionStatus",
      "evaluatedAt",
      "policyVersion",
      "rightsManifestRef",
    ],
    "SOURCE_DECISION_INPUT",
  );
  assertSourceClass(input.sourceClass);
  if (!(["CURRENT", "STALE", "DISPUTED", "BLOCKED"] as const).includes(input.decisionStatus)) {
    fail("SOURCE_DECISION_STATUS_INVALID");
  }
  assertCanonicalInstant(input.evaluatedAt, "SOURCE_DECISION_EVALUATED_AT");
  assertText(input.policyVersion, "SOURCE_POLICY_VERSION");
  const rights =
    input.rightsManifestRef === null
      ? null
      : validateRightsManifestRefV1(input.rightsManifestRef);
  const denialReasons: string[] = [];

  if (input.decisionStatus !== "CURRENT") {
    denialReasons.push(`SOURCE_DECISION_${input.decisionStatus}`);
  }
  if (!ELIGIBLE_SOURCE_CLASSES.has(input.sourceClass)) {
    denialReasons.push(`SOURCE_CLASS_${input.sourceClass}_QUARANTINE_DENIED`);
  }
  if (ELIGIBLE_SOURCE_CLASSES.has(input.sourceClass)) {
    if (rights === null) {
      denialReasons.push("CURRENT_RIGHTS_MANIFEST_REQUIRED");
    } else {
      if (rights.sourceClass !== input.sourceClass) {
        denialReasons.push("RIGHTS_SOURCE_CLASS_MISMATCH");
      }
      if (rights.status !== "ACTIVE") {
        denialReasons.push(`RIGHTS_${rights.status}`);
      }
      if (rights.permittedPurpose !== PURPOSE) {
        denialReasons.push("RIGHTS_PURPOSE_MISMATCH");
      }
      if (rights.policyVersion !== input.policyVersion) {
        denialReasons.push("RIGHTS_POLICY_VERSION_MISMATCH");
      }
      const evaluatedAt = Date.parse(input.evaluatedAt);
      if (
        evaluatedAt < Date.parse(rights.validFrom) ||
        evaluatedAt > Date.parse(rights.validUntil)
      ) {
        denialReasons.push("RIGHTS_OUTSIDE_VALIDITY_WINDOW");
      }
    }
  }

  const eligible = denialReasons.length === 0;
  const material = {
    contractVersion: "SourceEligibilityDecisionV1" as const,
    sourceClass: input.sourceClass,
    purpose: PURPOSE,
    decisionStatus: input.decisionStatus,
    outcome: eligible ? ("ELIGIBLE_FOR_QUARANTINE" as const) : ("DENIED" as const),
    evaluatedAt: input.evaluatedAt,
    policyVersion: input.policyVersion,
    rightsManifestRef: rights,
    generationEligible: eligible,
    quarantinedCandidateEligible: eligible,
    sharedBlueprintEligible: false as const,
    sharedBankEligible: false as const,
    modelTrainingEligible: false as const,
    crossUserReuseEligible: false as const,
    denialReasons: [...new Set(denialReasons)].sort(),
  };
  const decisionDigest = digestDeterministicQf0ValueV1(material);
  return immutableJson({
    ...material,
    decisionId: `qf0_source_decision_${decisionDigest.slice("sha256:".length)}`,
    decisionDigest,
  });
}

export function validateSourceEligibilityDecisionV1(
  input: SourceEligibilityDecisionV1,
): SourceEligibilityDecisionV1 {
  assertExactKeys(
    input,
    [
      "contractVersion",
      "decisionId",
      "decisionDigest",
      "sourceClass",
      "purpose",
      "decisionStatus",
      "outcome",
      "evaluatedAt",
      "policyVersion",
      "rightsManifestRef",
      "generationEligible",
      "quarantinedCandidateEligible",
      "sharedBlueprintEligible",
      "sharedBankEligible",
      "modelTrainingEligible",
      "crossUserReuseEligible",
      "denialReasons",
    ],
    "SOURCE_DECISION",
  );
  if (input.contractVersion !== "SourceEligibilityDecisionV1") {
    fail("SOURCE_DECISION_CONTRACT_VERSION_MISMATCH");
  }
  const rebuilt = createSourceEligibilityDecisionV1({
    sourceClass: input.sourceClass,
    decisionStatus: input.decisionStatus,
    evaluatedAt: input.evaluatedAt,
    policyVersion: input.policyVersion,
    rightsManifestRef: input.rightsManifestRef,
  });
  if (canonicalizeQf0ValueV1(input) !== canonicalizeQf0ValueV1(rebuilt)) {
    fail("SOURCE_DECISION_IDENTITY_OR_POLICY_MISMATCH");
  }
  return immutableJson(input);
}

export function createModelExecutionIdentityV1(
  input: Omit<ModelExecutionIdentityV1, "contractVersion" | "identityDigest">,
): ModelExecutionIdentityV1 {
  assertExactKeys(
    input,
    [
      "role",
      "providerId",
      "modelId",
      "modelVersion",
      "modelArtifactDigest",
      "executionId",
      "executionArtifactDigest",
      "configurationDigest",
      "executedAt",
    ],
    "MODEL_EXECUTION_INPUT",
  );
  if (!QF0_MODEL_ROLES.includes(input.role)) fail("MODEL_ROLE_INVALID");
  for (const [label, value] of [
    ["PROVIDER_ID", input.providerId],
    ["MODEL_ID", input.modelId],
    ["MODEL_VERSION", input.modelVersion],
    ["EXECUTION_ID", input.executionId],
  ] as const) {
    assertText(value, label);
  }
  assertDigest(input.modelArtifactDigest, "MODEL_ARTIFACT");
  assertDigest(input.executionArtifactDigest, "EXECUTION_ARTIFACT");
  assertDigest(input.configurationDigest, "MODEL_CONFIGURATION");
  assertCanonicalInstant(input.executedAt, "MODEL_EXECUTED_AT");
  const material = {
    contractVersion: "ModelExecutionIdentityV1" as const,
    ...input,
  };
  return immutableJson({
    ...material,
    identityDigest: digestDeterministicQf0ValueV1(material),
  });
}

export function validateModelExecutionIdentityV1(
  input: ModelExecutionIdentityV1,
): ModelExecutionIdentityV1 {
  assertExactKeys(
    input,
    [
      "contractVersion",
      "role",
      "providerId",
      "modelId",
      "modelVersion",
      "modelArtifactDigest",
      "executionId",
      "executionArtifactDigest",
      "configurationDigest",
      "executedAt",
      "identityDigest",
    ],
    "MODEL_EXECUTION_IDENTITY",
  );
  if (input.contractVersion !== "ModelExecutionIdentityV1") {
    fail("MODEL_EXECUTION_CONTRACT_VERSION_MISMATCH");
  }
  const rebuilt = createModelExecutionIdentityV1({
    role: input.role,
    providerId: input.providerId,
    modelId: input.modelId,
    modelVersion: input.modelVersion,
    modelArtifactDigest: input.modelArtifactDigest,
    executionId: input.executionId,
    executionArtifactDigest: input.executionArtifactDigest,
    configurationDigest: input.configurationDigest,
    executedAt: input.executedAt,
  });
  if (input.identityDigest !== rebuilt.identityDigest) {
    fail("MODEL_EXECUTION_IDENTITY_DIGEST_MISMATCH");
  }
  return immutableJson(input);
}

function normalizedCandidateInput(
  input: Omit<CandidateInputV1, "candidateId">,
): Omit<CandidateInputV1, "candidateId"> {
  assertExactKeys(
    input,
    [
      "lifecycle",
      "candidateContent",
      "contentDigest",
      "blueprintRef",
      "answerSpecificationDigest",
      "sourceEligibilityDecision",
      "generatorExecutionIdentity",
      "independentExecutionIdentities",
      "validatorProfileRefs",
      "createdAt",
      "policyVersion",
    ],
    "CANDIDATE_INPUT",
  );
  if (input.lifecycle !== "QUARANTINED") fail("RELEASABLE_OR_NON_QUARANTINE_STATE_DENIED");
  const content = record(input.candidateContent, "CANDIDATE_CONTENT");
  assertDigest(input.contentDigest, "CANDIDATE_CONTENT");
  if (digestDeterministicQf0ValueV1(content) !== input.contentDigest) {
    fail("CANDIDATE_CONTENT_DIGEST_MISMATCH");
  }

  assertExactKeys(
    input.blueprintRef,
    ["blueprintId", "blueprintVersion", "blueprintDigest"],
    "BLUEPRINT_REF",
  );
  assertText(input.blueprintRef.blueprintId, "BLUEPRINT_ID");
  assertText(input.blueprintRef.blueprintVersion, "BLUEPRINT_VERSION");
  assertDigest(input.blueprintRef.blueprintDigest, "BLUEPRINT");
  assertDigest(input.answerSpecificationDigest, "ANSWER_SPECIFICATION");
  const sourceDecision = validateSourceEligibilityDecisionV1(
    input.sourceEligibilityDecision,
  );
  if (
    sourceDecision.outcome !== "ELIGIBLE_FOR_QUARANTINE" ||
    sourceDecision.decisionStatus !== "CURRENT" ||
    !sourceDecision.generationEligible ||
    !sourceDecision.quarantinedCandidateEligible ||
    sourceDecision.rightsManifestRef === null
  ) {
    fail("SOURCE_DECISION_NOT_ELIGIBLE_FOR_QUARANTINE");
  }
  if (sourceDecision.policyVersion !== input.policyVersion) {
    fail("CANDIDATE_POLICY_VERSION_MISMATCH");
  }
  assertText(input.policyVersion, "CANDIDATE_POLICY_VERSION");
  assertCanonicalInstant(input.createdAt, "CANDIDATE_CREATED_AT");

  const generator = validateModelExecutionIdentityV1(
    input.generatorExecutionIdentity,
  );
  if (generator.role !== "GENERATOR") fail("GENERATOR_ROLE_REQUIRED");
  if (!Array.isArray(input.independentExecutionIdentities)) {
    fail("INDEPENDENT_EXECUTION_IDENTITIES_REQUIRED_ARRAY");
  }
  const executionIds = new Set([generator.executionId]);
  const identityDigests = new Set([generator.identityDigest]);
  const independent = input.independentExecutionIdentities.map((identity) => {
    const validated = validateModelExecutionIdentityV1(identity);
    if (validated.role === "GENERATOR") fail("INDEPENDENT_REVIEW_ROLE_INVALID");
    if (executionIds.has(validated.executionId) || identityDigests.has(validated.identityDigest)) {
      fail("GENERATOR_SELF_APPROVAL_OR_DUPLICATE_EXECUTION_IDENTITY");
    }
    executionIds.add(validated.executionId);
    identityDigests.add(validated.identityDigest);
    return validated;
  });

  if (!Array.isArray(input.validatorProfileRefs) || input.validatorProfileRefs.length === 0) {
    fail("VALIDATOR_PROFILE_REFS_REQUIRED");
  }
  const validatorIdentities = new Set<string>();
  const validators = input.validatorProfileRefs.map((profile) => {
    assertExactKeys(
      profile,
      ["validatorProfileId", "validatorProfileVersion", "validatorProfileDigest"],
      "VALIDATOR_PROFILE_REF",
    );
    assertText(profile.validatorProfileId, "VALIDATOR_PROFILE_ID");
    assertText(profile.validatorProfileVersion, "VALIDATOR_PROFILE_VERSION");
    assertDigest(profile.validatorProfileDigest, "VALIDATOR_PROFILE");
    const identity = `${profile.validatorProfileId}\u0000${profile.validatorProfileVersion}`;
    if (validatorIdentities.has(identity)) fail("DUPLICATE_VALIDATOR_PROFILE_REF");
    validatorIdentities.add(identity);
    return immutableJson(profile);
  });

  return immutableJson({
    lifecycle: "QUARANTINED" as const,
    candidateContent: content,
    contentDigest: input.contentDigest,
    blueprintRef: input.blueprintRef,
    answerSpecificationDigest: input.answerSpecificationDigest,
    sourceEligibilityDecision: sourceDecision,
    generatorExecutionIdentity: generator,
    independentExecutionIdentities: independent.sort((left, right) =>
      left.identityDigest.localeCompare(right.identityDigest),
    ),
    validatorProfileRefs: validators.sort((left, right) =>
      `${left.validatorProfileId}\u0000${left.validatorProfileVersion}`.localeCompare(
        `${right.validatorProfileId}\u0000${right.validatorProfileVersion}`,
      ),
    ),
    createdAt: input.createdAt,
    policyVersion: input.policyVersion,
  });
}

function candidateIdentityMaterial(input: Omit<CandidateInputV1, "candidateId">) {
  const normalized = normalizedCandidateInput(input);
  const rightsManifestRef = normalized.sourceEligibilityDecision.rightsManifestRef;
  if (rightsManifestRef === null) fail("CANDIDATE_RIGHTS_BINDING_REQUIRED");
  return {
    contractVersion: "QuarantinedQuestionCandidateV1" as const,
    lifecycle: normalized.lifecycle,
    contentDigest: normalized.contentDigest,
    blueprintRef: normalized.blueprintRef,
    answerSpecificationDigest: normalized.answerSpecificationDigest,
    sourceEligibilityDecision: normalized.sourceEligibilityDecision,
    rightsManifestRef,
    generatorExecutionIdentity: normalized.generatorExecutionIdentity,
    independentExecutionIdentities: normalized.independentExecutionIdentities,
    validatorProfileRefs: normalized.validatorProfileRefs,
    createdAt: normalized.createdAt,
    policyVersion: normalized.policyVersion,
  };
}

export function deriveQuarantinedQuestionCandidateIdV1(
  input: Omit<CandidateInputV1, "candidateId">,
): string {
  const checksum = digestDeterministicQf0ValueV1(candidateIdentityMaterial(input));
  return `qf0_candidate_${checksum.slice("sha256:".length)}`;
}

export function constructQuarantinedQuestionCandidateV1(
  input: CandidateInputV1,
): QuarantinedQuestionCandidateV1 {
  assertExactKeys(
    input,
    [
      "candidateId",
      "lifecycle",
      "candidateContent",
      "contentDigest",
      "blueprintRef",
      "answerSpecificationDigest",
      "sourceEligibilityDecision",
      "generatorExecutionIdentity",
      "independentExecutionIdentities",
      "validatorProfileRefs",
      "createdAt",
      "policyVersion",
    ],
    "CANDIDATE_CONSTRUCTION_INPUT",
  );
  const { candidateId, ...withoutId } = input;
  const identityMaterial = candidateIdentityMaterial(withoutId);
  const candidateChecksum = digestDeterministicQf0ValueV1(identityMaterial);
  const expectedCandidateId = `qf0_candidate_${candidateChecksum.slice("sha256:".length)}`;
  if (candidateId !== expectedCandidateId) fail("CANDIDATE_ID_MISMATCH");
  return immutableJson({
    ...identityMaterial,
    candidateId,
    candidateChecksum,
    candidateContent: withoutId.candidateContent,
    releaseStatus: null,
    learnerAssignment: null,
    bankAssignment: null,
  });
}

export function validateQuarantinedQuestionCandidateV1(
  input: QuarantinedQuestionCandidateV1,
): QuarantinedQuestionCandidateV1 {
  assertExactKeys(
    input,
    [
      "contractVersion",
      "candidateId",
      "candidateChecksum",
      "lifecycle",
      "candidateContent",
      "contentDigest",
      "blueprintRef",
      "answerSpecificationDigest",
      "sourceEligibilityDecision",
      "rightsManifestRef",
      "generatorExecutionIdentity",
      "independentExecutionIdentities",
      "validatorProfileRefs",
      "createdAt",
      "policyVersion",
      "releaseStatus",
      "learnerAssignment",
      "bankAssignment",
    ],
    "QUARANTINED_CANDIDATE",
  );
  if (input.contractVersion !== "QuarantinedQuestionCandidateV1") {
    fail("CANDIDATE_CONTRACT_VERSION_MISMATCH");
  }
  if (!QF0_CANDIDATE_LIFECYCLES.includes(input.lifecycle)) {
    fail("CANDIDATE_LIFECYCLE_INVALID");
  }
  if (input.lifecycle !== "QUARANTINED") fail("NON_QUARANTINED_CANDIDATE_DENIED");
  if (
    input.releaseStatus !== null ||
    input.learnerAssignment !== null ||
    input.bankAssignment !== null
  ) {
    fail("RELEASE_LEARNER_OR_BANK_ASSIGNMENT_DENIED");
  }
  const rebuilt = constructQuarantinedQuestionCandidateV1({
    candidateId: input.candidateId,
    lifecycle: "QUARANTINED",
    candidateContent: input.candidateContent,
    contentDigest: input.contentDigest,
    blueprintRef: input.blueprintRef,
    answerSpecificationDigest: input.answerSpecificationDigest,
    sourceEligibilityDecision: input.sourceEligibilityDecision,
    generatorExecutionIdentity: input.generatorExecutionIdentity,
    independentExecutionIdentities: input.independentExecutionIdentities,
    validatorProfileRefs: input.validatorProfileRefs,
    createdAt: input.createdAt,
    policyVersion: input.policyVersion,
  });
  if (canonicalizeQf0ValueV1(input) !== canonicalizeQf0ValueV1(rebuilt)) {
    fail("CANDIDATE_CHECKSUM_OR_BINDING_MISMATCH");
  }
  return immutableJson(input);
}

function scarcityMaterial(
  input: Omit<ScarcityInputV1, "eventId">,
): Omit<BodylessBankScarcityEventV1, "eventId" | "eventChecksum"> {
  assertExactKeys(
    input,
    [
      "examPackageRef",
      "subjectRef",
      "skillConceptRef",
      "problemFamilyRef",
      "requestedDifficultyBand",
      "requestedTaskProfile",
      "capacityShortageCount",
      "policyVersion",
      "occurredAt",
    ],
    "SCARCITY_EVENT_INPUT",
  );
  for (const [label, value] of [
    ["EXAM_PACKAGE_REF", input.examPackageRef],
    ["SUBJECT_REF", input.subjectRef],
    ["SKILL_CONCEPT_REF", input.skillConceptRef],
    ["PROBLEM_FAMILY_REF", input.problemFamilyRef],
    ["REQUESTED_DIFFICULTY_BAND", input.requestedDifficultyBand],
    ["REQUESTED_TASK_PROFILE", input.requestedTaskProfile],
    ["SCARCITY_POLICY_VERSION", input.policyVersion],
  ] as const) {
    assertText(value, label);
  }
  if (
    !Number.isSafeInteger(input.capacityShortageCount) ||
    input.capacityShortageCount < 1 ||
    input.capacityShortageCount > MAX_SCARCITY_COUNT
  ) {
    fail("CAPACITY_SHORTAGE_COUNT_INVALID");
  }
  assertCanonicalInstant(input.occurredAt, "SCARCITY_OCCURRED_AT");
  return immutableJson({
    contractVersion: "BodylessBankScarcityEventV1" as const,
    ...input,
  });
}

export function deriveBodylessBankScarcityEventIdV1(
  input: Omit<ScarcityInputV1, "eventId">,
): string {
  const checksum = digestDeterministicQf0ValueV1(scarcityMaterial(input));
  return `qf0_scarcity_${checksum.slice("sha256:".length)}`;
}

export function createBodylessBankScarcityEventV1(
  input: ScarcityInputV1,
): BodylessBankScarcityEventV1 {
  assertExactKeys(
    input,
    [
      "eventId",
      "examPackageRef",
      "subjectRef",
      "skillConceptRef",
      "problemFamilyRef",
      "requestedDifficultyBand",
      "requestedTaskProfile",
      "capacityShortageCount",
      "policyVersion",
      "occurredAt",
    ],
    "SCARCITY_EVENT_CONSTRUCTION_INPUT",
  );
  const { eventId, ...withoutId } = input;
  const material = scarcityMaterial(withoutId);
  const eventChecksum = digestDeterministicQf0ValueV1(material);
  const expectedId = `qf0_scarcity_${eventChecksum.slice("sha256:".length)}`;
  if (eventId !== expectedId) fail("SCARCITY_EVENT_ID_MISMATCH");
  return immutableJson({
    ...material,
    eventId,
    eventChecksum,
  });
}

export function assertQf0SourceOnlyBoundaryV1(): Readonly<{
  contractVersion: typeof QF0_CONTRACT_VERSION;
  network: false;
  providerExecution: false;
  database: false;
  persistence: false;
  release: false;
  learnerAssignment: false;
  bankAssignment: false;
}> {
  return Object.freeze({
    contractVersion: QF0_CONTRACT_VERSION,
    network: false,
    providerExecution: false,
    database: false,
    persistence: false,
    release: false,
    learnerAssignment: false,
    bankAssignment: false,
  });
}
