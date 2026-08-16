import {
  TRUSTED_REPAIR_LOAD_BUDGET,
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
  type CalculationRelationAnchorV1,
  type PracticeProofEvaluationState,
} from "./trusted-repair-contract";

export type TrustedRepairSourceBindingState = Readonly<{
  bindingVersion: "synthetic_fixture";
  sourceStatus: "synthetic_fixture";
  versionStatus: "synthetic_fixture";
  currentLawStatus: "not_applicable_practice";
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

export function trustedRepairSourceVersion(
  fixture: TrustedRepairFixture,
  sourceBinding: TrustedRepairSourceBindingState,
) {
  return [
    fixture.sourceBinding.sourceId,
    sourceBinding.bindingVersion,
    sourceBinding.sourceStatus,
    sourceBinding.versionStatus,
    sourceBinding.currentLawStatus,
    sourceBinding.sourceAnchorId ?? "no-anchor",
    `blockers-${sourceBinding.blockerCount}`,
  ].join(":");
}

export function trustedRepairSourceBindingMatches(input: {
  aggregate: TrustedRepairAggregate;
  fixture: TrustedRepairFixture;
  sourceBinding: TrustedRepairSourceBindingState;
}) {
  return (
    input.aggregate.session.bindings.sourceVersion ===
    trustedRepairSourceVersion(input.fixture, input.sourceBinding)
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

function normalizeEvidence(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s,._·:;()[\]{}]+/g, "");
}

type ParsedPracticeRelation = Readonly<{
  left: number;
  operator: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE";
  right: number;
  result: number;
  sourceIndex: number;
  sourceLength: number;
}>;

export type PracticeCalculationRelationEvaluation = Readonly<{
  state: PracticeProofEvaluationState;
  verified: boolean;
  validatorId: "validator:practice-calculation-relation@1";
  anchorId: CalculationRelationAnchorV1["anchorId"];
  anchorVersionId: CalculationRelationAnchorV1["anchorVersionId"];
  reasonCodes: readonly string[];
  matchedRelation: ParsedPracticeRelation | null;
}>;

const PRACTICE_RELATION_PATTERN =
  /(-?\d[\d,]*)\s*([+\-−×xX*÷/])\s*(-?\d[\d,]*)\s*=\s*(-?\d[\d,]*)/gu;

function relationOperator(value: string): ParsedPracticeRelation["operator"] {
  if (value === "+") return "ADD";
  if (value === "-" || value === "−") return "SUBTRACT";
  if (value === "×" || value === "x" || value === "X" || value === "*") {
    return "MULTIPLY";
  }
  return "DIVIDE";
}

function relationNumber(value: string) {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function claimTailIsNegated(text: string, claimEnd: number) {
  const tail = text.slice(claimEnd, claimEnd + 64);
  return (
    /^\s*(?:원(?:\s*\/\s*(?:년|연))?|연간\s*원)?\s*(?:(?:은|는|이|가|을|를|으로|로|인)\s*)?(?:(?:절대|전혀|결코)\s*)?(?:(?:이?라는?\s*)?(?:식|관계|계산식|계산|주장)(?:은|는|이|가)?\s*)?(?:아니|아님|아닌|아닙|아닐|아냐|않|틀렸|틀린|틀림|잘못|오류|(?:성립|유효|정확)(?:(?:하|되)지\s*(?:않|못)|할\s*수\s*없)|(?:맞|옳)지\s*(?:않|못)|참(?:이|은|는)?\s*아니|거짓|부정|불성립)/u.test(
      tail,
    ) ||
    /^\s*(?:원(?:\s*\/\s*(?:년|연))?|연간\s*원)?\s*(?:과|와)\s*같지\s*않/u.test(
      tail,
    )
  );
}

function claimHeadRejectsRelation(text: string, claimStart: number) {
  const boundedHead = text.slice(0, claimStart);
  const clauseStart = Math.max(
    boundedHead.lastIndexOf("."),
    boundedHead.lastIndexOf("!"),
    boundedHead.lastIndexOf("?"),
    boundedHead.lastIndexOf(";"),
    boundedHead.lastIndexOf("\n"),
  );
  const clause = boundedHead.slice(clauseStart + 1);
  return /(?:아니|아님|아닌|아닙|아닐|아냐|않|틀렸|틀린|틀림|잘못|오류)/u.test(
    clause,
  );
}

function parsePracticeRelations(text: string) {
  const normalized = text.normalize("NFKC");
  const relations: ParsedPracticeRelation[] = [];
  for (const match of normalized.matchAll(PRACTICE_RELATION_PATTERN)) {
    const left = relationNumber(match[1]);
    const right = relationNumber(match[3]);
    const result = relationNumber(match[4]);
    if (left === null || right === null || result === null) continue;
    relations.push({
      left,
      operator: relationOperator(match[2]),
      right,
      result,
      sourceIndex: match.index,
      sourceLength: match[0].length,
    });
  }
  return { normalized, relations } as const;
}

type ParsedRoleClaim = Readonly<{
  value: number;
  negated: boolean;
  unitValid: boolean;
  sourceIndex: number;
  sourceLength: number;
}>;

function explicitRoleClaims(text: string, roleLabel: string) {
  const claims: ParsedRoleClaim[] = [];
  const boundedRoleLabel = `(?<![가-힣A-Za-z0-9])${roleLabel}`;
  const patterns = [
    new RegExp(
      `${boundedRoleLabel}\\s*(?:은|는|이|가|:|=)?\\s*(-?\\d[\\d,]*)\\s*((?:원\\s*\\/\\s*(?:년|연)|연간\\s*원))?`,
      "gu",
    ),
    new RegExp(
      `(-?\\d[\\d,]*)\\s*((?:원\\s*\\/\\s*(?:년|연)|연간\\s*원))?\\s*(?:은|는|이|가|:|=)?\\s*${boundedRoleLabel}(?![가-힣A-Za-z0-9])`,
      "gu",
    ),
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = relationNumber(match[1]);
      if (value === null) continue;
      const sourceIndex = match.index;
      const sourceLength = match[0].length;
      claims.push({
        value,
        negated: claimTailIsNegated(text, sourceIndex + sourceLength),
        unitValid: match[2] !== undefined,
        sourceIndex,
        sourceLength,
      });
    }
  }
  return claims;
}

function roleBindingEvaluation(input: {
  text: string;
  grossIncomeValue: number;
  operatingExpenseValue: number;
  resultValue: number;
}) {
  const claims = [
    ["총수익", input.grossIncomeValue],
    ["운영비", input.operatingExpenseValue],
    ["순수익", input.resultValue],
  ] as const;
  const evaluated = claims.map(([label, expectedValue]) => {
    const roleClaims = explicitRoleClaims(input.text, label);
    const valuesValid =
      roleClaims.length > 0 &&
      roleClaims.every(
        (claim) => !claim.negated && claim.value === expectedValue,
      );
    return {
      valuesValid,
      unitsValid:
        valuesValid && roleClaims.every((claim) => claim.unitValid),
    };
  });
  return {
    valuesValid: evaluated.every((entry) => entry.valuesValid),
    unitsValid: evaluated.every((entry) => entry.unitsValid),
  };
}

type SignAssertion = "POSITIVE" | "NEGATIVE";

function claimHeadHasNegationPrefix(text: string, claimStart: number) {
  return /(?<![가-힣A-Za-z0-9])비\s*$/u.test(text.slice(0, claimStart));
}

function signAssertions(text: string) {
  const assertions: SignAssertion[] = [];
  const patterns = [
    {
      pattern: /(?<![가-힣A-Za-z0-9])양수/gu,
      asserted: "POSITIVE",
      negated: "NEGATIVE",
    },
    {
      pattern: /(?<![가-힣A-Za-z0-9])양의\s*부호/gu,
      asserted: "POSITIVE",
      negated: "NEGATIVE",
    },
    {
      pattern: /(?<![가-힣A-Za-z0-9])음수/gu,
      asserted: "NEGATIVE",
      negated: "POSITIVE",
    },
    {
      pattern: /(?<![가-힣A-Za-z0-9])음의\s*부호/gu,
      asserted: "NEGATIVE",
      negated: "POSITIVE",
    },
  ] as const;
  for (const { pattern, asserted, negated } of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (claimHeadHasNegationPrefix(text, match.index)) continue;
      const claimEnd = match.index + match[0].length;
      if (claimTailIsNegated(text, claimEnd)) {
        assertions.push(negated);
        continue;
      }
      const tail = text.slice(claimEnd, claimEnd + 24);
      if (
        /^\s*(?:(?:은|는|이|가)\s*)?(?:임|이다|이며|이고|입니다|[.,;]|$)/u.test(
          tail,
        )
      ) {
        assertions.push(asserted);
      }
    }
  }
  for (const match of text.matchAll(
    /부호\s*(?:는|가|:)?\s*([+\-−])/gu,
  )) {
    const asserted = match[1] === "+" ? "POSITIVE" : "NEGATIVE";
    const negated = asserted === "POSITIVE" ? "NEGATIVE" : "POSITIVE";
    assertions.push(
      claimTailIsNegated(text, match.index + match[0].length)
        ? negated
        : asserted,
    );
  }
  return assertions;
}

function boundedClaimTail(text: string, claim: ParsedRoleClaim) {
  const tail = text.slice(
    claim.sourceIndex + claim.sourceLength,
    claim.sourceIndex + claim.sourceLength + 120,
  );
  const boundary = tail.search(/[.!?;\n]|(?:총수익|운영비|순수익|결과)/u);
  return boundary >= 0 ? tail.slice(0, boundary) : tail;
}

function roundingAssertions(text: string) {
  const expected: boolean[] = [];
  const noRoundingPattern =
    /반올림\s*(?:을|은|는|이)?\s*(?:없음|하지\s*않음|0(?:자리)?)/gu;
  for (const match of text.matchAll(noRoundingPattern)) {
    expected.push(!claimTailIsNegated(text, match.index + match[0].length));
  }
  const appliedPattern =
    /반올림\s*(?:을|은|는|이)?\s*(?:필요|적용|함|한다|했다|하였|하여|해야)/gu;
  for (const match of text.matchAll(appliedPattern)) {
    expected.push(claimTailIsNegated(text, match.index + match[0].length));
  }
  return expected;
}

type ResultUnitAssertion = "EXPECTED" | "CONTRADICTED";

function resultUnitAssertions(text: string) {
  const assertions: ResultUnitAssertion[] = [];
  const pattern =
    /(?:이\s*)?(?:결과|순수익)(?:의)?\s*단위\s*(?:은|는|이|가|:|=)?\s*([^,.;!?\n]{1,40})/gu;
  for (const match of text.matchAll(pattern)) {
    const claim = match[1].replace(/\s+/gu, "");
    const expectedUnit = claim.match(/^(?:원\/(?:년|연)|연간원)/u);
    const expected = expectedUnit !== null;
    const negated = expectedUnit
      ? claimTailIsNegated(claim, expectedUnit[0].length)
      : /아니|않|틀렸|틀린|틀림|잘못|오류/u.test(claim);
    assertions.push(expected === !negated ? "EXPECTED" : "CONTRADICTED");
  }
  return assertions;
}

export function validatePracticeCalculationRelation(input: {
  text: string;
  anchor: CalculationRelationAnchorV1;
}): PracticeCalculationRelationEvaluation {
  const { normalized, relations } = parsePracticeRelations(input.text);
  const [grossIncome, operatingExpense] = input.anchor.operandRoles;
  const isExpectedRelation = (relation: ParsedPracticeRelation) =>
    relation.left === grossIncome.value &&
    relation.operator === input.anchor.operator &&
    relation.right === operatingExpense.value &&
    relation.result === input.anchor.result.value;
  const matching = relations.filter(isExpectedRelation);
  const relationIsNegated = (relation: ParsedPracticeRelation) =>
    claimHeadRejectsRelation(normalized, relation.sourceIndex) ||
    claimTailIsNegated(normalized, relation.sourceIndex + relation.sourceLength);
  const assertedMatching = matching.filter(
    (relation) => !relationIsNegated(relation),
  );
  const negatedMatching = matching.filter(relationIsNegated);
  const conflicting = relations.filter(
    (relation) => !relationIsNegated(relation) && !isExpectedRelation(relation),
  );

  if (negatedMatching.length > 0) {
    return {
      state: "AMBIGUOUS",
      verified: false,
      validatorId: input.anchor.deterministicValidatorId,
      anchorId: input.anchor.anchorId,
      anchorVersionId: input.anchor.anchorVersionId,
      reasonCodes: ["negated_calculation_relation"],
      matchedRelation: null,
    };
  }

  if (assertedMatching.length > 0 && conflicting.length > 0) {
    return {
      state: "AMBIGUOUS",
      verified: false,
      validatorId: input.anchor.deterministicValidatorId,
      anchorId: input.anchor.anchorId,
      anchorVersionId: input.anchor.anchorVersionId,
      reasonCodes: ["conflicting_calculation_relations"],
      matchedRelation: null,
    };
  }

  const relation = assertedMatching[0] ?? null;
  if (!relation) {
    const normalizedNumbers = normalizeEvidence(normalized);
    const allValuesPresent = [
      grossIncome.value,
      operatingExpense.value,
      input.anchor.result.value,
    ].every((value) => normalizedNumbers.includes(String(value)));
    return {
      state: allValuesPresent ? "UNSUPPORTED" : "PARTIAL",
      verified: false,
      validatorId: input.anchor.deterministicValidatorId,
      anchorId: input.anchor.anchorId,
      anchorVersionId: input.anchor.anchorVersionId,
      reasonCodes: [
        allValuesPresent
          ? "disconnected_numeric_presence_without_relation"
          : "ordered_calculation_relation_missing",
      ],
      matchedRelation: null,
    };
  }

  const relationUnitsValid = assertedMatching.every((candidate) => {
    const tail = normalized.slice(
      candidate.sourceIndex + candidate.sourceLength,
      candidate.sourceIndex + candidate.sourceLength + 24,
    );
    return /^\s*(?:원\s*\/\s*년|원\s*\/\s*연|연간\s*원)(?:\s*(?:이고|이며|이다|입니다|으로|로|이|가|은|는|을|를))?(?![가-힣A-Za-z0-9])/u.test(
      tail,
    );
  });
  const unitAssertions = resultUnitAssertions(normalized);
  const unitContradicted = unitAssertions.includes("CONTRADICTED");
  const roleBindings = roleBindingEvaluation({
    text: normalized,
    grossIncomeValue: grossIncome.value,
    operatingExpenseValue: operatingExpense.value,
    resultValue: input.anchor.result.value,
  });
  const resultClaims = explicitRoleClaims(normalized, "순수익").filter(
    (claim) =>
      !claim.negated && claim.value === input.anchor.result.value,
  );
  const scopedResultTails = resultClaims.map((claim) =>
    boundedClaimTail(normalized, claim),
  );
  const positiveSignStated = scopedResultTails.some((tail) =>
    signAssertions(tail).includes("POSITIVE"),
  );
  const negativeSignAsserted = signAssertions(normalized).includes("NEGATIVE");
  const signValid =
    relation.result > 0 &&
    input.anchor.sign === "POSITIVE" &&
    positiveSignStated &&
    !negativeSignAsserted;
  const scopedRounding = scopedResultTails.flatMap(roundingAssertions);
  const allRounding = roundingAssertions(normalized);
  const roundingConfirmed = scopedRounding.includes(true);
  const roundingContradicted = allRounding.includes(false);
  const roundingValid = roundingConfirmed && !roundingContradicted;
  const reasonCodes = [
    ...(roleBindings.valuesValid ? [] : ["operand_roles_missing"]),
    ...(roleBindings.unitsValid ? [] : ["operand_role_units_invalid"]),
    ...(relationUnitsValid ? [] : ["krw_per_year_unit_missing"]),
    ...(unitContradicted ? ["krw_per_year_unit_conflict"] : []),
    ...(signValid ? [] : ["positive_sign_constraint_failed"]),
    ...(roundingValid ? [] : ["half_up_scale_zero_rounding_not_confirmed"]),
  ];
  return {
    state: reasonCodes.length === 0 ? "PASS" : "PARTIAL",
    verified: reasonCodes.length === 0,
    validatorId: input.anchor.deterministicValidatorId,
    anchorId: input.anchor.anchorId,
    anchorVersionId: input.anchor.anchorVersionId,
    reasonCodes,
    matchedRelation: relation,
  };
}

function practiceRelationAnchor(fixture: TrustedRepairFixture) {
  const anchors = fixture.anchors.flatMap((anchor) =>
    anchor.calculationRelation ? [anchor.calculationRelation] : [],
  );
  if (anchors.length !== 1) {
    throw new TrustedRepairContractError("invalid_transition");
  }
  return anchors[0];
}

export function evaluatePracticeFixtureRelation(input: {
  fixture: TrustedRepairFixture;
  text: string;
}) {
  return validatePracticeCalculationRelation({
    text: input.text,
    anchor: practiceRelationAnchor(input.fixture),
  });
}

function persistedProofEvaluation(
  evaluation: PracticeCalculationRelationEvaluation,
): NonNullable<TrustedRepairStateData["proofEvaluation"]> {
  return {
    state: evaluation.state,
    verified: evaluation.verified,
    validatorId: evaluation.validatorId,
    anchorId: evaluation.anchorId,
    anchorVersionId: evaluation.anchorVersionId,
    reasonCodes: evaluation.reasonCodes,
  };
}

function anchorEvidence(text: string, fixture: TrustedRepairFixture) {
  return fixture.anchors.map((anchor) => {
    if (!anchor.calculationRelation) {
      throw new TrustedRepairContractError("invalid_transition");
    }
    const relationEvaluation = validatePracticeCalculationRelation({
      text,
      anchor: anchor.calculationRelation,
    });
    return {
      anchor,
      relationEvaluation,
      satisfied: relationEvaluation.state === "PASS",
    };
  });
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
  const plan = basePlan(aggregate, "blocked", {
    ...aggregate.session.stateData,
    gapCandidates: [],
    repairNeed: "blocked",
    repairPath: null,
    continuation: null,
    proofEvaluation: null,
    resultReasonCodes: [
      "source_binding_version_drift",
      "verified_release_denied_until_new_session_diagnosis",
    ],
  });
  return {
    ...plan,
    primaryGapId: null,
    outcome: "blocked",
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
      score: entry.anchor.weight,
      supportingEvidence: [
        ...entry.relationEvaluation.reasonCodes.map(
          (reason) =>
            `independent_attempt:${entry.anchor.anchorId}:relation_${entry.relationEvaluation.state.toLowerCase()}:${reason}`,
        ),
      ],
      counterEvidence: [
        ...(entry.relationEvaluation.state === "PASS"
          ? [
              `independent_attempt:${entry.anchor.anchorId}:typed_calculation_relation_pass`,
            ]
          : []),
      ],
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
    counterEvidence: [
      ...evidence.flatMap((entry) =>
        entry.relationEvaluation.state === "PASS"
          ? [
              `independent_attempt:${entry.anchor.anchorId}:typed_calculation_relation_pass`,
            ]
          : [],
      ),
      "same_session_reconstruction_not_yet_observed",
    ],
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
  const proofEvaluation = evaluatePracticeFixtureRelation({
    fixture: input.fixture,
    text: attempt.body,
  });
  const plan = basePlan(input.aggregate, "diagnosed", {
    ...input.aggregate.session.stateData,
    gapCandidates: diagnosis.candidates,
    repairNeed: diagnosis.repairNeed,
    repairPath: diagnosis.repairPath,
    proofEvaluation: persistedProofEvaluation(proofEvaluation),
    resultReasonCodes: ["deterministic_top_1_gap_selected"],
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
  const relationAnchors = input.fixture.anchors.flatMap((candidate) =>
    candidate.calculationRelation ? [candidate.calculationRelation] : [],
  );
  const typedPracticeProofPassed =
    relationAnchors.length > 0 &&
    relationAnchors.every(
      (relationAnchor) =>
        validatePracticeCalculationRelation({
          text: input.repair.body,
          anchor: relationAnchor,
        }).state === "PASS",
    );
  return evidence.satisfied && typedPracticeProofPassed;
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
  const repair = latestTrustedRepairArtifact(
    input.aggregate,
    "repair_submission",
  );
  if (
    !repair ||
    repair.revisionNumber !== input.aggregate.session.stateData.revisionNumber
  ) {
    throw new TrustedRepairContractError("invalid_transition");
  }
  const criterionPassed = primaryAnchorSatisfied({
    aggregate: input.aggregate,
    fixture: input.fixture,
    repair,
  });
  const proofEvaluation = evaluatePracticeFixtureRelation({
    fixture: input.fixture,
    text: repair.body,
  });
  const independentBoundaryPassed =
    input.aggregate.session.independentAttemptBeforeHelp &&
    input.aggregate.exposures.every(
      (exposure) => exposure.scaffoldKind !== "guided_solution",
    );
  const nextState = !independentBoundaryPassed
      ? ("guided" as const)
      : criterionPassed
        ? ("verified" as const)
        : ("partial" as const);
  const plan = basePlan(input.aggregate, nextState, {
    ...input.aggregate.session.stateData,
    continuation: input.continuation,
    proofEvaluation: persistedProofEvaluation(proofEvaluation),
    resultReasonCodes: [
      ...input.aggregate.session.stateData.resultReasonCodes,
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
    proofEvaluation: null,
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
