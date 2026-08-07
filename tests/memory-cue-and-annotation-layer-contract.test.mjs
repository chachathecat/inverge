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

function cueEvent(overrides = {}) {
  return {
    timing: "AFTER_RESPONSE",
    assistanceClassification: "NONE",
    derivedFrom: "CANONICAL_ASSISTANCE_EXPOSURE_LEDGER",
    ordering: "ORDERED",
    canonicalRecordCommitted: true,
    renderSubmitRaceDetected: false,
    ...overrides,
  };
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
  return { accepted: true, mayRenderCueBytes: true };
}

function evaluateAttemptEvidence(events) {
  const validated = events.map(validateCueExposureEvent);
  if (validated.some((result) => !result.accepted)) {
    return {
      failClosed: true,
      independentRetrieval: false,
      farTransfer: false,
      stableD7: false,
    };
  }
  const preResponse = events.some((event) => event.timing === "BEFORE_RESPONSE");
  if (preResponse && events.some((event) => event.assistanceClassification === "NONE")) {
    return {
      failClosed: true,
      independentRetrieval: false,
      farTransfer: false,
      stableD7: false,
    };
  }
  return {
    failClosed: false,
    independentRetrieval: !preResponse,
    farTransfer: !preResponse,
    stableD7: !preResponse,
  };
}

function evaluateTrainingCandidate(candidate, authorizations = contract.authorizationBoundary) {
  const annotation = contract.personalAnnotation;
  const rawOrigin = candidate.originKind === "PERSONAL_ANNOTATION_RAW_BODY"
    || candidate.containsRawAnnotationBody === true;
  if (rawOrigin) {
    return {
      candidateEligible: false,
      currentlyAuthorized: false,
      reason: "RAW_ANNOTATION_BODY_UNCONDITIONALLY_INELIGIBLE",
    };
  }
  if (candidate.renameOrAliasOfRawBody || candidate.directPromotionFromRawBody) {
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
      || candidate.containsExcerptOrFreeText === true
      || candidate.reconstructive === true
    ) {
      return { candidateEligible: false, currentlyAuthorized: false, reason: "SIGNAL_RECONSTRUCTIVE_OR_NOT_SEPARATE" };
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
    cueId: "cue-1",
    cueRevisionId: "cue-revision-1",
    requestId: "request-1",
    canonicalAttemptStateSource: "CANONICAL_SERVER_ATTEMPT_LEDGER",
    canonicalAttemptState: "INDEPENDENT_ATTEMPT_OPEN",
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
  if (
    request.canonicalAttemptStateSource !== cue.attemptStateSource
    || request.clientAttemptState !== undefined
  ) return fail("UNTRUSTED_ATTEMPT_STATE");
  if (request.renderSubmitRaceDetected) return fail(cue.preResponseAtomicCommit.renderSubmitRaceBehavior);
  if (request.recordFailure) return fail(cue.preResponseAtomicCommit.recordFailureBehavior);

  if (request.canonicalAttemptState === "SUBMITTED") {
    if (request.timing !== cue.afterResponseGate.onlyAllowedTimingForSubmittedAttempt) {
      return fail("SUBMITTED_ATTEMPT_AFTER_RESPONSE_ONLY");
    }
    if (request.canonicalExposureRecordCommitted !== true) return fail(cue.recordFailureBehavior);
    return { accepted: true, mayRenderCueBytes: true, independentEvidenceEligible: false, timing: "AFTER_RESPONSE" };
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
  const qa = read(P.qa);
  assert.match(qa, /PR #692 is merged at `512bfdb9232a86bf4f7d4cfbc076a9df1c8a7da2`/);
  assert.match(qa, /Focused behavioral contract suite: 16\/16 passed/);
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
  ]);
  assert.deepEqual(sequence, {
    failClosed: false,
    independentRetrieval: false,
    farTransfer: false,
    stableD7: false,
  });
  assert.deepEqual(evaluateAttemptEvidence([
    cueEvent({ timing: "AFTER_RESPONSE", assistanceClassification: "NONE" }),
  ]), {
    failClosed: false,
    independentRetrieval: true,
    farTransfer: true,
    stableD7: true,
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
    independentRetrieval: false,
    farTransfer: false,
    stableD7: false,
  });
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
  const safeSignal = evaluateTrainingCandidate({
    kind: "SEPARATE_NON_RECONSTRUCTIVE_SIGNAL",
    separateObjectIdentity: true,
    closedValueSchema: true,
    containsRawAnnotationBody: false,
    containsExcerptOrFreeText: false,
    reconstructive: false,
  });
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
    timing: "AFTER_RESPONSE",
  });
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
