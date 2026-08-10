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
};

const read = (path) => readFileSync(path, "utf8");
const decision = read(paths.decision);
const strategy = read(paths.strategy);
const benchmark = read(paths.benchmark);
const validation = read(paths.validation);
const contractText = read(paths.contract);
const contract = JSON.parse(contractText);

test("pins V13 as the sole active master and forbids active-pointer mutation", () => {
  const expected =
    "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md";
  assert.equal(contract.activeMasterPlan, expected);
  assert.equal(contract.role.mayReplaceActiveMasterPlan, false);
  assert.equal(contract.authorizationBoundary.activePointerMutation, false);
  assert.equal(contract.authorizationBoundary.roadmapMutation, false);
  assert.match(decision, /V13은 계속 답안길의 유일한 active master plan/);
  assert.match(strategy, /V13을 교체하지 않는다/);
});

test("keeps every runtime and commercial authorization false", () => {
  const forbidden = [
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
  ];
  for (const key of forbidden) {
    assert.equal(
      contract.authorizationBoundary[key],
      false,
      `${key} must remain false`,
    );
  }
});

test("pins the exact gap-to-transfer-to-replan loop", () => {
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

test("fails closed on evidence, transfer, closure, source, and raw data", () => {
  const invariant = contract.hardInvariants;
  assert.equal(invariant.exactAnchorRequiredForUsableGap, true);
  assert.equal(invariant.evaluationCompletionSufficientForPositiveEvidence, false);
  assert.equal(invariant.aiViewIsIndependentPerformance, false);
  assert.equal(invariant.sameItemOrSameSurfaceIsTransfer, false);
  assert.equal(invariant.verifiedNonSameSurfaceRequiredForD7, true);
  assert.equal(invariant.timedRecurrenceRequiredForClosure, true);
  assert.equal(invariant.laterIndependentFailureReopensClosure, true);
  assert.equal(
    invariant.practiceDeterministicConflictBlocksNumericRelease,
    true,
  );
  assert.equal(
    invariant.lawSourceOrEffectiveVersionConflictBlocksVerifiedRelease,
    true,
  );
  assert.equal(invariant.rawLearnerBodyInSharedAnalyticsOrTraining, false);
  assert.equal(invariant.oneCanonicalMasteryAuthority, true);
});

test("keeps Today max three while allowing bounded full-day blocks", () => {
  assert.equal(contract.hardInvariants.todayCoreOutcomeMax, 3);
  assert.equal(
    contract.hardInvariants.fullDayExecutionBlockLimitMode,
    "AVAILABLE_MINUTES_0_TO_N",
  );
  assert.equal(contract.hardInvariants.blockCompletionChangesMastery, false);
  assert.equal(contract.hardInvariants.engagementMaySetLearningPriority, false);
  assert.match(strategy, /CoreOutcome 0\.\.3/);
  assert.match(strategy, /ExecutionBlock 0\.\.N/);
});

test("defines complete Practice, Theory, and Law Golden verticals", () => {
  for (const subject of ["practice", "theory", "law"]) {
    assert.ok(contract.goldenVerticals[subject]);
    assert.ok(contract.goldenVerticals[subject].requiredStory.length >= 6);
  }
  assert.equal(
    contract.goldenVerticals.practice.hardGates.deterministicGoldAccuracy,
    1,
  );
  assert.equal(
    contract.goldenVerticals.law.hardGates.unknownConflictFailClosed,
    1,
  );
});

test("separates safe synthetic building from live activation", () => {
  assert.ok(contract.lanes.syntheticBuild.allowed.includes("STATE_MACHINE"));
  assert.ok(
    contract.lanes.syntheticBuild.forbidden.includes("REAL_LEARNER_BODY"),
  );
  assert.ok(
    contract.lanes.liveActivation.requiredPreconditions.includes(
      "CURRENT_O3A_EXACT_APPROVAL",
    ),
  );
  assert.ok(
    contract.lanes.liveActivation.requiredPreconditions.includes(
      "S236P_TERMINAL_DISPOSITION_OR_EXPLICIT_REPLACEMENT",
    ),
  );
});

test("adopts world-class mechanisms but rejects external authority leakage", () => {
  assert.ok(contract.benchmarkAdoption.UWORLD);
  assert.ok(contract.benchmarkAdoption.AMBOSS);
  assert.ok(contract.benchmarkAdoption.DUOLINGO_BIRDBRAIN);
  assert.ok(contract.benchmarkAdoption.KHANMIGO);
  assert.ok(contract.benchmarkAdoption.OATUTOR);
  assert.ok(contract.benchmarkAdoption.FSRS);
  assert.ok(contract.benchmarkAdoption.H5P_BRANCHING);
  assert.ok(
    contract.benchmarkAdoption.FSRS.reject.includes(
      "MASTERY_OR_PRIORITY_AUTHORITY",
    ),
  );
  assert.ok(
    contract.benchmarkAdoption.OATUTOR.reject.includes(
      "BKT_AS_CANONICAL_TRUTH",
    ),
  );
});

test("requires a complete open-source qualification ledger", () => {
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

test("keeps the benchmark matrix grounded and candid about evidence limits", () => {
  for (const marker of [
    "UWorld",
    "AMBOSS",
    "Duolingo Birdbrain",
    "Khanmigo",
    "OATutor",
    "FSRS",
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

test("rejects PR 697 active-master promotion while preserving product ideas", () => {
  assert.equal(contract.pr697Disposition.productIdeasAbsorbed, true);
  assert.equal(contract.pr697Disposition.activeMasterPromotionRejected, true);
  assert.equal(
    contract.pr697Disposition.recommendedAfterThisStandardAccepted,
    "SUPERSEDE_AND_CLOSE",
  );
});
