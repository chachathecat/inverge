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

function validateAnchor(candidate, anchorContract = contract.anchors) {
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
  if (!policy.allowedDomains.includes(candidate.domain)) {
    return { accepted: false, disposition: "REJECT", reason: "DOMAIN_CONFLICT" };
  }
  if (!policy.allowedBodyLocatorPolicies.includes(candidate.bodyLocatorPolicy)) {
    return { accepted: false, disposition: "REJECT", reason: "LOCATOR_CONFLICT" };
  }
  if (policy.rightsStateRequired && !candidate.rightsState) {
    return { accepted: false, disposition: "REJECT", reason: "RIGHTS_STATE_REQUIRED" };
  }
  if (policy.domainRightsConsistencyRequired && candidate.rightsState !== candidate.domain) {
    return { accepted: false, disposition: "REJECT", reason: "RIGHTS_DOMAIN_CONFLICT" };
  }
  if (policy.itemLevelRightsRequired && !candidate.itemRightsManifestId) {
    return { accepted: false, disposition: "REJECT", reason: "ITEM_RIGHTS_REQUIRED" };
  }
  if (policy.ownerBound && !candidate.ownerBindingRef) {
    return { accepted: false, disposition: "REJECT", reason: "OWNER_BINDING_REQUIRED" };
  }
  if (policy.targetDigestPolicy && candidate.targetDigestScope !== policy.targetDigestPolicy) {
    return { accepted: false, disposition: "REJECT", reason: "PRIVATE_DIGEST_SCOPE_CONFLICT" };
  }
  return { accepted: true, policy };
}

function projectPrivateAnchorOutsideVault(candidate, destination = "PRIVATE_METADATA_RECEIPT") {
  const validation = validateAnchor(candidate);
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
    submitted: true,
    submittedBeforeExposure: true,
    crossLearner: false,
    crossAttempt: false,
    mismatched: false,
    replayed: false,
    preSubmission: false,
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
    renderSubmitRaceDetected: false,
    attemptId: "attempt-1",
    learnerPrivateScopeId: "learner-1",
    attemptResolution: canonicalAttemptResolution(),
    ...overrides,
  };
  if (
    event.timing === "REVIEW_ONLY"
    && !Object.hasOwn(overrides, "attemptId")
    && !Object.hasOwn(overrides, "attemptResolution")
  ) {
    delete event.attemptId;
    delete event.attemptResolution;
  }
  return event;
}

function validateCanonicalAttemptBinding(subject) {
  const gate = contract.cueExposure.afterResponseGate;
  if (subject.clientAttemptId !== undefined || subject.inferLatestAttempt === true) {
    return { accepted: false, reason: "UNTRUSTED_OR_INFERRED_ATTEMPT_ID" };
  }
  if (typeof subject.attemptId !== "string" || subject.attemptId.trim().length === 0) {
    return { accepted: false, reason: "EXACT_ATTEMPT_ID_REQUIRED" };
  }
  const resolution = subject.attemptResolution;
  if (!resolution) return { accepted: false, reason: "ATTEMPT_RESOLUTION_MISSING" };
  if (resolution.source !== gate.attemptResolutionSource) {
    return { accepted: false, reason: "ATTEMPT_RESOLUTION_SOURCE_INVALID" };
  }
  if (
    resolution.known !== true
    || resolution.matchingRecordCount !== gate.exactMatchingRecordCount
    || resolution.crossLearner === true
    || resolution.crossAttempt === true
    || resolution.mismatched === true
    || resolution.replayed === true
    || resolution.preSubmission === true
    || resolution.submitted !== true
    || resolution.submittedBeforeExposure !== true
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

function validateCueExposureEvent(event) {
  const cue = contract.cueExposure;
  if (event.derivedFrom !== cue.timingAndClassificationSource) {
    return { accepted: false, mayRenderCueBytes: false, reason: "UNTRUSTED_DERIVATION" };
  }
  if (event.ordering !== "ORDERED") {
    return { accepted: false, mayRenderCueBytes: false, reason: cue.ambiguousOrderingBehavior };
  }
  if (event.renderSubmitRaceDetected) {
    return { accepted: false, mayRenderCueBytes: false, reason: cue.renderSubmitRaceBehavior };
  }
  if (!event.canonicalRecordCommitted) {
    return { accepted: false, mayRenderCueBytes: false, reason: cue.recordFailureBehavior };
  }
  const allowed = cue.closedTimingClassificationMap[event.timing];
  if (!allowed || !allowed.includes(event.assistanceClassification)) {
    return { accepted: false, mayRenderCueBytes: false, reason: "TIMING_CLASSIFICATION_INVALID" };
  }
  if (event.timing === "BEFORE_RESPONSE") {
    if (typeof event.attemptId !== "string" || event.attemptId.trim().length === 0) {
      return { accepted: false, mayRenderCueBytes: false, reason: "EXACT_ATTEMPT_ID_REQUIRED" };
    }
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
    complete: true,
    missingExposureRecord: false,
    failedRender: false,
    partialCommit: false,
    ambiguousRecord: false,
    preResponseCueExposureCount: 0,
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
  return {
    source: "CANONICAL_TRANSFER_EVALUATION_LEDGER",
    canonicalAttemptSource: "CANONICAL_SERVER_ATTEMPT_LEDGER",
    sourceAttemptId: "attempt-1",
    transferAttemptId: "attempt-transfer-1",
    learnerPrivateScopeId: "learner-1",
    canonicalAttemptState: "SUBMITTED",
    originTaskId: "task-origin-1",
    transferTaskId: "task-transfer-1",
    distinctEligibleTask: true,
    representationRelation: "NON_SAME_REPRESENTATION",
    actualSubmission: true,
    evaluationCompleted: true,
    resultId: "transfer-result-1",
    assistanceState: "INDEPENDENT",
    exposureHistoryComplete: true,
    preResponseCueExposureCount: 0,
    ambiguous: false,
    ...overrides,
  };
}

function stableD7Evidence(overrides = {}) {
  return {
    source: "CANONICAL_D7_EVALUATION_LEDGER",
    canonicalAttemptSource: "CANONICAL_SERVER_ATTEMPT_LEDGER",
    sourceAttemptId: "attempt-1",
    d7AttemptId: "attempt-d7-1",
    learnerPrivateScopeId: "learner-1",
    canonicalAttemptState: "SUBMITTED",
    timing: "D_PLUS_7",
    actualSubmission: true,
    evaluationCompleted: true,
    cueState: "HIDDEN",
    hiddenCueBytesAbsentAcrossAllSurfaces: true,
    representationRelation: "NON_SAME_REPRESENTATION",
    unresolvedScoringConflictCount: 0,
    assistanceState: "INDEPENDENT",
    exposureHistoryComplete: true,
    preResponseCueExposureCount: 0,
    ambiguous: false,
    ...overrides,
  };
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

function evaluateAttemptEvidence(events, evidence = {}) {
  const validated = events.map(validateCueExposureEvent);
  if (validated.some((result) => !result.accepted)) {
    return noPositiveEvidence({ failClosed: true, eligibilityPreserved: false });
  }
  const history = evidence.exposureHistory;
  if (
    !history
    || history.source !== contract.cueExposure.learningEvidenceGate.exposureHistorySource
    || history.complete !== true
    || history.missingExposureRecord === true
    || history.failedRender === true
    || history.partialCommit === true
    || history.ambiguousRecord === true
  ) {
    return noPositiveEvidence({ failClosed: true, eligibilityPreserved: false });
  }
  const preResponse = events.some((event) => event.timing === "BEFORE_RESPONSE")
    || history.preResponseCueExposureCount > 0;
  const assisted = evidence.attempt?.assistanceState === "ASSISTED";
  if (preResponse || assisted) {
    return noPositiveEvidence({ failClosed: false, eligibilityPreserved: false });
  }

  const attempt = evidence.attempt;
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
    && response.ambiguous !== true
  );

  const transfer = evidence.farTransfer;
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
    && transfer.exposureHistoryComplete === true
    && transfer.preResponseCueExposureCount === 0
    && transfer.ambiguous !== true
  );

  const d7 = evidence.stableD7;
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
    && d7.actualSubmission === true
    && d7.evaluationCompleted === true
    && d7.cueState === "HIDDEN"
    && d7.hiddenCueBytesAbsentAcrossAllSurfaces === true
    && d7.representationRelation === "NON_SAME_REPRESENTATION"
    && d7.unresolvedScoringConflictCount === 0
    && d7.assistanceState === "INDEPENDENT"
    && d7.exposureHistoryComplete === true
    && d7.preResponseCueExposureCount === 0
    && d7.ambiguous !== true
  );

  return {
    failClosed: false,
    independentEvidenceEligibilityPreserved: true,
    independentRetrieval,
    farTransfer,
    stableD7,
  };
}

function evaluateTrainingCandidate(candidate, authorizations = contract.authorizationBoundary) {
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
    if (
      candidate.separateObjectIdentity !== true
      || candidate.closedValueSchema !== true
      || candidate.containsRawAnnotationBody === true
      || candidate.containsRawBodyPointer === true
      || candidate.containsExcerptOrFreeText === true
      || candidate.reconstructive === true
      || candidate.reconstructiveDerivativeOfRawBody === true
    ) {
      return { candidateEligible: false, currentlyAuthorized: false, reason: "SIGNAL_RECONSTRUCTIVE_OR_NOT_SEPARATE" };
    }
    const purposeGate = annotation.signalPurposeGate;
    const consent = candidate.consent;
    const retention = candidate.retention;
    const validationTime = Date.parse("2026-08-07T00:00:00.000Z");
    const retentionExpiry = Date.parse(retention?.expiresAt ?? "");
    const consentExpiry = consent?.expiresAt == null ? null : Date.parse(consent.expiresAt);
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
      || consent.expired === true
      || consent.revoked === true
      || retention.expired === true
      || retention.revoked === true
      || retention.finite !== true
      || typeof retention.expiresAt !== "string"
      || retention.expiresAt.trim().length === 0
      || !Number.isFinite(retentionExpiry)
      || retentionExpiry <= validationTime
      || (consentExpiry !== null && (!Number.isFinite(consentExpiry) || consentExpiry <= validationTime))
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
  const distinctGatesAuthorized = authorizations.trainingSignalContribution === true
    && authorizations.clearedContentBankPromotion === true
    && authorizations.o5OfflineTraining === true;
  return {
    candidateEligible: true,
    currentlyAuthorized: distinctGatesAuthorized,
    reason: distinctGatesAuthorized ? "AUTHORIZED_BY_DISTINCT_FUTURE_GATES" : "DISTINCT_GATES_NOT_ALL_AUTHORIZED",
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
    cueId: "cue-1",
    cueRevisionId: "cue-revision-1",
    requestId: "request-1",
    singleUse: true,
    matchingRecordCount: 1,
    stale: false,
    consumed: false,
    ambiguous: false,
    ...overrides,
  };
}

function cueRenderRequest(overrides = {}) {
  return {
    timing: "BEFORE_RESPONSE",
    attemptId: "attempt-1",
    learnerPrivateScopeId: "learner-1",
    cueId: "cue-1",
    cueRevisionId: "cue-revision-1",
    requestId: "request-1",
    canonicalAttemptStateSource: "CANONICAL_SERVER_ATTEMPT_LEDGER",
    canonicalAttemptState: "INDEPENDENT_ATTEMPT_OPEN",
    attemptResolution: canonicalAttemptResolution(),
    confirmation: cueConfirmation(),
    commitSteps: [...contract.cueExposure.preResponseAtomicCommit.orderedSteps],
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
  if (request.recordFailure) return fail(cue.preResponseAtomicCommit.recordFailureBehavior);

  if (request.timing === "REVIEW_ONLY") {
    if (request.canonicalExposureRecordCommitted !== true) return fail(cue.recordFailureBehavior);
    if (request.attemptId !== undefined || request.attemptResolution !== undefined) {
      const binding = validateCanonicalAttemptBinding(request);
      if (!binding.accepted) return fail(binding.reason);
    }
    return {
      accepted: true,
      mayRenderCueBytes: true,
      independentEvidenceEligible: false,
      evidenceNeutral: true,
      timing: "REVIEW_ONLY",
    };
  }

  if (
    request.canonicalAttemptStateSource !== cue.attemptStateSource
    || request.clientAttemptState !== undefined
  ) return fail("UNTRUSTED_ATTEMPT_STATE");

  if (request.canonicalAttemptState === "SUBMITTED") {
    if (request.timing !== cue.afterResponseGate.onlyAllowedTimingForSubmittedAttempt) {
      return fail("SUBMITTED_ATTEMPT_AFTER_RESPONSE_ONLY");
    }
    const binding = validateCanonicalAttemptBinding(request);
    if (!binding.accepted) return fail(binding.reason);
    if (request.canonicalExposureRecordCommitted !== true) return fail(cue.recordFailureBehavior);
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
  if (request.canonicalAttemptState !== cue.beforeResponseGate.eligibleCanonicalAttemptState) {
    return fail("INDEPENDENT_ATTEMPT_NOT_OPEN");
  }
  const confirmation = request.confirmation;
  if (!confirmation) {
    if (request.clientConfirmationBoolean === true) return fail("CLIENT_BOOLEAN_INSUFFICIENT");
    if (request.preselectedConsent === true) return fail("PRESELECTED_CONSENT_INSUFFICIENT");
    return fail("CONFIRMATION_MISSING");
  }
  if (confirmation.source !== cue.beforeResponseGate.confirmationRecordSource) {
    return fail("CONFIRMATION_SOURCE_INVALID");
  }
  if (confirmation.status === "CANCELLED") return fail("CONFIRMATION_CANCELLED");
  if (confirmation.status !== cue.beforeResponseGate.acceptedConfirmationState) {
    return fail("CONFIRMATION_STATE_INVALID");
  }
  if (confirmation.stale) return fail("CONFIRMATION_STALE");
  if (confirmation.consumed || confirmation.singleUse !== true) return fail("CONFIRMATION_REPLAYED");
  if (
    confirmation.ambiguous
    || confirmation.matchingRecordCount !== cue.beforeResponseGate.exactMatchingRecordCount
  ) return fail("CONFIRMATION_AMBIGUOUS");
  for (const field of cue.beforeResponseGate.confirmationBindingFields) {
    if (confirmation[field] !== request[field]) return fail(`CONFIRMATION_${field.toUpperCase()}_MISMATCH`);
  }
  if (JSON.stringify(request.commitSteps) !== JSON.stringify(cue.preResponseAtomicCommit.orderedSteps)) {
    return fail(cue.preResponseAtomicCommit.partialCommitBehavior);
  }
  return {
    accepted: true,
    mayRenderCueBytes: true,
    canonicalAttemptState: cue.preResponseAtomicCommit.postCommitAttemptState,
    independentEvidenceEligible: cue.preResponseAtomicCommit.postCommitIndependentEvidenceEligible,
    orderedSteps: [...request.commitSteps, cue.preResponseAtomicCommit.renderStep],
  };
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
  const qa = read(P.qa);
  assert.match(qa, /PR #692 is merged at `512bfdb9232a86bf4f7d4cfbc076a9df1c8a7da2`/);
  assert.match(qa, /Focused behavioral contract suite: 23\/23 passed/);
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
    validateAnchor({ kind: "UNKNOWN_KIND", domain: "SHARED_OWNED", bodyLocatorPolicy: "NONE" }),
    { accepted: false, disposition: "REJECT", reason: "UNKNOWN_KIND" },
  );

  const withFallback = structuredClone(contract.anchors);
  withFallback.kindPolicy.DEFAULT = {
    allowedDomains: ["SHARED_OWNED"],
    allowedBodyLocatorPolicies: ["NONE"],
  };
  assert.equal(validateAnchor({ kind: "UNKNOWN_KIND" }, withFallback).accepted, false);
  assert.equal(anchorPolicyIntegrity(withFallback).reason, "KIND_POLICY_KEY_SET_MISMATCH");

  const missingMapping = structuredClone(contract.anchors);
  delete missingMapping.kindPolicy.CONCEPT_NODE;
  assert.equal(anchorPolicyIntegrity(missingMapping).valid, false);
});

test("learner-attempt anchors reject shared domains and non-vault locators", () => {
  const base = {
    kind: "LEARNER_ATTEMPT_RANGE",
    domain: "LEARNER_PRIVATE",
    bodyLocatorPolicy: "VAULT_LOCAL_ONLY",
    ownerBindingRef: "owner_scope_local",
    targetDigestScope: "VAULT_LOCAL_INTEGRITY_METADATA_ONLY",
  };
  assert.equal(validateAnchor(base).accepted, true);
  for (const domain of ["SHARED_OWNED", "SHARED_OFFICIAL_PERMITTED"]) {
    const result = validateAnchor({ ...base, domain });
    assert.equal(result.accepted, false, domain);
    assert.equal(result.reason, "DOMAIN_CONFLICT", domain);
  }
  const locatorResult = validateAnchor({ ...base, bodyLocatorPolicy: "SHARED_STABLE_SELECTOR" });
  assert.equal(locatorResult.accepted, false);
  assert.equal(locatorResult.reason, "LOCATOR_CONFLICT");
});

test("private non-vault projection is a content-free bodyless receipt", () => {
  const learnerPolicy = contract.anchors.kindPolicy.LEARNER_ATTEMPT_RANGE;
  const sourcePolicy = contract.anchors.kindPolicy.PRIVATE_SOURCE_RANGE;
  assert.deepEqual(sourcePolicy, learnerPolicy);

  for (const kind of ["LEARNER_ATTEMPT_RANGE", "PRIVATE_SOURCE_RANGE"]) {
    const anchor = {
      kind,
      domain: "LEARNER_PRIVATE",
      bodyLocatorPolicy: "VAULT_LOCAL_ONLY",
      ownerBindingRef: "owner_scope_local",
      targetDigestScope: "VAULT_LOCAL_INTEGRITY_METADATA_ONLY",
      anchorId: "private_anchor",
      receiptId: "private_receipt",
      excerpt: "private answer",
      startOffset: 1,
      endOffset: 9,
      bodyLocator: "vault-only",
      attemptLocator: "attempt-only",
      attemptRef: "attempt_ref",
      targetDigest: "private_digest",
    };
    const projected = projectPrivateAnchorOutsideVault(anchor);
    assert.equal(projected.accepted, true, kind);
    const policy = contract.anchors.kindPolicy[kind].nonVaultProjection;
    assert.deepEqual(sorted(Object.keys(projected.receipt)), sorted(policy.allowedFields), kind);
    for (const field of policy.forbiddenFields) {
      assert.equal(Object.hasOwn(projected.receipt, field), false, `${kind}.${field}`);
    }
    for (const destination of policy.forbiddenDestinations) {
      assert.equal(
        projectPrivateAnchorOutsideVault(anchor, destination).accepted,
        false,
        `${kind}.${destination}`,
      );
    }
  }
});

test("cue timing mapping rejects pre-response NONE and preserves sticky ineligibility", () => {
  assert.deepEqual(
    sorted(Object.keys(contract.cueExposure.closedTimingClassificationMap)),
    sorted(contract.cueExposure.eventVariants.map(({ timing }) => timing)),
  );
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
    farTransfer: farTransferEvidence(),
    stableD7: stableD7Evidence(),
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
    farTransferEvidence({ exposureHistoryComplete: false }),
    farTransferEvidence({ preResponseCueExposureCount: 1 }),
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
    stableD7Evidence({ exposureHistoryComplete: false }),
    stableD7Evidence({ preResponseCueExposureCount: 1 }),
    stableD7Evidence({ ambiguous: true }),
  ]) {
    assert.equal(evaluateAttemptEvidence([], { ...base, stableD7 }).stableD7, false);
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
  });
  const safeSignal = evaluateTrainingCandidate(signalCandidate());
  assert.deepEqual(safeSignal, {
    candidateEligible: true,
    currentlyAuthorized: false,
    reason: "DISTINCT_GATES_NOT_ALL_AUTHORIZED",
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

test("signals require exact-purpose consent and finite purpose-bound retention", () => {
  const gate = contract.personalAnnotation.signalPurposeGate;
  assert.equal(gate.exactPurposeConsentRequired, true);
  assert.equal(gate.finitePurposeBoundRetentionRequired, true);
  assert.equal(gate.genericOptInAccepted, false);
  assert.equal(gate.contractAcceptedAsConsent, false);
  assert.equal(gate.administratorChoiceAcceptedAsConsent, false);
  assert.equal(gate.o5AcceptedAsConsentOrRetention, false);
  assert.equal(gate.indefiniteRetentionAccepted, false);

  const allHypotheticalGates = {
    ...contract.authorizationBoundary,
    trainingSignalContribution: true,
    clearedContentBankPromotion: true,
    o5OfflineTraining: true,
  };
  assert.deepEqual(evaluateTrainingCandidate(signalCandidate(), allHypotheticalGates), {
    candidateEligible: true,
    currentlyAuthorized: true,
    reason: "AUTHORIZED_BY_DISTINCT_FUTURE_GATES",
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

test("valid confirmation commits exact assisted transition before render and races fail closed", () => {
  const valid = evaluateCueRender(cueRenderRequest());
  assert.deepEqual(valid, {
    accepted: true,
    mayRenderCueBytes: true,
    canonicalAttemptState: "ASSISTED",
    independentEvidenceEligible: false,
    orderedSteps: [
      "CONFIRMATION_RECORD_COMMITTED",
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
    canonicalExposureRecordCommitted: true,
  })), {
    accepted: true,
    mayRenderCueBytes: true,
    independentEvidenceEligible: false,
    positiveLearningEvidence: false,
    attemptId: "attempt-1",
    timing: "AFTER_RESPONSE",
  });
});

test("after-response rejects every non-exact canonical submitted-attempt reference", () => {
  const base = {
    canonicalAttemptState: "SUBMITTED",
    timing: "AFTER_RESPONSE",
    confirmation: undefined,
    canonicalExposureRecordCommitted: true,
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

test("review-only may remain unbound and is always evidence-neutral", () => {
  const event = validateCueExposureEvent(cueEvent({ timing: "REVIEW_ONLY" }));
  assert.equal(event.accepted, true);
  assert.equal(event.evidenceNeutral, true);
  assert.equal(event.positiveLearningEvidence, false);

  assert.deepEqual(evaluateCueRender({
    timing: "REVIEW_ONLY",
    canonicalExposureRecordCommitted: true,
    recordFailure: false,
    renderSubmitRaceDetected: false,
  }), {
    accepted: true,
    mayRenderCueBytes: true,
    independentEvidenceEligible: false,
    evidenceNeutral: true,
    timing: "REVIEW_ONLY",
  });
  const invalidBoundReview = evaluateCueRender({
    timing: "REVIEW_ONLY",
    attemptId: "attempt-1",
    learnerPrivateScopeId: "learner-1",
    attemptResolution: canonicalAttemptResolution({ attemptId: "other-attempt" }),
    canonicalExposureRecordCommitted: true,
    recordFailure: false,
    renderSubmitRaceDetected: false,
  });
  assert.equal(invalidBoundReview.accepted, false);
  assert.equal(invalidBoundReview.mayRenderCueBytes, false);
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
