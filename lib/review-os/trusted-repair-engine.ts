import {
  TRUSTED_REPAIR_LOAD_BUDGET,
  TrustedRepairContractError,
  trustedRepairBindingProfile,
  type CalculationRelationAnchorV1,
  type PracticeCalculationClaimV2,
  type PracticeCalculationClaimV2Input,
  type PracticeProofEvaluationState,
  type ScopedPredicateAnchorV1,
  type TheoryPredicateClaimV1,
  type TheoryPredicateClaimV1Input,
  type TheoryProofEvaluationState,
  type TrustedRepairAggregate,
  type TrustedRepairArtifactKind,
  type TrustedRepairContinuation,
  type TrustedRepairFixture,
  type TrustedRepairGapCandidate,
  type TrustedRepairInputMode,
  type TrustedRepairPrivateArtifact,
  type TrustedRepairState,
  type TrustedRepairStateData,
  type TrustedRepairTransitionPlan,
} from "./trusted-repair-contract";

export type TrustedRepairSourceBindingState = Readonly<{
  bindingVersion: "synthetic_fixture";
  sourceStatus: "synthetic_fixture";
  versionStatus: "synthetic_fixture";
  currentLawStatus: "not_applicable_practice" | "not_applicable_theory";
  sourceAnchorId: string | null;
  blockerCount: 0;
}>;

export const SYNTHETIC_SOURCE_BINDING: TrustedRepairSourceBindingState = {
  bindingVersion: "synthetic_fixture",
  sourceStatus: "synthetic_fixture",
  versionStatus: "synthetic_fixture",
  currentLawStatus: "not_applicable_practice",
  sourceAnchorId: null,
  blockerCount: 0,
};

export const SYNTHETIC_THEORY_SOURCE_BINDING: TrustedRepairSourceBindingState = {
  ...SYNTHETIC_SOURCE_BINDING,
  currentLawStatus: "not_applicable_theory",
};

export function trustedRepairSourceVersion(
  fixture: TrustedRepairFixture,
  sourceBinding: TrustedRepairSourceBindingState,
) {
  return JSON.stringify({
    fixtureSource: fixture.sourceBinding,
    resolvedSource: sourceBinding,
    rightsManifest: fixture.rights,
    sourceDecision: fixture.sourceDecision,
  });
}

export function trustedRepairSourceBindingMatches(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairSourceBindingState;
}) {
  const bindings = input.aggregate.session.bindings;
  const expected = trustedRepairBindingProfile(input.aggregate.session.subject);
  return (
    bindings.contractVersion === expected.contractVersion &&
    bindings.fixtureVersion === expected.fixtureVersion &&
    bindings.rubricVersion === expected.rubricVersion &&
    bindings.policyVersion === expected.policyVersion &&
    bindings.validatorVersion === expected.validatorVersion &&
    bindings.sourceVersion === trustedRepairSourceVersion(input.fixture, input.sourceBinding)
  );
}

function guardState(
  aggregate: TrustedRepairAggregate,
  expected: TrustedRepairState | readonly TrustedRepairState[],
) {
  const expectedStates = Array.isArray(expected) ? expected : [expected];
  if (!expectedStates.includes(aggregate.session.state)) {
    throw new TrustedRepairContractError("invalid_transition");
  }
}

function normalizeEvidenceCandidate(value: string) {
  return value.normalize("NFKC").replace(/\r\n?/g, "\n").trim();
}

function practiceRelationAnchor(fixture: TrustedRepairFixture) {
  const anchors = fixture.anchors.flatMap((entry) =>
    "calculationRelation" in entry ? [entry.calculationRelation] : [],
  );
  if (anchors.length !== 1) {
    throw new TrustedRepairContractError("invalid_transition");
  }
  return anchors[0];
}

function theoryPredicateAnchor(fixture: TrustedRepairFixture) {
  const anchors = fixture.anchors.flatMap((entry) =>
    "scopedPredicate" in entry ? [entry.scopedPredicate] : [],
  );
  if (anchors.length !== 1) {
    throw new TrustedRepairContractError("invalid_transition");
  }
  return anchors[0];
}

export type PracticeCalculationClaimEvaluation = Readonly<{
  state: PracticeProofEvaluationState;
  verified: boolean;
  validatorId: "validator:practice-calculation-claim@2";
  anchorId: CalculationRelationAnchorV1["anchorId"];
  anchorVersionId: CalculationRelationAnchorV1["anchorVersionId"];
  sourceRevisionId: string;
  reasonCodes: readonly string[];
}>;

function relationOperand(anchor: CalculationRelationAnchorV1, role: "gross_income" | "operating_expense") {
  const matches = anchor.operandRoles.filter((operand) => operand.role === role);
  if (matches.length !== 1) throw new TrustedRepairContractError("invalid_transition");
  return matches[0];
}

export function validatePracticeCalculationClaim(input: {
  claim: PracticeCalculationClaimV2;
  anchor: CalculationRelationAnchorV1;
  expectedSourceRevisionId: string;
}): PracticeCalculationClaimEvaluation {
  const gross = relationOperand(input.anchor, "gross_income");
  const expense = relationOperand(input.anchor, "operating_expense");
  const reasons: string[] = [];
  if (input.claim.sourceRevisionId !== input.expectedSourceRevisionId) reasons.push("source_revision_mismatch");
  if (input.claim.anchorId !== input.anchor.anchorId) reasons.push("anchor_identity_mismatch");
  if (input.claim.anchorVersionId !== input.anchor.anchorVersionId) reasons.push("anchor_version_mismatch");
  if (input.claim.grossIncome.value !== gross.value) reasons.push("gross_income_value_mismatch");
  if (input.claim.grossIncome.unit !== gross.unit) reasons.push("gross_income_unit_mismatch");
  if (input.claim.operatingExpense.value !== expense.value) reasons.push("operating_expense_value_mismatch");
  if (input.claim.operatingExpense.unit !== expense.unit) reasons.push("operating_expense_unit_mismatch");
  if (input.claim.operator !== input.anchor.operator) reasons.push("operator_mismatch");
  if (input.claim.operandOrder[0] !== input.anchor.operandOrder[0] || input.claim.operandOrder[1] !== input.anchor.operandOrder[1]) reasons.push("operand_order_mismatch");
  if (input.claim.result.value !== input.anchor.result.value) reasons.push("result_value_mismatch");
  if (input.claim.result.unit !== input.anchor.result.unit) reasons.push("result_unit_mismatch");
  if (input.claim.sign !== input.anchor.sign) reasons.push("sign_mismatch");
  if (input.claim.rounding.mode !== input.anchor.rounding.mode) reasons.push("rounding_mode_mismatch");
  if (input.claim.rounding.scale !== input.anchor.rounding.scale) reasons.push("rounding_scale_mismatch");
  if (input.claim.rounding.required !== false) reasons.push("rounding_required_mismatch");
  if (!Number.isFinite(Date.parse(input.claim.learnerConfirmedAt))) reasons.push("confirmation_time_invalid");
  const state = reasons.length === 0 ? ("PASS" as const) : ("PARTIAL" as const);
  return {
    state,
    verified: state === "PASS",
    validatorId: "validator:practice-calculation-claim@2",
    anchorId: input.anchor.anchorId,
    anchorVersionId: input.anchor.anchorVersionId,
    sourceRevisionId: input.expectedSourceRevisionId,
    reasonCodes: reasons,
  };
}

export function buildPracticeCalculationClaim(input: {
  claim: PracticeCalculationClaimV2Input;
  learnerConfirmedAt: string;
}): PracticeCalculationClaimV2 {
  return { ...input.claim, learnerConfirmedAt: input.learnerConfirmedAt };
}

export function renderPracticeCalculationClaim(claim: PracticeCalculationClaimV2) {
  const format = (value: number) => new Intl.NumberFormat("ko-KR").format(value);
  return `${format(claim.grossIncome.value)}원/년에서 ${format(claim.operatingExpense.value)}원/년을 차감하면 ${format(claim.result.value)}원/년이며, 부호는 양수이고 반올림은 필요하지 않습니다.`;
}

export type TheoryPredicateClaimEvaluation = Readonly<{
  state: TheoryProofEvaluationState;
  verified: boolean;
  validatorId: "validator:theory-scoped-predicate@1";
  anchorId: ScopedPredicateAnchorV1["anchorId"];
  anchorVersionId: ScopedPredicateAnchorV1["anchorVersionId"];
  sourceRevisionId: string;
  targetScopeId: ScopedPredicateAnchorV1["targetScopeId"];
  reasonCodes: readonly string[];
}>;

export function validateTheoryPredicateClaim(input: {
  claim: TheoryPredicateClaimV1;
  anchor: ScopedPredicateAnchorV1;
  expectedSourceRevisionId: string;
}): TheoryPredicateClaimEvaluation {
  const identityReasons: string[] = [];
  if (input.claim.sourceRevisionId !== input.expectedSourceRevisionId) {
    identityReasons.push("source_revision_mismatch");
  }
  if (input.claim.anchorId !== input.anchor.anchorId) {
    identityReasons.push("anchor_identity_mismatch");
  }
  if (input.claim.anchorVersionId !== input.anchor.anchorVersionId) {
    identityReasons.push("anchor_version_mismatch");
  }
  if (input.claim.targetScopeId !== input.anchor.targetScopeId) {
    identityReasons.push("target_scope_identity_mismatch");
  }
  if (!Number.isFinite(Date.parse(input.claim.learnerConfirmedAt))) {
    identityReasons.push("confirmation_time_invalid");
  }

  const occurrenceCount = input.claim.clauses.reduce(
    (count, clause) => count + clause.predicates.length,
    0,
  );
  if (
    input.claim.clauses.length > input.anchor.overflowPolicy.maxClauses ||
    occurrenceCount > input.anchor.overflowPolicy.maxPredicateOccurrences
  ) {
    return {
      state: "UNSUPPORTED",
      verified: false,
      validatorId: input.anchor.deterministicValidatorId,
      anchorId: input.anchor.anchorId,
      anchorVersionId: input.anchor.anchorVersionId,
      sourceRevisionId: input.expectedSourceRevisionId,
      targetScopeId: input.anchor.targetScopeId,
      reasonCodes: [...identityReasons, "theory_predicate_bounds_overflow"],
    };
  }

  const unresolved = input.claim.clauses.some(
    (clause) => clause.scopeResolution === "UNRESOLVED_ANAPHORA",
  );
  const unscoped = input.claim.clauses.some(
    (clause) => clause.scopeResolution === "UNSCOPED",
  );
  const knownScopes = new Set([
    input.anchor.targetScopeId,
    ...input.anchor.counterexampleScopes,
  ]);
  const unknownScope = input.claim.clauses.some(
    (clause) =>
      clause.scopeResolution === "EXACT" &&
      clause.scopeId !== null &&
      !knownScopes.has(clause.scopeId as ScopedPredicateAnchorV1["targetScopeId"]),
  );
  if (unresolved || unscoped) {
    return {
      state: "AMBIGUOUS",
      verified: false,
      validatorId: input.anchor.deterministicValidatorId,
      anchorId: input.anchor.anchorId,
      anchorVersionId: input.anchor.anchorVersionId,
      sourceRevisionId: input.expectedSourceRevisionId,
      targetScopeId: input.anchor.targetScopeId,
      reasonCodes: [
        ...identityReasons,
        ...(unresolved ? ["unresolved_anaphora"] : []),
        ...(unscoped ? ["unscoped_assertion"] : []),
      ],
    };
  }
  if (unknownScope || identityReasons.length > 0) {
    return {
      state: "UNSUPPORTED",
      verified: false,
      validatorId: input.anchor.deterministicValidatorId,
      anchorId: input.anchor.anchorId,
      anchorVersionId: input.anchor.anchorVersionId,
      sourceRevisionId: input.expectedSourceRevisionId,
      targetScopeId: input.anchor.targetScopeId,
      reasonCodes: [
        ...identityReasons,
        ...(unknownScope ? ["unknown_target_scope"] : []),
      ],
    };
  }

  const targetPredicates = input.claim.clauses
    .filter(
      (clause) =>
        clause.scopeResolution === "EXACT" &&
        clause.scopeId === input.anchor.targetScopeId,
    )
    .flatMap((clause) => clause.predicates);
  const polarities = (predicateId: string) =>
    new Set(
      targetPredicates
        .filter((predicate) => predicate.predicateId === predicateId)
        .map((predicate) => predicate.polarity),
    );
  const forbidden = input.anchor.forbiddenPredicates.flatMap((predicateId) => {
    const values = polarities(predicateId);
    return values.has("ASSERTED") ? [predicateId] : [];
  });
  if (forbidden.length > 0) {
    return {
      state: "BLOCKED",
      verified: false,
      validatorId: input.anchor.deterministicValidatorId,
      anchorId: input.anchor.anchorId,
      anchorVersionId: input.anchor.anchorVersionId,
      sourceRevisionId: input.expectedSourceRevisionId,
      targetScopeId: input.anchor.targetScopeId,
      reasonCodes: forbidden.map((value) => `forbidden_predicate_asserted:${value}`),
    };
  }
  const mixed = [
    ...input.anchor.requiredPredicates,
    ...input.anchor.acceptableAlternatives.flat(),
  ].filter((predicateId) => {
    const values = polarities(predicateId);
    return values.has("ASSERTED") && values.has("NEGATED");
  });
  if (mixed.length > 0) {
    return {
      state: "AMBIGUOUS",
      verified: false,
      validatorId: input.anchor.deterministicValidatorId,
      anchorId: input.anchor.anchorId,
      anchorVersionId: input.anchor.anchorVersionId,
      sourceRevisionId: input.expectedSourceRevisionId,
      targetScopeId: input.anchor.targetScopeId,
      reasonCodes: mixed.map((value) => `same_target_mixed_polarity:${value}`),
    };
  }
  const requiredSatisfied = input.anchor.requiredPredicates.every((predicateId) =>
    polarities(predicateId).has("ASSERTED"),
  );
  const alternativeSatisfied = input.anchor.acceptableAlternatives.some((group) =>
    group.every((predicateId) => polarities(predicateId).has("ASSERTED")),
  );
  if (requiredSatisfied || alternativeSatisfied) {
    return {
      state: "PASS",
      verified: true,
      validatorId: input.anchor.deterministicValidatorId,
      anchorId: input.anchor.anchorId,
      anchorVersionId: input.anchor.anchorVersionId,
      sourceRevisionId: input.expectedSourceRevisionId,
      targetScopeId: input.anchor.targetScopeId,
      reasonCodes: [],
    };
  }
  const requiredNegated = input.anchor.requiredPredicates.some((predicateId) =>
    polarities(predicateId).has("NEGATED"),
  );
  const crossTargetOnly =
    targetPredicates.length === 0 &&
    input.claim.clauses.some(
      (clause) =>
        clause.scopeResolution === "EXACT" &&
        clause.scopeId !== input.anchor.targetScopeId,
    );
  return {
    state: crossTargetOnly ? "UNSUPPORTED" : "PARTIAL",
    verified: false,
    validatorId: input.anchor.deterministicValidatorId,
    anchorId: input.anchor.anchorId,
    anchorVersionId: input.anchor.anchorVersionId,
    sourceRevisionId: input.expectedSourceRevisionId,
    targetScopeId: input.anchor.targetScopeId,
    reasonCodes: [
      crossTargetOnly
        ? "cross_target_evidence_cannot_satisfy_target"
        : requiredNegated
          ? "required_predicate_negated"
          : "required_target_predicate_missing",
    ],
  };
}

export function buildTheoryPredicateClaim(input: {
  claim: TheoryPredicateClaimV1Input;
  learnerConfirmedAt: string;
}): TheoryPredicateClaimV1 {
  return { ...input.claim, learnerConfirmedAt: input.learnerConfirmedAt };
}

export function renderTheoryPredicateClaim(claim: TheoryPredicateClaimV1) {
  const asserted = claim.clauses
    .filter((clause) => clause.scopeId === claim.targetScopeId)
    .flatMap((clause) => clause.predicates)
    .filter((predicate) => predicate.polarity === "ASSERTED")
    .map((predicate) => predicate.predicateId);
  return `수익방식의 목표 범위에서 확인된 술어: ${asserted.join(", ")}.`;
}

function persistedProofEvaluation(
  evaluation: PracticeCalculationClaimEvaluation,
): NonNullable<TrustedRepairStateData["proofEvaluation"]> {
  return {
    state: evaluation.state,
    verified: evaluation.verified,
    validatorId: evaluation.validatorId,
    anchorId: evaluation.anchorId,
    anchorVersionId: evaluation.anchorVersionId,
    sourceRevisionId: evaluation.sourceRevisionId,
    reasonCodes: evaluation.reasonCodes,
  };
}

function persistedTheoryProofEvaluation(
  evaluation: TheoryPredicateClaimEvaluation,
): NonNullable<TrustedRepairStateData["proofEvaluation"]> {
  return {
    state: evaluation.state,
    verified: evaluation.verified,
    validatorId: evaluation.validatorId,
    anchorId: evaluation.anchorId,
    anchorVersionId: evaluation.anchorVersionId,
    sourceRevisionId: evaluation.sourceRevisionId,
    targetScopeId: evaluation.targetScopeId,
    reasonCodes: evaluation.reasonCodes,
  };
}

export function latestTrustedRepairArtifact(
  aggregate: TrustedRepairAggregate,
  kind: TrustedRepairArtifactKind,
) {
  return aggregate.artifacts.reduce<TrustedRepairPrivateArtifact | null>(
    (latest, artifact) => {
      if (artifact.kind !== kind) return latest;
      if (!latest || artifact.revisionNumber > latest.revisionNumber) {
        return artifact;
      }
      if (
        artifact.revisionNumber === latest.revisionNumber &&
        artifact.createdAt >= latest.createdAt
      ) {
        return artifact;
      }
      return latest;
    },
    null,
  );
}

export function trustedRepairSubmissionCount(
  aggregate: TrustedRepairAggregate,
) {
  return aggregate.artifacts.filter(
    (artifact) => artifact.kind === "repair_submission",
  ).length;
}

export function trustedRepairPartialRetryAvailable(
  aggregate: TrustedRepairAggregate,
) {
  const retriesUsed = Math.max(0, trustedRepairSubmissionCount(aggregate) - 1);
  return (
    aggregate.session.state === "partial" &&
    aggregate.session.outcome === "partial" &&
    aggregate.session.confirmedRevisionId !== null &&
    aggregate.session.primaryGapId !== null &&
    aggregate.session.independentAttemptBeforeHelp &&
    aggregate.exposures.every(
      (exposure) => exposure.scaffoldKind !== "guided_solution",
    ) &&
    retriesUsed < TRUSTED_REPAIR_LOAD_BUDGET.maximumImmediatePartialRetries
  );
}

function basePlan(
  aggregate: TrustedRepairAggregate,
  nextState: TrustedRepairState,
  stateData: TrustedRepairStateData,
): TrustedRepairTransitionPlan {
  return {
    expectedState: aggregate.session.state,
    nextState,
    stateData,
    confirmedRevisionId: aggregate.session.confirmedRevisionId,
    primaryGapId: aggregate.session.primaryGapId,
    outcome: aggregate.session.outcome,
    assistanceLevel: aggregate.session.assistanceLevel,
    independentAttemptBeforeHelp:
      aggregate.session.independentAttemptBeforeHelp,
    artifact: null,
    exposure: null,
  };
}

export function planTrustedRepairSourceBindingDrift(
  aggregate: TrustedRepairAggregate,
): TrustedRepairTransitionPlan {
  const plan = basePlan(aggregate, "stale", {
    ...aggregate.session.stateData,
    gapCandidates: [],
    repairNeed: "blocked",
    repairPath: null,
    continuation: null,
    proofEvaluation: null,
    structuredClaim: null,
    resultReasonCodes: [
      "source_binding_version_drift",
      "verified_release_denied_until_new_session_diagnosis",
    ],
  });
  return {
    ...plan,
    primaryGapId: null,
    outcome: "stale",
    assistanceLevel: 0,
    independentAttemptBeforeHelp: false,
  };
}

export function trustedRepairAggregateForRelease(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairSourceBindingState;
}): TrustedRepairAggregate {
  if (trustedRepairSourceBindingMatches(input)) return input.aggregate;
  const plan = planTrustedRepairSourceBindingDrift(input.aggregate);
  return {
    session: {
      ...input.aggregate.session,
      state: plan.nextState,
      confirmedRevisionId: plan.confirmedRevisionId,
      primaryGapId: plan.primaryGapId,
      outcome: plan.outcome,
      assistanceLevel: plan.assistanceLevel,
      independentAttemptBeforeHelp: plan.independentAttemptBeforeHelp,
      stateData: plan.stateData,
    },
    artifacts: input.aggregate.artifacts,
    exposures: [],
  };
}

export function selectTrustedRepairScaffoldExposure(
  aggregate: TrustedRepairAggregate,
) {
  const expectedKind =
    aggregate.session.state === "guided" &&
    aggregate.session.assistanceLevel === 3
      ? "guided_solution"
      : "smallest_eligible_scaffold";
  for (let index = aggregate.exposures.length - 1; index >= 0; index -= 1) {
    const exposure = aggregate.exposures[index];
    if (
      exposure.revisionId === aggregate.session.confirmedRevisionId &&
      exposure.gapId === aggregate.session.primaryGapId &&
      exposure.assistanceLevel === aggregate.session.assistanceLevel &&
      exposure.scaffoldKind === expectedKind
    ) {
      return exposure;
    }
  }
  return null;
}

export function initialTrustedRepairStateData(
  inputMode: TrustedRepairInputMode,
): TrustedRepairStateData {
  return {
    inputMode,
    revisionNumber: 0,
    prediction: null,
    predictionConfidence: null,
    selfDiagnosisCode: null,
    gapCandidates: [],
    repairNeed: null,
    repairPath: null,
    continuation: null,
    proofEvaluation: null,
    structuredClaim: null,
    resultReasonCodes: [],
  };
}

export function planTrustedRepairRevisionConfirmation(input: {
  aggregate: TrustedRepairAggregate;
  artifactId: string;
  body: string;
  occurredAt: string;
}) {
  guardState(input.aggregate, "editable_capture_draft");
  const revisionNumber = input.aggregate.session.stateData.revisionNumber + 1;
  const plan = basePlan(input.aggregate, "revision_confirmed", {
    ...input.aggregate.session.stateData,
    revisionNumber,
    gapCandidates: [],
    repairNeed: null,
    repairPath: null,
    proofEvaluation: null,
    structuredClaim: null,
    resultReasonCodes: [],
  });
  return {
    ...plan,
    confirmedRevisionId: input.artifactId,
    artifact: {
      artifactId: input.artifactId,
      revisionNumber,
      kind: "confirmed_revision" as const,
      inputMode: input.aggregate.session.stateData.inputMode,
      body: input.body,
      createdAt: input.occurredAt,
    },
  };
}

export function planTrustedRepairPrediction(input: {
  aggregate: TrustedRepairAggregate;
  prediction: "likely_success" | "likely_partial" | "likely_blocked";
  confidence: "low" | "medium" | "high";
}) {
  guardState(input.aggregate, "revision_confirmed");
  return basePlan(input.aggregate, "prediction_committed", {
    ...input.aggregate.session.stateData,
    prediction: input.prediction,
    predictionConfidence: input.confidence,
  });
}

export function planTrustedRepairIndependentAttempt(input: {
  aggregate: TrustedRepairAggregate;
  artifactId: string;
  body: string;
  occurredAt: string;
}) {
  guardState(input.aggregate, "prediction_committed");
  if (input.aggregate.exposures.length > 0) {
    throw new TrustedRepairContractError("invalid_transition");
  }
  const plan = basePlan(input.aggregate, "independent_attempt_committed", {
    ...input.aggregate.session.stateData,
    resultReasonCodes: ["independent_attempt_committed_before_help"],
  });
  return {
    ...plan,
    independentAttemptBeforeHelp: true,
    artifact: {
      artifactId: input.artifactId,
      revisionNumber: input.aggregate.session.stateData.revisionNumber,
      kind: "independent_attempt" as const,
      inputMode: input.aggregate.session.stateData.inputMode,
      body: input.body,
      createdAt: input.occurredAt,
    },
  };
}

export function planTrustedRepairSelfDiagnosis(input: {
  aggregate: TrustedRepairAggregate;
  selfDiagnosisCode: string;
}) {
  guardState(input.aggregate, "independent_attempt_committed");
  if (!/^[a-z0-9][a-z0-9_-]{2,80}$/.test(input.selfDiagnosisCode)) {
    throw new TrustedRepairContractError("invalid_input");
  }
  return basePlan(input.aggregate, "self_diagnosis_committed", {
    ...input.aggregate.session.stateData,
    selfDiagnosisCode: input.selfDiagnosisCode,
  });
}

function repairPathFor(input: {
  inputMode: TrustedRepairInputMode;
  confidence: TrustedRepairStateData["predictionConfidence"];
  insufficient: boolean;
}) {
  if (input.insufficient) return "WORKED_CONCEPT_FIRST" as const;
  if (input.inputMode === "EDITABLE_VOICE_TRANSCRIPTION") {
    return "VOICE_TEACH_BACK" as const;
  }
  if (input.inputMode === "STRUCTURED_SELECTION") {
    return "STRUCTURED_SELECTION" as const;
  }
  if (
    input.inputMode === "EDITABLE_PHOTO_OCR" ||
    input.inputMode === "EDITABLE_PDF_OCR"
  ) {
    return "UPLOAD_EXISTING_ARTIFACT" as const;
  }
  if (input.confidence === "high") return "QUICK_VERIFICATION" as const;
  return "LEARNER_GENERATED" as const;
}

export function diagnoseTrustedRepairAttempt(input: {
  fixture: TrustedRepairFixture;
  attemptText: string;
  stateData: TrustedRepairStateData;
}) {
  const anchor = input.fixture.anchors[0];
  if (!anchor) throw new TrustedRepairContractError("invalid_transition");
  const insufficient = normalizeEvidenceCandidate(input.attemptText).length < 12;
  const candidate: TrustedRepairGapCandidate = {
    gapId: insufficient ? "INSUFFICIENT_EVIDENCE" : `gap-${anchor.anchorId}-structured-confirmation`,
    anchorId: anchor.anchorId,
    labelKo: insufficient ? "판단할 독립 근거가 부족함" : `${anchor.labelKo} 구조화 확인 필요`,
    rank: 1,
    supportingEvidence: [
      insufficient ? "independent_attempt:insufficient_evidence" : "independent_attempt:free_form_candidate_evidence_only",
    ],
    counterEvidence: ["canonical_structured_commitment_not_yet_confirmed"],
    repairActionKo: insufficient
      ? "가장 먼저 떠오르는 근거를 한 문장으로 직접 적으세요."
      : "보지 않고 다시 구성한 뒤 계산관계의 각 필드를 직접 확인하세요.",
    successCriterionKo: input.fixture.successCriterionKo,
  };
  return {
    candidates: [candidate],
    primary: candidate,
    repairNeed: "required" as const,
    repairPath: repairPathFor({
      inputMode: input.stateData.inputMode,
      confidence: input.stateData.predictionConfidence,
      insufficient,
    }),
  };
}

export function planTrustedRepairDiagnosis(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairSourceBindingState;
}) {
  guardState(input.aggregate, "self_diagnosis_committed");
  if (!trustedRepairSourceBindingMatches(input)) {
    return planTrustedRepairSourceBindingDrift(input.aggregate);
  }
  const attempt = latestTrustedRepairArtifact(
    input.aggregate,
    "independent_attempt",
  );
  if (!attempt) throw new TrustedRepairContractError("invalid_transition");
  const diagnosis = diagnoseTrustedRepairAttempt({
    fixture: input.fixture,
    attemptText: attempt.body,
    stateData: input.aggregate.session.stateData,
  });
  const plan = basePlan(input.aggregate, "diagnosed", {
    ...input.aggregate.session.stateData,
    gapCandidates: diagnosis.candidates,
    repairNeed: diagnosis.repairNeed,
    repairPath: diagnosis.repairPath,
    proofEvaluation: null,
    structuredClaim: null,
    resultReasonCodes: [
      "deterministic_top_1_gap_selected",
      "free_form_evidence_cannot_create_verified",
    ],
  });
  return {
    ...plan,
    primaryGapId: diagnosis.primary.gapId,
  };
}

export function planTrustedRepairExposure(input: {
  aggregate: TrustedRepairAggregate;
  exposureId: string;
  occurredAt: string;
}) {
  guardState(input.aggregate, "diagnosed");
  const revisionId = input.aggregate.session.confirmedRevisionId;
  const gapId = input.aggregate.session.primaryGapId;
  if (!revisionId || !gapId) {
    throw new TrustedRepairContractError("invalid_transition");
  }
  const plan = basePlan(input.aggregate, "exposure_committed", {
    ...input.aggregate.session.stateData,
    resultReasonCodes: [
      ...input.aggregate.session.stateData.resultReasonCodes,
      "smallest_scaffold_exposure_committed_before_help",
    ],
  });
  return {
    ...plan,
    assistanceLevel: 1,
    exposure: {
      exposureId: input.exposureId,
      revisionId,
      gapId,
      assistanceLevel: 1,
      scaffoldKind: "smallest_eligible_scaffold" as const,
      occurredAt: input.occurredAt,
    },
  };
}

export function planTrustedRepairSubmission(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairSourceBindingState;
  artifactId: string;
  body: string;
  occurredAt: string;
}) {
  guardState(input.aggregate, ["exposure_committed", "partial"]);
  if (!trustedRepairSourceBindingMatches(input)) {
    return planTrustedRepairSourceBindingDrift(input.aggregate);
  }
  const retryingPartial = input.aggregate.session.state === "partial";
  const submissionCount = trustedRepairSubmissionCount(input.aggregate);
  if (
    (retryingPartial && !trustedRepairPartialRetryAvailable(input.aggregate)) ||
    (!retryingPartial && submissionCount !== 0)
  ) {
    throw new TrustedRepairContractError("invalid_transition");
  }
  const plan = basePlan(input.aggregate, "repair_submitted", {
    ...input.aggregate.session.stateData,
    continuation: null,
    proofEvaluation: null,
    structuredClaim: null,
    resultReasonCodes: [
      ...input.aggregate.session.stateData.resultReasonCodes,
      retryingPartial
        ? "bounded_partial_retry_submission_committed"
        : "learner_reconstruction_committed",
    ],
  });
  return {
    ...plan,
    artifact: {
      artifactId: input.artifactId,
      revisionNumber: input.aggregate.session.stateData.revisionNumber,
      kind: "repair_submission" as const,
      inputMode: input.aggregate.session.stateData.inputMode,
      body: input.body,
      createdAt: input.occurredAt,
    },
  };
}

export function planTrustedRepairStructuredClaimConfirmation(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairSourceBindingState;
  claim: PracticeCalculationClaimV2;
}) {
  guardState(input.aggregate, "repair_submitted");
  if (input.aggregate.session.subject !== "appraisal_practical") {
    throw new TrustedRepairContractError("invalid_transition");
  }
  if (!trustedRepairSourceBindingMatches(input)) return planTrustedRepairSourceBindingDrift(input.aggregate);
  const revisionId = input.aggregate.session.confirmedRevisionId;
  if (!revisionId || input.claim.sourceRevisionId !== revisionId) {
    return planTrustedRepairSourceBindingDrift(input.aggregate);
  }
  const evaluation = validatePracticeCalculationClaim({
    claim: input.claim,
    anchor: practiceRelationAnchor(input.fixture),
    expectedSourceRevisionId: revisionId,
  });
  const independentBoundaryPassed =
    input.aggregate.session.independentAttemptBeforeHelp &&
    input.aggregate.exposures.every((exposure) => exposure.scaffoldKind !== "guided_solution");
  const nextState = independentBoundaryPassed && evaluation.state === "PASS"
    ? ("verified" as const)
    : independentBoundaryPassed
      ? ("partial" as const)
      : ("guided" as const);
  const plan = basePlan(input.aggregate, nextState, {
    ...input.aggregate.session.stateData,
    continuation: "VERIFY_AND_CONTINUE",
    structuredClaim: input.claim,
    proofEvaluation: persistedProofEvaluation(evaluation),
    resultReasonCodes: [
      ...input.aggregate.session.stateData.resultReasonCodes,
      ...(evaluation.state === "PASS"
        ? ["same_session_structured_practice_claim_passed"]
        : ["same_session_structured_practice_claim_not_yet_passed"]),
      "free_form_evidence_was_candidate_only",
      "no_mastery_transfer_stability_score_or_pass_claim",
    ],
  });
  return { ...plan, outcome: nextState };
}

export function planTrustedRepairTheoryClaimConfirmation(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairSourceBindingState;
  claim: TheoryPredicateClaimV1;
}) {
  guardState(input.aggregate, "repair_submitted");
  if (input.aggregate.session.subject !== "appraisal_theory") {
    throw new TrustedRepairContractError("invalid_transition");
  }
  if (!trustedRepairSourceBindingMatches(input)) {
    return planTrustedRepairSourceBindingDrift(input.aggregate);
  }
  const revisionId = input.aggregate.session.confirmedRevisionId;
  if (!revisionId || input.claim.sourceRevisionId !== revisionId) {
    return planTrustedRepairSourceBindingDrift(input.aggregate);
  }
  const evaluation = validateTheoryPredicateClaim({
    claim: input.claim,
    anchor: theoryPredicateAnchor(input.fixture),
    expectedSourceRevisionId: revisionId,
  });
  const independentBoundaryPassed =
    input.aggregate.session.independentAttemptBeforeHelp &&
    input.aggregate.exposures.every(
      (exposure) => exposure.scaffoldKind !== "guided_solution",
    );
  const nextState =
    independentBoundaryPassed && evaluation.state === "PASS"
      ? ("verified" as const)
      : independentBoundaryPassed
        ? ("partial" as const)
        : ("guided" as const);
  const plan = basePlan(input.aggregate, nextState, {
    ...input.aggregate.session.stateData,
    continuation: "VERIFY_AND_CONTINUE",
    structuredClaim: input.claim,
    proofEvaluation: persistedTheoryProofEvaluation(evaluation),
    resultReasonCodes: [
      ...input.aggregate.session.stateData.resultReasonCodes,
      ...(evaluation.state === "PASS"
        ? ["same_session_structured_theory_claim_passed"]
        : ["same_session_structured_theory_claim_not_yet_passed"]),
      "free_form_evidence_was_candidate_only",
      "no_mastery_transfer_stability_score_or_pass_claim",
    ],
  });
  return { ...plan, outcome: nextState };
}

export function planTrustedRepairContinuation(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairSourceBindingState;
  continuation: TrustedRepairContinuation;
  exposureId: string;
  occurredAt: string;
}) {
  const permittedStates: TrustedRepairState[] = [
    "diagnosed",
    "exposure_committed",
    "repair_submitted",
    "partial",
  ];
  guardState(input.aggregate, permittedStates);

  if (!trustedRepairSourceBindingMatches(input)) {
    return planTrustedRepairSourceBindingDrift(input.aggregate);
  }

  if (input.continuation === "DEFER_FOR_NOW") {
    const plan = basePlan(input.aggregate, "deferred", {
      ...input.aggregate.session.stateData,
      continuation: input.continuation,
      resultReasonCodes: [
        ...input.aggregate.session.stateData.resultReasonCodes,
        "learner_deferred_without_success_evidence",
      ],
    });
    return { ...plan, outcome: "deferred" as const };
  }

  if (input.continuation === "SWITCH_TO_GUIDED") {
    const revisionId = input.aggregate.session.confirmedRevisionId;
    const gapId = input.aggregate.session.primaryGapId;
    const smallestScaffoldCommitted = input.aggregate.exposures.some(
      (exposure) =>
        exposure.revisionId === revisionId &&
        exposure.gapId === gapId &&
        exposure.assistanceLevel === 1 &&
        exposure.scaffoldKind === "smallest_eligible_scaffold",
    );
    if (!revisionId || !gapId || !smallestScaffoldCommitted) {
      throw new TrustedRepairContractError("invalid_transition");
    }
    const plan = basePlan(input.aggregate, "guided", {
      ...input.aggregate.session.stateData,
      continuation: input.continuation,
      resultReasonCodes: [
        ...input.aggregate.session.stateData.resultReasonCodes,
        "guided_mode_has_zero_independent_success_effect",
      ],
    });
    return {
      ...plan,
      outcome: "guided" as const,
      assistanceLevel: 3,
      exposure: {
        exposureId: input.exposureId,
        revisionId,
        gapId,
        assistanceLevel: 3,
        scaffoldKind: "guided_solution" as const,
        occurredAt: input.occurredAt,
      },
    };
  }

  guardState(input.aggregate, "repair_submitted");
  const plan = basePlan(input.aggregate, "partial", {
    ...input.aggregate.session.stateData,
    continuation: input.continuation,
    structuredClaim: null,
    proofEvaluation: null,
    resultReasonCodes: [
      ...input.aggregate.session.stateData.resultReasonCodes,
      input.aggregate.session.subject === "appraisal_practical"
        ? "structured_practice_claim_required"
        : "structured_theory_claim_required",
      "free_form_evidence_cannot_create_verified",
      "no_mastery_transfer_stability_score_or_pass_claim",
    ],
  });
  return { ...plan, outcome: "partial" as const };
}

export function planTrustedRepairRevisionDrift(input: {
  aggregate: TrustedRepairAggregate;
  artifactId: string;
  body: string;
  occurredAt: string;
}) {
  guardState(input.aggregate, [
    "diagnosed",
    "exposure_committed",
    "repair_submitted",
    "verified",
    "partial",
    "guided",
    "deferred",
    "blocked",
    "uncertain",
  ]);
  const revisionNumber = input.aggregate.session.stateData.revisionNumber + 1;
  const plan = basePlan(input.aggregate, "stale", {
    ...input.aggregate.session.stateData,
    revisionNumber,
    gapCandidates: [],
    repairNeed: null,
    repairPath: null,
    continuation: null,
    proofEvaluation: null,
    structuredClaim: null,
    resultReasonCodes: [
      "revision_drift_invalidated_anchor_diagnosis_and_verification",
    ],
  });
  return {
    ...plan,
    confirmedRevisionId: input.artifactId,
    primaryGapId: null,
    outcome: "stale" as const,
    assistanceLevel: 0,
    independentAttemptBeforeHelp: false,
    artifact: {
      artifactId: input.artifactId,
      revisionNumber,
      kind: "confirmed_revision" as const,
      inputMode: input.aggregate.session.stateData.inputMode,
      body: input.body,
      createdAt: input.occurredAt,
    },
  };
}
