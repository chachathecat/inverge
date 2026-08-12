import {
  TrustedRepairContractError,
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

export type TrustedRepairLawBindingState = Readonly<{
  bindingVersion: string;
  sourceStatus:
    | "verified"
    | "needs_official_verification"
    | "unresolved_conflict"
    | "blocked"
    | "synthetic_fixture";
  versionStatus:
    | "verified"
    | "needs_official_verification"
    | "unresolved_conflict"
    | "blocked"
    | "synthetic_fixture";
  currentLawStatus:
    | "current_law_verified"
    | "current_law_unresolved"
    | "not_current"
    | "synthetic_fixture";
  sourceAnchorId: string | null;
  blockerCount: number;
}>;

export const SYNTHETIC_SOURCE_BINDING: TrustedRepairLawBindingState = {
  bindingVersion: "synthetic_fixture",
  sourceStatus: "synthetic_fixture",
  versionStatus: "synthetic_fixture",
  currentLawStatus: "synthetic_fixture",
  sourceAnchorId: null,
  blockerCount: 0,
};

function guardState(
  aggregate: TrustedRepairAggregate,
  expected: TrustedRepairState | readonly TrustedRepairState[],
) {
  const expectedStates = Array.isArray(expected) ? expected : [expected];
  if (!expectedStates.includes(aggregate.session.state)) {
    throw new TrustedRepairContractError("invalid_transition");
  }
}

function normalizeEvidence(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s,._·:;()[\]{}]+/g, "");
}

function conceptPresent(text: string, concept: string) {
  const normalizedText = normalizeEvidence(text);
  const normalizedConcept = normalizeEvidence(concept);
  if (normalizedText.includes(normalizedConcept)) return true;
  if (normalizedConcept === "200000000") {
    return normalizedText.includes("2억");
  }
  if (normalizedConcept === "2000000") {
    return normalizedText.includes("200만원");
  }
  return false;
}

function anchorEvidence(text: string, fixture: TrustedRepairFixture) {
  return fixture.anchors.map((anchor) => {
    const missing = anchor.requiredConcepts.filter(
      (concept) => !conceptPresent(text, concept),
    );
    const acceptablePresent = anchor.acceptableAlternatives.filter((concept) =>
      conceptPresent(text, concept),
    );
    const falseClaims = anchor.forbiddenFalseClaims.filter((claim) =>
      conceptPresent(text, claim),
    );
    return {
      anchor,
      missing,
      acceptablePresent,
      falseClaims,
      satisfied: missing.length === 0 && falseClaims.length === 0,
    };
  });
}

export function latestTrustedRepairArtifact(
  aggregate: TrustedRepairAggregate,
  kind: TrustedRepairArtifactKind,
) {
  return [...aggregate.artifacts]
    .filter((artifact) => artifact.kind === kind)
    .sort((left, right) => right.revisionNumber - left.revisionNumber)[0] ?? null;
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
  const insufficient = normalizeEvidence(input.attemptText).length < 12;
  if (insufficient) {
    const candidate: TrustedRepairGapCandidate = {
      gapId: "INSUFFICIENT_EVIDENCE",
      anchorId: input.fixture.anchors[0].anchorId,
      labelKo: "판단할 독립 근거가 부족함",
      rank: 1,
      supportingEvidence: ["independent_attempt:insufficient_evidence"],
      counterEvidence: ["no_committed_anchor_support"],
      repairActionKo: "가장 먼저 떠오르는 근거를 한 문장으로 직접 적으세요.",
      successCriterionKo: input.fixture.successCriterionKo,
    };
    return {
      candidates: [candidate],
      primary: candidate,
      repairNeed: "required" as const,
      repairPath: repairPathFor({
        inputMode: input.stateData.inputMode,
        confidence: input.stateData.predictionConfidence,
        insufficient: true,
      }),
    };
  }

  const evidence = anchorEvidence(input.attemptText, input.fixture);
  const candidates = evidence
    .filter((entry) => !entry.satisfied)
    .map((entry) => ({
      gapId: `gap-${entry.anchor.anchorId}`,
      anchorId: entry.anchor.anchorId,
      labelKo: entry.anchor.labelKo,
      score:
        entry.anchor.weight +
        entry.missing.length * 20 +
        entry.falseClaims.length * 100,
      supportingEvidence: [
        ...entry.missing.map(
          (concept) => `independent_attempt:${entry.anchor.anchorId}:missing:${concept}`,
        ),
        ...entry.falseClaims.map(
          (claim) => `independent_attempt:${entry.anchor.anchorId}:false_claim:${claim}`,
        ),
      ],
      counterEvidence: entry.acceptablePresent.map(
        (concept) =>
          `independent_attempt:${entry.anchor.anchorId}:alternative_present:${concept}`,
      ),
      repairActionKo: `${entry.anchor.labelKo}을(를) 근거와 함께 한 문장으로 다시 구성하세요.`,
      successCriterionKo: input.fixture.successCriterionKo,
    }))
    .sort(
      (left, right) =>
        right.score - left.score || left.anchorId.localeCompare(right.anchorId),
    )
    .slice(0, 3)
    .map((candidate, index) => ({
      gapId: candidate.gapId,
      anchorId: candidate.anchorId,
      labelKo: candidate.labelKo,
      rank: index + 1,
      supportingEvidence: candidate.supportingEvidence,
      counterEvidence: candidate.counterEvidence,
      repairActionKo: candidate.repairActionKo,
      successCriterionKo: candidate.successCriterionKo,
    }));

  const fallbackAnchor = input.fixture.anchors[0];
  const fallback: TrustedRepairGapCandidate = {
    gapId: `gap-${fallbackAnchor.anchorId}-verification`,
    anchorId: fallbackAnchor.anchorId,
    labelKo: `${fallbackAnchor.labelKo} 직접 검증`,
    rank: 1,
    supportingEvidence: [
      `independent_attempt:${fallbackAnchor.anchorId}:present_needs_reconstruction`,
    ],
    counterEvidence: ["same_session_reconstruction_not_yet_observed"],
    repairActionKo: `${fallbackAnchor.labelKo}을(를) 보지 않고 한 번 더 구성하세요.`,
    successCriterionKo: input.fixture.successCriterionKo,
  };
  const bounded = candidates.length > 0 ? candidates : [fallback];
  return {
    candidates: bounded,
    primary: bounded[0],
    repairNeed: candidates.length > 0 ? ("required" as const) : ("optional" as const),
    repairPath: repairPathFor({
      inputMode: input.stateData.inputMode,
      confidence: input.stateData.predictionConfidence,
      insufficient: false,
    }),
  };
}

export function planTrustedRepairDiagnosis(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairLawBindingState;
}) {
  guardState(input.aggregate, "self_diagnosis_committed");
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
  const sourceBlocked =
    input.fixture.sourceBinding.requiredStatus === "current_law_verified" &&
    (input.sourceBinding.sourceStatus !== "verified" ||
      input.sourceBinding.versionStatus !== "verified" ||
      input.sourceBinding.currentLawStatus !== "current_law_verified" ||
      input.sourceBinding.sourceAnchorId !==
        input.fixture.sourceBinding.sourceAnchorId ||
      input.sourceBinding.blockerCount > 0);
  const plan = basePlan(input.aggregate, "diagnosed", {
    ...input.aggregate.session.stateData,
    gapCandidates: diagnosis.candidates,
    repairNeed: sourceBlocked ? "blocked" : diagnosis.repairNeed,
    repairPath: diagnosis.repairPath,
    resultReasonCodes: [
      "deterministic_top_1_gap_selected",
      ...(sourceBlocked ? ["law_source_currentness_unverified"] : []),
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
  artifactId: string;
  body: string;
  occurredAt: string;
}) {
  guardState(input.aggregate, "exposure_committed");
  const plan = basePlan(input.aggregate, "repair_submitted", {
    ...input.aggregate.session.stateData,
    resultReasonCodes: [
      ...input.aggregate.session.stateData.resultReasonCodes,
      "learner_reconstruction_committed",
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

function primaryAnchorSatisfied(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  repair: TrustedRepairPrivateArtifact;
}) {
  const primary = input.aggregate.session.stateData.gapCandidates.find(
    (candidate) => candidate.gapId === input.aggregate.session.primaryGapId,
  );
  const anchor = input.fixture.anchors.find(
    (candidate) => candidate.anchorId === primary?.anchorId,
  );
  if (!anchor) return false;
  const [evidence] = anchorEvidence(input.repair.body, {
    ...input.fixture,
    anchors: [anchor],
  });
  return evidence.satisfied;
}

export function planTrustedRepairContinuation(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairLawBindingState;
  continuation: TrustedRepairContinuation;
  exposureId: string;
  occurredAt: string;
}) {
  const permittedStates: TrustedRepairState[] = [
    "diagnosed",
    "exposure_committed",
    "repair_submitted",
  ];
  guardState(input.aggregate, permittedStates);

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
    if (!revisionId || !gapId) {
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
  const repair = latestTrustedRepairArtifact(
    input.aggregate,
    "repair_submission",
  );
  if (!repair) throw new TrustedRepairContractError("invalid_transition");
  const sourceBlocked =
    input.fixture.sourceBinding.requiredStatus === "current_law_verified" &&
    (input.sourceBinding.sourceStatus !== "verified" ||
      input.sourceBinding.versionStatus !== "verified" ||
      input.sourceBinding.currentLawStatus !== "current_law_verified" ||
      input.sourceBinding.blockerCount > 0);
  const criterionPassed = primaryAnchorSatisfied({
    aggregate: input.aggregate,
    fixture: input.fixture,
    repair,
  });
  const independentBoundaryPassed =
    input.aggregate.session.independentAttemptBeforeHelp &&
    input.aggregate.exposures.every(
      (exposure) => exposure.scaffoldKind !== "guided_solution",
    );
  const nextState = sourceBlocked
    ? ("blocked" as const)
    : !independentBoundaryPassed
      ? ("guided" as const)
      : criterionPassed
        ? ("verified" as const)
        : ("partial" as const);
  const plan = basePlan(input.aggregate, nextState, {
    ...input.aggregate.session.stateData,
    continuation: input.continuation,
    resultReasonCodes: [
      ...input.aggregate.session.stateData.resultReasonCodes,
      ...(sourceBlocked ? ["law_source_currentness_unverified"] : []),
      ...(criterionPassed
        ? ["same_session_primary_criterion_passed"]
        : ["same_session_primary_criterion_not_yet_passed"]),
      "no_mastery_transfer_stability_score_or_pass_claim",
    ],
  });
  return { ...plan, outcome: nextState };
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
