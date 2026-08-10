import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = {
  decision:
    "docs/decisions/2026-08-10-owner-appraiser-second-world-class-vertical-execution.md",
  strategy:
    "docs/strategy/dabangil-appraiser-second-world-class-vertical-execution-v1-2026-08-10.md",
  benchmark:
    "docs/qa/appraiser-second-world-class-benchmark-and-adoption-matrix-v1-2026-08-10.md",
  contract:
    "config/dabangil-appraiser-second-world-class-vertical-v1.json",
  validation:
    "docs/qa/appraiser-second-world-class-vertical-validation.md",
  runner: "scripts/run-node-tests.mjs",
};

const read = (path) => readFileSync(path, "utf8");
const decision = read(files.decision);
const strategy = read(files.strategy);
const benchmark = read(files.benchmark);
const validation = read(files.validation);
const contractText = read(files.contract);
const runner = read(files.runner);
const contract = JSON.parse(contractText);

const includesAll = (text, markers, label) => {
  for (const marker of markers) {
    assert.ok(text.includes(marker), `${label} missing marker: ${marker}`);
  }
};

test("synchronizes WCV contract v1.0.3 and keeps V13 authoritative", () => {
  assert.equal(contract.version, "1.0.3");
  assert.equal(
    contract.activeMasterPlan,
    "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md",
  );
  assert.equal(contract.role.mayReplaceActiveMasterPlan, false);
  assert.equal(contract.authorizationBoundary.activePointerMutation, false);
  assert.equal(contract.authorizationBoundary.roadmapMutation, false);
  includesAll(decision, ["contract_version: \"1.0.3\"", "V13은 계속 답안길의 유일한 active master plan"], "decision");
  includesAll(strategy, ["version: \"1.0.3\"", "V13을 교체하지 않는다"], "strategy");
  assert.ok(benchmark.includes("contract version: `1.0.3`"));
  assert.ok(validation.includes("contract version: `1.0.3`"));
});

test("authorizes no runtime, content, commercial, dependency or Production mutation", () => {
  for (const key of [
    "runtime",
    "ui",
    "api",
    "schema",
    "migration",
    "rls",
    "storage",
    "persistence",
    "provider",
    "dependency",
    "environment",
    "deployment",
    "production",
    "realContent",
    "ownerActivation",
    "externalLearner",
    "commercial",
    "pricing",
    "payment",
    "firstStageActivation",
    "otherExamActivation",
  ]) {
    assert.equal(contract.authorizationBoundary[key], false, key);
  }
});

test("pins the exact learner-value sequence", () => {
  assert.deepEqual(contract.coreLoop, [
    "CAPTURE",
    "CONFIRMED_REVISION",
    "EXACT_ANSWER_ANCHOR",
    "SUCCESSFUL_OUTCOME_QUALIFIED_BIGGEST_GAP",
    "DIRECT_REPAIR",
    "SAME_SESSION_VERIFICATION",
    "D1_INDEPENDENT_RECONSTRUCTION",
    "D7_VERIFIED_NON_SAME_SURFACE_TRANSFER",
    "TIMED_RECURRENCE",
    "RECURRING_DEDUCTION_PROJECTION",
    "EVIDENCE_DRIVEN_REPLAN",
  ]);
});

test("requires successful evidence, sealed transfer, timed recurrence and fail-closed Trust", () => {
  const x = contract.hardInvariants;
  assert.equal(x.exactAnchorRequiredForUsableGap, true);
  assert.equal(x.evaluationCompletionSufficientForPositiveEvidence, false);
  assert.equal(x.aiViewIsIndependentPerformance, false);
  assert.equal(x.sameItemOrSameSurfaceIsTransfer, false);
  assert.equal(x.verifiedNonSameSurfaceRequiredForD7, true);
  assert.equal(x.timedRecurrenceRequiredForClosure, true);
  assert.equal(x.laterIndependentFailureReopensClosure, true);
  assert.equal(x.practiceDeterministicConflictBlocksNumericRelease, true);
  assert.equal(x.lawSourceOrEffectiveVersionConflictBlocksVerifiedRelease, true);
  assert.equal(x.oneCanonicalMasteryAuthority, true);
});

test("commits append-only exposure before any help byte", () => {
  const x = contract.hardInvariants;
  const exposure = contract.assistanceExposureContract;
  assert.equal(x.helpOutputRequiresPriorExposureCommit, true);
  assert.equal(x.exposureCommitFailureBehavior, "ZERO_HELP_BYTES_NO_EVIDENCE");
  assert.equal(x.exposedAttemptMayReturnToUnseen, false);
  assert.equal(x.laterDistinctIndependentAttemptRequiredAfterExposure, true);
  assert.deepEqual(exposure, {
    authority: "TRUSTED_SERVER_APPEND_ONLY",
    commitBeforeOutput: true,
    coveredOutputKinds: [
      "HINT",
      "EXPLANATION",
      "WORKED_STEP",
      "PROBE",
      "FULL_SOLUTION",
    ],
    commitFailureBehavior: "ZERO_OUTPUT_NO_EVIDENCE",
    exposedMayBeRelabeledUnseen: false,
    laterDistinctIndependentAttemptRequired: true,
    clientOrModelMayAssertExposureState: false,
  });
  includesAll(strategy, ["AssistanceExposureCommitV1", "output 0 byte"], "strategy exposure contract");
  assert.ok(validation.includes("Pre-help exposure"));
});

test("binds D+1 to the frozen D0 configuration and restarts on mismatch", () => {
  const x = contract.hardInvariants;
  const frozen = contract.frozenD0Configuration;
  assert.equal(x.d1RequiresFrozenD0Configuration, true);
  assert.equal(x.incompatibleD0D1ConfigurationBehavior, "STALE_RESTART_D0");
  assert.equal(x.securityRepairMaySilentlyPreserveD0Evidence, false);
  assert.deepEqual(frozen.requiredBindings, [
    "PROBLEM_REVISION",
    "SOURCE_VERSION",
    "MODEL_VERSION",
    "PROMPT_VERSION",
    "RUBRIC_VERSION",
    "VALIDATOR_VERSION",
    "FULL_DAY_POLICY_VERSION",
    "NOTEBOOK_SCHEMA_VERSION",
    "TUTOR_POLICY_VERSION",
    "ASSISTANCE_POLICY_VERSION",
    "MEASUREMENT_POLICY_VERSION",
    "ITEM_RELEASE_ARTIFACT",
  ]);
  assert.equal(frozen.onMismatch, "STALE_RESTART_D0");
  assert.equal(frozen.securityRepairBehavior, "INVALIDATE_AND_RESTART");
  assert.equal(frozen.silentEvidenceCarryForwardAllowed, false);
  includesAll(strategy, ["FrozenD0ConfigurationSnapshotV1", "D0부터 restart"], "strategy frozen D0 contract");
  assert.ok(validation.includes("Frozen D0"));
});

test("keeps Today at three and Full-Day at trusted-server integer 30..720", () => {
  const x = contract.hardInvariants;
  assert.equal(x.todayCoreOutcomeMax, 3);
  assert.equal(x.fullDayExecutionBlockLimitMode, "AVAILABLE_MINUTES_0_TO_N");
  assert.equal(x.blockCompletionChangesMastery, false);
  assert.equal(x.engagementMaySetLearningPriority, false);
  assert.deepEqual(x.fullDayAvailableMinutes, {
    requiredType: "integer",
    minimum: 30,
    maximum: 720,
    outsideRangeBehavior: "REJECT_NO_PLAN",
  });
  includesAll(strategy, ["CoreOutcome은 0..3", "REJECT_NO_PLAN"], "strategy Full-Day contract");
});

test("requires complete Practice, Theory and Law Golden verticals", () => {
  for (const subject of ["practice", "theory", "law"]) {
    assert.ok(contract.goldenVerticals[subject]);
    assert.ok(contract.goldenVerticals[subject].requiredStory.length >= 6);
  }
  assert.equal(contract.goldenVerticals.practice.hardGates.deterministicGoldAccuracy, 1);
  assert.equal(contract.goldenVerticals.law.hardGates.unknownConflictFailClosed, 1);
});

test("requires the complete reset-safe casio_fx_9860giii routine", () => {
  const practice = contract.goldenVerticals.practice;
  assert.ok(practice.requiredStory.includes("CASIO_FX_9860GIII_RESET_SAFE_ROUTINE"));
  assert.deepEqual(practice.calculatorRoutineRequirements, [
    "FORMULA",
    "EXTRACTED_VALUES",
    "HAND_KEY_SEQUENCE",
    "EXPECTED_DISPLAY",
    "UNIT_SIGN_ROUNDING_CHECKS",
    "ANSWER_SHEET_TRANSFER",
    "RESET_SAFE_REPRODUCTION",
    "NO_PROGRAM_STORAGE_GUARDRAIL",
  ]);
  includesAll(
    strategy,
    [
      "casio_fx_9860giii",
      "formula",
      "extracted values",
      "hand-key sequence",
      "expected display",
      "answer-sheet transfer",
      "no-program-storage guardrail",
    ],
    "strategy GIII contract",
  );
  assert.ok(validation.includes("GIII routine"));
});

test("separates synthetic building from completed exact live activation", () => {
  assert.ok(contract.lanes.syntheticBuild.allowed.includes("STATE_MACHINE"));
  assert.ok(contract.lanes.syntheticBuild.forbidden.includes("REAL_LEARNER_BODY"));
  assert.ok(contract.lanes.liveActivation.requiredPreconditions.includes("CURRENT_O3A_EXACT_APPROVAL"));
  assert.ok(contract.lanes.liveActivation.requiredPreconditions.includes("S236P_COMPLETED_EXACT_ACCEPTANCE"));
  includesAll(strategy, ["acceptanceCompleted=true", "terminalPass=true"], "strategy activation gate");
});

test("preserves the current O4F-to-S243C ordering without circularity", () => {
  const commercial = contract.lanes.commercialActivation;
  assert.deepEqual(commercial.canonicalDependencyPath, [
    "S241A",
    "O3C",
    "S239A",
    "S242C",
    "O4F",
    "S243C",
  ]);
  assert.deepEqual(commercial.preCanaryCompletedPath, [
    "S241A",
    "O3C",
    "S239A",
    "S242C",
    "O4F",
  ]);
  assert.equal(commercial.paidCanaryTarget, "S243C");
  assert.equal(commercial.s243cCompletionRequiredBeforePaidCanaryEntry, false);
  assert.equal(commercial.ownerPrivateAcceptanceMaySubstitute, false);
  assert.equal(commercial.genericOwnerActivationMaySubstitute, false);
  assert.equal(commercial.ownerPrivateEvidenceMaySubstituteExternalCommercialPath, false);
  assert.ok(strategy.includes("S241A → O3C → S239A → S242C → O4F → S243C"));
});

test("keeps private raw bodies out of training and shared planes", () => {
  const x = contract.hardInvariants;
  assert.equal(x.rawLearnerBodyInSharedAnalyticsOrTraining, false);
  assert.equal(x.rawLearnerContentAsModelTrainingInputForbidden, true);
  assert.equal(x.exactPurposeConsentAloneSufficientForRawLearnerContentTraining, false);
  assert.deepEqual(x.futureTrainingCandidates, [
    "CONSENTED_PSEUDONYMOUS_NON_RECONSTRUCTIVE_SIGNALS",
    "PROMOTED_CLEARED_CONTENT_BANK_MATERIAL",
  ]);
});

test("keeps pyBKT benchmark-only until O2 and sufficient event data", () => {
  const bkt = contract.benchmarkAdoption.PYBKT;
  assert.equal(bkt.currentDisposition, "BENCHMARK_ONLY");
  assert.deepEqual(bkt.shadowPrerequisites, [
    "EXACT_O2_MEASUREMENT_CONSENT_GATE",
    "SUFFICIENT_CLOSED_SCHEMA_SKILL_EVENTS",
  ]);
  assert.ok(bkt.reject.includes("HIDDEN_SHADOW_BEFORE_O2"));
  assert.ok(bkt.reject.includes("SHADOW_FROM_SYNTHETIC_BENCHMARK_ALONE"));
  assert.ok(bkt.reject.includes("CANONICAL_MASTERY_AUTHORITY"));
  includesAll(strategy, ["pyBKT", "benchmark_only", "exact-scope O2 measurement/consent gate"], "strategy pyBKT boundary");
  includesAll(benchmark, ["Current disposition is exactly:", "> `benchmark_only`"], "benchmark pyBKT boundary");
  includesAll(validation, ["pyBKT", "benchmark_only"], "validation pyBKT boundary");
  assert.equal(/Current disposition:\s*`benchmark_shadow_only`/i.test(benchmark), false);
});

test("registers the focused contract in the default test runner", () => {
  assert.ok(runner.includes("tests/appraiser-second-world-class-vertical-contract.test.mjs"));
});

test("requires complete open-source qualification before adoption", () => {
  const required = new Set(contract.openSourceQualificationRequiredFields);
  for (const field of [
    "project",
    "version",
    "license",
    "securityPosture",
    "transitiveDependencies",
    "sbom",
    "dataEgress",
    "fallback",
    "rollback",
    "uninstallability",
    "promotionGate",
  ]) {
    assert.ok(required.has(field), field);
  }
  includesAll(
    benchmark,
    [
      "UWorld",
      "AMBOSS",
      "Duolingo Birdbrain",
      "Khanmigo",
      "OATutor",
      "Ajv",
      "decimal.js",
      "Inspect AI",
      "FSRS",
      "pyBKT",
      "H5P",
      "QTI 3",
      "Caliper",
      "W3C PROV",
      "NIST AI RMF",
      "Structured AI Tutor RCT",
      "Generative AI without guardrails",
      "Tutor CoPilot",
      "Retrieval Practice",
    ],
    "benchmark matrix",
  );
  assert.ok(benchmark.includes("외부 제품의 마케팅 주장은 답안길 효능 증거가 아니다"));
});

test("records superseded V13.1 and source-only non-claims", () => {
  assert.deepEqual(contract.pr697Disposition, {
    productIdeasAbsorbed: true,
    activeMasterPromotionRejected: true,
    recommendedAfterThisStandardAccepted: "SUPERSEDE_AND_CLOSE",
  });
  assert.ok(decision.includes("PR #697과 Issue #695는 2026-08-10 KST에 superseded"));
  includesAll(
    validation,
    [
      "runtime evidence: none",
      "learning efficacy",
      "commercial readiness",
      "Production readiness",
    ],
    "validation non-claims",
  );
});

test("all source artifacts end with a newline", () => {
  for (const [label, text] of [
    ["decision", decision],
    ["strategy", strategy],
    ["benchmark", benchmark],
    ["contract", contractText],
    ["validation", validation],
  ]) {
    assert.ok(text.endsWith("\n"), label);
  }
});
