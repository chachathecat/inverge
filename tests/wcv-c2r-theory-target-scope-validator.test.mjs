import assert from "node:assert/strict";
import test from "node:test";

import {
  TRUSTED_REPAIR_THEORY_CONTRACT_VERSION,
  TRUSTED_REPAIR_THEORY_FIXTURE_VERSION,
  TRUSTED_REPAIR_THEORY_RUBRIC_VERSION,
  TRUSTED_REPAIR_THEORY_VALIDATOR_VERSION,
  TRUSTED_REPAIR_POLICY_VERSION,
  parseJsonRejectingDuplicateKeys,
  parseTheoryPredicateClaimV1Input,
} from "../lib/review-os/trusted-repair-contract.ts";
import {
  SYNTHETIC_THEORY_SOURCE_BINDING,
  buildTheoryPredicateClaim,
  initialTrustedRepairStateData,
  planTrustedRepairDiagnosis,
  planTrustedRepairExposure,
  planTrustedRepairIndependentAttempt,
  planTrustedRepairPrediction,
  planTrustedRepairRevisionConfirmation,
  planTrustedRepairSelfDiagnosis,
  planTrustedRepairSubmission,
  planTrustedRepairTheoryClaimConfirmation,
  trustedRepairSourceVersion,
  validateTheoryPredicateClaim,
} from "../lib/review-os/trusted-repair-engine.ts";
import {
  TRUSTED_REPAIR_FIXTURES,
  TRUSTED_REPAIR_GOLD_CANDIDATES,
  trustedRepairCanonicalFixture,
} from "../lib/review-os/trusted-repair-fixtures.ts";

const USER_ID = "10000000-0000-4000-8000-000000000002";
const SESSION_ID = "20000000-0000-4000-8000-000000000002";
let idCounter = 200;
const nextId = () =>
  `30000000-0000-4000-8000-${String(idCounter++).padStart(12, "0")}`;

function fixture() {
  return trustedRepairCanonicalFixture("appraisal_theory");
}

function anchor() {
  const selected = fixture().anchors[0];
  assert.ok("scopedPredicate" in selected);
  return selected.scopedPredicate;
}

function claimInput(sourceRevisionId = nextId()) {
  const selected = anchor();
  return {
    sourceRevisionId,
    anchorId: selected.anchorId,
    anchorVersionId: selected.anchorVersionId,
    targetScopeId: selected.targetScopeId,
    clauses: [
      {
        clauseIndex: 1,
        scopeResolution: "EXACT",
        scopeId: selected.targetScopeId,
        predicates: [
          {
            predicateId: selected.requiredPredicates[0],
            polarity: "ASSERTED",
          },
        ],
      },
      {
        clauseIndex: 2,
        scopeResolution: "EXACT",
        scopeId: selected.targetScopeId,
        predicates: [
          {
            predicateId: selected.forbiddenPredicates[0],
            polarity: "NEGATED",
          },
        ],
      },
    ],
    confirmationMode: "MANUAL_STRUCTURED",
  };
}

function claim(input = claimInput()) {
  return buildTheoryPredicateClaim({
    claim: input,
    learnerConfirmedAt: "2026-08-17T02:30:00.000Z",
  });
}

function evaluate(input) {
  return validateTheoryPredicateClaim({
    claim: claim(input),
    anchor: anchor(),
    expectedSourceRevisionId: input.sourceRevisionId,
  });
}

function initialAggregate() {
  const selected = fixture();
  return {
    session: {
      sessionId: SESSION_ID,
      userId: USER_ID,
      fixtureId: selected.fixtureId,
      subject: "appraisal_theory",
      state: "editable_capture_draft",
      recordVersion: 1,
      confirmedRevisionId: null,
      primaryGapId: null,
      outcome: null,
      assistanceLevel: 0,
      independentAttemptBeforeHelp: false,
      bindings: {
        contractVersion: TRUSTED_REPAIR_THEORY_CONTRACT_VERSION,
        fixtureVersion: TRUSTED_REPAIR_THEORY_FIXTURE_VERSION,
        sourceVersion: trustedRepairSourceVersion(
          selected,
          SYNTHETIC_THEORY_SOURCE_BINDING,
        ),
        rubricVersion: TRUSTED_REPAIR_THEORY_RUBRIC_VERSION,
        policyVersion: TRUSTED_REPAIR_POLICY_VERSION,
        validatorVersion: TRUSTED_REPAIR_THEORY_VALIDATOR_VERSION,
      },
      stateData: initialTrustedRepairStateData("TYPED_TEXT"),
      createdAt: "2026-08-17T02:00:00.000Z",
      updatedAt: "2026-08-17T02:00:00.000Z",
    },
    artifacts: [],
    exposures: [],
  };
}

function applyPlan(aggregate, plan) {
  return {
    session: {
      ...aggregate.session,
      state: plan.nextState,
      recordVersion: aggregate.session.recordVersion + 1,
      confirmedRevisionId: plan.confirmedRevisionId,
      primaryGapId: plan.primaryGapId,
      outcome: plan.outcome,
      assistanceLevel: plan.assistanceLevel,
      independentAttemptBeforeHelp: plan.independentAttemptBeforeHelp,
      stateData: plan.stateData,
    },
    artifacts: plan.artifact
      ? [
          ...aggregate.artifacts,
          { ...plan.artifact, sessionId: SESSION_ID, userId: USER_ID },
        ]
      : aggregate.artifacts,
    exposures: plan.exposure
      ? [
          ...aggregate.exposures,
          { ...plan.exposure, sessionId: SESSION_ID, userId: USER_ID },
        ]
      : aggregate.exposures,
  };
}

function repairSubmitted() {
  const selected = fixture();
  let aggregate = initialAggregate();
  aggregate = applyPlan(
    aggregate,
    planTrustedRepairRevisionConfirmation({
      aggregate,
      artifactId: nextId(),
      body: "합성 이론 확정 수정본",
      occurredAt: "2026-08-17T02:01:00.000Z",
    }),
  );
  aggregate = applyPlan(
    aggregate,
    planTrustedRepairPrediction({
      aggregate,
      prediction: "likely_partial",
      confidence: "medium",
    }),
  );
  aggregate = applyPlan(
    aggregate,
    planTrustedRepairIndependentAttempt({
      aggregate,
      artifactId: nextId(),
      body: "수익방식과 원가방식은 모두 가치를 설명한다.",
      occurredAt: "2026-08-17T02:02:00.000Z",
    }),
  );
  aggregate = applyPlan(
    aggregate,
    planTrustedRepairSelfDiagnosis({
      aggregate,
      selfDiagnosisCode: "target_scope_or_polarity_drift",
    }),
  );
  aggregate = applyPlan(
    aggregate,
    planTrustedRepairDiagnosis({
      aggregate,
      fixture: selected,
      sourceBinding: SYNTHETIC_THEORY_SOURCE_BINDING,
    }),
  );
  assert.equal(aggregate.session.state, "diagnosed");
  assert.equal(aggregate.session.stateData.proofEvaluation, null);
  aggregate = applyPlan(
    aggregate,
    planTrustedRepairExposure({
      aggregate,
      exposureId: nextId(),
      occurredAt: "2026-08-17T02:03:00.000Z",
    }),
  );
  return applyPlan(
    aggregate,
    planTrustedRepairSubmission({
      aggregate,
      fixture: selected,
      sourceBinding: SYNTHETIC_THEORY_SOURCE_BINDING,
      artifactId: nextId(),
      body: "수익방식은 기대수익을 가치로 전환하며 원가만 사용하지 않는다.",
      occurredAt: "2026-08-17T02:04:00.000Z",
    }),
  );
}

test("[C2R-C-T-R05] exact target assertion passes; negated required predicate is only partial", () => {
  const exact = claimInput();
  assert.equal(evaluate(exact).state, "PASS");
  exact.clauses[0].predicates[0].polarity = "NEGATED";
  const negated = evaluate(exact);
  assert.equal(negated.state, "PARTIAL");
  assert.equal(negated.verified, false);
  assert.ok(negated.reasonCodes.includes("required_predicate_negated"));

  const negatedWithAlternative = claimInput();
  negatedWithAlternative.clauses[0].predicates = [
    {
      predicateId: anchor().requiredPredicates[0],
      polarity: "NEGATED",
    },
    {
      predicateId: anchor().acceptableAlternatives[0][0],
      polarity: "ASSERTED",
    },
  ];
  const alternativeCannotOverride = evaluate(negatedWithAlternative);
  assert.equal(alternativeCannotOverride.state, "PARTIAL");
  assert.equal(alternativeCannotOverride.verified, false);
  assert.deepEqual(alternativeCannotOverride.reasonCodes, [
    "required_predicate_negated",
  ]);
});

test("[C2R-C-T-R13/R16] same-target mixed polarity stays ambiguous across clause boundaries", () => {
  for (const sameClause of [true, false]) {
    const input = claimInput();
    const negative = {
      predicateId: anchor().requiredPredicates[0],
      polarity: "NEGATED",
    };
    if (sameClause) input.clauses[0].predicates.push(negative);
    else {
      input.clauses.push({
        clauseIndex: 3,
        scopeResolution: "EXACT",
        scopeId: anchor().targetScopeId,
        predicates: [negative],
      });
    }
    assert.equal(evaluate(input).state, "AMBIGUOUS");
  }

  const counterexampleCannotErase = claimInput();
  counterexampleCannotErase.clauses[0].predicates.push({
    predicateId: anchor().requiredPredicates[0],
    polarity: "NEGATED",
  });
  counterexampleCannotErase.clauses.push({
    clauseIndex: 3,
    scopeResolution: "EXACT",
    scopeId: anchor().counterexampleScopes[0],
    predicates: [
      {
        predicateId: anchor().requiredPredicates[0],
        polarity: "ASSERTED",
      },
    ],
  });
  assert.equal(evaluate(counterexampleCannotErase).state, "AMBIGUOUS");

  const counterexampleDoesNotContaminate = claimInput();
  counterexampleDoesNotContaminate.clauses.push({
    clauseIndex: 3,
    scopeResolution: "EXACT",
    scopeId: anchor().counterexampleScopes[0],
    predicates: [
      {
        predicateId: anchor().requiredPredicates[0],
        polarity: "NEGATED",
      },
    ],
  });
  assert.equal(evaluate(counterexampleDoesNotContaminate).state, "PASS");

  const arbitraryTargetPredicate = claimInput();
  arbitraryTargetPredicate.clauses[0].predicates.push(
    {
      predicateId: "synthetic_supporting_predicate",
      polarity: "ASSERTED",
    },
    {
      predicateId: "synthetic_supporting_predicate",
      polarity: "NEGATED",
    },
  );
  const arbitraryMixed = evaluate(arbitraryTargetPredicate);
  assert.equal(arbitraryMixed.state, "AMBIGUOUS");
  assert.deepEqual(arbitraryMixed.reasonCodes, [
    "same_target_mixed_polarity:synthetic_supporting_predicate",
  ]);
});

test("[C2R-C-T-R18] clause and occurrence overflow cannot be truncated into PASS", () => {
  const tooManyClauses = claimInput();
  tooManyClauses.clauses = Array.from({ length: 25 }, (_, index) => ({
    clauseIndex: index + 1,
    scopeResolution: "EXACT",
    scopeId: anchor().targetScopeId,
    predicates: [
      {
        predicateId: anchor().requiredPredicates[0],
        polarity: "ASSERTED",
      },
    ],
  }));
  assert.equal(evaluate(tooManyClauses).state, "UNSUPPORTED");

  const tooManyOccurrences = claimInput();
  tooManyOccurrences.clauses = [
    {
      clauseIndex: 1,
      scopeResolution: "EXACT",
      scopeId: anchor().targetScopeId,
      predicates: Array.from({ length: 65 }, () => ({
        predicateId: anchor().requiredPredicates[0],
        polarity: "ASSERTED",
      })),
    },
  ];
  assert.equal(evaluate(tooManyOccurrences).state, "UNSUPPORTED");
});

test("[C2R-C-T-R20] another scope cannot supply the target predicate", () => {
  const input = claimInput();
  input.clauses = [
    {
      clauseIndex: 1,
      scopeResolution: "EXACT",
      scopeId: anchor().counterexampleScopes[0],
      predicates: [
        {
          predicateId: anchor().requiredPredicates[0],
          polarity: "ASSERTED",
        },
      ],
    },
  ];
  assert.equal(evaluate(input).state, "UNSUPPORTED");

  for (const supportPredicateId of [
    anchor().requiredPredicates[0],
    anchor().acceptableAlternatives[0][0],
  ]) {
    const targetFillerCannotMaskCrossTargetSupport = claimInput();
    targetFillerCannotMaskCrossTargetSupport.clauses = [
      {
        clauseIndex: 1,
        scopeResolution: "EXACT",
        scopeId: anchor().targetScopeId,
        predicates: [
          {
            predicateId: anchor().forbiddenPredicates[0],
            polarity: "NEGATED",
          },
          {
            predicateId: "synthetic_target_filler",
            polarity: "ASSERTED",
          },
        ],
      },
      {
        clauseIndex: 2,
        scopeResolution: "EXACT",
        scopeId: anchor().counterexampleScopes[0],
        predicates: [
          {
            predicateId: supportPredicateId,
            polarity: "ASSERTED",
          },
        ],
      },
    ];
    const result = evaluate(targetFillerCannotMaskCrossTargetSupport);
    assert.equal(result.state, "UNSUPPORTED");
    assert.deepEqual(result.reasonCodes, [
      "cross_target_evidence_cannot_satisfy_target",
    ]);
  }
});

test("unresolved anaphora and unscoped assertions are ambiguous; forbidden assertion blocks", () => {
  for (const scopeResolution of ["UNRESOLVED_ANAPHORA", "UNSCOPED"]) {
    const input = claimInput();
    input.clauses = [
      {
        clauseIndex: 1,
        scopeResolution,
        scopeId: null,
        predicates: [
          {
            predicateId: anchor().requiredPredicates[0],
            polarity: "ASSERTED",
          },
        ],
      },
    ];
    assert.equal(evaluate(input).state, "AMBIGUOUS");
  }
  const forbidden = claimInput();
  forbidden.clauses[1].predicates[0].polarity = "ASSERTED";
  assert.equal(evaluate(forbidden).state, "BLOCKED");
  forbidden.clauses[1].predicates.push({
    predicateId: anchor().forbiddenPredicates[0],
    polarity: "NEGATED",
  });
  const forbiddenMixed = evaluate(forbidden);
  assert.equal(forbiddenMixed.state, "BLOCKED");
  assert.deepEqual(forbiddenMixed.reasonCodes, [
    `forbidden_predicate_asserted:${anchor().forbiddenPredicates[0]}`,
  ]);
});

test("Theory planning preserves fail-closed dispositions instead of relying on SQL rejection", () => {
  for (const { input, expectedState } of [
    {
      input: (() => {
        const value = claimInput();
        value.clauses[0].predicates = [
          {
            predicateId: anchor().requiredPredicates[0],
            polarity: "NEGATED",
          },
          {
            predicateId: anchor().acceptableAlternatives[0][0],
            polarity: "ASSERTED",
          },
        ];
        return value;
      })(),
      expectedState: "PARTIAL",
    },
    {
      input: (() => {
        const value = claimInput();
        value.clauses[0].predicates.push(
          {
            predicateId: "synthetic_supporting_predicate",
            polarity: "ASSERTED",
          },
          {
            predicateId: "synthetic_supporting_predicate",
            polarity: "NEGATED",
          },
        );
        return value;
      })(),
      expectedState: "AMBIGUOUS",
    },
  ]) {
    const aggregate = repairSubmitted();
    input.sourceRevisionId = aggregate.session.confirmedRevisionId;
    const plan = planTrustedRepairTheoryClaimConfirmation({
      aggregate,
      fixture: fixture(),
      sourceBinding: SYNTHETIC_THEORY_SOURCE_BINDING,
      claim: claim(input),
    });
    assert.equal(plan.nextState, "partial");
    assert.equal(plan.outcome, "partial");
    assert.equal(plan.stateData.proofEvaluation.state, expectedState);
    assert.equal(plan.stateData.proofEvaluation.verified, false);
  }
});

test("free-form evidence remains candidate-only until the exact structured Theory commitment passes", () => {
  const aggregate = repairSubmitted();
  assert.equal(aggregate.session.state, "repair_submitted");
  assert.equal(aggregate.session.stateData.structuredClaim, null);
  assert.equal(aggregate.session.stateData.proofEvaluation, null);
  const input = claimInput(aggregate.session.confirmedRevisionId);
  const plan = planTrustedRepairTheoryClaimConfirmation({
    aggregate,
    fixture: fixture(),
    sourceBinding: SYNTHETIC_THEORY_SOURCE_BINDING,
    claim: claim(input),
  });
  assert.equal(plan.nextState, "verified");
  assert.equal(plan.outcome, "verified");
  assert.equal(plan.stateData.proofEvaluation.state, "PASS");
  assert.ok(
    plan.stateData.resultReasonCodes.includes(
      "no_mastery_transfer_stability_score_or_pass_claim",
    ),
  );
});

test("closed Theory claim parser rejects unknown, missing, duplicate, and structurally inconsistent fields", () => {
  const valid = claimInput();
  assert.deepEqual(parseTheoryPredicateClaimV1Input(valid), valid);
  assert.throws(() =>
    parseTheoryPredicateClaimV1Input({ ...valid, verified: true }),
  );
  assert.throws(() =>
    parseTheoryPredicateClaimV1Input({ ...valid, clauses: [] }),
  );
  assert.throws(() =>
    parseTheoryPredicateClaimV1Input({
      ...valid,
      clauses: [{ ...valid.clauses[0], scopeId: null }],
    }),
  );
  assert.throws(() =>
    parseJsonRejectingDuplicateKeys(
      '{"action":"confirm_theory_claim","action":"start"}',
    ),
  );
});

test("Theory owns seven rights-safe fixtures and matching Golden/Owner-Gold candidates", () => {
  assert.equal(
    TRUSTED_REPAIR_FIXTURES.filter(
      (entry) => entry.subject === "appraisal_theory",
    ).length,
    7,
  );
  assert.deepEqual(
    TRUSTED_REPAIR_GOLD_CANDIDATES.filter(
      (entry) => entry.subject === "appraisal_theory",
    )
      .map((entry) => entry.goldTier)
      .sort(),
    ["GOLDEN", "OWNER_GOLD"],
  );
});
