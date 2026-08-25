import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildCapacityEnvelope,
  buildPersonalDrillBudget,
  buildStudyWeekPlan,
} from "../lib/review-os/study-capacity-life-mode-orchestrator.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const paths = {
  decision: join(root, "docs/decisions/2026-08-24-owner-study-capacity-life-mode-orchestrator.md"),
  product: join(root, "docs/product/dabangil-study-capacity-life-mode-orchestrator-v1.md"),
  config: join(root, "config/dabangil-study-capacity-life-mode-orchestrator-v1.json"),
  qa: join(root, "docs/qa/dabangil-study-capacity-life-mode-orchestrator-validation.md"),
  engine: join(root, "lib/review-os/study-capacity-life-mode-orchestrator.ts"),
  engineTest: join(root, "tests/study-capacity-life-mode-orchestrator.test.mjs"),
  contractTest: join(root, "tests/dabangil-study-capacity-life-mode-contract.test.mjs"),
};

const expectedChangedPaths = [
  "docs/decisions/2026-08-24-owner-study-capacity-life-mode-orchestrator.md",
  "docs/product/dabangil-study-capacity-life-mode-orchestrator-v1.md",
  "config/dabangil-study-capacity-life-mode-orchestrator-v1.json",
  "docs/qa/dabangil-study-capacity-life-mode-orchestrator-validation.md",
  "lib/review-os/study-capacity-life-mode-orchestrator.ts",
  "tests/study-capacity-life-mode-orchestrator.test.mjs",
  "tests/dabangil-study-capacity-life-mode-contract.test.mjs",
];

function read(path) {
  return readFileSync(path, "utf8");
}

const decision = read(paths.decision);
const product = read(paths.product);
const config = JSON.parse(read(paths.config));
const qa = read(paths.qa);
const engine = read(paths.engine);
const engineTest = read(paths.engineTest);

const forbiddenRuntimePaths = [
  /^app\//,
  /^components\//,
  /^supabase\//,
  /^\.github\/workflows\//,
  /^lib\/review-os\/c3r-p-/,
  /^tests\/e2e\/wcv-c3r-p-/,
  /^scripts\/automation\/wcv-c3r-p-/,
];

test("machine contract is default-off and carries no runtime, production or PR #800 mutation authority", () => {
  assert.equal(config.contractVersion, "dabangil.study_capacity_life_mode_orchestrator.v1");
  assert.equal(config.status, "source_implemented_default_off");
  for (const field of [
    "runtimeAuthorized",
    "uiIntegrationAuthorized",
    "persistenceAuthorized",
    "schemaMigrationAuthorized",
    "productionAuthorized",
    "remoteMutationAuthorized",
    "billingAuthorized",
    "publicFirstRoundAuthorized",
    "pr800MutationAuthorized",
  ]) {
    assert.equal(config[field], false, `${field} must remain false`);
  }
  assert.equal(config.integrationGate.sourceMergeDependencySatisfiedByPr800, true);
  assert.equal(config.integrationGate.pr800ResultingMainSha, "71fd878a7369c25a153bc90389347039684c501f");
  assert.equal(config.integrationGate.pr800ResultingMainTree, "f6fb7bc1d1613a8431a4bbdfe155eea9d9f5303c");
});

test("changed-path manifest is exact, unique and has zero PR #800 runtime overlap", () => {
  assert.deepEqual(config.changedPathsExactly, expectedChangedPaths);
  assert.equal(new Set(config.changedPathsExactly).size, expectedChangedPaths.length);
  for (const path of config.changedPathsExactly) {
    assert.ok(!forbiddenRuntimePaths.some((pattern) => pattern.test(path)), `forbidden overlapping path: ${path}`);
  }
  assert.equal(config.integrationGate.pr800MustRemainUntouchedByThisWork, true);
  assert.equal(config.integrationGate.doesNotChangeRoadmapSelector, true);
  assert.equal(config.integrationGate.doesNotCloseC3RStages, true);
});

test("contract separates life mode, daily capacity, exam mode and study phase", () => {
  assert.deepEqual(config.supported.examModes, ["first", "second", "both"]);
  assert.ok(config.supported.lifeModes.includes("full_time_study"));
  assert.ok(config.supported.lifeModes.includes("full_time_employed"));
  assert.ok(config.supported.lifeModes.includes("shift_or_irregular_work"));
  assert.ok(config.supported.studyPhases.includes("recovery"));
  assert.equal(config.policy.capacityBandCanChangeDaily, true);
  assert.equal(config.policy.lifeModeIsNotEffortOrAbilityRating, true);
  assert.match(product, /생활형태가 곧 능력은 아니다/);
  assert.match(product, /전업도 회복일에는 compressed mode/);
  assert.match(product, /직장병행도 주말에는 intensive mode/);
});

test("max-three outcomes and many execution blocks are preserved exactly", () => {
  assert.equal(config.policy.maximumCoreOutcomes, 3);
  assert.match(product, /CoreOutcome[^\n]*0~3개/);
  assert.match(product, /ExecutionBlock[^\n]*0\.\.N/);
  assert.match(engine, /const MAX_CORE_OUTCOMES = 3/);
  assert.match(engineTest, /executionBlocks\.length > 3/);
});

test("active study excludes app interaction and provider wait", () => {
  assert.ok(config.policy.studyTimeExclusions.includes("app_interaction"));
  assert.ok(config.policy.studyTimeExclusions.includes("provider_wait"));
  assert.equal(config.policy.actualActiveMinutesAlreadyNetOfExclusions, true);
  assert.equal(config.policy.exclusionMetadataIsNotDoubleSubtracted, true);
  assert.match(engine, /actualActiveMinutes/);
  assert.match(engine, /appInteractionMinutes/);
  assert.match(engine, /providerWaitMinutes/);
  assert.match(qa, /neither added nor double-subtracted/);
});

test("learning integrity blocks schedule completion from becoming mastery or readiness", () => {
  assert.equal(config.policy.completionDoesNotChangeMastery, true);
  assert.equal(config.policy.assistedSuccessDoesNotCountAsIndependent, true);
  assert.equal(config.policy.sameSurfaceRetryDoesNotCountAsTransfer, true);
  assert.equal(config.policy.personalGenerationReadinessEligible, false);
  assert.equal(config.policy.personalGenerationCrossUserReuseEligible, false);
  assert.match(engine, /masteryMutationAllowed\s*:\s*false/);
  assert.match(engine, /readinessEligible\s*:\s*false/);
  assert.match(engine, /crossUserReuseEligible\s*:\s*false/);
});

test("plan gap is a scheduling feasibility projection, never pass probability", () => {
  assert.equal(config.planGap.claimBoundary, "schedule_feasibility_only_not_pass_probability");
  assert.equal(config.policy.planGapIsNotPassProbability, true);
  assert.equal(config.policy.maximumRequiredPlanMinutes, 5040);
  assert.equal(config.policy.weekPlanDatesMustFitOneSevenDayInterval, true);
  assert.match(engine, /schedule_feasibility_only_not_pass_probability/);
  assert.match(product, /계획 완주 가능성은 합격확률과 분리/);
  assert.doesNotMatch(product, /현재 합격확률\s*\d/);
});

test("source documents preserve exact non-goals and separate integration gate", () => {
  assert.match(decision, /PR #800 source, branch, metadata, reviews and runtime evidence are immutable to this Work/);
  assert.match(decision, /original Draft-only boundary applied while PR #800 occupied the sole merge-producing writer slot/);
  assert.match(decision, /may therefore be marked Ready and squash-merged only after refreshed-main exact-head tests/);
  assert.match(product, /learner-facing runtime 완성을 주장하지 않는다/);
  assert.match(qa, /Authenticated integration remains a separate Work/);
});

test("machine policy claims are executable for windows, bank-first and distinct-date evidence", () => {
  assert.equal(config.policy.usableNonprotectedWindowsBoundSchedulableCapacity, true);
  assert.equal(config.policy.verifiedBankMatchNewGenerationBudgetMinutes, 0);
  assert.equal(config.policy.capacityHistoryRequiresDistinctPriorDates, true);
  const profile = {
    lifeMode: "full_time_study",
    examMode: "first",
    phase: "timed_integration",
    scheduleVolatility: "low",
    policyVersion: config.contractVersion,
  };
  const week = buildStudyWeekPlan({
    profile,
    days: [{
      date: "2026-08-24",
      dayKind: "weekday",
      declaredActiveMinutes: 720,
      windows: [{ id: "narrow", startMinute: 600, endMinute: 630, environment: "desk", interruptibility: "low" }],
    }],
    candidates: [],
    requiredMinimumMinutes: 60,
    requiredMaximumMinutes: 120,
  });
  assert.equal(week.weeklyAvailableMinutes, 30);
  assert.equal(week.feasibility.status, "infeasible");
  const bank = buildPersonalDrillBudget({ next48hAvailableDrillMinutes: 120, pendingDrillMinutes: 40, estimatedMinutesPerNewItem: 10, verifiedBankHasMatchingItems: true });
  assert.equal(bank.newGenerationBudgetMinutes, 0);
  assert.equal(bank.maximumNewItems, 0);
  const duplicates = Array.from({ length: 14 }, () => ({ date: "2026-08-10", plannedActiveMinutes: 120, actualActiveMinutes: 120 }));
  assert.throws(() => buildCapacityEnvelope({ profile, declaredActiveMinutes: 180, asOfDate: "2026-08-25", history: duplicates }), /duplicate-capacity-history-date/);
});

test("forbidden claims include ten-hour dogma, guarantees, shame and unlimited AI entitlement", () => {
  const forbidden = new Set(config.forbiddenClaims);
  for (const claim of [
    "ten_hours_is_an_official_pass_condition",
    "longer_logged_time_is_mastery",
    "life_mode_is_effort_or_ability",
    "plan_gap_is_pass_probability",
    "block_completion_is_mastery",
    "generated_problem_is_verified_transfer",
    "shame_or_fear_copy",
    "unlimited_ai_generation_from_study_hours",
  ]) {
    assert.ok(forbidden.has(claim), `missing forbidden claim: ${claim}`);
  }
});

test("focused fixture matrix covers full-time, employed, shift, both, replan and drill budget", () => {
  const fixtures = new Set(config.acceptanceFixtures);
  for (const fixture of [
    "full_time_first_600",
    "full_time_first_720",
    "employed_weekday_180",
    "employed_weekend_420",
    "shift_commute_90",
    "both_mode",
    "history_calibration_14d",
    "overtime_replan_180_to_60",
    "ai_drill_capacity_48h",
    "invalid_overlapping_windows",
    "deterministic_replay",
    "required_plan_gap_bound",
    "week_date_interval_bound",
  ]) {
    assert.ok(fixtures.has(fixture), `missing fixture: ${fixture}`);
  }
});
