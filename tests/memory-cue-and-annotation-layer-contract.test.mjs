import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const P = {
  active: "docs/strategy/ACTIVE-MASTER-PLAN.md",
  annex: "docs/strategy/dabangil-memory-cue-and-annotation-layer-v1-2026-08-06.md",
  decision: "docs/decisions/2026-08-06-owner-memory-cue-and-annotation-layer.md",
  contract: "config/dabangil-memory-cue-and-annotation-layer-v1.json",
  qa: "docs/qa/memory-cue-and-annotation-layer-v1-validation.md",
};

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const contract = JSON.parse(read(P.contract));

const sorted = (values) => [...values].sort();
const VALID_SHA256 = `sha256:${"a".repeat(64)}`;

function validAnchor(overrides = {}) {
  const kind = overrides.kind ?? "LEARNER_ATTEMPT_RANGE";
  const defaultsByKind = {
    CONCEPT_NODE: ["SHARED_OWNED", "NONE", "VESG_CONCEPT_NODE"],
    FORMULA_NODE: ["SHARED_OWNED", "NONE", "VESG_FORMULA_NODE"],
    PROCEDURE_STEP: ["SHARED_OWNED", "NONE", "VESG_PROCEDURE_STEP"],
    QUESTION_UNIT: ["SHARED_OWNED", "NONE", "VERSIONED_QUESTION_UNIT"],
    OWNED_CONTENT_RANGE: ["SHARED_OWNED", "SHARED_STABLE_SELECTOR", "OWNED_CONTENT_REVISION_RANGE"],
    OFFICIAL_PERMITTED_RANGE: ["SHARED_OFFICIAL_PERMITTED", "SHARED_STABLE_SELECTOR", "OFFICIAL_PERMITTED_CONTENT_REVISION_RANGE"],
    LEARNER_ATTEMPT_RANGE: ["LEARNER_PRIVATE", "VAULT_LOCAL_ONLY", "LEARNER_ATTEMPT_REVISION_RANGE"],
    PRIVATE_SOURCE_RANGE: ["LEARNER_PRIVATE", "VAULT_LOCAL_ONLY", "PRIVATE_SOURCE_REVISION_RANGE"],
  };
  const [domain, bodyLocatorPolicy, targetType] = defaultsByKind[kind]
    ?? defaultsByKind.CONCEPT_NODE;
  const candidate = {
    anchorId: "anchor-1",
    profileId: "profile-appraiser-second",
    kind,
    domain,
    targetType,
    targetRevisionId: "revision-1",
    targetDigest: VALID_SHA256,
    bodyLocatorPolicy,
    rightsManifestId: "rights-manifest-1",
    status: "ACTIVE",
    ...overrides,
  };
  if (["LEARNER_ATTEMPT_RANGE", "PRIVATE_SOURCE_RANGE"].includes(kind)) {
    candidate.ownerBindingRef ??= "pob_owner_scope_local_1";
    candidate.vaultLocalTargetRef ??= "vault_target_1";
    candidate.targetDigestScope ??= "VAULT_LOCAL_INTEGRITY_METADATA_ONLY";
  }
  if (kind === "QUESTION_UNIT") candidate.rightsState ??= candidate.domain;
  if (kind === "OFFICIAL_PERMITTED_RANGE") {
    candidate.itemRightsManifestId ??= "irm_item_rights_manifest_1";
  }
  return candidate;
}

function canonicalItemRightsBoundary(candidate, overrides = {}) {
  return {
    source: "CANONICAL_SERVER_ITEM_RIGHTS_MANIFEST_BOUNDARY",
    serverSide: true,
    authoritative: true,
    resolved: true,
    matchingRecordCount: 1,
    ambiguous: false,
    conflicting: false,
    stale: false,
    replayed: false,
    clientInferred: false,
    crossRevision: false,
    itemRightsManifestId: candidate.itemRightsManifestId,
    anchorId: candidate.anchorId,
    kind: candidate.kind,
    domain: candidate.domain,
    targetType: candidate.targetType,
    targetRevisionId: candidate.targetRevisionId,
    rightsManifestId: candidate.rightsManifestId,
    ...overrides,
  };
}

function canonicalPrivateOwnerBoundary(candidate, overrides = {}) {
  const authenticatedLearnerId = overrides.authenticatedLearnerId ?? "learner-1";
  const tenantScopeId = overrides.tenantScopeId ?? "tenant-1";
  const baseResolution = {
    source: "CANONICAL_SERVER_PRIVATE_ANCHOR_OWNER_BOUNDARY",
    serverSide: true,
    authoritative: true,
    resolved: true,
    matchingRecordCount: 1,
    ambiguous: false,
    conflicting: false,
    stale: false,
    replayed: false,
    clientInferred: false,
    crossLearner: false,
    crossTenant: false,
    ownerBindingRef: candidate.ownerBindingRef,
    authenticatedLearnerId,
    tenantScopeId,
    anchorId: candidate.anchorId,
    kind: candidate.kind,
    vaultLocalTargetRef: candidate.vaultLocalTargetRef,
    targetRevisionId: candidate.targetRevisionId,
    targetDigest: candidate.targetDigest,
    targetDigestScope: candidate.targetDigestScope,
    bodyLocatorPolicy: candidate.bodyLocatorPolicy,
  };
  const resolution = Object.hasOwn(overrides, "resolution")
    ? overrides.resolution == null
      ? overrides.resolution
      : { ...baseResolution, ...overrides.resolution }
    : baseResolution;
  return {
    authenticatedLearnerId,
    tenantScopeId,
    resolution,
    ...Object.fromEntries(
      Object.entries(overrides).filter(([key]) => ![
        "authenticatedLearnerId",
        "tenantScopeId",
        "resolution",
      ].includes(key)),
    ),
  };
}

function validatePrivateAnchorOwnerBinding(candidate, ownerBoundary, anchorContract) {
  const gate = anchorContract.privateOwnerBindingGate;
  const fail = (reason) => ({ accepted: false, disposition: "REJECT", reason });
  for (const field of gate.callerAssertionFieldsForbidden) {
    if (Object.hasOwn(candidate, field)) return fail(`CALLER_OWNER_ASSERTION_${field}_FORBIDDEN`);
  }
  for (const field of gate.candidateConditionalRequiredFields) {
    if (!Object.hasOwn(candidate, field)) return fail(`PRIVATE_OWNER_BINDING_${field}_MISSING`);
    const schema = gate.candidateFieldSchemas[field];
    const value = candidate[field];
    const valid = schema.type === "string"
      ? typeof value === "string"
        && value.trim() === value
        && new RegExp(schema.pattern).test(value)
      : schema.type === "literal" && value === schema.value;
    if (!valid) return fail(`PRIVATE_OWNER_BINDING_${field}_INVALID`);
  }
  const contextSchema = gate.authenticatedContextSchema;
  if (
    !ownerBoundary
    || typeof ownerBoundary !== "object"
    || Array.isArray(ownerBoundary)
    || JSON.stringify(sorted(Object.keys(ownerBoundary)))
      !== JSON.stringify(sorted(contextSchema.requiredFields))
  ) return fail("AUTHORITATIVE_OWNER_BOUNDARY_INVALID");
  const idPattern = new RegExp(contextSchema.idPattern);
  for (const field of gate.authenticatedScopeFields) {
    const value = ownerBoundary[field];
    if (typeof value !== "string" || value.trim() !== value || !idPattern.test(value)) {
      return fail(`AUTHENTICATED_OWNER_SCOPE_${field}_INVALID`);
    }
  }
  const resolution = ownerBoundary.resolution;
  const resolutionSchema = gate.resolutionSchema;
  if (
    !resolution
    || typeof resolution !== "object"
    || Array.isArray(resolution)
    || JSON.stringify(sorted(Object.keys(resolution)))
      !== JSON.stringify(sorted(resolutionSchema.requiredFields))
  ) return fail("PRIVATE_OWNER_RESOLUTION_SCHEMA_INVALID");
  if (
    resolution.source !== gate.resolutionSource
    || resolution.matchingRecordCount !== gate.exactMatchingRecordCount
  ) return fail("PRIVATE_OWNER_RESOLUTION_SOURCE_OR_COUNT_INVALID");
  for (const [field, requiredValue] of Object.entries(gate.requiredBooleanStates)) {
    if (resolution[field] !== requiredValue) {
      return fail(`PRIVATE_OWNER_RESOLUTION_${field}_INVALID`);
    }
  }
  for (const field of gate.authenticatedScopeFields) {
    if (resolution[field] !== ownerBoundary[field]) {
      return fail(`PRIVATE_OWNER_RESOLUTION_${field}_MISMATCH`);
    }
  }
  for (const field of gate.exactPrivateAnchorAndVaultBindingFields) {
    if (resolution[field] !== candidate[field]) {
      return fail(`PRIVATE_OWNER_RESOLUTION_${field}_MISMATCH`);
    }
  }
  return { accepted: true };
}

function validateItemRightsManifestBinding(candidate, itemRightsBoundary, anchorContract) {
  const gate = anchorContract.itemRightsManifestBindingGate;
  const fail = (reason) => ({ accepted: false, disposition: "REJECT", reason });
  for (const field of gate.callerAssertionFieldsForbidden) {
    if (Object.hasOwn(candidate, field)) return fail(`CALLER_ITEM_RIGHTS_ASSERTION_${field}_FORBIDDEN`);
  }
  const value = candidate[gate.candidateField];
  const schema = gate.candidateFieldSchema;
  if (
    typeof value !== "string"
    || value.trim() !== value
    || value.length < schema.minLength
    || !new RegExp(schema.pattern).test(value)
  ) return fail("ITEM_RIGHTS_MANIFEST_ID_INVALID");
  if (
    !itemRightsBoundary
    || typeof itemRightsBoundary !== "object"
    || Array.isArray(itemRightsBoundary)
    || JSON.stringify(sorted(Object.keys(itemRightsBoundary)))
      !== JSON.stringify(sorted(gate.resolutionSchema.requiredFields))
  ) return fail("ITEM_RIGHTS_RESOLUTION_SCHEMA_INVALID");
  if (
    itemRightsBoundary.source !== gate.resolutionSource
    || itemRightsBoundary.matchingRecordCount !== gate.exactMatchingRecordCount
  ) return fail("ITEM_RIGHTS_RESOLUTION_SOURCE_OR_COUNT_INVALID");
  for (const [field, requiredValue] of Object.entries(gate.requiredBooleanStates)) {
    if (itemRightsBoundary[field] !== requiredValue) {
      return fail(`ITEM_RIGHTS_RESOLUTION_${field}_INVALID`);
    }
  }
  for (const field of gate.exactAnchorBindingFields) {
    if (itemRightsBoundary[field] !== candidate[field]) {
      return fail(`ITEM_RIGHTS_RESOLUTION_${field}_MISMATCH`);
    }
  }
  return { accepted: true };
}

function anchorPolicyIntegrity(anchorContract = contract.anchors) {
  const declaredKinds = sorted(anchorContract.kinds);
  const mappedKinds = sorted(Object.keys(anchorContract.kindPolicy ?? {}));
  if (JSON.stringify(declaredKinds) !== JSON.stringify(mappedKinds)) {
    return { valid: false, reason: "KIND_POLICY_KEY_SET_MISMATCH" };
  }
  if (
    anchorContract.defaultKindPolicyAllowed !== false
    || anchorContract.fallbackKindPolicyAllowed !== false
    || Object.keys(anchorContract.kindPolicy).some((key) => /default|fallback|unknown|\*/i.test(key))
  ) {
    return { valid: false, reason: "FALLBACK_POLICY_FORBIDDEN" };
  }
  return { valid: true };
}

function validateAnchor(
  candidate,
  anchorContract = contract.anchors,
  ownerBoundary,
  itemRightsBoundary,
) {
  const integrity = anchorPolicyIntegrity(anchorContract);
  if (!integrity.valid) return { accepted: false, disposition: "REJECT", reason: integrity.reason };

  const policy = anchorContract.kindPolicy[candidate.kind];
  if (!policy) {
    return {
      accepted: false,
      disposition: anchorContract.unknownKindBehavior,
      reason: "UNKNOWN_KIND",
    };
  }
  if (
    JSON.stringify(sorted(Object.keys(anchorContract.requiredBindingSchema ?? {})))
    !== JSON.stringify(sorted(anchorContract.requiredBindings))
  ) {
    return {
      accepted: false,
      disposition: "REJECT",
      reason: "REQUIRED_BINDING_SCHEMA_KEY_SET_MISMATCH",
    };
  }
  if (candidate.requiredBindingsAmbiguous === true) {
    return { accepted: false, disposition: "REJECT", reason: "REQUIRED_BINDING_AMBIGUOUS" };
  }
  if (Array.isArray(candidate.conflictingRequiredBindings) && candidate.conflictingRequiredBindings.length > 0) {
    return { accepted: false, disposition: "REJECT", reason: "REQUIRED_BINDING_INCONSISTENT" };
  }
  for (const field of anchorContract.requiredBindings) {
    if (!Object.hasOwn(candidate, field)) {
      return { accepted: false, disposition: "REJECT", reason: `REQUIRED_BINDING_${field}_MISSING` };
    }
    const schema = anchorContract.requiredBindingSchema[field];
    const value = candidate[field];
    let valid = false;
    if (schema.type === "string") {
      valid = typeof value === "string"
        && value.trim() === value
        && value.length >= (schema.minLength ?? 0)
        && (schema.pattern == null || new RegExp(schema.pattern).test(value));
    } else if (schema.type === "enum") {
      const sourceKey = schema.valuesSource.split(".").at(-1);
      valid = typeof value === "string" && anchorContract[sourceKey]?.includes(value) === true;
    }
    if (!valid) {
      return { accepted: false, disposition: "REJECT", reason: `REQUIRED_BINDING_${field}_INVALID` };
    }
  }
  if (!policy.allowedDomains.includes(candidate.domain)) {
    return { accepted: false, disposition: "REJECT", reason: "DOMAIN_CONFLICT" };
  }
  if (!policy.allowedBodyLocatorPolicies.includes(candidate.bodyLocatorPolicy)) {
    return { accepted: false, disposition: "REJECT", reason: "LOCATOR_CONFLICT" };
  }
  if (!policy.allowedTargetTypes.includes(candidate.targetType)) {
    return { accepted: false, disposition: "REJECT", reason: "TARGET_TYPE_CONFLICT" };
  }
  if (policy.rightsStateRequired && !candidate.rightsState) {
    return { accepted: false, disposition: "REJECT", reason: "RIGHTS_STATE_REQUIRED" };
  }
  if (policy.domainRightsConsistencyRequired && candidate.rightsState !== candidate.domain) {
    return { accepted: false, disposition: "REJECT", reason: "RIGHTS_DOMAIN_CONFLICT" };
  }
  if (policy.itemLevelRightsRequired) {
    const itemRightsValidation = validateItemRightsManifestBinding(
      candidate,
      itemRightsBoundary,
      anchorContract,
    );
    if (!itemRightsValidation.accepted) return itemRightsValidation;
  }
  if (policy.targetDigestPolicy && candidate.targetDigestScope !== policy.targetDigestPolicy) {
    return { accepted: false, disposition: "REJECT", reason: "PRIVATE_DIGEST_SCOPE_CONFLICT" };
  }
  if (policy.ownerBound) {
    const ownerValidation = validatePrivateAnchorOwnerBinding(
      candidate,
      ownerBoundary,
      anchorContract,
    );
    if (!ownerValidation.accepted) return ownerValidation;
  }
  return { accepted: true, policy };
}

function projectPrivateAnchorOutsideVault(
  candidate,
  destination = "PRIVATE_METADATA_RECEIPT",
  ownerBoundary,
) {
  const validation = validateAnchor(candidate, contract.anchors, ownerBoundary);
  if (!validation.accepted) return validation;
  const projection = validation.policy.nonVaultProjection;
  if (!projection) return { accepted: false, reason: "NON_PRIVATE_ANCHOR" };
  if (projection.forbiddenDestinations.includes(destination)) {
    return { accepted: false, reason: "FORBIDDEN_PROJECTION_DESTINATION" };
  }
  return {
    accepted: true,
    receipt: {
      projectionType: projection.mode,
      anchorKind: candidate.kind,
      privateBodyPresent: false,
      contentBearing: false,
    },
  };
}

function canonicalAttemptResolution(overrides = {}) {
  return {
    source: "CANONICAL_SERVER_ATTEMPT_LEDGER",
    attemptId: "attempt-1",
    learnerPrivateScopeId: "learner-1",
    canonicalAttemptState: "SUBMITTED",
    matchingRecordCount: 1,
    known: true,
    resolved: true,
    submitted: true,
    submittedBeforeExposure: true,
    crossLearner: false,
    crossAttempt: false,
    mismatched: false,
    replayed: false,
    preSubmission: false,
    closed: false,
    stale: false,
    cancelled: false,
    ambiguous: false,
    conflicting: false,
    clientInferred: false,
    ...overrides,
  };
}

function canonicalOpenAttemptResolution(overrides = {}) {
  return canonicalAttemptResolution({
    canonicalAttemptState: "INDEPENDENT_ATTEMPT_OPEN",
    submitted: false,
    submittedBeforeExposure: false,
    preSubmission: true,
    ...overrides,
  });
}

function canonicalReviewOnlyResolution(overrides = {}) {
  const base = {
    source: "CANONICAL_SERVER_CUE_TIMING_CLASSIFICATION_RESOLVER",
    known: true,
    resolved: true,
    matchingResolutionCount: 1,
    ambiguous: false,
    conflicting: false,
    crossLearner: false,
    stale: false,
    clientInferred: false,
    canonicalTiming: "REVIEW_ONLY",
    canonicalAssistanceClassification: "NONE",
    canonicalExposureRecordState: "COMMITTED",
    learnerPrivateScopeId: "learner-1",
    attemptScopeId: "question-scope-1",
    cueId: "cue-1",
    cueRevisionId: "cue-revision-1",
    requestId: "request-1",
    openIndependentAttemptResolution: {
      source: "CANONICAL_SERVER_ATTEMPT_LEDGER",
      queriedCanonicalAttemptState: "INDEPENDENT_ATTEMPT_OPEN",
      learnerPrivateScopeId: "learner-1",
      attemptScopeId: "question-scope-1",
      matchingRecordCount: 0,
      known: true,
      resolved: true,
      ambiguous: false,
      conflicting: false,
      crossLearner: false,
      stale: false,
      clientInferred: false,
    },
  };
  const resolution = { ...base, ...overrides };
  if (Object.hasOwn(overrides, "openIndependentAttemptResolution")) {
    resolution.openIndependentAttemptResolution = overrides.openIndependentAttemptResolution == null
      ? overrides.openIndependentAttemptResolution
      : { ...base.openIndependentAttemptResolution, ...overrides.openIndependentAttemptResolution };
  }
  return resolution;
}

function reviewOnlyRequest(overrides = {}) {
  return {
    timing: "REVIEW_ONLY",
    assistanceClassification: "NONE",
    learnerPrivateScopeId: "learner-1",
    attemptScopeId: "question-scope-1",
    cueId: "cue-1",
    cueRevisionId: "cue-revision-1",
    requestId: "request-1",
    reviewOnlyResolution: canonicalReviewOnlyResolution(),
    canonicalRecordCommitted: true,
    recordFailure: false,
    renderSubmitRaceDetected: false,
    ...overrides,
  };
}

function cueEvent(overrides = {}) {
  const event = {
    timing: "AFTER_RESPONSE",
    assistanceClassification: "NONE",
    derivedFrom: "CANONICAL_ASSISTANCE_EXPOSURE_LEDGER",
    ordering: "ORDERED",
    canonicalRecordCommitted: true,
    recordFailure: false,
    renderSubmitRaceDetected: false,
    attemptId: "attempt-1",
    learnerPrivateScopeId: "learner-1",
    attemptResolution: canonicalAttemptResolution(),
    ...overrides,
  };
  if (event.timing === "BEFORE_RESPONSE") {
    return { ...event, ...cueRenderRequest(), ...overrides };
  }
  if (
    event.timing === "REVIEW_ONLY"
    && !Object.hasOwn(overrides, "attemptId")
    && !Object.hasOwn(overrides, "attemptResolution")
  ) {
    delete event.attemptId;
    delete event.attemptResolution;
    event.attemptScopeId = overrides.attemptScopeId ?? "question-scope-1";
    event.cueId = overrides.cueId ?? "cue-1";
    event.cueRevisionId = overrides.cueRevisionId ?? "cue-revision-1";
    event.requestId = overrides.requestId ?? "request-1";
    event.reviewOnlyResolution = Object.hasOwn(overrides, "reviewOnlyResolution")
      ? overrides.reviewOnlyResolution
      : canonicalReviewOnlyResolution();
  }
  return event;
}

function hasExactCanonicalAttemptResolutionStates(resolution) {
  const stateGate = contract.cueExposure.canonicalAttemptResolutionStateGate;
  return resolution !== null
    && typeof resolution === "object"
    && !Array.isArray(resolution)
    && Object.entries(stateGate.requiredExactPrimitiveBooleanStates).every(
      ([field, expected]) => resolution[field] === expected,
    );
}

function validateCanonicalAttemptBinding(subject) {
  const gate = contract.cueExposure.afterResponseGate;
  if (
    subject.clientAttemptId !== undefined
    || subject.inferLatestAttempt === true
    || subject.clientLearnerPrivateScopeId !== undefined
    || subject.callerLearnerPrivateScopeId !== undefined
    || subject.inferLearnerPrivateScopeId === true
  ) {
    return { accepted: false, reason: "UNTRUSTED_OR_INFERRED_ATTEMPT_OR_LEARNER_SCOPE" };
  }
  if (typeof subject.attemptId !== "string" || subject.attemptId.trim().length === 0) {
    return { accepted: false, reason: "EXACT_ATTEMPT_ID_REQUIRED" };
  }
  const learnerScopeRule = gate.learnerPrivateScopeBindingRule;
  const learnerScope = subject[learnerScopeRule.field];
  if (
    typeof learnerScope !== learnerScopeRule.requiredPrimitiveType
    || learnerScope.trim() !== learnerScope
    || learnerScope.length < learnerScopeRule.minimumLength
  ) return { accepted: false, reason: "EXACT_LEARNER_PRIVATE_SCOPE_ID_REQUIRED" };
  const resolution = subject.attemptResolution;
  if (!resolution) return { accepted: false, reason: "ATTEMPT_RESOLUTION_MISSING" };
  if (resolution.source !== gate.attemptResolutionSource) {
    return { accepted: false, reason: "ATTEMPT_RESOLUTION_SOURCE_INVALID" };
  }
  if (!hasExactCanonicalAttemptResolutionStates(resolution)) {
    return { accepted: false, reason: "ATTEMPT_RESOLUTION_STATE_INVALID" };
  }
  const resolvedLearnerScope = resolution[learnerScopeRule.field];
  if (
    typeof resolvedLearnerScope !== learnerScopeRule.requiredPrimitiveType
    || resolvedLearnerScope.trim() !== resolvedLearnerScope
    || resolvedLearnerScope.length < learnerScopeRule.minimumLength
  ) return { accepted: false, reason: "CANONICAL_LEARNER_PRIVATE_SCOPE_ID_REQUIRED" };
  if (
    resolution.matchingRecordCount !== gate.exactMatchingRecordCount
    || Object.entries(gate.requiredResolutionBooleanStates).some(
      ([field, expected]) => resolution[field] !== expected,
    )
  ) return { accepted: false, reason: "ATTEMPT_RESOLUTION_INVALID" };
  for (const field of gate.exactBindingFields) {
    if (resolution[field] !== subject[field]) {
      return { accepted: false, reason: `ATTEMPT_${field.toUpperCase()}_MISMATCH` };
    }
  }
  if (resolution.canonicalAttemptState !== gate.requiredCanonicalAttemptState) {
    return { accepted: false, reason: "ATTEMPT_NOT_SUBMITTED" };
  }
  return { accepted: true };
}

function hasExactCanonicalRecordCommit(subject) {
  const gate = contract.cueExposure.canonicalRecordCommittedGate;
  const value = subject[gate.field];
  return typeof value === gate.requiredPrimitiveType && value === gate.requiredValue;
}

function hasExactNoRecordFailure(subject) {
  const gate = contract.cueExposure.recordFailureGate;
  const value = subject[gate.field];
  return typeof value === gate.requiredPrimitiveType && value === gate.requiredExactValue;
}

function hasAllowedTimingClassification(subject) {
  const allowed = contract.cueExposure.closedTimingClassificationMap[subject.timing];
  return Array.isArray(allowed) && allowed.includes(subject.assistanceClassification);
}

function authorizeCanonicalReviewOnlyCueRender(subject) {
  const gate = contract.cueExposure.reviewOnlyGate;
  const fail = (reason) => ({
    accepted: false,
    mayRenderCueBytes: false,
    independentEvidenceEligible: false,
    gateId: gate.gateId,
    reason,
  });
  if (subject.renderSubmitRaceDetected === true) {
    return fail(contract.cueExposure.renderSubmitRaceBehavior);
  }
  if (!hasExactNoRecordFailure(subject)) return fail(contract.cueExposure.recordFailureBehavior);
  if (subject.ordering !== undefined && subject.ordering !== "ORDERED") {
    return fail(contract.cueExposure.ambiguousOrderingBehavior);
  }
  if (!hasExactCanonicalRecordCommit(subject)) return fail(contract.cueExposure.recordFailureBehavior);
  if (
    Object.hasOwn(subject, "canonicalExposureRecordCommitted")
    || subject.clientEvent !== undefined
    || subject.clientTiming !== undefined
    || subject.clientAssistanceClassification !== undefined
    || subject.inferTiming === true
  ) return fail("UNTRUSTED_REVIEW_ONLY_INPUT");
  if (
    subject.derivedFrom !== undefined
    && subject.derivedFrom !== contract.cueExposure.timingAndClassificationSource
  ) return fail("UNTRUSTED_REVIEW_ONLY_EVENT_DERIVATION");

  const resolution = subject.reviewOnlyResolution;
  if (!resolution) return fail("CANONICAL_REVIEW_ONLY_RESOLUTION_MISSING");
  if (
    resolution.source !== gate.canonicalResolutionSource
    || Object.entries(gate.requiredResolutionBooleanStates).some(
      ([field, expected]) => resolution[field] !== expected,
    )
    || resolution.matchingResolutionCount !== gate.exactMatchingResolutionCount
  ) return fail("CANONICAL_REVIEW_ONLY_RESOLUTION_INVALID");
  if (
    resolution.canonicalTiming !== gate.requiredCanonicalTiming
    || !gate.allowedCanonicalAssistanceClassifications.includes(
      resolution.canonicalAssistanceClassification,
    )
  ) return fail("CANONICAL_REVIEW_ONLY_TIMING_CLASSIFICATION_INVALID");
  if (
    (subject.timing !== undefined && subject.timing !== resolution.canonicalTiming)
    || (
      subject.assistanceClassification !== undefined
      && subject.assistanceClassification !== resolution.canonicalAssistanceClassification
    )
  ) return fail("REVIEW_ONLY_CALLER_CANONICAL_CONFLICT");
  for (const field of gate.exactBindingFields) {
    if (
      typeof subject[field] !== "string"
      || subject[field].trim().length === 0
      || resolution[field] !== subject[field]
    ) return fail(`REVIEW_ONLY_${field.toUpperCase()}_MISMATCH`);
  }
  if (resolution.canonicalExposureRecordState !== gate.canonicalExposureRecordStateRequired) {
    return fail("CANONICAL_REVIEW_ONLY_EXPOSURE_RECORD_NOT_COMMITTED");
  }
  const openAttempt = resolution.openIndependentAttemptResolution;
  if (
    !openAttempt
    || openAttempt.source !== gate.canonicalAttemptAbsenceSource
    || !hasExactCanonicalAttemptResolutionStates(openAttempt)
    || openAttempt.queriedCanonicalAttemptState !== gate.openAttemptStateFilter
    || openAttempt.known !== true
    || openAttempt.matchingRecordCount !== gate.matchingCanonicalOpenIndependentAttemptCount
    || openAttempt.ambiguous !== false
    || openAttempt.crossLearner !== false
    || openAttempt.stale !== false
    || openAttempt.learnerPrivateScopeId !== subject.learnerPrivateScopeId
    || openAttempt.attemptScopeId !== subject.attemptScopeId
  ) return fail("MATCHING_CANONICAL_OPEN_ATTEMPT_NOT_PROVEN_ABSENT");
  if (subject.attemptId !== undefined || subject.attemptResolution !== undefined) {
    const binding = validateCanonicalAttemptBinding(subject);
    if (!binding.accepted) return fail(binding.reason);
  }
  return {
    accepted: true,
    mayRenderCueBytes: true,
    independentEvidenceEligible: false,
    evidenceNeutral: true,
    timing: gate.requiredCanonicalTiming,
    assistanceClassification: resolution.canonicalAssistanceClassification,
    gateId: gate.gateId,
  };
}

function authorizeExactPreResponseCueRender(subject) {
  const cue = contract.cueExposure;
  const gate = cue.beforeResponseGate;
  const fail = (reason) => ({
    accepted: false,
    mayRenderCueBytes: false,
    independentEvidenceEligible: false,
    gateId: gate.gateId,
    reason,
  });

  if (subject.timing !== "BEFORE_RESPONSE") return fail("PRE_RESPONSE_GATE_TIMING_INVALID");
  if (subject.renderSubmitRaceDetected === true) {
    return fail(cue.preResponseAtomicCommit.renderSubmitRaceBehavior);
  }
  if (!hasExactNoRecordFailure(subject)) return fail(cue.preResponseAtomicCommit.recordFailureBehavior);
  if (!hasExactCanonicalRecordCommit(subject)) {
    return fail(cue.preResponseAtomicCommit.recordFailureBehavior);
  }
  if (subject.clientAttemptId !== undefined || subject.inferLatestAttempt === true) {
    return fail("UNTRUSTED_OR_INFERRED_ATTEMPT_ID");
  }
  if (
    subject.canonicalAttemptStateSource !== gate.attemptResolutionSource
    || subject.clientAttemptState !== undefined
  ) return fail("UNTRUSTED_ATTEMPT_STATE");
  if (typeof subject.attemptId !== "string" || subject.attemptId.trim().length === 0) {
    return fail("EXACT_ATTEMPT_ID_REQUIRED");
  }
  if (
    typeof subject.learnerPrivateScopeId !== "string"
    || subject.learnerPrivateScopeId.trim().length === 0
  ) return fail("EXACT_LEARNER_PRIVATE_SCOPE_ID_REQUIRED");

  const resolution = subject.attemptResolution;
  if (!resolution) return fail("ATTEMPT_RESOLUTION_MISSING");
  if (resolution.source !== gate.attemptResolutionSource) {
    return fail("ATTEMPT_RESOLUTION_SOURCE_INVALID");
  }
  if (
    !hasExactCanonicalAttemptResolutionStates(resolution)
    || resolution.known !== true
    || resolution.matchingRecordCount !== gate.exactMatchingRecordCount
    || resolution.ambiguous !== false
    || resolution.crossLearner !== false
    || resolution.crossAttempt !== false
    || resolution.mismatched !== false
    || resolution.stale !== false
    || resolution.cancelled !== false
    || resolution.replayed !== false
    || resolution.closed !== false
    || resolution.submitted !== false
  ) return fail("ATTEMPT_RESOLUTION_INVALID");
  for (const field of gate.attemptBindingFields) {
    if (resolution[field] !== subject[field]) {
      return fail(`ATTEMPT_${field.toUpperCase()}_MISMATCH`);
    }
  }
  if (
    resolution.canonicalAttemptState !== gate.eligibleCanonicalAttemptState
    || subject.canonicalAttemptState !== resolution.canonicalAttemptState
  ) return fail("INDEPENDENT_ATTEMPT_NOT_OPEN");

  const confirmation = subject.confirmation;
  if (!confirmation) {
    if (subject.clientConfirmationBoolean === true) return fail("CLIENT_BOOLEAN_INSUFFICIENT");
    if (subject.preselectedConsent === true) return fail("PRESELECTED_CONSENT_INSUFFICIENT");
    return fail("CONFIRMATION_MISSING");
  }
  if (confirmation.source !== gate.confirmationRecordSource) {
    return fail("CONFIRMATION_SOURCE_INVALID");
  }
  if (confirmation.serverRecorded !== true || confirmation.deliberate !== true) {
    return fail("CONFIRMATION_NOT_DELIBERATE_SERVER_RECORD");
  }
  if (confirmation.active !== true) return fail("CONFIRMATION_NOT_ACTIVE");
  if (confirmation.status === "CANCELLED" || confirmation.cancelled === true) {
    return fail("CONFIRMATION_CANCELLED");
  }
  if (confirmation.status !== gate.acceptedConfirmationState) {
    return fail("CONFIRMATION_STATE_INVALID");
  }
  if (confirmation.stale !== false) return fail("CONFIRMATION_STALE");
  if (confirmation.replayed !== gate.confirmationReplayedMustExactlyEqual) {
    return fail("CONFIRMATION_REPLAYED");
  }
  if (confirmation.consumed !== false || confirmation.singleUse !== true) {
    return fail("CONFIRMATION_REPLAYED");
  }
  if (
    confirmation.ambiguous !== false
    || confirmation.matchingRecordCount !== gate.exactMatchingRecordCount
  ) return fail("CONFIRMATION_AMBIGUOUS");
  for (const field of gate.confirmationBindingFields) {
    if (confirmation[field] !== subject[field]) {
      return fail(`CONFIRMATION_${field.toUpperCase()}_MISMATCH`);
    }
  }
  if (JSON.stringify(subject.commitSteps) !== JSON.stringify(cue.preResponseAtomicCommit.orderedSteps)) {
    return fail(cue.preResponseAtomicCommit.partialCommitBehavior);
  }
  return {
    accepted: true,
    mayRenderCueBytes: true,
    canonicalAttemptState: cue.preResponseAtomicCommit.postCommitAttemptState,
    independentEvidenceEligible: cue.preResponseAtomicCommit.postCommitIndependentEvidenceEligible,
    positiveLearningEvidence: false,
    atomicCommitCompletedBeforeRender: true,
    gateId: gate.gateId,
    orderedSteps: [...subject.commitSteps, cue.preResponseAtomicCommit.renderStep],
  };
}

function validateCueExposureEvent(event) {
  const cue = contract.cueExposure;
  if (!hasExactNoRecordFailure(event)) {
    return { accepted: false, mayRenderCueBytes: false, reason: cue.recordFailureBehavior };
  }
  if (!hasExactCanonicalRecordCommit(event)) {
    return { accepted: false, mayRenderCueBytes: false, reason: cue.recordFailureBehavior };
  }
  if (event.derivedFrom !== cue.timingAndClassificationSource) {
    return { accepted: false, mayRenderCueBytes: false, reason: "UNTRUSTED_DERIVATION" };
  }
  if (event.ordering !== "ORDERED") {
    return { accepted: false, mayRenderCueBytes: false, reason: cue.ambiguousOrderingBehavior };
  }
  if (
    event.timing === "REVIEW_ONLY"
    || event.reviewOnlyResolution?.canonicalTiming === "REVIEW_ONLY"
  ) return authorizeCanonicalReviewOnlyCueRender(event);
  if (event.renderSubmitRaceDetected) {
    return { accepted: false, mayRenderCueBytes: false, reason: cue.renderSubmitRaceBehavior };
  }
  if (!hasAllowedTimingClassification(event)) {
    return { accepted: false, mayRenderCueBytes: false, reason: "TIMING_CLASSIFICATION_INVALID" };
  }
  if (event.timing === "BEFORE_RESPONSE") {
    return authorizeExactPreResponseCueRender(event);
  }
  if (event.timing === "AFTER_RESPONSE") {
    const binding = validateCanonicalAttemptBinding(event);
    if (!binding.accepted) return { ...binding, mayRenderCueBytes: false };
  }
  if (
    event.timing === "REVIEW_ONLY"
    && (event.attemptId !== undefined || event.attemptResolution !== undefined)
  ) {
    const binding = validateCanonicalAttemptBinding(event);
    if (!binding.accepted) return { ...binding, mayRenderCueBytes: false };
  }
  return {
    accepted: true,
    mayRenderCueBytes: true,
    positiveLearningEvidence: false,
    evidenceNeutral: event.timing === "REVIEW_ONLY",
  };
}

function canonicalExposureHistory(overrides = {}) {
  return {
    source: "CANONICAL_ASSISTANCE_EXPOSURE_LEDGER",
    authoritative: true,
    complete: true,
    matchingRecordCount: 1,
    attemptId: "attempt-1",
    learnerPrivateScopeId: "learner-1",
    missingExposureRecord: false,
    failedRender: false,
    partialCommit: false,
    ambiguousRecord: false,
    ambiguous: false,
    conflicting: false,
    stale: false,
    replayed: false,
    clientInferred: false,
    callerPaired: false,
    preResponseCueExposureCount: 0,
    preResponseCueExposureCountAuthoritative: true,
    preResponseCueExposureCountAmbiguous: false,
    preResponseCueExposureCountConflicting: false,
    preResponseCueExposureCountStale: false,
    preResponseCueExposureCountClientInferred: false,
    ...overrides,
  };
}

function canonicalIndependentAttempt(overrides = {}) {
  return {
    source: "CANONICAL_SERVER_ATTEMPT_LEDGER",
    attemptId: "attempt-1",
    learnerPrivateScopeId: "learner-1",
    canonicalAttemptState: "SUBMITTED",
    assistanceState: "INDEPENDENT",
    ...overrides,
  };
}

function independentResponseEvidence(overrides = {}) {
  return {
    source: "CANONICAL_SERVER_RESPONSE_EVALUATION_LEDGER",
    attemptId: "attempt-1",
    learnerPrivateScopeId: "learner-1",
    submissionId: "submission-1",
    evaluationId: "evaluation-1",
    actualSubmission: true,
    evaluationCompleted: true,
    ambiguous: false,
    ...overrides,
  };
}

function farTransferEvidence(overrides = {}) {
  const transferAttemptId = overrides.transferAttemptId ?? "attempt-transfer-1";
  const learnerPrivateScopeId = overrides.learnerPrivateScopeId ?? "learner-1";
  return {
    source: "CANONICAL_TRANSFER_EVALUATION_LEDGER",
    canonicalAttemptSource: "CANONICAL_SERVER_ATTEMPT_LEDGER",
    sourceAttemptId: "attempt-1",
    transferAttemptId,
    learnerPrivateScopeId,
    canonicalAttemptState: "SUBMITTED",
    originTaskId: "task-origin-1",
    transferTaskId: "task-transfer-1",
    distinctEligibleTask: true,
    representationRelation: "NON_SAME_REPRESENTATION",
    actualSubmission: true,
    evaluationCompleted: true,
    resultId: "transfer-result-1",
    assistanceState: "INDEPENDENT",
    exposureHistory: canonicalExposureHistory({
      attemptId: transferAttemptId,
      learnerPrivateScopeId,
    }),
    ambiguous: false,
    ...overrides,
  };
}

function stableD7Evidence(overrides = {}) {
  const d7AttemptId = overrides.d7AttemptId ?? "attempt-d7-1";
  const learnerPrivateScopeId = overrides.learnerPrivateScopeId ?? "learner-1";
  return {
    source: "CANONICAL_D7_EVALUATION_LEDGER",
    canonicalAttemptSource: "CANONICAL_SERVER_ATTEMPT_LEDGER",
    sourceAttemptId: "attempt-1",
    d7AttemptId,
    learnerPrivateScopeId,
    canonicalAttemptState: "SUBMITTED",
    timing: "D_PLUS_7",
    sourceAttemptSubmittedAt: "2026-08-01T00:00:00.000Z",
    d7EvaluationCompletedAt: "2026-08-08T00:00:00.000Z",
    actualSubmission: true,
    evaluationCompleted: true,
    cueState: "HIDDEN",
    hiddenCueBytesAbsentAcrossAllSurfaces: true,
    representationRelation: "NON_SAME_REPRESENTATION",
    unresolvedScoringConflictCount: 0,
    assistanceState: "INDEPENDENT",
    exposureHistory: canonicalExposureHistory({
      attemptId: d7AttemptId,
      learnerPrivateScopeId,
    }),
    ambiguous: false,
    ...overrides,
  };
}

function parseCanonicalUtcMilliseconds(value) {
  if (
    typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) return null;
  return milliseconds;
}

function hasTrustedD7ElapsedInterval(candidate) {
  const gate = contract.cueExposure.learningEvidenceGate
    .requiredAffirmativeEvidence.stableD7.trustedElapsedIntervalGate;
  if (
    candidate?.[gate.sourceAttemptTimestampSourceField]
      !== gate.sourceAttemptTimestampRequiredSource
    || candidate?.[gate.evaluationTimestampSourceField]
      !== gate.evaluationTimestampRequiredSource
  ) return false;
  const sourceAttemptSubmittedAt = parseCanonicalUtcMilliseconds(
    candidate[gate.sourceAttemptTimestampField],
  );
  const d7EvaluationCompletedAt = parseCanonicalUtcMilliseconds(
    candidate[gate.evaluationTimestampField],
  );
  return sourceAttemptSubmittedAt !== null
    && d7EvaluationCompletedAt !== null
    && d7EvaluationCompletedAt - sourceAttemptSubmittedAt >= gate.minimumElapsedMilliseconds;
}

function noPositiveEvidence({ failClosed, eligibilityPreserved }) {
  return {
    failClosed,
    independentEvidenceEligibilityPreserved: eligibilityPreserved,
    independentRetrieval: false,
    farTransfer: false,
    stableD7: false,
  };
}

function validateCanonicalExposureHistory(history, expectedAttemptId, expectedLearnerScopeId) {
  const gate = contract.cueExposure.learningEvidenceGate.exposureHistoryBindingGate;
  const countGate = contract.cueExposure.learningEvidenceGate.preResponseCueExposureCountGate;
  if (
    !history
    || typeof history !== "object"
    || Array.isArray(history)
    || JSON.stringify(sorted(Object.keys(history)))
      !== JSON.stringify(sorted(gate.requiredFields))
    || history.source !== contract.cueExposure.learningEvidenceGate.exposureHistorySource
    || history.matchingRecordCount !== gate.exactMatchingRecordCount
  ) return { accepted: false };
  const identityPattern = new RegExp(gate.identityFieldPattern);
  for (const field of gate.identityFields) {
    const value = history[field];
    if (typeof value !== "string" || value.trim() !== value || !identityPattern.test(value)) {
      return { accepted: false };
    }
  }
  if (
    history.attemptId !== expectedAttemptId
    || history.learnerPrivateScopeId !== expectedLearnerScopeId
  ) return { accepted: false };
  for (const [field, expected] of Object.entries(gate.requiredBooleanStates)) {
    if (history[field] !== expected) return { accepted: false };
  }
  const count = history.preResponseCueExposureCount;
  if (
    typeof count !== countGate.requiredPrimitiveType
    || !Number.isSafeInteger(count)
    || count < countGate.minimum
    || Object.entries(countGate.authoritativeStateFields).some(
      ([field, expected]) => history[field] !== expected,
    )
  ) return { accepted: false };
  return { accepted: true, count };
}

function evaluateAttemptEvidence(events, evidence = {}) {
  const validated = events.map(validateCueExposureEvent);
  if (validated.some((result) => !result.accepted)) {
    return noPositiveEvidence({ failClosed: true, eligibilityPreserved: false });
  }
  const attempt = evidence.attempt;
  const historyValidation = validateCanonicalExposureHistory(
    evidence.exposureHistory,
    attempt?.attemptId,
    attempt?.learnerPrivateScopeId,
  );
  if (!historyValidation.accepted) {
    return noPositiveEvidence({ failClosed: true, eligibilityPreserved: false });
  }
  const countGate = contract.cueExposure.learningEvidenceGate.preResponseCueExposureCountGate;
  const count = historyValidation.count;
  const preResponse = events.some((event) => event.timing === "BEFORE_RESPONSE")
    || count > countGate.independentCreditRequiredValue;
  const assisted = evidence.attempt?.assistanceState === "ASSISTED";
  if (preResponse || assisted) {
    return noPositiveEvidence({ failClosed: false, eligibilityPreserved: false });
  }

  const response = evidence.independentResponse;
  const independentRetrieval = Boolean(
    attempt
    && response
    && attempt.source === "CANONICAL_SERVER_ATTEMPT_LEDGER"
    && attempt.canonicalAttemptState === "SUBMITTED"
    && attempt.assistanceState === "INDEPENDENT"
    && response.source === "CANONICAL_SERVER_RESPONSE_EVALUATION_LEDGER"
    && response.attemptId === attempt.attemptId
    && response.learnerPrivateScopeId === attempt.learnerPrivateScopeId
    && typeof response.submissionId === "string"
    && response.submissionId.length > 0
    && typeof response.evaluationId === "string"
    && response.evaluationId.length > 0
    && response.actualSubmission === true
    && response.evaluationCompleted === true
    && response.ambiguous === false
  );

  const transfer = evidence.farTransfer;
  const transferHistory = validateCanonicalExposureHistory(
    transfer?.exposureHistory,
    transfer?.transferAttemptId,
    transfer?.learnerPrivateScopeId,
  );
  const farTransfer = Boolean(
    independentRetrieval
    && transfer
    && transfer.source === "CANONICAL_TRANSFER_EVALUATION_LEDGER"
    && transfer.canonicalAttemptSource === "CANONICAL_SERVER_ATTEMPT_LEDGER"
    && transfer.sourceAttemptId === attempt.attemptId
    && transfer.learnerPrivateScopeId === attempt.learnerPrivateScopeId
    && transfer.canonicalAttemptState === "SUBMITTED"
    && typeof transfer.transferAttemptId === "string"
    && transfer.transferAttemptId.length > 0
    && transfer.transferAttemptId !== attempt.attemptId
    && typeof transfer.originTaskId === "string"
    && typeof transfer.transferTaskId === "string"
    && transfer.transferTaskId !== transfer.originTaskId
    && transfer.distinctEligibleTask === true
    && transfer.representationRelation === "NON_SAME_REPRESENTATION"
    && transfer.actualSubmission === true
    && transfer.evaluationCompleted === true
    && typeof transfer.resultId === "string"
    && transfer.resultId.length > 0
    && transfer.assistanceState === "INDEPENDENT"
    && transferHistory.accepted
    && transferHistory.count === countGate.independentCreditRequiredValue
    && transfer.ambiguous === false
  );

  const d7 = evidence.stableD7;
  const d7History = validateCanonicalExposureHistory(
    d7?.exposureHistory,
    d7?.d7AttemptId,
    d7?.learnerPrivateScopeId,
  );
  const stableD7 = Boolean(
    independentRetrieval
    && d7
    && d7.source === "CANONICAL_D7_EVALUATION_LEDGER"
    && d7.canonicalAttemptSource === "CANONICAL_SERVER_ATTEMPT_LEDGER"
    && d7.sourceAttemptId === attempt.attemptId
    && d7.learnerPrivateScopeId === attempt.learnerPrivateScopeId
    && d7.canonicalAttemptState === "SUBMITTED"
    && typeof d7.d7AttemptId === "string"
    && d7.d7AttemptId.length > 0
    && d7.d7AttemptId !== attempt.attemptId
    && d7.timing === "D_PLUS_7"
    && hasTrustedD7ElapsedInterval(d7)
    && d7.actualSubmission === true
    && d7.evaluationCompleted === true
    && d7.cueState === "HIDDEN"
    && d7.hiddenCueBytesAbsentAcrossAllSurfaces === true
    && d7.representationRelation === "NON_SAME_REPRESENTATION"
    && d7.unresolvedScoringConflictCount === 0
    && d7.assistanceState === "INDEPENDENT"
    && d7History.accepted
    && d7History.count === countGate.independentCreditRequiredValue
    && d7.ambiguous === false
  );

  return {
    failClosed: false,
    independentEvidenceEligibilityPreserved: true,
    independentRetrieval,
    farTransfer,
    stableD7,
  };
}

function validateSignalContentSafetyProof(candidate) {
  const gate = contract.personalAnnotation.signalContentSafetyProofGate;
  if (
    candidate.contentSafetyProofValidated !== true
    || candidate.contentSafetyProofValidationSource !== gate.validationSource
    || candidate.contentSafetyProofAmbiguous !== false
    || typeof candidate.signalId !== "string"
    || candidate.signalId.trim().length === 0
    || typeof candidate.signalRevisionId !== "string"
    || candidate.signalRevisionId.trim().length === 0
    || candidate.contentSafetyProofSignalId !== candidate.signalId
    || candidate.contentSafetyProofSignalRevisionId !== candidate.signalRevisionId
  ) {
    return { accepted: false, reason: "SIGNAL_CONTENT_SAFETY_PROOF_UNVALIDATED_OR_CROSS_OBJECT" };
  }
  for (const field of gate.requiredBooleanFalseFields) {
    if (
      !Object.hasOwn(candidate, field)
      || typeof candidate[field] !== "boolean"
      || candidate[field] !== false
    ) {
      return { accepted: false, reason: `SIGNAL_CONTENT_SAFETY_${field}_NOT_EXPLICIT_FALSE` };
    }
  }
  return { accepted: true };
}

function parseExactUtcInstant(value) {
  if (
    typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) return null;
  return milliseconds;
}

function trustedEvaluationTime(overrides = {}) {
  return {
    source: "TRUSTED_SERVER_CLOCK_BOUNDARY",
    evaluatedAt: "2026-09-01T00:00:00.000Z",
    serverSide: true,
    trusted: true,
    ambiguous: false,
    ...overrides,
  };
}

function approvalReceipt(kind, overrides = {}) {
  const sources = contract.personalAnnotation.trainingApprovalReceiptGate.resolutionSourcesByKind;
  return {
    receiptId: `${kind.toLowerCase().replaceAll("_", "-")}-receipt-1`,
    approvalKind: kind,
    source: sources[kind],
    independentlyResolved: true,
    matchingRecordCount: 1,
    active: true,
    ambiguous: false,
    replayed: false,
    stale: false,
    revoked: false,
    signalId: "signal-1",
    signalRevisionId: "signal-revision-1",
    purposeId: "offline-training-purpose-1",
    o5ScopeId: "o5-scope-1",
    ...overrides,
  };
}

function futureApprovalReceipts(overrides = {}) {
  const receipts = {
    contribution: approvalReceipt("CONTRIBUTION_APPROVAL"),
    promotion: approvalReceipt("PROMOTION_APPROVAL"),
    o5: approvalReceipt("O5_APPROVAL"),
  };
  for (const field of Object.keys(receipts)) {
    if (Object.hasOwn(overrides, field)) {
      receipts[field] = overrides[field] == null
        ? overrides[field]
        : { ...receipts[field], ...overrides[field] };
    }
  }
  return receipts;
}

function trainingDecisionContext(overrides = {}) {
  return {
    trustedEvaluationTime: trustedEvaluationTime(),
    ...overrides,
  };
}

function hypotheticalReceiptValidTrainingDecisionContext(overrides = {}) {
  return trainingDecisionContext({
    approvalReceipts: futureApprovalReceipts(),
    ...overrides,
  });
}

function validateTrustedEvaluationTime(candidate, decisionContext) {
  const gate = contract.personalAnnotation.signalPurposeGate.trustedEvaluationTimeGate;
  if (
    Object.hasOwn(candidate, "evaluationTime")
    || decisionContext.callerEvaluationTime !== undefined
    || decisionContext.clientEvaluationTime !== undefined
  ) return { accepted: false, reason: "CALLER_CONTROLLED_EVALUATION_TIME" };
  const record = decisionContext.trustedEvaluationTime;
  const milliseconds = parseExactUtcInstant(record?.evaluatedAt);
  if (
    !record
    || record.source !== gate.source
    || record.serverSide !== true
    || record.trusted !== true
    || record.ambiguous !== false
    || milliseconds === null
  ) return { accepted: false, reason: "TRUSTED_EVALUATION_TIME_INVALID" };
  return { accepted: true, milliseconds };
}

function validateTrainingApprovalReceipts(candidate, decisionContext) {
  const gate = contract.personalAnnotation.trainingApprovalReceiptGate;
  const receipts = decisionContext.approvalReceipts;
  if (!receipts || typeof receipts !== "object" || Array.isArray(receipts)) {
    return { authorized: false, reason: "CANDIDATE_BOUND_APPROVAL_RECEIPTS_MISSING" };
  }
  const receiptIds = [];
  for (const kind of gate.receiptKinds) {
    const field = gate.receiptFieldsByKind[kind];
    const receipt = receipts[field];
    if (
      !receipt
      || receipt.approvalKind !== kind
      || receipt.source !== gate.resolutionSourcesByKind[kind]
      || receipt.independentlyResolved !== true
      || receipt.matchingRecordCount !== gate.exactMatchingRecordCount
      || receipt.active !== true
      || receipt.ambiguous !== false
      || receipt.replayed !== false
      || receipt.stale !== false
      || receipt.revoked !== false
      || typeof receipt.receiptId !== "string"
      || receipt.receiptId.trim().length === 0
    ) return { authorized: false, reason: `APPROVAL_RECEIPT_${kind}_INVALID` };
    for (const bindingField of gate.exactBindingFields) {
      if (
        typeof candidate[bindingField] !== "string"
        || candidate[bindingField].trim().length === 0
        || receipt[bindingField] !== candidate[bindingField]
      ) return { authorized: false, reason: `APPROVAL_RECEIPT_${kind}_${bindingField}_MISMATCH` };
    }
    receiptIds.push(receipt.receiptId);
  }
  if (new Set(receiptIds).size !== receiptIds.length) {
    return { authorized: false, reason: "APPROVAL_RECEIPT_REUSE_FORBIDDEN" };
  }
  return { authorized: true };
}

function evaluateTrainingCandidate(candidate, decisionContext = {}) {
  const annotation = contract.personalAnnotation;
  const rawOrigin = candidate.originKind === "PERSONAL_ANNOTATION_RAW_BODY"
    || candidate.originKind === "PERSONAL_ANNOTATION_RAW_POINTER"
    || candidate.containsRawAnnotationBody === true
    || candidate.containsRawBodyPointer === true
    || candidate.reconstructiveDerivativeOfRawBody === true;
  if (rawOrigin) {
    return {
      candidateEligible: false,
      currentlyAuthorized: false,
      reason: "RAW_ANNOTATION_BODY_UNCONDITIONALLY_INELIGIBLE",
    };
  }
  if (
    candidate.renameOrAliasOfRawBody
    || candidate.directPromotionFromRawBody
    || candidate.renamedRawPointerAsSignal
    || candidate.renamedReconstructiveDerivativeAsSignal
  ) {
    return {
      candidateEligible: false,
      currentlyAuthorized: false,
      reason: "RAW_BODY_RELABEL_OR_DIRECT_PROMOTION_FORBIDDEN",
    };
  }
  if (!annotation.futureTrainingCandidateKinds.includes(candidate.kind)) {
    return { candidateEligible: false, currentlyAuthorized: false, reason: "UNKNOWN_CANDIDATE_KIND" };
  }
  if (candidate.kind === "SEPARATE_NON_RECONSTRUCTIVE_SIGNAL") {
    const contentSafety = validateSignalContentSafetyProof(candidate);
    if (!contentSafety.accepted) {
      return { candidateEligible: false, currentlyAuthorized: false, reason: contentSafety.reason };
    }
    if (
      candidate.separateObjectIdentity !== true
      || candidate.closedValueSchema !== true
    ) {
      return { candidateEligible: false, currentlyAuthorized: false, reason: "SIGNAL_RECONSTRUCTIVE_OR_NOT_SEPARATE" };
    }
    const purposeGate = annotation.signalPurposeGate;
    const consent = candidate.consent;
    const retention = candidate.retention;
    const trustedTime = validateTrustedEvaluationTime(candidate, decisionContext);
    if (!trustedTime.accepted) {
      return { candidateEligible: false, currentlyAuthorized: false, reason: trustedTime.reason };
    }
    const retentionExpiry = parseExactUtcInstant(retention?.expiresAt);
    const consentExpiry = parseExactUtcInstant(consent?.expiresAt);
    const exactPurposeStatesValid = Object.entries(
      purposeGate.requiredExactPrimitiveBooleanStates,
    ).every(([recordName, requiredStates]) => Object.entries(requiredStates).every(
      ([field, expected]) => candidate[recordName]?.[field] === expected,
    ));
    if (
      candidate.genericOptIn === true
      || candidate.contractAsConsent === true
      || candidate.administratorChoiceAsConsent === true
      || candidate.o5AsConsentOrRetention === true
      || !consent
      || !retention
      || consent.source !== purposeGate.consentRecordSource
      || retention.source !== purposeGate.retentionRecordSource
      || consent.state !== purposeGate.requiredConsentState
      || retention.state !== purposeGate.requiredRetentionState
      || consent.exactPurpose !== true
      || !exactPurposeStatesValid
      || retention.finite !== true
      || typeof consent.expiresAt !== "string"
      || consent.expiresAt.trim().length === 0
      || typeof retention.expiresAt !== "string"
      || retention.expiresAt.trim().length === 0
      || retentionExpiry === null
      || consentExpiry === null
      || retentionExpiry <= trustedTime.milliseconds
      || consentExpiry <= trustedTime.milliseconds
    ) {
      return { candidateEligible: false, currentlyAuthorized: false, reason: "SIGNAL_PURPOSE_CONSENT_OR_RETENTION_INVALID" };
    }
    for (const field of purposeGate.exactBindingFields) {
      if (consent[field] !== candidate[field] || retention[field] !== candidate[field]) {
        return { candidateEligible: false, currentlyAuthorized: false, reason: "SIGNAL_PURPOSE_BINDING_MISMATCH" };
      }
    }
  }
  if (candidate.kind === "SEPARATELY_AUTHORED_RIGHTS_REVIEWED_CLEARED_CONTENT_BANK_OBJECT") {
    if (
      candidate.separateObjectIdentity !== true
      || candidate.separatelyAuthored !== true
      || candidate.rightsOwned !== true
      || candidate.rightsReviewed !== true
      || candidate.provenanceReviewed !== true
    ) {
      return { candidateEligible: false, currentlyAuthorized: false, reason: "CLEARED_OBJECT_REQUIREMENTS_MISSING" };
    }
  }
  const approval = validateTrainingApprovalReceipts(candidate, decisionContext);
  return {
    candidateEligible: true,
    hypotheticalReceiptsValid: approval.authorized,
    currentlyAuthorized: false,
    reason: approval.authorized
      ? "HYPOTHETICAL_RECEIPTS_VALID_CURRENT_USE_UNAUTHORIZED"
      : approval.reason,
  };
}

function signalCandidate(overrides = {}) {
  const base = {
    kind: "SEPARATE_NON_RECONSTRUCTIVE_SIGNAL",
    signalId: "signal-1",
    signalRevisionId: "signal-revision-1",
    purposeId: "offline-training-purpose-1",
    o5ScopeId: "o5-scope-1",
    separateObjectIdentity: true,
    closedValueSchema: true,
    containsRawAnnotationBody: false,
    containsRawBodyPointer: false,
    containsExcerptOrFreeText: false,
    reconstructive: false,
    reconstructiveDerivativeOfRawBody: false,
    contentSafetyProofValidated: true,
    contentSafetyProofValidationSource: "CANONICAL_CLOSED_SIGNAL_SCHEMA_VALIDATOR",
    contentSafetyProofAmbiguous: false,
    contentSafetyProofSignalId: "signal-1",
    contentSafetyProofSignalRevisionId: "signal-revision-1",
    consent: {
      source: "CANONICAL_VERSIONED_CONSENT_OPT_OUT_LEDGER",
      state: "ACTIVE",
      exactPurpose: true,
      signalId: "signal-1",
      signalRevisionId: "signal-revision-1",
      purposeId: "offline-training-purpose-1",
      o5ScopeId: "o5-scope-1",
      expired: false,
      revoked: false,
      expiresAt: "2026-12-31T00:00:00.000Z",
    },
    retention: {
      source: "CANONICAL_PURPOSE_SCOPED_RETENTION_LEDGER",
      state: "ACTIVE",
      signalId: "signal-1",
      signalRevisionId: "signal-revision-1",
      purposeId: "offline-training-purpose-1",
      o5ScopeId: "o5-scope-1",
      finite: true,
      expiresAt: "2026-12-31T00:00:00.000Z",
      expired: false,
      revoked: false,
    },
  };
  const candidate = { ...base, ...overrides };
  if (Object.hasOwn(overrides, "consent")) {
    candidate.consent = overrides.consent == null ? overrides.consent : { ...base.consent, ...overrides.consent };
  }
  if (Object.hasOwn(overrides, "retention")) {
    candidate.retention = overrides.retention == null
      ? overrides.retention
      : { ...base.retention, ...overrides.retention };
  }
  return candidate;
}

function cueConfirmation(overrides = {}) {
  return {
    source: "CANONICAL_SERVER_CONFIRMATION_LEDGER",
    status: "CONFIRMED",
    attemptId: "attempt-1",
    learnerPrivateScopeId: "learner-1",
    cueId: "cue-1",
    cueRevisionId: "cue-revision-1",
    requestId: "request-1",
    serverRecorded: true,
    deliberate: true,
    active: true,
    singleUse: true,
    matchingRecordCount: 1,
    stale: false,
    replayed: false,
    consumed: false,
    cancelled: false,
    ambiguous: false,
    ...overrides,
  };
}

function cueRenderRequest(overrides = {}) {
  const timing = overrides.timing ?? "BEFORE_RESPONSE";
  const canonicalAttemptState = overrides.canonicalAttemptState
    ?? (timing === "AFTER_RESPONSE" ? "SUBMITTED" : "INDEPENDENT_ATTEMPT_OPEN");
  const attemptResolution = Object.hasOwn(overrides, "attemptResolution")
    ? overrides.attemptResolution
    : timing === "AFTER_RESPONSE"
      ? canonicalAttemptResolution()
      : canonicalOpenAttemptResolution();
  return {
    timing,
    assistanceClassification: "LOW",
    attemptId: "attempt-1",
    learnerPrivateScopeId: "learner-1",
    cueId: "cue-1",
    cueRevisionId: "cue-revision-1",
    requestId: "request-1",
    canonicalAttemptStateSource: "CANONICAL_SERVER_ATTEMPT_LEDGER",
    canonicalAttemptState,
    attemptResolution,
    confirmation: cueConfirmation(),
    commitSteps: [...contract.cueExposure.preResponseAtomicCommit.orderedSteps],
    canonicalRecordCommitted: true,
    recordFailure: false,
    renderSubmitRaceDetected: false,
    ...overrides,
  };
}

function evaluateCueRender(request) {
  const cue = contract.cueExposure;
  const fail = (reason) => ({
    accepted: false,
    mayRenderCueBytes: false,
    independentEvidenceEligible: false,
    reason,
  });
  if (request.renderSubmitRaceDetected) return fail(cue.preResponseAtomicCommit.renderSubmitRaceBehavior);
  if (!hasExactNoRecordFailure(request)) return fail(cue.preResponseAtomicCommit.recordFailureBehavior);

  if (
    request.timing === "REVIEW_ONLY"
    || request.reviewOnlyResolution?.canonicalTiming === "REVIEW_ONLY"
  ) return authorizeCanonicalReviewOnlyCueRender(request);

  if (request.canonicalAttemptState === "SUBMITTED") {
    if (request.timing !== cue.afterResponseGate.onlyAllowedTimingForSubmittedAttempt) {
      return fail("SUBMITTED_ATTEMPT_AFTER_RESPONSE_ONLY");
    }
    if (!hasAllowedTimingClassification(request)) return fail("TIMING_CLASSIFICATION_INVALID");
    const binding = validateCanonicalAttemptBinding(request);
    if (!binding.accepted) return fail(binding.reason);
    if (!hasExactCanonicalRecordCommit(request)) return fail(cue.recordFailureBehavior);
    return {
      accepted: true,
      mayRenderCueBytes: true,
      independentEvidenceEligible: false,
      positiveLearningEvidence: false,
      attemptId: request.attemptId,
      timing: "AFTER_RESPONSE",
    };
  }

  if (request.timing !== "BEFORE_RESPONSE") return fail("NON_SUBMITTED_AFTER_RESPONSE_INVALID");
  if (!hasAllowedTimingClassification(request)) return fail("TIMING_CLASSIFICATION_INVALID");
  return authorizeExactPreResponseCueRender(request);
}

function validateSemanticHighlightAccessibility(candidate) {
  const rule = contract.semanticHighlight.accessibilityRequirement;
  const checks = {
    visibleTextLabel: typeof candidate.visibleTextLabel === "string"
      && candidate.visibleTextLabel.trim().length > 0,
    computedAccessibleName: typeof candidate.computedAccessibleName === "string"
      && candidate.computedAccessibleName.trim().length > 0,
  };
  const conditionResults = rule.conditions.map(({ field }) => checks[field] === true);
  const accepted = rule.requirementMode === "ALL_OF" && conditionResults.every(Boolean);
  return { accepted: accepted && candidate.colorOnlyMeaning !== true, checks };
}

test("MCAL paths resolve and V13 remains sole active master plan", () => {
  for (const p of Object.values(P)) assert.equal(fs.existsSync(path.join(ROOT, p)), true, p);
  const active = read(P.active);
  assert.match(active, /dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06\.md/);
  assert.match(active, /Memory Cue & Annotation Layer/);
  assert.doesNotMatch(active, /final-master-plan-v14/);
  assert.equal(contract.version, "1.0.9");
  assert.equal(contract.compatibility.v13RemainsSoleActiveMasterPlan, true);
  assert.equal(contract.compatibility.newMasterPlanVersionCreated, false);
});

test("authorization remains fail-closed and development order is exact", () => {
  for (const [key, value] of Object.entries(contract.authorizationBoundary)) {
    assert.equal(value, false, `authorizationBoundary.${key}`);
  }
  assert.deepEqual(contract.exactDevelopmentPriority, [
    "CORE_AUTHORITY_CONCEPT_QUESTION_VERIFICATION_ENGINES",
    "ATTEMPT_REPAIR_TRANSFER_D7_LOOP",
    "TERMINOLOGY_DECOMPOSITION_MEMORY_POSTIT_MVP",
    "SEMANTIC_HIGHLIGHTING",
    "PERSONAL_ANNOTATION_EDITOR",
  ]);
  assert.equal(contract.implementationProgram[0].authorizedByThisContract, true);
  for (const work of contract.implementationProgram.slice(1)) {
    assert.equal(work.authorizedByThisContract, false, work.workId);
  }
  assert.equal(contract.compatibility.mcal1Through4Authorized, false);
  for (const key of [
    "mcal1TerminologyConstruction",
    "mcal2MemoryPostItRuntime",
    "mcal3SemanticHighlightRuntime",
    "mcal4PersonalAnnotationRuntime",
  ]) assert.equal(contract.authorizationBoundary[key], false, key);
});

test("released VESG projection is the only exact-definition authority", () => {
  assert.equal(contract.definitionAuthority.canonicalAuthority, "VESG");
  assert.equal(
    contract.definitionAuthority.exactDefinitionRefTarget,
    "RELEASED_VERSIONED_VESG_CONCEPT_EVIDENCE_PROJECTION",
  );
  assert.equal(contract.definitionAuthority.releasedConceptRequired, true);
  assert.equal(contract.definitionAuthority.versionBindingRequired, true);
  assert.equal(contract.definitionAuthority.evidenceProjectionBindingRequired, true);
  assert.deepEqual(contract.definitionAuthority.requiredBindings, [
    "profileId",
    "conceptId",
    "graphSnapshotId",
    "normSnapshotId",
    "evidenceProjectionRevision",
    "releaseRef",
    "targetDigest",
  ]);
  assert.equal(contract.definitionAuthority.unresolvedOrHeldDefinitionMayRelease, false);
  assert.equal(contract.definitionAuthority.mcalMayCreateDefinitionAuthority, false);
  assert.equal(contract.definitionAuthority.mcalMayOverrideDefinition, false);
  assert.equal(contract.role.mayBecomeSecondDefinitionAuthority, false);
  const mcal1 = contract.implementationProgram.find((work) => work.workId === "MCAL-1");
  assert.ok(mcal1.requires.includes("RELEASED_VERSIONED_VESG_CONCEPTS"));
});

test("mnemonic, exact definition, cue exposure and D+7 stay separate", () => {
  assert.equal(contract.separation.memoryGlossMayEqualExactDefinition, false);
  assert.equal(contract.separation.literalGlossMayBePresentedAsProfessionalDefinition, false);
  assert.equal(contract.separation.cueViewMayPromoteIndependentMastery, false);
  assert.equal(contract.decomposition.inventedHanjaAllowed, false);
  assert.equal(contract.decomposition.disputedOrUnknownLearnerVisible, false);
  assert.equal(contract.cueFading.revealCreatesExposureEvent, true);
  assert.equal(contract.cueFading.beforeResponseRevealIsAssisted, true);
  assert.equal(contract.cueFading.anyPreResponseDecompositionDisplayCreatesExposure, true);
  assert.equal(contract.cueExposure.canonicalLedger, "ASSISTANCE_EXPOSURE_LEDGER");
  assert.equal(contract.cueExposure.separateLedgerAllowed, false);
  assert.equal(contract.cueExposure.timingAndClassificationSource, "CANONICAL_ASSISTANCE_EXPOSURE_LEDGER");
  assert.equal(contract.cueExposure.untrustedClientTimingOrClassificationAccepted, false);
  assert.equal(contract.cueExposure.attemptStateSource, "CANONICAL_SERVER_ATTEMPT_LEDGER");
  assert.equal(contract.cueExposure.untrustedClientAttemptStateAccepted, false);
  assert.equal(contract.cueExposure.beforeResponseGate.clientBooleanSufficient, false);
  assert.equal(contract.cueExposure.beforeResponseGate.preselectedConsentSufficient, false);
  assert.equal(contract.cueExposure.laterEventsMayRestoreIndependentClassification, false);
  assert.equal(contract.cueExposure.atomicRecordBeforeRender, true);
  assert.equal(contract.cueExposure.recordFailureBehavior, "DO_NOT_RENDER_CUE_BYTES");
  assert.equal(contract.cueFading.renderOnExposureRecordFailure, false);
  assert.equal(contract.memoryPostItMvp.exposureRecordFailureBehavior, "DO_NOT_RENDER_CUE_BYTES");
  assert.equal(contract.cueFading.d7StableState, "HIDDEN");
  assert.equal(contract.cueFading.stableRequiresNonSameRepresentation, true);
  assert.deepEqual(contract.cueFading.hiddenCueBytesForbiddenIn, [
    "DOM",
    "SSR",
    "ACCESSIBILITY_TEXT",
    "PREFETCH",
    "CACHE",
    "DIRECT_API_OUTPUT",
  ]);
  const mcal2 = contract.implementationProgram.find((work) => work.workId === "MCAL-2");
  assert.ok(mcal2.requires.includes("CPF_2A_CLOSED"));
  assert.ok(mcal2.requires.includes("APPROVED_BODYLESS_EXPOSURE_PATH"));
  assert.ok(mcal2.requires.includes("CANONICAL_ASSISTANCE_EXPOSURE_LEDGER_REUSE"));
});

test("highlights and personal annotations remain bounded and private", () => {
  assert.equal(contract.memoryPostItMvp.defaultCollapsed, true);
  assert.deepEqual(contract.memoryPostItMvp.collapsedDefaultVisibleFields, ["formalTerm"]);
  assert.equal(contract.memoryPostItMvp.collapsedDecompositionRequiresAtomicExposureBeforeRender, true);
  assert.equal(contract.memoryPostItMvp.maximumExpandedCardsPerSurface, 1);
  assert.equal(contract.memoryPostItMvp.createsFourthTodayPrimaryTask, false);
  assert.equal(contract.semanticHighlight.maximumPrimaryHighlightsPerSurface, 3);
  assert.equal(contract.semanticHighlight.colorOnlyMeaningAllowed, false);
  assert.equal(contract.semanticHighlight.textLabelRequired, true);
  assert.equal(contract.semanticHighlight.accessibleNameRequired, true);
  assert.equal(contract.semanticHighlight.accessibilityRequirement.requirementMode, "ALL_OF");
  assert.equal(contract.semanticHighlight.accessibilityRequirement.redundantAriaLabelRequired, false);
  assert.equal(contract.semanticHighlight.revisionBoundTypedAnchorRequired, true);
  assert.equal(contract.semanticHighlight.anchorTargetDigestRequired, true);
  assert.equal(contract.anchors.typed, true);
  assert.equal(contract.anchors.revisionBound, true);
  for (const key of ["targetType", "targetRevisionId", "targetDigest"]) {
    assert.ok(contract.anchors.requiredBindings.includes(key), key);
  }
  assert.equal(contract.personalAnnotation.bodyPlane, "PERSONAL_RAW_VAULT");
  assert.equal(contract.personalAnnotation.sharedReuse, false);
  assert.equal(contract.personalAnnotation.crossUserReuse, false);
  assert.equal(contract.personalAnnotation.directRawBodyTrainingAllowed, false);
  assert.equal(contract.personalAnnotation.directRawBodyTrainingProhibition, "UNCONDITIONAL_NON_OVERRIDABLE");
  assert.equal(contract.personalAnnotation.rawBodyRenameAliasOrDirectPromotionAllowed, false);
  assert.equal(contract.personalAnnotation.freeTextAnalytics, false);
});

test("Portable Core owns interfaces only and hard gates are zero", () => {
  assert.equal(contract.portableCore.crossProfileCueInheritanceAllowed, false);
  assert.equal(contract.portableCore.crossProfileDefinitionInheritanceAllowed, false);
  assert.equal(contract.portableCore.crossProfileMasteryTransferAllowed, false);
  assert.ok(contract.portableCore.reusableInterfaces.includes("MEMORY_CUE"));
  assert.ok(contract.portableCore.profileOwned.includes("EXACT_DEFINITION"));
  for (const [key, value] of Object.entries(contract.hardGates)) {
    assert.equal(value, 0, `hardGates.${key}`);
  }
});

test("Markdown fences and exact boundary language are present", () => {
  for (const p of [P.active, P.annex, P.decision, P.qa]) {
    const body = read(p);
    assert.equal((body.match(/```/g) ?? []).length % 2, 0, p);
  }
  const annex = read(P.annex);
  assert.match(annex, /암기용 풀이입니다\. 시험용 정확한 정의를 대체하지 않습니다\./);
  assert.match(annex, /MCAL-4 — personal annotation editor/);
  assert.match(annex, /PERSONAL_RAW_VAULT/);
  assert.match(annex, /primary highlight 기본 최대 3개/);
  assert.match(annex, /canonical Assistance\/Exposure ledger/);
  assert.match(annex, /DOM, SSR payload, accessibility text, prefetch response, cache entry 또는 direct/);
  assert.match(annex, /released, versioned VESG concept\/evidence projection/);
  assert.match(annex, /BODYLESS_RECEIPT_ONLY/);
  assert.match(annex, /BEFORE_RESPONSE \+ NONE/);
  assert.match(annex, /CANONICAL_SERVER_ATTEMPT_LEDGER/);
  assert.match(annex, /direct raw-body model training = 0 unconditionally/);
  assert.match(annex, /\(`ALL_OF`\)/);
  assert.match(annex, /eligibility만 보존/);
  assert.match(annex, /non-null exact `attemptId`/);
  assert.match(annex, /CANONICAL_VERSIONED_CONSENT_OPT_OUT_LEDGER/);
  assert.match(annex, /finite purpose-bound retention/);
  assert.match(annex, /EXACT_PRE_RESPONSE_RENDER_GATE_V1/);
  assert.match(annex, /containsRawAnnotationBody = false/);
  assert.match(annex, /property 부재는\s+content safety의 증거가 아니다/);
  assert.match(annex, /CANONICAL_REVIEW_ONLY_RENDER_GATE_V1/);
  assert.match(annex, /matching open independent\s+attempt 0건/);
  assert.match(annex, /TRUSTED_SERVER_CLOCK_BOUNDARY/);
  assert.match(annex, /independently\s+resolved receipt/);
  assert.match(annex, /truthiness-only 검사는 금지/);
  assert.match(annex, /CANONICAL_SERVER_PRIVATE_ANCHOR_OWNER_BOUNDARY/);
  assert.match(annex, /canonicalRecordCommitted === true/);
  assert.match(annex, /matching `undefined` values/);
  assert.match(annex, /`consent\.expired === false`/);
  assert.match(annex, /`canonicalExposureRecordCommitted`[^\n]*대체/);
  assert.match(annex, /canonical attempt resolution state gate/);
  assert.match(annex, /EXACT_RENDER_RECORD_FAILURE_GATE_V1/);
  assert.match(annex, /`recordFailure === true`/);
  assert.match(annex, /`replayed === false`는 exact primitive equality/);
  assert.match(annex, /outer canonical timing\/classification resolution도 `resolved === true`/);
  assert.match(annex, /모든 render-capable request\/event variant/);
  assert.match(annex, /pre-response request는\s+`assistanceClassification`/);
  assert.match(annex, /submitted-attempt `AFTER_RESPONSE` request/);
  assert.match(annex, /`sourceAttemptSubmittedAt`/);
  assert.match(annex, /최소 `604800000` ms/);
  assert.match(annex, /shared gate로 routing하기 전에/);
  assert.match(annex, /request path에는 이\s+event-only 필드를 요구하지 않는다/);
  assert.match(annex, /`canonicalRecordCommitted === true`를 exact primitive equality로 증명/);
  assert.match(annex, /preResponseCueExposureCount/);
  assert.match(annex, /CANONICAL_SERVER_ITEM_RIGHTS_MANIFEST_BOUNDARY/);
  assert.match(annex, /transferAttemptId/);
  assert.match(annex, /d7AttemptId/);
  assert.match(annex, /`ambiguous`는 exact primitive `false`/);
  assert.match(annex, /`currentlyAuthorized`는 정확히 `false`/);
  const qa = read(P.qa);
  assert.match(qa, /PR #692 is merged at `512bfdb9232a86bf4f7d4cfbc076a9df1c8a7da2`/);
  assert.match(qa, /Focused behavioral contract suite: 44\/44 passed/);
  assert.doesNotMatch(qa, /Focused behavioral contract suite: 41\/41 passed/);
  assert.doesNotMatch(qa, /Focused behavioral contract suite: 39\/39 passed/);
  assert.doesNotMatch(qa, /Focused behavioral contract suite: 36\/36 passed/);
  assert.doesNotMatch(qa, /Focused behavioral contract suite: 34\/34 passed/);
  assert.doesNotMatch(qa, /Focused behavioral contract suite: 31\/31 passed/);
  assert.doesNotMatch(qa, /Focused behavioral contract suite: 28\/28 passed/);
  assert.doesNotMatch(qa, /Focused behavioral contract suite: 25\/25 passed/);
  assert.doesNotMatch(qa, /Focused behavioral contract suite: 23\/23 passed/);
  assert.doesNotMatch(qa, /Focused behavioral contract suite: 16\/16 passed/);
  assert.doesNotMatch(qa, /Focused behavioral contract suite: 12\/12 passed/);
  assert.doesNotMatch(qa, /PR #692 remains open|Repository CI is pending/);
});

test("anchor kind policy is exact and rejects unknown or fallback mappings", () => {
  assert.deepEqual(
    sorted(Object.keys(contract.anchors.kindPolicy)),
    sorted(contract.anchors.kinds),
  );
  assert.deepEqual(anchorPolicyIntegrity(), { valid: true });
  assert.deepEqual(
    validateAnchor(validAnchor({ kind: "UNKNOWN_KIND" })),
    { accepted: false, disposition: "REJECT", reason: "UNKNOWN_KIND" },
  );

  const withFallback = structuredClone(contract.anchors);
  withFallback.kindPolicy.DEFAULT = {
    allowedDomains: ["SHARED_OWNED"],
    allowedBodyLocatorPolicies: ["NONE"],
  };
  assert.equal(validateAnchor(validAnchor({ kind: "UNKNOWN_KIND" }), withFallback).accepted, false);
  assert.equal(anchorPolicyIntegrity(withFallback).reason, "KIND_POLICY_KEY_SET_MISMATCH");

  const missingMapping = structuredClone(contract.anchors);
  delete missingMapping.kindPolicy.CONCEPT_NODE;
  assert.equal(anchorPolicyIntegrity(missingMapping).valid, false);
});

test("every declared anchor required binding uses exact closed validation", () => {
  assert.deepEqual(
    sorted(Object.keys(contract.anchors.requiredBindingSchema)),
    sorted(contract.anchors.requiredBindings),
  );
  assert.equal(contract.anchors.requiredBindingSchemaKeySetMustExactlyEqualRequiredBindings, true);
  assert.equal(contract.anchors.truthinessOnlyValidationAllowed, false);
  const valid = validAnchor();
  assert.equal(
    validateAnchor(valid, contract.anchors, canonicalPrivateOwnerBoundary(valid)).accepted,
    true,
  );

  const invalidValues = {
    anchorId: [null, "", " anchor-1", 1, [], "?"],
    profileId: [null, "", " profile-1", 1, [], "?"],
    kind: [null, "", 1, [], "UNKNOWN_KIND"],
    domain: [null, "", 1, [], "UNKNOWN_DOMAIN"],
    targetType: [null, "", 1, [], "UNKNOWN_TARGET"],
    targetRevisionId: [null, "", " revision-1", 1, [], "?"],
    targetDigest: [null, "", 1, [], "sha256:not-a-digest"],
    bodyLocatorPolicy: [null, "", 1, [], "UNKNOWN_LOCATOR"],
    rightsManifestId: [null, "", " rights-1", 1, [], "?"],
    status: [null, "", 1, [], "UNKNOWN_STATUS"],
  };
  for (const field of contract.anchors.requiredBindings) {
    const omitted = validAnchor();
    delete omitted[field];
    assert.equal(validateAnchor(omitted).accepted, false, `${field}: omitted`);
    for (const invalid of invalidValues[field]) {
      assert.equal(
        validateAnchor(validAnchor({ [field]: invalid })).accepted,
        false,
        `${field}: ${JSON.stringify(invalid)}`,
      );
    }
  }
  assert.equal(validateAnchor(validAnchor({ requiredBindingsAmbiguous: true })).accepted, false);
  assert.equal(validateAnchor(validAnchor({ conflictingRequiredBindings: ["profileId"] })).accepted, false);
  assert.equal(validateAnchor(validAnchor({ targetType: "VESG_CONCEPT_NODE" })).accepted, false);
});

test("official-permitted anchors require a closed item-rights ID bound to the exact revision", () => {
  const gate = contract.anchors.itemRightsManifestBindingGate;
  const anchor = validAnchor({ kind: "OFFICIAL_PERMITTED_RANGE" });
  const boundary = canonicalItemRightsBoundary(anchor);
  assert.deepEqual(gate.appliesToKinds, ["OFFICIAL_PERMITTED_RANGE"]);
  assert.equal(gate.bareIdentifierEstablishesBinding, false);
  assert.equal(gate.callerAssertionTruthinessClientEqualityFallbackOrInferenceAccepted, false);
  assert.equal(gate.resolutionSchema.additionalFieldsAllowed, false);
  assert.equal(validateAnchor(anchor).accepted, false);
  assert.equal(validateAnchor(anchor, contract.anchors, undefined, boundary).accepted, true);

  for (const invalid of [undefined, null, "", "   ", " irm_item_rights_1", "item-rights-1", 1, true, {}, []]) {
    const candidate = validAnchor({ kind: "OFFICIAL_PERMITTED_RANGE" });
    if (invalid === undefined) delete candidate.itemRightsManifestId;
    else candidate.itemRightsManifestId = invalid;
    assert.equal(
      validateAnchor(
        candidate,
        contract.anchors,
        undefined,
        canonicalItemRightsBoundary(candidate),
      ).accepted,
      false,
      `itemRightsManifestId: ${String(invalid)}`,
    );
  }

  for (const invalidBoundary of [
    undefined,
    null,
    {},
    canonicalItemRightsBoundary(anchor, { source: "CLIENT" }),
    canonicalItemRightsBoundary(anchor, { serverSide: false }),
    canonicalItemRightsBoundary(anchor, { authoritative: false }),
    canonicalItemRightsBoundary(anchor, { resolved: false }),
    canonicalItemRightsBoundary(anchor, { matchingRecordCount: 0 }),
    canonicalItemRightsBoundary(anchor, { matchingRecordCount: 2 }),
    canonicalItemRightsBoundary(anchor, { ambiguous: true }),
    canonicalItemRightsBoundary(anchor, { conflicting: true }),
    canonicalItemRightsBoundary(anchor, { stale: true }),
    canonicalItemRightsBoundary(anchor, { replayed: true }),
    canonicalItemRightsBoundary(anchor, { clientInferred: true }),
    canonicalItemRightsBoundary(anchor, { crossRevision: true }),
    canonicalItemRightsBoundary(anchor, { itemRightsManifestId: "irm_other_manifest_1" }),
    canonicalItemRightsBoundary(anchor, { anchorId: "other-anchor" }),
    canonicalItemRightsBoundary(anchor, { targetRevisionId: "other-revision" }),
    canonicalItemRightsBoundary(anchor, { rightsManifestId: "other-rights-manifest" }),
    canonicalItemRightsBoundary(anchor, { unexpected: true }),
  ]) {
    assert.equal(
      validateAnchor(anchor, contract.anchors, undefined, invalidBoundary).accepted,
      false,
      JSON.stringify(invalidBoundary),
    );
  }

  for (const assertion of gate.callerAssertionFieldsForbidden) {
    const candidate = validAnchor({ kind: "OFFICIAL_PERMITTED_RANGE", [assertion]: true });
    assert.equal(
      validateAnchor(
        candidate,
        contract.anchors,
        undefined,
        canonicalItemRightsBoundary(candidate),
      ).accepted,
      false,
      assertion,
    );
  }
});

test("private anchors require an exact authoritative owner binding and remain vault-local", () => {
  const gate = contract.anchors.privateOwnerBindingGate;
  assert.deepEqual(gate.appliesToKinds, ["LEARNER_ATTEMPT_RANGE", "PRIVATE_SOURCE_RANGE"]);
  assert.equal(gate.callerAssertionTruthinessOrClientEqualityAccepted, false);
  assert.equal(gate.resolutionSource, "CANONICAL_SERVER_PRIVATE_ANCHOR_OWNER_BOUNDARY");
  assert.equal(gate.resolutionSchema.additionalFieldsAllowed, false);
  const base = validAnchor();
  const boundary = canonicalPrivateOwnerBoundary(base);
  assert.equal(validateAnchor(base).accepted, false);
  assert.equal(validateAnchor(base, contract.anchors, boundary).accepted, true);
  for (const domain of ["SHARED_OWNED", "SHARED_OFFICIAL_PERMITTED"]) {
    const result = validateAnchor({ ...base, domain }, contract.anchors, boundary);
    assert.equal(result.accepted, false, domain);
    assert.equal(result.reason, "DOMAIN_CONFLICT", domain);
  }
  const locatorResult = validateAnchor(
    { ...base, bodyLocatorPolicy: "SHARED_STABLE_SELECTOR" },
    contract.anchors,
    boundary,
  );
  assert.equal(locatorResult.accepted, false);
  assert.equal(locatorResult.reason, "LOCATOR_CONFLICT");

  for (const kind of gate.appliesToKinds) {
    const anchor = validAnchor({ kind });
    assert.equal(
      validateAnchor(anchor, contract.anchors, canonicalPrivateOwnerBoundary(anchor)).accepted,
      true,
      kind,
    );
  }

  for (const [field, invalidValues] of Object.entries({
    ownerBindingRef: [undefined, null, "", "   ", 1, {}, [], "owner-scope-local"],
    vaultLocalTargetRef: [undefined, null, "", "   ", 1, {}, [], "target-1"],
    targetDigestScope: [undefined, null, "", "VAULT_LOCAL", 1, {}, []],
  })) {
    for (const invalidValue of invalidValues) {
      const candidate = validAnchor();
      if (invalidValue === undefined) delete candidate[field];
      else candidate[field] = invalidValue;
      const result = validateAnchor(
        candidate,
        contract.anchors,
        canonicalPrivateOwnerBoundary(candidate),
      );
      assert.equal(result.accepted, false, `${field}: ${String(invalidValue)}`);
    }
  }

  const invalidBoundaries = [
    undefined,
    null,
    {},
    canonicalPrivateOwnerBoundary(base, { authenticatedLearnerId: 1 }),
    canonicalPrivateOwnerBoundary(base, { tenantScopeId: [] }),
    canonicalPrivateOwnerBoundary(base, { resolution: undefined }),
    canonicalPrivateOwnerBoundary(base, { resolution: { source: "CLIENT" } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { serverSide: false } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { authoritative: false } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { resolved: false } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { matchingRecordCount: 0 } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { matchingRecordCount: 2 } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { ambiguous: true } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { conflicting: true } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { stale: true } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { replayed: true } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { clientInferred: true } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { crossLearner: true } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { crossTenant: true } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { authenticatedLearnerId: "other-learner" } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { tenantScopeId: "other-tenant" } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { ownerBindingRef: "pob_other_owner_1" } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { anchorId: "other-anchor" } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { kind: "PRIVATE_SOURCE_RANGE" } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { vaultLocalTargetRef: "vault_other_target_1" } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { targetRevisionId: "other-revision" } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { targetDigest: `sha256:${"b".repeat(64)}` } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { bodyLocatorPolicy: "SHARED_STABLE_SELECTOR" } }),
    canonicalPrivateOwnerBoundary(base, { resolution: { unexpected: true } }),
  ];
  const missingScope = canonicalPrivateOwnerBoundary(base);
  delete missingScope.tenantScopeId;
  invalidBoundaries.push(missingScope);
  for (const ownerBoundary of invalidBoundaries) {
    assert.equal(
      validateAnchor(base, contract.anchors, ownerBoundary).accepted,
      false,
      JSON.stringify(ownerBoundary),
    );
  }

  for (const assertion of gate.callerAssertionFieldsForbidden) {
    const candidate = validAnchor({ [assertion]: true });
    assert.equal(
      validateAnchor(
        candidate,
        contract.anchors,
        canonicalPrivateOwnerBoundary(candidate),
      ).accepted,
      false,
      assertion,
    );
  }
});

test("private non-vault projection is a content-free bodyless receipt", () => {
  const learnerPolicy = contract.anchors.kindPolicy.LEARNER_ATTEMPT_RANGE;
  const sourcePolicy = contract.anchors.kindPolicy.PRIVATE_SOURCE_RANGE;
  assert.deepEqual(sourcePolicy.allowedDomains, learnerPolicy.allowedDomains);
  assert.deepEqual(
    sourcePolicy.allowedBodyLocatorPolicies,
    learnerPolicy.allowedBodyLocatorPolicies,
  );
  assert.deepEqual(sourcePolicy.nonVaultProjection, learnerPolicy.nonVaultProjection);
  assert.notDeepEqual(sourcePolicy.allowedTargetTypes, learnerPolicy.allowedTargetTypes);

  for (const kind of ["LEARNER_ATTEMPT_RANGE", "PRIVATE_SOURCE_RANGE"]) {
    const anchor = validAnchor({
      kind,
      anchorId: "private_anchor",
      receiptId: "private_receipt",
      excerpt: "private answer",
      startOffset: 1,
      endOffset: 9,
      bodyLocator: "vault-only",
      attemptLocator: "attempt-only",
      attemptRef: "attempt_ref",
    });
    const ownerBoundary = canonicalPrivateOwnerBoundary(anchor);
    const projected = projectPrivateAnchorOutsideVault(
      anchor,
      "PRIVATE_METADATA_RECEIPT",
      ownerBoundary,
    );
    assert.equal(projected.accepted, true, kind);
    const policy = contract.anchors.kindPolicy[kind].nonVaultProjection;
    assert.deepEqual(sorted(Object.keys(projected.receipt)), sorted(policy.allowedFields), kind);
    for (const field of policy.forbiddenFields) {
      assert.equal(Object.hasOwn(projected.receipt, field), false, `${kind}.${field}`);
    }
    for (const destination of policy.forbiddenDestinations) {
      assert.equal(
        projectPrivateAnchorOutsideVault(anchor, destination, ownerBoundary).accepted,
        false,
        `${kind}.${destination}`,
      );
    }
  }
});

test("cue timing mapping rejects pre-response NONE and preserves sticky ineligibility", () => {
  const commitGate = contract.cueExposure.canonicalRecordCommittedGate;
  assert.deepEqual(
    sorted(Object.keys(contract.cueExposure.closedTimingClassificationMap)),
    sorted(contract.cueExposure.eventVariants.map(({ timing }) => timing)),
  );
  assert.deepEqual(
    sorted(commitGate.appliesToEveryRenderCapableExposureEventTiming),
    sorted(contract.cueExposure.eventVariants.map(({ timing }) => timing)),
  );
  assert.equal(commitGate.requiredPrimitiveType, "boolean");
  assert.equal(commitGate.requiredValue, true);
  assert.equal(commitGate.truthinessAllowed, false);
  for (const timing of ["BEFORE_RESPONSE", "AFTER_RESPONSE", "REVIEW_ONLY"]) {
    for (const canonicalRecordCommitted of [
      undefined,
      null,
      false,
      "true",
      "false",
      0,
      1,
      {},
      [],
    ]) {
      const result = validateCueExposureEvent(cueEvent({ timing, canonicalRecordCommitted }));
      assert.equal(result.accepted, false, `${timing}: ${String(canonicalRecordCommitted)}`);
      assert.equal(result.mayRenderCueBytes, false, `${timing}: ${String(canonicalRecordCommitted)}`);
    }
  }
  assert.deepEqual(validateCueExposureEvent(cueEvent({
    timing: "AFTER_RESPONSE",
    canonicalRecordCommitted: true,
  })), {
    accepted: true,
    mayRenderCueBytes: true,
    positiveLearningEvidence: false,
    evidenceNeutral: false,
  });
  assert.equal(validateCueExposureEvent(cueEvent({
    timing: "BEFORE_RESPONSE",
    assistanceClassification: "NONE",
  })).accepted, false);
  for (const assistanceClassification of ["LOW", "MATERIAL"]) {
    assert.equal(validateCueExposureEvent(cueEvent({
      timing: "BEFORE_RESPONSE",
      assistanceClassification,
    })).accepted, true, assistanceClassification);
  }

  const sequence = evaluateAttemptEvidence([
    cueEvent({ timing: "BEFORE_RESPONSE", assistanceClassification: "LOW" }),
    cueEvent({
      timing: "AFTER_RESPONSE",
      assistanceClassification: "MATERIAL",
      independentEvidenceEligible: true,
    }),
  ], {
    exposureHistory: canonicalExposureHistory({ preResponseCueExposureCount: 1 }),
    attempt: canonicalIndependentAttempt(),
    independentResponse: independentResponseEvidence(),
    farTransfer: farTransferEvidence({
      exposureHistory: canonicalExposureHistory({
        attemptId: "attempt-transfer-1",
        preResponseCueExposureCount: 1,
      }),
    }),
    stableD7: stableD7Evidence({
      exposureHistory: canonicalExposureHistory({
        attemptId: "attempt-d7-1",
        preResponseCueExposureCount: 1,
      }),
    }),
  });
  assert.deepEqual(sequence, {
    failClosed: false,
    independentEvidenceEligibilityPreserved: false,
    independentRetrieval: false,
    farTransfer: false,
    stableD7: false,
  });

  assert.equal(validateCueExposureEvent(cueEvent({
    derivedFrom: "UNTRUSTED_CLIENT",
  })).accepted, false);
  assert.equal(validateCueExposureEvent(cueEvent({
    ordering: "AMBIGUOUS",
  })).accepted, false);
  assert.equal(validateCueExposureEvent(cueEvent({
    renderSubmitRaceDetected: true,
  })).accepted, false);
  assert.deepEqual(validateCueExposureEvent(cueEvent({
    canonicalRecordCommitted: false,
  })), {
    accepted: false,
    mayRenderCueBytes: false,
    reason: "DO_NOT_RENDER_CUE_BYTES",
  });
  assert.deepEqual(evaluateAttemptEvidence([cueEvent({
    canonicalRecordCommitted: false,
  })]), {
    failClosed: true,
    independentEvidenceEligibilityPreserved: false,
    independentRetrieval: false,
    farTransfer: false,
    stableD7: false,
  });
});

test("pre-response requests reject omitted or NONE assistance classification", () => {
  const gate = contract.cueExposure.beforeResponseGate;
  assert.equal(
    gate.timingClassificationMapRef,
    "cueExposure.closedTimingClassificationMap.BEFORE_RESPONSE",
  );
  assert.deepEqual(
    gate.requiredAssistanceClassifications,
    contract.cueExposure.closedTimingClassificationMap.BEFORE_RESPONSE,
  );
  assert.equal(gate.assistanceClassificationRequiredOnRequest, true);

  const omitted = cueRenderRequest();
  delete omitted.assistanceClassification;
  for (const request of [
    omitted,
    cueRenderRequest({ assistanceClassification: "NONE" }),
  ]) {
    const result = evaluateCueRender(request);
    assert.equal(result.accepted, false);
    assert.equal(result.mayRenderCueBytes, false);
    assert.equal(result.reason, "TIMING_CLASSIFICATION_INVALID");
  }

  for (const assistanceClassification of gate.requiredAssistanceClassifications) {
    const result = evaluateCueRender(cueRenderRequest({ assistanceClassification }));
    assert.equal(result.accepted, true, assistanceClassification);
    assert.equal(result.mayRenderCueBytes, true, assistanceClassification);
  }
});

test("every BEFORE_RESPONSE render path delegates to one exact gate and rejects all bypasses", () => {
  const gate = contract.cueExposure.beforeResponseGate;
  assert.equal(gate.gateId, "EXACT_PRE_RESPONSE_RENDER_GATE_V1");
  assert.equal(gate.sharedAcrossEveryRenderCapableValidator, true);
  assert.equal(gate.alternateValidatorBypassAllowed, false);
  assert.deepEqual(gate.renderCapableValidators, [
    "CUE_RENDER_REQUEST_VALIDATOR",
    "CUE_EXPOSURE_EVENT_VALIDATOR",
  ]);

  const invalidOverrides = [
    { attemptId: undefined },
    { attemptId: "" },
    { learnerPrivateScopeId: undefined },
    { learnerPrivateScopeId: "" },
    { attemptResolution: undefined },
    { attemptResolution: canonicalOpenAttemptResolution({ source: "CLIENT" }) },
    { attemptResolution: canonicalOpenAttemptResolution({ known: false }) },
    { attemptResolution: canonicalOpenAttemptResolution({ matchingRecordCount: 0 }) },
    { attemptResolution: canonicalOpenAttemptResolution({ matchingRecordCount: 2, ambiguous: true }) },
    { attemptResolution: canonicalOpenAttemptResolution({ crossLearner: true }) },
    { attemptResolution: canonicalOpenAttemptResolution({ crossAttempt: true }) },
    { attemptResolution: canonicalOpenAttemptResolution({ mismatched: true }) },
    { attemptResolution: canonicalOpenAttemptResolution({ stale: true }) },
    { attemptResolution: canonicalOpenAttemptResolution({ cancelled: true }) },
    { attemptResolution: canonicalOpenAttemptResolution({ replayed: true }) },
    { attemptResolution: canonicalOpenAttemptResolution({ closed: true }) },
    { attemptResolution: canonicalAttemptResolution() },
    { attemptResolution: canonicalOpenAttemptResolution({ attemptId: "other-attempt" }) },
    { attemptResolution: canonicalOpenAttemptResolution({ learnerPrivateScopeId: "other-learner" }) },
    { clientAttemptId: "attempt-1" },
    { inferLatestAttempt: true },
    { clientAttemptState: "INDEPENDENT_ATTEMPT_OPEN" },
    { canonicalAttemptStateSource: "CLIENT" },
    { confirmation: undefined },
    { confirmation: cueConfirmation({ source: "CLIENT" }) },
    { confirmation: cueConfirmation({ serverRecorded: false }) },
    { confirmation: cueConfirmation({ deliberate: false }) },
    { confirmation: cueConfirmation({ active: false }) },
    { confirmation: cueConfirmation({ status: "CANCELLED", cancelled: true }) },
    { confirmation: cueConfirmation({ stale: true }) },
    { confirmation: cueConfirmation({ consumed: true }) },
    { confirmation: cueConfirmation({ singleUse: false }) },
    { confirmation: cueConfirmation({ matchingRecordCount: 2, ambiguous: true }) },
    { confirmation: undefined, clientConfirmationBoolean: true },
    { confirmation: undefined, preselectedConsent: true },
    { commitSteps: ["CONFIRMATION_CONSUMPTION_COMMITTED"] },
    { commitSteps: [...contract.cueExposure.preResponseAtomicCommit.orderedSteps].reverse() },
    { canonicalRecordCommitted: false },
    { recordFailure: true },
    { renderSubmitRaceDetected: true },
  ];
  for (const field of gate.confirmationBindingFields) {
    invalidOverrides.push({ confirmation: cueConfirmation({ [field]: `wrong-${field}` }) });
  }

  for (const overrides of invalidOverrides) {
    const event = cueEvent({
      timing: "BEFORE_RESPONSE",
      assistanceClassification: "LOW",
      ...overrides,
    });
    for (const validate of [validateCueExposureEvent, evaluateCueRender]) {
      const result = validate(event);
      assert.equal(result.accepted, false, `${validate.name}: ${result.reason}`);
      assert.equal(result.mayRenderCueBytes, false, `${validate.name}: ${result.reason}`);
    }
  }

  const insufficientFlagOnly = validateCueExposureEvent({
    timing: "BEFORE_RESPONSE",
    assistanceClassification: "LOW",
    derivedFrom: "CANONICAL_ASSISTANCE_EXPOSURE_LEDGER",
    ordering: "ORDERED",
    canonicalRecordCommitted: true,
    renderSubmitRaceDetected: false,
    attemptId: "attempt-1",
  });
  assert.equal(insufficientFlagOnly.accepted, false);
  assert.equal(insufficientFlagOnly.mayRenderCueBytes, false);

  const validEvent = cueEvent({ timing: "BEFORE_RESPONSE", assistanceClassification: "MATERIAL" });
  for (const validate of [validateCueExposureEvent, evaluateCueRender]) {
    const result = validate(validEvent);
    assert.equal(result.accepted, true, validate.name);
    assert.equal(result.mayRenderCueBytes, true, validate.name);
    assert.equal(result.gateId, gate.gateId, validate.name);
    assert.equal(result.atomicCommitCompletedBeforeRender, true, validate.name);
    assert.equal(result.canonicalAttemptState, "ASSISTED", validate.name);
    assert.equal(result.independentEvidenceEligible, false, validate.name);
    assert.equal(result.orderedSteps.at(-1), "CUE_BYTES_RENDERED", validate.name);
  }
});

test("pre-response rejects noncanonical attempt resolution states across both render validators", () => {
  const stateGate = contract.cueExposure.canonicalAttemptResolutionStateGate;
  const beforeResponseGate = contract.cueExposure.beforeResponseGate;
  assert.equal(stateGate.gateId, "EXACT_CANONICAL_ATTEMPT_RESOLUTION_STATE_GATE_V1");
  assert.equal(
    beforeResponseGate.attemptResolutionStateGateRef,
    "cueExposure.canonicalAttemptResolutionStateGate",
  );
  assert.deepEqual(stateGate.requiredExactPrimitiveBooleanStates, {
    known: true,
    resolved: true,
    ambiguous: false,
    conflicting: false,
    stale: false,
    clientInferred: false,
  });

  for (const [field, invalidValue] of [
    ["resolved", false],
    ["conflicting", true],
    ["clientInferred", true],
  ]) {
    const subject = cueEvent({
      timing: "BEFORE_RESPONSE",
      assistanceClassification: "LOW",
      attemptResolution: canonicalOpenAttemptResolution({ [field]: invalidValue }),
    });
    for (const validate of [evaluateCueRender, validateCueExposureEvent]) {
      const result = validate(subject);
      assert.equal(result.accepted, false, `${validate.name}: ${field}`);
      assert.equal(result.mayRenderCueBytes, false, `${validate.name}: ${field}`);
    }
  }
});

test("cue absence and after-response-only exposure preserve eligibility but create no evidence", () => {
  const gate = contract.cueExposure.learningEvidenceGate;
  assert.equal(gate.cueAbsenceEffect, "PRESERVE_ELIGIBILITY_ONLY");
  assert.equal(gate.cueAbsenceCreatesPositiveEvidence, false);
  assert.equal(gate.emptySequenceCreatesPositiveEvidence, false);
  assert.equal(gate.afterResponseOnlySequenceCreatesPositiveEvidence, false);
  assert.equal(contract.separation.cueAbsenceMayCreatePositiveLearningEvidence, false);

  for (const events of [
    [],
    [cueEvent({ timing: "AFTER_RESPONSE", assistanceClassification: "NONE" })],
  ]) {
    assert.deepEqual(evaluateAttemptEvidence(events, {
      exposureHistory: canonicalExposureHistory(),
      attempt: canonicalIndependentAttempt(),
    }), {
      failClosed: false,
      independentEvidenceEligibilityPreserved: true,
      independentRetrieval: false,
      farTransfer: false,
      stableD7: false,
    });
  }
});

test("independent retrieval requires affirmative canonical submitted and evaluated response evidence", () => {
  const countGate = contract.cueExposure.learningEvidenceGate.preResponseCueExposureCountGate;
  assert.equal(countGate.requiredPrimitiveType, "number");
  assert.equal(countGate.integerRequired, true);
  assert.equal(countGate.safeIntegerRequired, true);
  assert.equal(countGate.minimum, 0);
  assert.equal(countGate.independentCreditRequiredValue, 0);
  assert.equal(countGate.eachApplicableCanonicalHistoryMustCarryItsOwnCount, true);
  assert.equal(countGate.downstreamEvidenceCountCopiesAcceptedAsHistory, false);
  assert.equal(countGate.exactZeroEffect, "PRESERVE_ELIGIBILITY_ONLY");
  assert.equal(
    countGate.baseHistoryCountAboveZeroEffect,
    "DENY_INDEPENDENT_RETRIEVAL_FAR_TRANSFER_AND_STABLE_D7",
  );
  assert.equal(countGate.downstreamHistoryCountAboveZeroEffect, "DENY_AFFECTED_CREDIT");
  const base = {
    exposureHistory: canonicalExposureHistory(),
    attempt: canonicalIndependentAttempt(),
    independentResponse: independentResponseEvidence(),
  };
  assert.deepEqual(evaluateAttemptEvidence([], base), {
    failClosed: false,
    independentEvidenceEligibilityPreserved: true,
    independentRetrieval: true,
    farTransfer: false,
    stableD7: false,
  });

  const invalidEvidence = [
    { ...base, attempt: undefined },
    { ...base, independentResponse: undefined },
    { ...base, attempt: canonicalIndependentAttempt({ source: "CLIENT" }) },
    { ...base, attempt: canonicalIndependentAttempt({ canonicalAttemptState: "INDEPENDENT_ATTEMPT_OPEN" }) },
    { ...base, independentResponse: independentResponseEvidence({ source: "CLIENT" }) },
    { ...base, independentResponse: independentResponseEvidence({ attemptId: "other-attempt" }) },
    { ...base, independentResponse: independentResponseEvidence({ learnerPrivateScopeId: "other-learner" }) },
    { ...base, independentResponse: independentResponseEvidence({ actualSubmission: false }) },
    { ...base, independentResponse: independentResponseEvidence({ evaluationCompleted: false }) },
    { ...base, independentResponse: independentResponseEvidence({ ambiguous: true }) },
  ];
  for (const evidence of invalidEvidence) {
    assert.equal(evaluateAttemptEvidence([], evidence).independentRetrieval, false);
  }

  const assisted = evaluateAttemptEvidence([], {
    ...base,
    attempt: canonicalIndependentAttempt({ assistanceState: "ASSISTED" }),
  });
  assert.equal(assisted.independentEvidenceEligibilityPreserved, false);
  assert.equal(assisted.independentRetrieval, false);

  for (const exposureHistory of [
    undefined,
    canonicalExposureHistory({ complete: false }),
    canonicalExposureHistory({ missingExposureRecord: true }),
    canonicalExposureHistory({ failedRender: true }),
    canonicalExposureHistory({ partialCommit: true }),
    canonicalExposureHistory({ ambiguousRecord: true }),
  ]) {
    const result = evaluateAttemptEvidence([], { ...base, exposureHistory });
    assert.equal(result.failClosed, true);
    assert.equal(result.independentRetrieval, false);
  }

  const missingCount = canonicalExposureHistory();
  delete missingCount.preResponseCueExposureCount;
  const invalidCountHistories = [
    missingCount,
    canonicalExposureHistory({ preResponseCueExposureCount: undefined }),
    canonicalExposureHistory({ preResponseCueExposureCount: null }),
    canonicalExposureHistory({ preResponseCueExposureCount: false }),
    canonicalExposureHistory({ preResponseCueExposureCount: true }),
    canonicalExposureHistory({ preResponseCueExposureCount: "0" }),
    canonicalExposureHistory({ preResponseCueExposureCount: 0.5 }),
    canonicalExposureHistory({ preResponseCueExposureCount: -1 }),
    canonicalExposureHistory({ preResponseCueExposureCount: Number.NaN }),
    canonicalExposureHistory({ preResponseCueExposureCount: Number.POSITIVE_INFINITY }),
    canonicalExposureHistory({ preResponseCueExposureCount: Number.MAX_SAFE_INTEGER + 1 }),
    canonicalExposureHistory({ preResponseCueExposureCount: {} }),
    canonicalExposureHistory({ preResponseCueExposureCount: [] }),
    canonicalExposureHistory({ preResponseCueExposureCountAuthoritative: false }),
    canonicalExposureHistory({ preResponseCueExposureCountAmbiguous: true }),
    canonicalExposureHistory({ preResponseCueExposureCountConflicting: true }),
    canonicalExposureHistory({ preResponseCueExposureCountStale: true }),
    canonicalExposureHistory({ preResponseCueExposureCountClientInferred: true }),
  ];
  for (const exposureHistory of invalidCountHistories) {
    const result = evaluateAttemptEvidence([], {
      ...base,
      exposureHistory,
      farTransfer: farTransferEvidence(),
      stableD7: stableD7Evidence(),
    });
    assert.deepEqual(result, noPositiveEvidence({ failClosed: true, eligibilityPreserved: false }));
  }

  const transferExposed = evaluateAttemptEvidence([], {
    ...base,
    farTransfer: farTransferEvidence({
      exposureHistory: canonicalExposureHistory({
        attemptId: "attempt-transfer-1",
        preResponseCueExposureCount: 1,
      }),
    }),
  });
  assert.equal(transferExposed.independentRetrieval, true);
  assert.equal(transferExposed.farTransfer, false);
  const d7Exposed = evaluateAttemptEvidence([], {
    ...base,
    stableD7: stableD7Evidence({
      exposureHistory: canonicalExposureHistory({
        attemptId: "attempt-d7-1",
        preResponseCueExposureCount: 1,
      }),
    }),
  });
  assert.equal(d7Exposed.independentRetrieval, true);
  assert.equal(d7Exposed.stableD7, false);

  const priorCueExposure = evaluateAttemptEvidence([], {
    ...base,
    exposureHistory: canonicalExposureHistory({ preResponseCueExposureCount: 1 }),
  });
  assert.deepEqual(
    priorCueExposure,
    noPositiveEvidence({ failClosed: false, eligibilityPreserved: false }),
  );
});

test("base, far-transfer and D+7 exposure histories bind to their own evaluated attempts", () => {
  const gate = contract.cueExposure.learningEvidenceGate.exposureHistoryBindingGate;
  assert.equal(gate.additionalFieldsAllowed, false);
  assert.equal(gate.eachApplicableHistoryValidatedIndependently, true);
  assert.equal(gate.bareDownstreamCountCopyEstablishesAttemptBinding, false);
  assert.equal(gate.sourceAttemptHistoryMaySubstituteForDownstreamHistory, false);
  const base = {
    exposureHistory: canonicalExposureHistory(),
    attempt: canonicalIndependentAttempt(),
    independentResponse: independentResponseEvidence(),
  };
  assert.equal(evaluateAttemptEvidence([], base).independentRetrieval, true);

  const missingAttempt = canonicalExposureHistory();
  delete missingAttempt.attemptId;
  const missingLearner = canonicalExposureHistory();
  delete missingLearner.learnerPrivateScopeId;
  for (const exposureHistory of [
    missingAttempt,
    missingLearner,
    canonicalExposureHistory({ attemptId: "other-attempt" }),
    canonicalExposureHistory({ learnerPrivateScopeId: "other-learner" }),
  ]) {
    const result = evaluateAttemptEvidence([], { ...base, exposureHistory });
    assert.equal(result.failClosed, true);
    assert.equal(result.independentRetrieval, false);
  }

  const validTransfer = farTransferEvidence();
  const transferResult = evaluateAttemptEvidence([], { ...base, farTransfer: validTransfer });
  assert.equal(transferResult.independentRetrieval, true);
  assert.equal(transferResult.farTransfer, true);
  for (const exposureHistory of [
    undefined,
    canonicalExposureHistory(),
    canonicalExposureHistory({ attemptId: "attempt-transfer-foreign" }),
    canonicalExposureHistory({
      attemptId: validTransfer.transferAttemptId,
      learnerPrivateScopeId: "other-learner",
    }),
    canonicalExposureHistory({ attemptId: validTransfer.transferAttemptId, ambiguous: true }),
    canonicalExposureHistory({ attemptId: validTransfer.transferAttemptId, conflicting: true }),
    canonicalExposureHistory({ attemptId: validTransfer.transferAttemptId, stale: true }),
    canonicalExposureHistory({ attemptId: validTransfer.transferAttemptId, replayed: true }),
    canonicalExposureHistory({ attemptId: validTransfer.transferAttemptId, clientInferred: true }),
    canonicalExposureHistory({ attemptId: validTransfer.transferAttemptId, callerPaired: true }),
  ]) {
    const result = evaluateAttemptEvidence([], {
      ...base,
      farTransfer: farTransferEvidence({ exposureHistory }),
      stableD7: stableD7Evidence(),
    });
    assert.equal(result.independentRetrieval, true);
    assert.equal(result.farTransfer, false);
    assert.equal(result.stableD7, true);
  }

  const validD7 = stableD7Evidence();
  const d7Result = evaluateAttemptEvidence([], { ...base, stableD7: validD7 });
  assert.equal(d7Result.independentRetrieval, true);
  assert.equal(d7Result.stableD7, true);
  for (const exposureHistory of [
    undefined,
    canonicalExposureHistory(),
    canonicalExposureHistory({ attemptId: "attempt-d7-foreign" }),
    canonicalExposureHistory({
      attemptId: validD7.d7AttemptId,
      learnerPrivateScopeId: "other-learner",
    }),
    canonicalExposureHistory({ attemptId: validD7.d7AttemptId, ambiguous: true }),
    canonicalExposureHistory({ attemptId: validD7.d7AttemptId, conflicting: true }),
    canonicalExposureHistory({ attemptId: validD7.d7AttemptId, stale: true }),
    canonicalExposureHistory({ attemptId: validD7.d7AttemptId, replayed: true }),
    canonicalExposureHistory({ attemptId: validD7.d7AttemptId, clientInferred: true }),
    canonicalExposureHistory({ attemptId: validD7.d7AttemptId, callerPaired: true }),
  ]) {
    const result = evaluateAttemptEvidence([], {
      ...base,
      farTransfer: farTransferEvidence(),
      stableD7: stableD7Evidence({ exposureHistory }),
    });
    assert.equal(result.independentRetrieval, true);
    assert.equal(result.farTransfer, true);
    assert.equal(result.stableD7, false);
  }

  const bareTransferCount = farTransferEvidence({
    exposureHistory: undefined,
    preResponseCueExposureCount: 0,
  });
  const bareD7Count = stableD7Evidence({
    exposureHistory: undefined,
    preResponseCueExposureCount: 0,
  });
  const copiedCountOnly = evaluateAttemptEvidence([], {
    ...base,
    farTransfer: bareTransferCount,
    stableD7: bareD7Count,
  });
  assert.equal(copiedCountOnly.independentRetrieval, true);
  assert.equal(copiedCountOnly.farTransfer, false);
  assert.equal(copiedCountOnly.stableD7, false);

  const zeroCountOnly = evaluateAttemptEvidence([], {
    exposureHistory: canonicalExposureHistory(),
    attempt: canonicalIndependentAttempt(),
  });
  assert.equal(zeroCountOnly.independentRetrieval, false);
  assert.equal(zeroCountOnly.farTransfer, false);
  assert.equal(zeroCountOnly.stableD7, false);
});

test("affirmative learning evidence requires ambiguous to be exact primitive false", () => {
  const affirmative = contract.cueExposure.learningEvidenceGate.requiredAffirmativeEvidence;
  for (const evidenceContract of Object.values(affirmative)) {
    assert.equal(evidenceContract.ambiguousMustExactlyEqual, false);
  }
  const base = {
    exposureHistory: canonicalExposureHistory(),
    attempt: canonicalIndependentAttempt(),
    independentResponse: independentResponseEvidence(),
  };
  const invalidAmbiguityValues = [undefined, null, true, "true", "false", 0, 1, {}, []];

  for (const ambiguous of invalidAmbiguityValues) {
    const independentResponse = independentResponseEvidence();
    if (ambiguous === undefined) delete independentResponse.ambiguous;
    else independentResponse.ambiguous = ambiguous;
    const result = evaluateAttemptEvidence([], {
      ...base,
      independentResponse,
      farTransfer: farTransferEvidence(),
      stableD7: stableD7Evidence(),
    });
    assert.equal(result.independentRetrieval, false, `independentResponse: ${String(ambiguous)}`);
    assert.equal(result.farTransfer, false, `independentResponse: ${String(ambiguous)}`);
    assert.equal(result.stableD7, false, `independentResponse: ${String(ambiguous)}`);
  }

  for (const ambiguous of invalidAmbiguityValues) {
    const farTransfer = farTransferEvidence();
    if (ambiguous === undefined) delete farTransfer.ambiguous;
    else farTransfer.ambiguous = ambiguous;
    const result = evaluateAttemptEvidence([], {
      ...base,
      farTransfer,
      stableD7: stableD7Evidence(),
    });
    assert.equal(result.independentRetrieval, true, `farTransfer: ${String(ambiguous)}`);
    assert.equal(result.farTransfer, false, `farTransfer: ${String(ambiguous)}`);
    assert.equal(result.stableD7, true, `farTransfer: ${String(ambiguous)}`);
  }

  for (const ambiguous of invalidAmbiguityValues) {
    const stableD7 = stableD7Evidence();
    if (ambiguous === undefined) delete stableD7.ambiguous;
    else stableD7.ambiguous = ambiguous;
    const result = evaluateAttemptEvidence([], {
      ...base,
      farTransfer: farTransferEvidence(),
      stableD7,
    });
    assert.equal(result.independentRetrieval, true, `stableD7: ${String(ambiguous)}`);
    assert.equal(result.farTransfer, true, `stableD7: ${String(ambiguous)}`);
    assert.equal(result.stableD7, false, `stableD7: ${String(ambiguous)}`);
  }

  const exactFalse = evaluateAttemptEvidence([], {
    ...base,
    farTransfer: farTransferEvidence(),
    stableD7: stableD7Evidence(),
  });
  assert.equal(exactFalse.independentRetrieval, true);
  assert.equal(exactFalse.farTransfer, true);
  assert.equal(exactFalse.stableD7, true);

  const falseAlone = evaluateAttemptEvidence([], {
    exposureHistory: canonicalExposureHistory(),
    attempt: canonicalIndependentAttempt(),
    independentResponse: { ambiguous: false },
    farTransfer: { ambiguous: false },
    stableD7: { ambiguous: false },
  });
  assert.equal(falseAlone.independentRetrieval, false);
  assert.equal(falseAlone.farTransfer, false);
  assert.equal(falseAlone.stableD7, false);
});

test("far transfer requires a distinct eligible non-same-representation submitted result", () => {
  const base = {
    exposureHistory: canonicalExposureHistory(),
    attempt: canonicalIndependentAttempt(),
    independentResponse: independentResponseEvidence(),
  };
  const valid = evaluateAttemptEvidence([], { ...base, farTransfer: farTransferEvidence() });
  assert.equal(valid.independentRetrieval, true);
  assert.equal(valid.farTransfer, true);
  assert.equal(valid.stableD7, false);

  for (const farTransfer of [
    undefined,
    farTransferEvidence({ source: "CLIENT" }),
    farTransferEvidence({ canonicalAttemptSource: "CLIENT" }),
    farTransferEvidence({ sourceAttemptId: "other-attempt" }),
    farTransferEvidence({ learnerPrivateScopeId: "other-learner" }),
    farTransferEvidence({ canonicalAttemptState: "INDEPENDENT_ATTEMPT_OPEN" }),
    farTransferEvidence({ transferAttemptId: "attempt-1" }),
    farTransferEvidence({ transferTaskId: "task-origin-1" }),
    farTransferEvidence({ distinctEligibleTask: false }),
    farTransferEvidence({ representationRelation: "SAME_REPRESENTATION" }),
    farTransferEvidence({ actualSubmission: false }),
    farTransferEvidence({ evaluationCompleted: false }),
    farTransferEvidence({ resultId: "" }),
    farTransferEvidence({ assistanceState: "ASSISTED" }),
    farTransferEvidence({ exposureHistory: undefined }),
    farTransferEvidence({
      exposureHistory: canonicalExposureHistory({
        attemptId: "attempt-transfer-1",
        complete: false,
      }),
    }),
    farTransferEvidence({
      exposureHistory: canonicalExposureHistory({
        attemptId: "attempt-transfer-1",
        preResponseCueExposureCount: 1,
      }),
    }),
    farTransferEvidence({ ambiguous: true }),
  ]) {
    assert.equal(evaluateAttemptEvidence([], { ...base, farTransfer }).farTransfer, false);
  }
});

test("stable D+7 requires a completed hidden-cue nonconflicted canonical evaluation", () => {
  const base = {
    exposureHistory: canonicalExposureHistory(),
    attempt: canonicalIndependentAttempt(),
    independentResponse: independentResponseEvidence(),
  };
  const valid = evaluateAttemptEvidence([], { ...base, stableD7: stableD7Evidence() });
  assert.equal(valid.independentRetrieval, true);
  assert.equal(valid.stableD7, true);

  for (const stableD7 of [
    undefined,
    stableD7Evidence({ source: "CLIENT" }),
    stableD7Evidence({ canonicalAttemptSource: "CLIENT" }),
    stableD7Evidence({ sourceAttemptId: "other-attempt" }),
    stableD7Evidence({ learnerPrivateScopeId: "other-learner" }),
    stableD7Evidence({ canonicalAttemptState: "INDEPENDENT_ATTEMPT_OPEN" }),
    stableD7Evidence({ d7AttemptId: "attempt-1" }),
    stableD7Evidence({ timing: "D_PLUS_1" }),
    stableD7Evidence({ actualSubmission: false }),
    stableD7Evidence({ evaluationCompleted: false }),
    stableD7Evidence({ cueState: "PROMPT_ONLY" }),
    stableD7Evidence({ hiddenCueBytesAbsentAcrossAllSurfaces: false }),
    stableD7Evidence({ representationRelation: "SAME_REPRESENTATION" }),
    stableD7Evidence({ unresolvedScoringConflictCount: 1 }),
    stableD7Evidence({ assistanceState: "ASSISTED" }),
    stableD7Evidence({ exposureHistory: undefined }),
    stableD7Evidence({
      exposureHistory: canonicalExposureHistory({
        attemptId: "attempt-d7-1",
        complete: false,
      }),
    }),
    stableD7Evidence({
      exposureHistory: canonicalExposureHistory({
        attemptId: "attempt-d7-1",
        preResponseCueExposureCount: 1,
      }),
    }),
    stableD7Evidence({ ambiguous: true }),
  ]) {
    assert.equal(evaluateAttemptEvidence([], { ...base, stableD7 }).stableD7, false);
  }
});

test("stable D+7 requires trusted timestamps separated by at least seven elapsed days", () => {
  const gate = contract.cueExposure.learningEvidenceGate
    .requiredAffirmativeEvidence.stableD7.trustedElapsedIntervalGate;
  assert.equal(gate.sourceAttemptTimestampField, "sourceAttemptSubmittedAt");
  assert.equal(gate.sourceAttemptTimestampSourceField, "canonicalAttemptSource");
  assert.equal(gate.sourceAttemptTimestampRequiredSource, "CANONICAL_SERVER_ATTEMPT_LEDGER");
  assert.equal(gate.evaluationTimestampField, "d7EvaluationCompletedAt");
  assert.equal(gate.evaluationTimestampSourceField, "source");
  assert.equal(gate.evaluationTimestampRequiredSource, "CANONICAL_D7_EVALUATION_LEDGER");
  assert.equal(gate.requiredTimestampFormat, "RFC3339_UTC_MILLISECONDS");
  assert.equal(gate.minimumElapsedMilliseconds, 7 * 24 * 60 * 60 * 1000);
  assert.equal(gate.serverComputedFromTrustedTimestamps, true);
  assert.equal(gate.callerSuppliedElapsedOrTimingLabelSufficient, false);
  assert.equal(contract.hardGates.d7StableWithoutActual7DayElapsedInterval, 0);

  const base = {
    exposureHistory: canonicalExposureHistory(),
    attempt: canonicalIndependentAttempt(),
    independentResponse: independentResponseEvidence(),
  };
  for (const stableD7 of [
    stableD7Evidence({ sourceAttemptSubmittedAt: undefined }),
    stableD7Evidence({ d7EvaluationCompletedAt: undefined }),
    stableD7Evidence({ sourceAttemptSubmittedAt: "2026-08-01" }),
    stableD7Evidence({ d7EvaluationCompletedAt: "2026-08-08T09:00:00.000+09:00" }),
    stableD7Evidence({ d7EvaluationCompletedAt: "2026-08-07T23:59:59.999Z" }),
    stableD7Evidence({ d7EvaluationCompletedAt: "2026-08-01T00:00:00.001Z" }),
    stableD7Evidence({
      d7EvaluationCompletedAt: "2026-08-01T00:00:00.001Z",
      elapsedMilliseconds: 7 * 24 * 60 * 60 * 1000,
    }),
  ]) {
    const result = evaluateAttemptEvidence([], { ...base, stableD7 });
    assert.equal(result.independentRetrieval, true);
    assert.equal(result.stableD7, false);
  }

  for (const d7EvaluationCompletedAt of [
    "2026-08-08T00:00:00.000Z",
    "2026-08-09T00:00:00.000Z",
  ]) {
    const result = evaluateAttemptEvidence([], {
      ...base,
      stableD7: stableD7Evidence({ d7EvaluationCompletedAt }),
    });
    assert.equal(result.stableD7, true, d7EvaluationCompletedAt);
  }
});

test("raw annotation bodies reject opt-in, O5, relabel and direct-promotion bypasses", () => {
  const overrides = contract.personalAnnotation.possibleOverrideAuthorities;
  assert.deepEqual(overrides, {
    learnerConsent: false,
    learnerOptIn: false,
    contract: false,
    administratorChoice: false,
    futureO5: false,
  });
  const allHypotheticalGates = {
    ...contract.authorizationBoundary,
    trainingSignalContribution: true,
    clearedContentBankPromotion: true,
    o5OfflineTraining: true,
  };
  assert.deepEqual(evaluateTrainingCandidate({
    kind: "SEPARATELY_AUTHORED_RIGHTS_REVIEWED_CLEARED_CONTENT_BANK_OBJECT",
    originKind: "PERSONAL_ANNOTATION_RAW_BODY",
    learnerConsent: true,
    learnerOptIn: true,
    administratorChoice: true,
    futureO5: true,
  }, allHypotheticalGates), {
    candidateEligible: false,
    currentlyAuthorized: false,
    reason: "RAW_ANNOTATION_BODY_UNCONDITIONALLY_INELIGIBLE",
  });
  for (const bypass of [
    { renameOrAliasOfRawBody: true },
    { directPromotionFromRawBody: true },
    { renamedRawPointerAsSignal: true },
    { renamedReconstructiveDerivativeAsSignal: true },
  ]) {
    assert.equal(evaluateTrainingCandidate({
      kind: "SEPARATELY_AUTHORED_RIGHTS_REVIEWED_CLEARED_CONTENT_BANK_OBJECT",
      ...bypass,
    }, allHypotheticalGates).candidateEligible, false);
  }
});

test("only separate safe candidates remain behind distinct contribution, promotion and O5 gates", () => {
  assert.deepEqual(contract.personalAnnotation.futureTrainingCandidateKinds, [
    "SEPARATE_NON_RECONSTRUCTIVE_SIGNAL",
    "SEPARATELY_AUTHORED_RIGHTS_REVIEWED_CLEARED_CONTENT_BANK_OBJECT",
  ]);
  assert.deepEqual(contract.personalAnnotation.trainingGateSeparation, {
    contributionGate: "DISTINCT_REQUIRED",
    promotionGate: "DISTINCT_REQUIRED",
    o5Gate: "DISTINCT_REQUIRED",
    contributionImpliesPromotion: false,
    promotionImpliesO5: false,
    o5MayBypassContributionOrPromotion: false,
    allPresentAuthorizations: false,
    currentlyAuthorized: false,
    canonicalAuthorizationBoundaryPath: "authorizationBoundary",
    canonicalAuthorizationFields: [
      "modelTraining",
      "personalRawBodyTraining",
      "trainingSignalContribution",
      "clearedContentBankPromotion",
      "o5OfflineTraining",
    ],
    requiredCurrentCanonicalValue: false,
    globalAuthorizationFlagsMayAuthorizeCandidate: false,
    independentlyResolvedCandidateBoundReceiptsRequired: true,
    receiptValidityImpliesCurrentAuthorization: false,
    hypotheticalOrMockReceiptsMayAuthorizeCurrentUse: false,
    futureActivationRequiresSeparatelyAuthorizedCanonicalBoundaryChange: true,
  });
  const safeSignal = evaluateTrainingCandidate(signalCandidate(), trainingDecisionContext());
  assert.deepEqual(safeSignal, {
    candidateEligible: true,
    hypotheticalReceiptsValid: false,
    currentlyAuthorized: false,
    reason: "CANDIDATE_BOUND_APPROVAL_RECEIPTS_MISSING",
  });
  assert.equal(evaluateTrainingCandidate({
    kind: "SEPARATE_NON_RECONSTRUCTIVE_SIGNAL",
    separateObjectIdentity: true,
    closedValueSchema: true,
    reconstructive: true,
  }).candidateEligible, false);
  assert.equal(evaluateTrainingCandidate({
    kind: "SEPARATELY_AUTHORED_RIGHTS_REVIEWED_CLEARED_CONTENT_BANK_OBJECT",
    separateObjectIdentity: true,
    separatelyAuthored: true,
    rightsOwned: true,
    rightsReviewed: true,
    provenanceReviewed: true,
  }).currentlyAuthorized, false);
  for (const key of ["trainingSignalContribution", "clearedContentBankPromotion", "o5OfflineTraining"]) {
    assert.equal(contract.authorizationBoundary[key], false, key);
  }
});

test("signals require affirmative same-object validated boolean-false content-safety proofs", () => {
  const gate = contract.personalAnnotation.signalContentSafetyProofGate;
  assert.deepEqual(gate.requiredBooleanFalseFields, [
    "containsRawAnnotationBody",
    "containsRawBodyPointer",
    "containsExcerptOrFreeText",
    "reconstructive",
    "reconstructiveDerivativeOfRawBody",
  ]);
  assert.equal(gate.eachFieldMustBeExplicitlyPresent, true);
  assert.equal(gate.requiredPrimitiveType, "boolean");
  assert.equal(gate.requiredValue, false);
  assert.equal(gate.closedSchemaValidationRequired, true);
  assert.equal(gate.validationSource, "CANONICAL_CLOSED_SIGNAL_SCHEMA_VALIDATOR");
  assert.equal(gate.clientValidationAssertionAccepted, false);
  assert.equal(gate.exactSignalAndRevisionBindingRequired, true);
  assert.equal(gate.ambiguousProofAllowed, false);
  assert.equal(gate.crossObjectProofAllowed, false);

  const allHypotheticalGates = hypotheticalReceiptValidTrainingDecisionContext();
  const validCandidate = signalCandidate();
  for (const field of gate.requiredBooleanFalseFields) {
    assert.equal(Object.hasOwn(validCandidate, field), true, field);
    assert.equal(typeof validCandidate[field], "boolean", field);
    assert.equal(validCandidate[field], false, field);

    const omitted = signalCandidate();
    delete omitted[field];
    assert.equal(evaluateTrainingCandidate(omitted, allHypotheticalGates).candidateEligible, false, `${field}: omitted`);

    for (const invalidValue of [undefined, null, "false", 0, {}, true]) {
      const result = evaluateTrainingCandidate(
        signalCandidate({ [field]: invalidValue }),
        allHypotheticalGates,
      );
      assert.equal(result.candidateEligible, false, `${field}: ${String(invalidValue)}`);
      assert.equal(result.currentlyAuthorized, false, `${field}: ${String(invalidValue)}`);
    }
  }
  for (const invalidCandidate of [
    signalCandidate({ contentSafetyProofValidated: false }),
    signalCandidate({ contentSafetyProofValidated: undefined }),
    signalCandidate({ contentSafetyProofValidationSource: "CLIENT" }),
    signalCandidate({ contentSafetyProofAmbiguous: true }),
    signalCandidate({ contentSafetyProofSignalId: "other-signal" }),
    signalCandidate({ contentSafetyProofSignalRevisionId: "other-revision" }),
  ]) {
    const result = evaluateTrainingCandidate(invalidCandidate, allHypotheticalGates);
    assert.equal(result.candidateEligible, false, result.reason);
    assert.equal(result.currentlyAuthorized, false, result.reason);
  }

  assert.deepEqual(evaluateTrainingCandidate(validCandidate, allHypotheticalGates), {
    candidateEligible: true,
    hypotheticalReceiptsValid: true,
    currentlyAuthorized: false,
    reason: "HYPOTHETICAL_RECEIPTS_VALID_CURRENT_USE_UNAUTHORIZED",
  });
  for (const key of ["trainingSignalContribution", "clearedContentBankPromotion", "o5OfflineTraining"]) {
    assert.equal(contract.authorizationBoundary[key], false, key);
  }
});

test("signals require exact-purpose consent and finite purpose-bound retention", () => {
  const gate = contract.personalAnnotation.signalPurposeGate;
  assert.equal(gate.exactPurposeConsentRequired, true);
  assert.equal(gate.finitePurposeBoundRetentionRequired, true);
  assert.equal(gate.genericOptInAccepted, false);
  assert.equal(gate.contractAcceptedAsConsent, false);
  assert.equal(gate.administratorChoiceAcceptedAsConsent, false);
  assert.equal(gate.o5AcceptedAsConsentOrRetention, false);
  assert.equal(gate.indefiniteRetentionAccepted, false);

  const allHypotheticalGates = hypotheticalReceiptValidTrainingDecisionContext();
  assert.deepEqual(evaluateTrainingCandidate(signalCandidate(), allHypotheticalGates), {
    candidateEligible: true,
    hypotheticalReceiptsValid: true,
    currentlyAuthorized: false,
    reason: "HYPOTHETICAL_RECEIPTS_VALID_CURRENT_USE_UNAUTHORIZED",
  });

  const invalidCandidates = [
    signalCandidate({ consent: undefined }),
    signalCandidate({ retention: undefined }),
    signalCandidate({ consent: { source: "GENERIC_OPT_IN" } }),
    signalCandidate({ retention: { source: "GENERIC_RETENTION" } }),
    signalCandidate({ consent: { exactPurpose: false } }),
    signalCandidate({ consent: { expired: true } }),
    signalCandidate({ consent: { revoked: true } }),
    signalCandidate({ consent: { expiresAt: "2026-08-01T00:00:00.000Z" } }),
    signalCandidate({ retention: { expired: true } }),
    signalCandidate({ retention: { revoked: true } }),
    signalCandidate({ retention: { finite: false } }),
    signalCandidate({ retention: { expiresAt: "" } }),
    signalCandidate({ retention: { expiresAt: "2026-08-01T00:00:00.000Z" } }),
    signalCandidate({ genericOptIn: true, consent: undefined, retention: undefined }),
    signalCandidate({ contractAsConsent: true, consent: undefined, retention: undefined }),
    signalCandidate({ administratorChoiceAsConsent: true, consent: undefined, retention: undefined }),
    signalCandidate({ o5AsConsentOrRetention: true, consent: undefined, retention: undefined }),
    signalCandidate({ containsRawBodyPointer: true }),
    signalCandidate({ reconstructiveDerivativeOfRawBody: true }),
    signalCandidate({ renamedRawPointerAsSignal: true }),
    signalCandidate({ renamedReconstructiveDerivativeAsSignal: true }),
  ];
  for (const field of gate.exactBindingFields) {
    invalidCandidates.push(signalCandidate({ consent: { [field]: `wrong-${field}` } }));
    invalidCandidates.push(signalCandidate({ retention: { [field]: `wrong-${field}` } }));
  }
  for (const candidate of invalidCandidates) {
    const result = evaluateTrainingCandidate(candidate, allHypotheticalGates);
    assert.equal(result.candidateEligible, false, result.reason);
    assert.equal(result.currentlyAuthorized, false, result.reason);
  }
  for (const key of ["trainingSignalContribution", "clearedContentBankPromotion", "o5OfflineTraining"]) {
    assert.equal(contract.authorizationBoundary[key], false, key);
  }
});

test("consent and retention expiry and revocation states require exact primitive false", () => {
  const gate = contract.personalAnnotation.signalPurposeGate;
  assert.deepEqual(gate.requiredExactPrimitiveBooleanStates, {
    consent: { expired: false, revoked: false },
    retention: { expired: false, revoked: false },
  });
  assert.equal(gate.exactFalseOnlyPreservesEligibility, true);
  assert.equal(gate.exactFalseCreatesConsentReceiptOrAuthorization, false);
  assert.equal(gate.truthinessDefaultingCoercionOrAbsenceAccepted, false);

  const allHypotheticalGates = hypotheticalReceiptValidTrainingDecisionContext();
  const invalidValues = [undefined, null, true, "true", "false", 0, 1, {}, []];
  for (const [recordName, states] of Object.entries(gate.requiredExactPrimitiveBooleanStates)) {
    for (const stateName of Object.keys(states)) {
      const omitted = signalCandidate();
      delete omitted[recordName][stateName];
      const omittedResult = evaluateTrainingCandidate(omitted, allHypotheticalGates);
      assert.equal(omittedResult.candidateEligible, false, `${recordName}.${stateName}: omitted`);
      assert.equal(omittedResult.hypotheticalReceiptsValid === true, false);
      assert.equal(omittedResult.currentlyAuthorized, false);

      for (const invalidValue of invalidValues) {
        const result = evaluateTrainingCandidate(signalCandidate({
          [recordName]: { [stateName]: invalidValue },
        }), allHypotheticalGates);
        assert.equal(
          result.candidateEligible,
          false,
          `${recordName}.${stateName}: ${String(invalidValue)}`,
        );
        assert.equal(result.hypotheticalReceiptsValid === true, false);
        assert.equal(result.currentlyAuthorized, false);
      }
    }
  }

  const valid = evaluateTrainingCandidate(signalCandidate(), allHypotheticalGates);
  assert.equal(valid.candidateEligible, true);
  assert.equal(valid.hypotheticalReceiptsValid, true);
  assert.equal(valid.currentlyAuthorized, false);

  for (const candidate of [
    signalCandidate({ consent: { state: "INACTIVE" } }),
    signalCandidate({ consent: { exactPurpose: false } }),
    signalCandidate({ retention: { finite: false } }),
    signalCandidate({ retention: { purposeId: "purpose-other" } }),
  ]) {
    const result = evaluateTrainingCandidate(candidate, allHypotheticalGates);
    assert.equal(result.candidateEligible, false, result.reason);
    assert.equal(result.hypotheticalReceiptsValid === true, false);
    assert.equal(result.currentlyAuthorized, false);
  }

  const falseOnly = signalCandidate();
  falseOnly.consent = { expired: false, revoked: false };
  falseOnly.retention = { expired: false, revoked: false };
  const falseOnlyResult = evaluateTrainingCandidate(falseOnly, allHypotheticalGates);
  assert.equal(falseOnlyResult.candidateEligible, false);
  assert.equal(falseOnlyResult.hypotheticalReceiptsValid === true, false);
  assert.equal(falseOnlyResult.currentlyAuthorized, false);

  const noApprovalReceipts = evaluateTrainingCandidate(signalCandidate(), trainingDecisionContext());
  assert.equal(noApprovalReceipts.candidateEligible, true);
  assert.equal(noApprovalReceipts.hypotheticalReceiptsValid, false);
  assert.equal(noApprovalReceipts.currentlyAuthorized, false);
});

test("future training approvals are independently resolved and exact-candidate bound", () => {
  const gate = contract.personalAnnotation.trainingApprovalReceiptGate;
  assert.equal(gate.appliesToEveryFutureTrainingCandidate, true);
  assert.deepEqual(gate.exactBindingFields, [
    "signalId",
    "signalRevisionId",
    "purposeId",
    "o5ScopeId",
  ]);
  assert.equal(gate.globalAuthorizationBooleanSubstitutionAllowed, false);
  assert.equal(gate.independentResolutionRequired, true);
  assert.equal(gate.replayedAllowed, false);
  assert.equal(gate.ambiguousAllowed, false);
  assert.equal(gate.validReceiptSetEffectUnderThisContract, "HYPOTHETICAL_FUTURE_BINDING_PROOF_ONLY");
  assert.equal(gate.currentTrainingAuthorizationEffectUnderThisContract, false);
  assert.equal(gate.mockFixtureHypotheticalOrFutureReceiptOverrideAllowed, false);

  const validCandidate = signalCandidate();
  const valid = evaluateTrainingCandidate(
    validCandidate,
    hypotheticalReceiptValidTrainingDecisionContext(),
  );
  assert.deepEqual(valid, {
    candidateEligible: true,
    hypotheticalReceiptsValid: true,
    currentlyAuthorized: false,
    reason: "HYPOTHETICAL_RECEIPTS_VALID_CURRENT_USE_UNAUTHORIZED",
  });

  const globalBooleanSubstitution = evaluateTrainingCandidate(validCandidate, trainingDecisionContext({
    trainingSignalContribution: true,
    clearedContentBankPromotion: true,
    o5OfflineTraining: true,
  }));
  assert.equal(globalBooleanSubstitution.candidateEligible, true);
  assert.equal(globalBooleanSubstitution.hypotheticalReceiptsValid, false);
  assert.equal(globalBooleanSubstitution.currentlyAuthorized, false);

  const receiptFields = ["contribution", "promotion", "o5"];
  for (let mask = 0; mask < 2 ** receiptFields.length; mask += 1) {
    const approvalReceipts = futureApprovalReceipts();
    for (const [index, field] of receiptFields.entries()) {
      if ((mask & (1 << index)) === 0) approvalReceipts[field] = undefined;
    }
    const result = evaluateTrainingCandidate(validCandidate, hypotheticalReceiptValidTrainingDecisionContext({
      approvalReceipts,
      trainingSignalContribution: true,
      clearedContentBankPromotion: true,
      o5OfflineTraining: true,
      mockFixture: true,
      hypotheticalFutureContext: true,
    }));
    assert.equal(result.currentlyAuthorized, false, `receipt mask ${mask}`);
    assert.equal(result.hypotheticalReceiptsValid, mask === 7, `receipt mask ${mask}`);
  }

  const invalidReceiptSets = [];
  for (const field of ["contribution", "promotion", "o5"]) {
    invalidReceiptSets.push(futureApprovalReceipts({ [field]: undefined }));
    invalidReceiptSets.push(futureApprovalReceipts({ [field]: { ambiguous: true } }));
    invalidReceiptSets.push(futureApprovalReceipts({ [field]: { replayed: true } }));
    invalidReceiptSets.push(futureApprovalReceipts({ [field]: { independentlyResolved: false } }));
    invalidReceiptSets.push(futureApprovalReceipts({ [field]: { matchingRecordCount: 0 } }));
    for (const bindingField of gate.exactBindingFields) {
      invalidReceiptSets.push(futureApprovalReceipts({
        [field]: { [bindingField]: `cross-${bindingField}` },
      }));
    }
  }
  const reused = futureApprovalReceipts();
  reused.promotion.receiptId = reused.contribution.receiptId;
  invalidReceiptSets.push(reused);

  for (const approvalReceipts of invalidReceiptSets) {
    const result = evaluateTrainingCandidate(validCandidate, hypotheticalReceiptValidTrainingDecisionContext({
      approvalReceipts,
    }));
    assert.equal(result.candidateEligible, true, result.reason);
    assert.equal(result.currentlyAuthorized, false, result.reason);
  }
  for (const key of ["trainingSignalContribution", "clearedContentBankPromotion", "o5OfflineTraining"]) {
    assert.equal(contract.authorizationBoundary[key], false, key);
  }
  assert.equal(contract.personalAnnotation.trainingGateSeparation.currentlyAuthorized, false);
  assert.equal(contract.personalAnnotation.trainingGateSeparation.receiptValidityImpliesCurrentAuthorization, false);
  for (const key of contract.personalAnnotation.trainingGateSeparation.canonicalAuthorizationFields) {
    assert.equal(contract.authorizationBoundary[key], false, key);
    assert.equal(typeof contract.authorizationBoundary[key], "boolean", key);
  }
});

test("consent and retention expiry use only trusted server decision time", () => {
  const gate = contract.personalAnnotation.signalPurposeGate.trustedEvaluationTimeGate;
  assert.equal(gate.source, "TRUSTED_SERVER_CLOCK_BOUNDARY");
  assert.equal(gate.callerProvidedTimeAccepted, false);
  assert.equal(gate.candidateProvidedTimeAccepted, false);
  assert.equal(gate.expiryBoundaryPolicy, "EXPIRY_MUST_BE_STRICTLY_AFTER_EVALUATION_TIME");

  const decisionAtBoundary = hypotheticalReceiptValidTrainingDecisionContext({
    trustedEvaluationTime: trustedEvaluationTime({ evaluatedAt: "2026-09-01T00:00:00.000Z" }),
  });
  const beforeExpiry = evaluateTrainingCandidate(signalCandidate({
    consent: { expiresAt: "2026-09-02T00:00:00.000Z" },
    retention: { expiresAt: "2026-09-02T00:00:00.000Z" },
  }), decisionAtBoundary);
  assert.equal(beforeExpiry.candidateEligible, true);
  assert.equal(beforeExpiry.hypotheticalReceiptsValid, true);
  assert.equal(beforeExpiry.currentlyAuthorized, false);

  for (const field of ["consent", "retention"]) {
    for (const expiresAt of [
      "2026-09-01T00:00:00.000Z",
      "2026-08-31T23:59:59.999Z",
    ]) {
      const result = evaluateTrainingCandidate(signalCandidate({
        [field]: { expiresAt },
      }), decisionAtBoundary);
      assert.equal(result.candidateEligible, false, `${field}: ${expiresAt}`);
      assert.equal(result.currentlyAuthorized, false, `${field}: ${expiresAt}`);
    }
  }

  const invalidContexts = [
    {},
    trainingDecisionContext({ trustedEvaluationTime: undefined }),
    trainingDecisionContext({ trustedEvaluationTime: trustedEvaluationTime({ source: "CLIENT_CLOCK" }) }),
    trainingDecisionContext({ trustedEvaluationTime: trustedEvaluationTime({ evaluatedAt: "not-a-time" }) }),
    trainingDecisionContext({ trustedEvaluationTime: trustedEvaluationTime({ evaluatedAt: "2026-9-1" }) }),
    trainingDecisionContext({ trustedEvaluationTime: trustedEvaluationTime({ serverSide: false }) }),
    trainingDecisionContext({ trustedEvaluationTime: trustedEvaluationTime({ trusted: false }) }),
    trainingDecisionContext({ trustedEvaluationTime: trustedEvaluationTime({ ambiguous: true }) }),
    trainingDecisionContext({ callerEvaluationTime: "2026-08-01T00:00:00.000Z" }),
    trainingDecisionContext({ clientEvaluationTime: "2026-08-01T00:00:00.000Z" }),
  ];
  for (const context of invalidContexts) {
    const result = evaluateTrainingCandidate(signalCandidate(), context);
    assert.equal(result.candidateEligible, false, result.reason);
    assert.equal(result.currentlyAuthorized, false, result.reason);
  }
  const candidateControlled = evaluateTrainingCandidate(
    signalCandidate({ evaluationTime: "2026-08-01T00:00:00.000Z" }),
    hypotheticalReceiptValidTrainingDecisionContext(),
  );
  assert.equal(candidateControlled.candidateEligible, false);
  assert.equal(candidateControlled.currentlyAuthorized, false);
});

test("pre-response confirmation rejects missing, stale, replayed, mismatched and ambiguous records", () => {
  for (const request of [
    cueRenderRequest({ confirmation: undefined }),
    cueRenderRequest({ confirmation: cueConfirmation({ status: "CANCELLED" }) }),
    cueRenderRequest({ confirmation: cueConfirmation({ stale: true }) }),
    cueRenderRequest({ confirmation: cueConfirmation({ consumed: true }) }),
    cueRenderRequest({ confirmation: cueConfirmation({ matchingRecordCount: 2, ambiguous: true }) }),
    cueRenderRequest({ confirmation: undefined, clientConfirmationBoolean: true }),
    cueRenderRequest({ confirmation: undefined, preselectedConsent: true }),
    cueRenderRequest({ clientAttemptState: "INDEPENDENT_ATTEMPT_OPEN" }),
  ]) {
    const result = evaluateCueRender(request);
    assert.equal(result.accepted, false, result.reason);
    assert.equal(result.mayRenderCueBytes, false, result.reason);
  }
  for (const field of contract.cueExposure.beforeResponseGate.confirmationBindingFields) {
    const result = evaluateCueRender(cueRenderRequest({
      confirmation: cueConfirmation({ [field]: `wrong-${field}` }),
    }));
    assert.equal(result.accepted, false, field);
    assert.match(result.reason, /MISMATCH/, field);
  }
});

test("pre-response rejects confirmations explicitly marked replayed across both render validators", () => {
  const gate = contract.cueExposure.beforeResponseGate;
  assert.equal(gate.confirmationReplayedMustExactlyEqual, false);
  const subject = cueRenderRequest({
    assistanceClassification: "LOW",
    confirmation: cueConfirmation({
      replayed: true,
      consumed: false,
      singleUse: true,
    }),
  });
  for (const validate of [
    evaluateCueRender,
    (request) => validateCueExposureEvent(cueEvent(request)),
  ]) {
    const result = validate(subject);
    assert.equal(result.accepted, false);
    assert.equal(result.mayRenderCueBytes, false);
    assert.equal(result.reason, "CONFIRMATION_REPLAYED");
  }
});

test("valid confirmation commits exact assisted transition before render and races fail closed", () => {
  const valid = evaluateCueRender(cueRenderRequest());
  assert.deepEqual(valid, {
    accepted: true,
    mayRenderCueBytes: true,
    canonicalAttemptState: "ASSISTED",
    independentEvidenceEligible: false,
    positiveLearningEvidence: false,
    atomicCommitCompletedBeforeRender: true,
    gateId: "EXACT_PRE_RESPONSE_RENDER_GATE_V1",
    orderedSteps: [
      "CONFIRMATION_CONSUMPTION_COMMITTED",
      "CUE_EXPOSURE_RECORD_COMMITTED",
      "ATTEMPT_STATE_TRANSITIONED_TO_ASSISTED",
      "INDEPENDENT_EVIDENCE_INVALIDATED",
      "CUE_BYTES_RENDERED",
    ],
  });
  for (const request of [
    cueRenderRequest({ commitSteps: ["CONFIRMATION_RECORD_COMMITTED"] }),
    cueRenderRequest({ commitSteps: [
      "CUE_EXPOSURE_RECORD_COMMITTED",
      "CONFIRMATION_RECORD_COMMITTED",
      "ATTEMPT_STATE_TRANSITIONED_TO_ASSISTED",
      "INDEPENDENT_EVIDENCE_INVALIDATED",
    ] }),
    cueRenderRequest({ recordFailure: true }),
    cueRenderRequest({ renderSubmitRaceDetected: true }),
  ]) {
    assert.equal(evaluateCueRender(request).mayRenderCueBytes, false);
  }
  assert.equal(evaluateCueRender(cueRenderRequest({
    canonicalAttemptState: "SUBMITTED",
    timing: "BEFORE_RESPONSE",
  })).accepted, false);
  assert.deepEqual(evaluateCueRender(cueRenderRequest({
    canonicalAttemptState: "SUBMITTED",
    timing: "AFTER_RESPONSE",
    confirmation: undefined,
    canonicalRecordCommitted: true,
  })), {
    accepted: true,
    mayRenderCueBytes: true,
    independentEvidenceEligible: false,
    positiveLearningEvidence: false,
    attemptId: "attempt-1",
    timing: "AFTER_RESPONSE",
  });
});

test("submitted-attempt bindings require exact learner scope across request and event validators", () => {
  const gate = contract.cueExposure.afterResponseGate;
  assert.equal(gate.sharedAcrossEveryApplicableRenderCapableValidator, true);
  assert.deepEqual(gate.renderCapableValidators, [
    "CUE_RENDER_REQUEST_VALIDATOR",
    "CUE_EXPOSURE_EVENT_VALIDATOR",
  ]);
  assert.equal(gate.nonNullExactLearnerPrivateScopeIdRequired, true);
  assert.equal(gate.learnerPrivateScopeBindingRule.requiredPrimitiveType, "string");
  assert.equal(gate.learnerPrivateScopeBindingRule.trimmedRequired, true);
  assert.equal(gate.learnerPrivateScopeBindingRule.matchingMissingOrUndefinedAccepted, false);

  const validators = [
    ["request", (overrides = {}) => evaluateCueRender(cueRenderRequest({
      canonicalAttemptState: "SUBMITTED",
      timing: "AFTER_RESPONSE",
      confirmation: undefined,
      ...overrides,
    }))],
    ["event", (overrides = {}) => validateCueExposureEvent(cueEvent({
      timing: "AFTER_RESPONSE",
      ...overrides,
    }))],
  ];
  const invalidBindings = [
    {
      learnerPrivateScopeId: undefined,
      attemptResolution: canonicalAttemptResolution({ learnerPrivateScopeId: undefined }),
    },
    { learnerPrivateScopeId: undefined },
    { attemptResolution: canonicalAttemptResolution({ learnerPrivateScopeId: undefined }) },
    {
      learnerPrivateScopeId: "learner-foreign",
      attemptResolution: canonicalAttemptResolution({
        learnerPrivateScopeId: "learner-foreign",
        crossLearner: true,
      }),
    },
    { attemptResolution: canonicalAttemptResolution({ learnerPrivateScopeId: "learner-other" }) },
    { attemptResolution: canonicalAttemptResolution({ resolved: false }) },
    { attemptResolution: canonicalAttemptResolution({ ambiguous: true }) },
    { attemptResolution: canonicalAttemptResolution({ conflicting: true }) },
    { attemptResolution: canonicalAttemptResolution({ stale: true }) },
    { attemptResolution: canonicalAttemptResolution({ replayed: true }) },
    { attemptResolution: canonicalAttemptResolution({ clientInferred: true }) },
    { clientLearnerPrivateScopeId: "learner-1" },
    { callerLearnerPrivateScopeId: "learner-1" },
    { inferLearnerPrivateScopeId: true },
    {
      attemptId: undefined,
      attemptResolution: canonicalAttemptResolution({ attemptId: undefined }),
    },
    { attemptId: null },
    { attemptId: "   " },
    { attemptResolution: canonicalAttemptResolution({ attemptId: "attempt-other" }) },
    { attemptResolution: canonicalAttemptResolution({ crossAttempt: true }) },
    { clientAttemptId: "attempt-1" },
    { inferLatestAttempt: true },
  ];
  for (const invalidScope of [null, "", "   ", " learner-1", "learner-1 ", 0, true, {}, []]) {
    invalidBindings.push({ learnerPrivateScopeId: invalidScope });
    invalidBindings.push({
      attemptResolution: canonicalAttemptResolution({ learnerPrivateScopeId: invalidScope }),
    });
  }

  for (const [name, validate] of validators) {
    for (const invalidBinding of invalidBindings) {
      const result = validate(invalidBinding);
      assert.equal(result.accepted, false, `${name}: ${result.reason}`);
      assert.equal(result.mayRenderCueBytes, false, `${name}: ${result.reason}`);
    }
    const valid = validate();
    assert.equal(valid.accepted, true, name);
    assert.equal(valid.mayRenderCueBytes, true, name);
  }
});

test("after-response rejects every non-exact canonical submitted-attempt reference", () => {
  const base = {
    canonicalAttemptState: "SUBMITTED",
    timing: "AFTER_RESPONSE",
    confirmation: undefined,
    canonicalRecordCommitted: true,
  };
  const invalidRequests = [
    cueRenderRequest({ ...base, attemptId: undefined }),
    cueRenderRequest({ ...base, attemptId: "" }),
    cueRenderRequest({ ...base, attemptResolution: undefined }),
    cueRenderRequest({ ...base, attemptResolution: canonicalAttemptResolution({ known: false }) }),
    cueRenderRequest({ ...base, attemptResolution: canonicalAttemptResolution({ matchingRecordCount: 0 }) }),
    cueRenderRequest({ ...base, attemptResolution: canonicalAttemptResolution({ crossLearner: true }) }),
    cueRenderRequest({ ...base, attemptResolution: canonicalAttemptResolution({ crossAttempt: true }) }),
    cueRenderRequest({ ...base, attemptResolution: canonicalAttemptResolution({ mismatched: true }) }),
    cueRenderRequest({ ...base, attemptResolution: canonicalAttemptResolution({ replayed: true }) }),
    cueRenderRequest({ ...base, attemptResolution: canonicalAttemptResolution({ preSubmission: true }) }),
    cueRenderRequest({ ...base, attemptResolution: canonicalAttemptResolution({ submitted: false }) }),
    cueRenderRequest({ ...base, attemptResolution: canonicalAttemptResolution({ submittedBeforeExposure: false }) }),
    cueRenderRequest({ ...base, attemptResolution: canonicalAttemptResolution({ canonicalAttemptState: "INDEPENDENT_ATTEMPT_OPEN" }) }),
    cueRenderRequest({ ...base, attemptResolution: canonicalAttemptResolution({ source: "CLIENT" }) }),
    cueRenderRequest({ ...base, attemptResolution: canonicalAttemptResolution({ attemptId: "other-attempt" }) }),
    cueRenderRequest({ ...base, attemptResolution: canonicalAttemptResolution({ learnerPrivateScopeId: "other-learner" }) }),
    cueRenderRequest({ ...base, clientAttemptId: "attempt-1" }),
    cueRenderRequest({ ...base, inferLatestAttempt: true }),
  ];
  for (const request of invalidRequests) {
    const result = evaluateCueRender(request);
    assert.equal(result.accepted, false, result.reason);
    assert.equal(result.mayRenderCueBytes, false, result.reason);
    assert.equal(result.independentEvidenceEligible, false, result.reason);
  }
});

test("after-response requests require canonicalRecordCommitted and ignore aliases", () => {
  const gate = contract.cueExposure.afterResponseGate;
  assert.equal(gate.canonicalRecordCommittedGateRef, "cueExposure.canonicalRecordCommittedGate");
  assert.equal(gate.canonicalRecordCommittedField, "canonicalRecordCommitted");
  assert.equal(gate.canonicalExposureRecordCommittedAliasAccepted, false);
  assert.equal(gate.alternateCommitFieldFallbackAllowed, false);

  for (const canonicalRecordCommitted of [
    undefined,
    null,
    false,
    "true",
    "false",
    0,
    1,
    {},
    [],
  ]) {
    const request = cueRenderRequest({
      canonicalAttemptState: "SUBMITTED",
      timing: "AFTER_RESPONSE",
      confirmation: undefined,
      canonicalRecordCommitted,
      canonicalExposureRecordCommitted: true,
    });
    const result = evaluateCueRender(request);
    assert.equal(result.accepted, false, String(canonicalRecordCommitted));
    assert.equal(result.mayRenderCueBytes, false, String(canonicalRecordCommitted));
  }

  const valid = evaluateCueRender(cueRenderRequest({
    canonicalAttemptState: "SUBMITTED",
    timing: "AFTER_RESPONSE",
    confirmation: undefined,
    canonicalRecordCommitted: true,
    canonicalExposureRecordCommitted: false,
  }));
  assert.equal(valid.accepted, true);
  assert.equal(valid.mayRenderCueBytes, true);

  const trueAlone = evaluateCueRender(cueRenderRequest({
    canonicalAttemptState: "SUBMITTED",
    timing: "AFTER_RESPONSE",
    confirmation: undefined,
    canonicalRecordCommitted: true,
    attemptId: undefined,
  }));
  assert.equal(trueAlone.accepted, false);
  assert.equal(trueAlone.mayRenderCueBytes, false);

  assert.equal(validateCueExposureEvent(cueEvent({
    timing: "AFTER_RESPONSE",
    canonicalRecordCommitted: false,
    canonicalExposureRecordCommitted: true,
  })).accepted, false);
  assert.equal(validateCueExposureEvent(cueEvent({
    timing: "AFTER_RESPONSE",
    canonicalRecordCommitted: true,
  })).accepted, true);
});

test("after-response requests validate the closed timing classification before render", () => {
  const gate = contract.cueExposure.afterResponseGate;
  assert.equal(
    gate.timingClassificationMapRef,
    "cueExposure.closedTimingClassificationMap.AFTER_RESPONSE",
  );
  assert.equal(gate.assistanceClassificationRequiredOnRequest, true);
  assert.equal(
    gate.missingOrDisallowedAssistanceClassificationBehavior,
    "FAIL_CLOSED_NO_CUE_BYTES",
  );
  assert.equal(contract.hardGates.afterResponseRequestWithoutClosedClassification, 0);

  const omitted = cueRenderRequest({ timing: "AFTER_RESPONSE", confirmation: undefined });
  delete omitted.assistanceClassification;
  for (const request of [
    omitted,
    cueRenderRequest({
      timing: "AFTER_RESPONSE",
      assistanceClassification: "BOGUS",
      confirmation: undefined,
    }),
  ]) {
    const result = evaluateCueRender(request);
    assert.equal(result.accepted, false);
    assert.equal(result.mayRenderCueBytes, false);
    assert.equal(result.reason, "TIMING_CLASSIFICATION_INVALID");
  }

  for (const assistanceClassification of contract.cueExposure.closedTimingClassificationMap.AFTER_RESPONSE) {
    const result = evaluateCueRender(cueRenderRequest({
      timing: "AFTER_RESPONSE",
      assistanceClassification,
      confirmation: undefined,
    }));
    assert.equal(result.accepted, true, assistanceClassification);
    assert.equal(result.mayRenderCueBytes, true, assistanceClassification);
  }
});

test("after-response exposure events reject explicit record failures before timing routing", () => {
  const gate = contract.cueExposure.recordFailureGate;
  assert.equal(gate.gateId, "EXACT_RENDER_RECORD_FAILURE_GATE_V1");
  assert.equal(gate.sharedAcrossEveryRenderCapableValidator, true);
  assert.equal(gate.evaluatedBeforeTimingRouting, true);
  assert.equal(gate.field, "recordFailure");
  assert.equal(gate.requiredPrimitiveType, "boolean");
  assert.equal(gate.requiredExactValue, false);

  const event = validateCueExposureEvent(cueEvent({
    timing: "AFTER_RESPONSE",
    canonicalRecordCommitted: true,
    recordFailure: true,
  }));
  assert.equal(event.accepted, false);
  assert.equal(event.mayRenderCueBytes, false);
  assert.equal(event.reason, contract.cueExposure.recordFailureBehavior);

  const request = evaluateCueRender(cueRenderRequest({
    canonicalAttemptState: "SUBMITTED",
    timing: "AFTER_RESPONSE",
    confirmation: undefined,
    canonicalRecordCommitted: true,
    recordFailure: true,
  }));
  assert.equal(request.accepted, false);
  assert.equal(request.mayRenderCueBytes, false);
});

test("review-only requests require exact canonicalRecordCommitted across both validators", () => {
  const commitGate = contract.cueExposure.canonicalRecordCommittedGate;
  const reviewOnlyGate = contract.cueExposure.reviewOnlyGate;
  assert.equal(commitGate.sharedAcrossEveryRenderCapableValidator, true);
  assert.deepEqual(commitGate.renderCapableValidators, [
    "CUE_RENDER_REQUEST_VALIDATOR",
    "CUE_EXPOSURE_EVENT_VALIDATOR",
  ]);
  assert.equal(
    reviewOnlyGate.canonicalRecordCommittedGateRef,
    "cueExposure.canonicalRecordCommittedGate",
  );

  const omitted = reviewOnlyRequest();
  delete omitted.canonicalRecordCommitted;
  for (const subject of [
    omitted,
    reviewOnlyRequest({ canonicalRecordCommitted: undefined }),
    reviewOnlyRequest({ canonicalRecordCommitted: null }),
    reviewOnlyRequest({ canonicalRecordCommitted: false }),
    reviewOnlyRequest({ canonicalRecordCommitted: "true" }),
    reviewOnlyRequest({ canonicalRecordCommitted: 1 }),
    reviewOnlyRequest({ canonicalRecordCommitted: {} }),
    reviewOnlyRequest({ canonicalRecordCommitted: [] }),
  ]) {
    const event = cueEvent(subject);
    if (!Object.hasOwn(subject, "canonicalRecordCommitted")) {
      delete event.canonicalRecordCommitted;
    }
    for (const result of [
      evaluateCueRender(subject),
      validateCueExposureEvent(event),
    ]) {
      assert.equal(result.accepted, false);
      assert.equal(result.mayRenderCueBytes, false);
      assert.equal(result.reason, contract.cueExposure.recordFailureBehavior);
    }
  }

  assert.equal(evaluateCueRender(reviewOnlyRequest()).accepted, true);
  assert.equal(validateCueExposureEvent(cueEvent(reviewOnlyRequest())).accepted, true);
});

test("review-only exposure events require canonical provenance and exact ordering before routing", () => {
  const gate = contract.cueExposure.reviewOnlyGate.exposureEventPreRoutingGate;
  assert.equal(gate.validator, "CUE_EXPOSURE_EVENT_VALIDATOR");
  assert.equal(gate.evaluatedBeforeReviewOnlyRouting, true);
  assert.equal(gate.requiredDerivedFromField, "derivedFrom");
  assert.equal(gate.requiredDerivedFromSourceRef, "cueExposure.timingAndClassificationSource");
  assert.equal(gate.requiredOrderingField, "ordering");
  assert.equal(gate.requiredOrderingValue, "ORDERED");
  assert.equal(gate.requestValidatorRequiresEventOnlyFields, false);
  assert.equal(contract.hardGates.reviewOnlyEventWithoutProvenanceOrOrdering, 0);

  const missingProvenance = cueEvent(reviewOnlyRequest());
  delete missingProvenance.derivedFrom;
  const missingOrdering = cueEvent(reviewOnlyRequest());
  delete missingOrdering.ordering;
  for (const event of [
    missingProvenance,
    cueEvent(reviewOnlyRequest({ derivedFrom: "CLIENT_EVENT" })),
    missingOrdering,
    cueEvent(reviewOnlyRequest({ ordering: "AMBIGUOUS" })),
  ]) {
    const result = validateCueExposureEvent(event);
    assert.equal(result.accepted, false);
    assert.equal(result.mayRenderCueBytes, false);
  }

  assert.equal(validateCueExposureEvent(cueEvent(reviewOnlyRequest())).accepted, true);
  assert.equal(evaluateCueRender(reviewOnlyRequest()).accepted, true);
});

test("review-only requires canonical server derivation and no matching open attempt", () => {
  const gate = contract.cueExposure.reviewOnlyGate;
  assert.equal(gate.gateId, "CANONICAL_REVIEW_ONLY_RENDER_GATE_V1");
  assert.equal(gate.sharedAcrossEveryRenderCapableValidator, true);
  assert.equal(gate.callerSuppliedReviewOnlyLabelSufficient, false);
  assert.equal(gate.callerSuppliedCanonicalExposureRecordCommittedAccepted, false);
  assert.equal(gate.clientEventAccepted, false);
  assert.equal(gate.inferredTimingAccepted, false);
  assert.equal(gate.matchingCanonicalOpenIndependentAttemptCount, 0);

  for (const request of [
    reviewOnlyRequest({ reviewOnlyResolution: undefined }),
    reviewOnlyRequest({ canonicalExposureRecordCommitted: true }),
    reviewOnlyRequest({ clientEvent: { timing: "REVIEW_ONLY" } }),
    reviewOnlyRequest({ inferTiming: true }),
    reviewOnlyRequest({ timing: "BEFORE_RESPONSE" }),
    reviewOnlyRequest({ assistanceClassification: "LOW" }),
    reviewOnlyRequest({ reviewOnlyResolution: canonicalReviewOnlyResolution({ known: false }) }),
    reviewOnlyRequest({ reviewOnlyResolution: canonicalReviewOnlyResolution({ matchingResolutionCount: 2 }) }),
    reviewOnlyRequest({ reviewOnlyResolution: canonicalReviewOnlyResolution({ ambiguous: true }) }),
    reviewOnlyRequest({ reviewOnlyResolution: canonicalReviewOnlyResolution({ conflicting: true }) }),
    reviewOnlyRequest({ reviewOnlyResolution: canonicalReviewOnlyResolution({ crossLearner: true }) }),
    reviewOnlyRequest({ reviewOnlyResolution: canonicalReviewOnlyResolution({ stale: true }) }),
    reviewOnlyRequest({ reviewOnlyResolution: canonicalReviewOnlyResolution({ clientInferred: true }) }),
    reviewOnlyRequest({ reviewOnlyResolution: canonicalReviewOnlyResolution({
      canonicalExposureRecordState: "MISSING",
    }) }),
    reviewOnlyRequest({ reviewOnlyResolution: canonicalReviewOnlyResolution({
      openIndependentAttemptResolution: null,
    }) }),
    reviewOnlyRequest({ recordFailure: true }),
    reviewOnlyRequest({ renderSubmitRaceDetected: true }),
  ]) {
    const result = evaluateCueRender(request);
    assert.equal(result.accepted, false, result.reason);
    assert.equal(result.mayRenderCueBytes, false, result.reason);
  }

  const openAttemptResolution = canonicalReviewOnlyResolution({
    openIndependentAttemptResolution: { matchingRecordCount: 1 },
  });
  for (const validate of [
    (subject) => evaluateCueRender(subject),
    (subject) => validateCueExposureEvent(cueEvent(subject)),
  ]) {
    const result = validate(reviewOnlyRequest({ reviewOnlyResolution: openAttemptResolution }));
    assert.equal(result.accepted, false, result.reason);
    assert.equal(result.mayRenderCueBytes, false, result.reason);
  }

  const alternatePathCallerLabel = validateCueExposureEvent(cueEvent({
    timing: "REVIEW_ONLY",
    reviewOnlyResolution: undefined,
  }));
  assert.equal(alternatePathCallerLabel.accepted, false);
  assert.equal(alternatePathCallerLabel.mayRenderCueBytes, false);
  const alternatePathClientEvent = validateCueExposureEvent(cueEvent({
    timing: "REVIEW_ONLY",
    derivedFrom: "CLIENT_EVENT",
  }));
  assert.equal(alternatePathClientEvent.accepted, false);
  assert.equal(alternatePathClientEvent.mayRenderCueBytes, false);

  for (const openIndependentAttemptResolution of [
    { source: "CLIENT" },
    { queriedCanonicalAttemptState: "SUBMITTED" },
    { known: false },
    { ambiguous: true },
    { crossLearner: true },
    { stale: true },
    { learnerPrivateScopeId: "other-learner" },
    { attemptScopeId: "other-scope" },
  ]) {
    const result = evaluateCueRender(reviewOnlyRequest({
      reviewOnlyResolution: canonicalReviewOnlyResolution({ openIndependentAttemptResolution }),
    }));
    assert.equal(result.accepted, false, result.reason);
    assert.equal(result.mayRenderCueBytes, false, result.reason);
  }
  for (const field of gate.exactBindingFields) {
    const missing = reviewOnlyRequest();
    delete missing[field];
    assert.equal(evaluateCueRender(missing).accepted, false, `${field}: missing`);
    const mismatch = reviewOnlyRequest({
      reviewOnlyResolution: canonicalReviewOnlyResolution({ [field]: `other-${field}` }),
    });
    assert.equal(evaluateCueRender(mismatch).accepted, false, `${field}: mismatch`);
  }

  const event = validateCueExposureEvent(cueEvent({ timing: "REVIEW_ONLY" }));
  assert.deepEqual(event, {
    accepted: true,
    mayRenderCueBytes: true,
    independentEvidenceEligible: false,
    evidenceNeutral: true,
    timing: "REVIEW_ONLY",
    assistanceClassification: "NONE",
    gateId: "CANONICAL_REVIEW_ONLY_RENDER_GATE_V1",
  });
  assert.deepEqual(evaluateCueRender(reviewOnlyRequest()), event);

  const invalidBoundReview = evaluateCueRender(reviewOnlyRequest({
    attemptId: "attempt-1",
    attemptResolution: canonicalAttemptResolution({ attemptId: "other-attempt" }),
  }));
  assert.equal(invalidBoundReview.accepted, false);
  assert.equal(invalidBoundReview.mayRenderCueBytes, false);
});

test("review-only rejects unresolved outer canonical timing resolutions across both validators", () => {
  const gate = contract.cueExposure.reviewOnlyGate;
  assert.equal(gate.requiredResolutionBooleanStates.resolved, true);

  const missingResolved = canonicalReviewOnlyResolution();
  delete missingResolved.resolved;
  for (const reviewOnlyResolution of [
    missingResolved,
    canonicalReviewOnlyResolution({ resolved: false }),
  ]) {
    const subject = reviewOnlyRequest({ reviewOnlyResolution });
    for (const validate of [
      evaluateCueRender,
      (request) => validateCueExposureEvent(cueEvent(request)),
    ]) {
      const result = validate(subject);
      assert.equal(result.accepted, false);
      assert.equal(result.mayRenderCueBytes, false);
      assert.equal(result.reason, "CANONICAL_REVIEW_ONLY_RESOLUTION_INVALID");
    }
  }
});

test("review-only independently validates the nested canonical absence-resolution state", () => {
  const stateGate = contract.cueExposure.canonicalAttemptResolutionStateGate;
  const reviewOnlyGate = contract.cueExposure.reviewOnlyGate;
  assert.equal(
    reviewOnlyGate.canonicalAttemptAbsenceResolutionStateGateRef,
    "cueExposure.canonicalAttemptResolutionStateGate",
  );
  assert.equal(stateGate.eachResolutionValidatedIndependently, true);
  assert.equal(stateGate.truthinessDefaultingCoercionOrAbsenceAccepted, false);

  for (const [field, invalidValue] of [
    ["resolved", false],
    ["conflicting", true],
    ["clientInferred", true],
  ]) {
    const subject = reviewOnlyRequest({
      reviewOnlyResolution: canonicalReviewOnlyResolution({
        openIndependentAttemptResolution: { [field]: invalidValue },
      }),
    });
    for (const validate of [
      evaluateCueRender,
      (request) => validateCueExposureEvent(cueEvent(request)),
    ]) {
      const result = validate(subject);
      assert.equal(result.accepted, false, field);
      assert.equal(result.mayRenderCueBytes, false, field);
    }
  }
});

test("semantic-highlight accessibility requires visible label and computed name together", () => {
  assert.equal(validateSemanticHighlightAccessibility({
    visibleTextLabel: "정확한 정의",
    computedAccessibleName: "",
  }).accepted, false);
  assert.equal(validateSemanticHighlightAccessibility({
    visibleTextLabel: "",
    computedAccessibleName: "정확한 정의",
  }).accepted, false);
  assert.equal(validateSemanticHighlightAccessibility({
    visibleTextLabel: "정확한 정의",
    computedAccessibleName: "정확한 정의",
  }).accepted, true);
  assert.equal(contract.semanticHighlight.accessibilityRequirement.redundantAriaLabelRequired, false);
  assert.equal(validateSemanticHighlightAccessibility({
    visibleTextLabel: "정확한 정의",
    computedAccessibleName: "정확한 정의",
    ariaLabel: undefined,
  }).accepted, true);
});
