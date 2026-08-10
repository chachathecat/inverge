import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const paths = {
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
const decision = read(paths.decision);
const strategy = read(paths.strategy);
const benchmark = read(paths.benchmark);
const validation = read(paths.validation);
const contractText = read(paths.contract);
const runner = read(paths.runner);
const contract = JSON.parse(contractText);
const combined = `${decision}\n${strategy}\n${benchmark}\n${validation}`;

test("synchronizes contract version 1.0.3 across source artifacts", () => {
  assert.equal(contract.version, "1.0.3");
  assert.match(decision, /contract_version: "1\.0\.3"/);
  assert.match(strategy, /version: "1\.0\.3"/);
  assert.match(benchmark, /contract version: `1\.0\.3`/);
  assert.match(validation, /contract version: `1\.0\.3`/);
});

test("pins V13 as the sole active master and forbids pointer or roadmap mutation", () => {
  const expected =
    "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md";
  assert.equal(contract.activeMasterPlan, expected);
  assert.equal(contract.role.mayReplaceActiveMasterPlan, false);
  assert.equal(contract.authorizationBoundary.activePointerMutation, false);
  assert.equal(contract.authorizationBoundary.roadmapMutation, false);
  assert.match(decision, /V13은 계속 답안길의 유일한 active master plan/);
  assert.match(strategy, /V13을 교체하지 않는다/);
});

test("keeps all runtime and commercial authorizations false", () => {
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
    assert.equal(contract.authorizationBoundary[key], false, `${key} must be false`);
  }
});

test("pins the exact learner-value loop", () => {
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

test("fails closed on gap, transfer, closure, source and raw data", () => {
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
  assert.equal(x.rawLearnerBodyInSharedAnalyticsOrTraining, false);
  assert.equal(x.rawLearnerContentAsModelTrainingInputForbidden, true);
  assert.equal(
    x.exactPurposeConsentAloneSufficientForRawLearnerContentTraining,
    false,
  );
  assert.deepEqual(x.futureTrainingCandidates, [
    "CONSENTED_PSEUDONYMOUS_NON_RECONSTRUCTIVE_SIGNALS",
    "PROMOTED_CLEARED_CONTENT_BANK_MATERIAL",
  ]);
  assert.equal(x.oneCanonicalMasteryAuthority, true);
});

test("requires append-only exposure commit before every help output", () => {
  const invariant = contract.hardInvariants;
  const exposure = contract.assistanceExposureContract;
  assert.equal(invariant.helpOutputRequiresPriorExposureCommit, true);
  assert.equal(invariant.exposureCommitFailureBehavior, "ZERO_HELP_BYTES_NO_EVIDENCE");
  assert.equal(invariant.exposedAttemptMayReturnToUnseen, false);
  assert.equal(invariant.laterDistinctIndependentAttemptRequiredAfterExposure, true);
  assert.equal(exposure.authority, "TRUSTED_SERVER_APPEND_ONLY");
  assert.equal(exposure.commitBeforeOutput, true);
  assert.deepEqual(exposure.coveredOutputKinds, [
    "HINT",
    "EXPLANATION",
    "WORKED_STEP",
    "PROBE",
    "FULL_SOLUTION",
  ]);
  assert.equal(exposure.commitFailureBehavior, "ZERO_OUTPUT_NO_EVIDENCE");
  assert.equal(exposure.exposedMayBeRelabeledUnseen, false);
  assert.equal(exposure.laterDistinctIndependentAttemptRequired, true);
  assert.equal(exposure.clientOrModelMayAssertExposureState, false);
  assert.match(strategy, /AssistanceExposureCommitV1/);
  assert.match(strategy, /output 0 byte/);
  assert.match(validation, /Pre-help exposure/);
});

test("binds D+1 to a frozen D0 configuration and restarts on mismatch", () => {
  const x = contract.hardInvariants;
  const frozen = contract.frozenD0Configuration;
  assert.equal(x.d1RequiresFrozenD0Configuration, true);
  assert.equal(x.incompatibleD0D1ConfigurationBehavior, "STALE_RESTART_D0");
  assert.equal(x.securityRepairMaySilentlyPreserveD0Evidence, false);
  for (const required of [
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
  ]) {
    assert.ok(frozen.requiredBindings.includes(required), `missing ${required}`);
  }
  assert.equal(frozen.onMismatch, "STALE_RESTART_D0");
  assert.equal(frozen.securityRepairBehavior, "INVALIDATE_AND_RESTART");
  assert.equal(frozen.silentEvidenceCarryForwardAllowed, false);
  assert.match(strategy, /FrozenD0ConfigurationSnapshotV1/);
  assert.match(strategy, /incompatible change.*stale|incompatible하면.*stale/i);
  assert.match(validation, /Frozen D0/);
});

test("keeps Today max three and Full-Day integer 30 through 720", () => {
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
  assert.match(strategy, /CoreOutcome은 0\.\.3/);
  assert.match(strategy, /REJECT_NO_PLAN/);
});

test("defines complete Practice, Theory and Law Golden verticals", () => {
  for (const subject of ["practice", "theory", "law"]) {
    assert.ok(contract.goldenVerticals[subject]);
    assert.ok(contract.goldenVerticals[subject].requiredStory.length >= 6);
  }
  assert.equal(
    contract.goldenVerticals.practice.hardGates.deterministicGoldAccuracy,
    1,
  );
  assert.equal(contract.goldenVerticals.law.hardGates.unknownConflictFailClosed, 1);
});

test("requires the complete reset-safe casio_fx_9860giii Practice routine", () => {
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
  assert.match(strategy, /casio_fx_9860giii/);
  for (const marker of [
    "formula",
    "extracted values",
    "hand-key sequence",
    "expected display",
    "answer-sheet transfer",
    "no-program-storage guardrail",
  ]) {
    assert.match(strategy, new RegExp(marker, "i"));
  }
  assert.match(validation, /GIII routine/);
});

test("separates synthetic building from exact live activation", () => {
  assert.ok(contract.lanes.syntheticBuild.allowed.includes("STATE_MACHINE"));
  assert.ok(contract.lanes.syntheticBuild.forbidden.includes("REAL_LEARNER_BODY"));
  assert.ok(
    contract.lanes.liveActivation.requiredPreconditions.includes(
      "CURRENT_O3A_EXACT_APPROVAL",
    ),
  );
  assert.ok(
    contract.lanes.liveActivation.requiredPreconditions.includes(
      "S236P_COMPLETED_EXACT_ACCEPTANCE",
    ),
  );
  assert.match(strategy, /acceptanceCompleted=true/);
  assert.match(strategy, /terminalPass=true/);
});

test("preserves the current canonical pre-canary and S243C ordering", () => {
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
  assert.equal(
    commercial.ownerPrivateEvidenceMaySubstituteExternalCommercialPath,
    false,
  );
  assert.match(strategy, /S241A → O3C → S239A → S242C → O4F → S243C/);
});

test("keeps pyBKT benchmark_only until O2 and sufficient event data", () => {
  const bkt = contract.benchmarkAdoption.PYBKT;
  assert.equal(bkt.currentDisposition, "BENCHMARK_ONLY");
  assert.deepEqual(bkt.shadowPrerequisites, [
    "EXACT_O2_MEASUREMENT_CONSENT_GATE",
    "SUFFICIENT_CLOSED_SCHEMA_SKILL_EVENTS",
  ]);
  assert.ok(bkt.reject.includes("HIDDEN_SHADOW_BEFORE_O2"));
  assert.ok(bkt.reject.includes("SHADOW_FROM_SYNTHETIC_BENCHMARK_ALONE"));
  assert.ok(bkt.reject.includes("CANONICAL_MASTERY_AUTHORITY"));
  assert.match(strategy, /pyBKT.*benchmark_only/is);
  assert.match(strategy, /exact-scope O2 measurement\/consent gate/i);
  assert.match(benchmark, /current disposition is exactly:\s*\n\n> `benchmark_only`/i);
  assert.match(validation, /pyBKT.*benchmark_only/is);
  assert.doesNotMatch(benchmark, /benchmark_shadow_only/);
});

test("registers the focused contract in the default Node runner", () => {
  const marker = "tests/appraiser-second-world-class-vertical-contract.test.mjs";
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(runner, new RegExp(escaped));
});

test("requires complete open-source qualification", () => {
  const required = new Set(contract.openSourceQualificationRequiredFields);
  for (const key of [
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
    assert.ok(required.has(key), `missing ${key}`);
  }
});

test("grounds benchmark mechanisms and states their limits", () => {
  for (const marker of [
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
  ]) {
    assert.match(benchmark, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(benchmark, /외부 제품의 마케팅 주장은 답안길 효능 증거가 아니다/);
});

test("pins source validation non-claims", () => {
  assert.match(validation, /runtime evidence: none/);
  assert.match(validation, /learning efficacy/);
  assert.match(validation, /commercial readiness/);
  assert.match(validation, /Production readiness/);
});

test("records PR 697 and Issue 695 as superseded without active-master promotion", () => {
  assert.equal(contract.pr697Disposition.productIdeasAbsorbed, true);
  assert.equal(contract.pr697Disposition.activeMasterPromotionRejected, true);
  assert.equal(
    contract.pr697Disposition.recommendedAfterThisStandardAccepted,
    "SUPERSEDE_AND_CLOSE",
  );
  assert.match(decision, /PR #697과 Issue #695는.*superseded/s);
});

test("all source artifacts end with a newline", () => {
  for (const [name, body] of [
    ["decision", decision],
    ["strategy", strategy],
    ["benchmark", benchmark],
    ["contract", contractText],
    ["validation", validation],
  ]) {
    assert.ok(body.endsWith("\n"), `${name} must end with newline`);
  }
});
