import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  FIRST_STAGE_CAPACITY_BRIDGE_FEATURE_FLAG,
  FirstStageCapacityBridgeError,
  buildFirstStageCapacityPreview,
  buildFirstStageStudyCapacityPlan,
  firstStageCapacityBridgeAvailability,
} from "../lib/review-os/first-stage/study-capacity/index.ts";
import {
  FirstStageKernelError,
  beginAttempt,
  createExamCycleState,
} from "../lib/review-os/first-stage/kernel/index.ts";
import {
  SUBJECT_ADAPTER_SCHEMA_VERSION,
  SUBJECT_ADAPTER_V1_INTERFACE_DIGEST,
  createSubjectAdapterRegistry,
} from "../lib/review-os/first-stage/subject-adapter/index.ts";

const root = path.resolve(import.meta.dirname, "..");
const integrationBase = "3e78b8d783506bed676f817a4efe23d576ad5568";
const policyVersion = "dabangil.study_capacity_life_mode_orchestrator.v1";

function read(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

function reference(index, subjectId = "accounting") {
  return {
    schemaVersion: "first_stage.question_reference.v1",
    questionId: `${subjectId}-owner-q-${String(index).padStart(3, "0")}`,
    questionVersion: "v1",
    subjectId,
    examYear: 2026,
    examRound: 37,
    sessionId: "first-stage-owner-2026-session-1",
    questionNumber: index,
    choiceCount: 5,
    sourceVersionManifestIds: ["owner-private-source-v1"],
    rightsState: "verified_owner_private",
    currentnessState: "verified_exam_date",
  };
}

function testAdapter() {
  return {
    schemaVersion: SUBJECT_ADAPTER_SCHEMA_VERSION,
    adapterId: "m5-test-accounting-adapter",
    adapterVersion: "v1",
    subjectId: "accounting",
    assertQuestionReference(value) {
      if (value.subjectId !== "accounting" || !value.questionId.startsWith("accounting-owner-q-")) {
        throw new FirstStageKernelError("adapter_mismatch");
      }
    },
    presentQuestion() {
      throw new Error("not-used-by-capacity-bridge-test");
    },
    evaluateSubmission() {
      throw new Error("not-used-by-capacity-bridge-test");
    },
    buildIndependentRetry() {
      throw new Error("not-used-by-capacity-bridge-test");
    },
  };
}

function candidateSource({ required = false, minutes = 30, mutate } = {}) {
  return {
    schemaVersion: "first_stage.study_capacity_candidate_source.v1",
    sourceId: "m5-test-server-candidate-source",
    sourceVersion: "v1",
    sourceSha256: "7".repeat(64),
    subjectAdapterInterfaceDigest: SUBJECT_ADAPTER_V1_INTERFACE_DIGEST,
    buildCandidates({ queueItems }) {
      const batch = {
        schemaVersion: "first_stage.study_capacity_candidate_batch.v1",
        assignments: queueItems.map((item, index) => ({
          queueItemId: item.queueItemId,
          candidate: {
            id: `first-stage:${item.queueItemId}`,
            title: `Synthetic metadata task ${index + 1}`,
            subject: item.subjectId,
            examTrack: "first",
            taskKind: item.kind === "independent_retry" ? "due_review" : "independent_problem_solving",
            cognitiveLoad: index % 3 === 0 ? "high" : index % 3 === 1 ? "medium" : "low",
            requiredness: required ? "required" : "core_candidate",
            estimatedMinutes: minutes,
            minimumContinuousMinutes: minutes,
            allowedEnvironments: ["desk", "library"],
            requiresDesk: true,
            prioritySignals: item.kind === "independent_retry" ? ["due_review"] : ["new_study"],
            basePriority: 0,
            outcomeKey: `synthetic-outcome-${index % 4}`,
            sourceRef: `first-stage-question:${item.questionReference.questionId}@${item.questionReference.questionVersion}`,
            metadataOnly: true,
          },
        })),
        omittedQueueItemIds: [],
      };
      mutate?.(batch, queueItems);
      return batch;
    },
  };
}

function profile(overrides = {}) {
  return {
    lifeMode: "full_time_study",
    examMode: "first",
    phase: "timed_integration",
    scheduleVolatility: "low",
    policyVersion,
    ...overrides,
  };
}

function availability(overrides = {}) {
  return {
    date: "2026-08-26",
    dayKind: "weekday",
    declaredActiveMinutes: 600,
    windows: [
      { id: "morning", startMinute: 420, endMinute: 660, environment: "desk", interruptibility: "low" },
      { id: "afternoon", startMinute: 720, endMinute: 960, environment: "library", interruptibility: "low" },
      { id: "evening", startMinute: 1020, endMinute: 1200, environment: "desk", interruptibility: "medium" },
    ],
    externalCommitmentMinutes: 0,
    ...overrides,
  };
}

function kernelState(count = 6, mode = "full_day") {
  return createExamCycleState({
    examCycleId: `m5-owner-${mode}-${count}`,
    ownerId: "owner-private-1",
    mode,
    questionReferences: Array.from({ length: count }, (_, index) => reference(index + 1)),
  });
}

function build(input = {}) {
  const state = input.state ?? kernelState();
  const source = input.candidateSource ?? candidateSource();
  return buildFirstStageStudyCapacityPlan({
    planKind: state.examCycle.mode,
    state,
    trustedOwnerId: state.examCycle.ownerId,
    trustedExamCycleDefinitionSha256: state.examCycle.definitionSha256,
    trustedGeneratedAt: "2026-08-26T00:00:00.000Z",
    profile: profile(),
    availability: availability(),
    registry: createSubjectAdapterRegistry([testAdapter()]),
    candidateSource: source,
    trustedCandidateSourceBinding: {
      schemaVersion: "first_stage.study_capacity_candidate_source_binding.v1",
      sourceId: "m5-test-server-candidate-source",
      sourceVersion: "v1",
      sourceSha256: "7".repeat(64),
      subjectAdapterInterfaceDigest: SUBJECT_ADAPTER_V1_INTERFACE_DIGEST,
    },
    ...input,
  });
}

function expectBridgeCode(fn, code) {
  assert.throws(fn, (error) =>
    error instanceof FirstStageCapacityBridgeError && error.code === code);
}

test("binds M5 to the validated M4 receipt and preserves every frozen upstream", () => {
  const contract = JSON.parse(read("config/dabangil-first-stage-study-capacity-runtime-bridge-v1.json"));
  assert.equal(contract.milestone, "M5_STUDY_CAPACITY_RUNTIME_BRIDGE");
  assert.equal(contract.validatedKernelDependency.pullRequest, 842);
  assert.equal(contract.validatedKernelDependency.resultingMainSha, integrationBase);
  assert.equal(contract.validatedKernelDependency.resultingMainTree, "268de11f1ca7f0a7c0453020bcbf2681217821c1");
  assert.equal(contract.validatedKernelDependency.subjectAdapterInterfaceDigest, SUBJECT_ADAPTER_V1_INTERFACE_DIGEST);
  assert.equal(contract.runtimeBoundary.persistenceMutation, false);
  assert.equal(contract.runtimeBoundary.remoteSupabaseMutation, false);
  assert.equal(contract.runtimeBoundary.productionMutation, false);
  assert.equal(contract.bridge.noPlaceholderQuestions, true);
  assert.equal(contract.bridge.serverCandidateSourceInstalled, false);
  assert.equal(contract.bridge.candidateSchedulingDurationLoadAndConstraintsComeOnlyFromServerSource, true);
  assert.equal(contract.bridge.requirednessDerivedByBridgeFromTrustedKernelQueueClass, true);
  assert.deepEqual(contract.untrustedInputBoundary.acceptsOnly, [
    "action",
    "planKind",
    "lifeMode",
    "phase",
    "scheduleVolatility",
    "dayKind",
    "declaredActiveMinutes",
    "windows",
    "externalCommitmentMinutes",
  ]);
  assert.equal(contract.untrustedInputBoundary.clientKernelStateAccepted, false);
  assert.equal(contract.untrustedInputBoundary.clientCandidatesAccepted, false);
  assert.equal(contract.untrustedInputBoundary.clientCapacityHistoryAccepted, false);
  assert.equal(contract.bridge.deterministicPlanDigestAuthority, "replay_hint_only_not_identity_or_authorization");
  assert.equal(FIRST_STAGE_CAPACITY_BRIDGE_FEATURE_FLAG, "INVERGE_OWNER_FIRST_STAGE_CAPACITY_ENABLED");

  execFileSync("git", [
    "diff", "--quiet", integrationBase, "--",
    "lib/review-os/first-stage/kernel",
    "lib/review-os/first-stage/subject-adapter",
    "lib/review-os/study-capacity-life-mode-orchestrator.ts",
    "config/dabangil-study-capacity-life-mode-orchestrator-v1.json",
    "docs/decisions/2026-08-24-owner-study-capacity-life-mode-orchestrator.md",
  ], { cwd: root });
});

test("projects a trusted Kernel queue without mutating learning state", () => {
  const state = kernelState(9);
  const before = JSON.stringify(state);
  const first = build({ state });
  const second = build({ state });
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(state), before);
  assert.equal(first.queue.sourceItemCount, 9);
  assert.equal(first.queue.candidateCount, 9);
  assert.equal(first.queue.candidateSourceId, "m5-test-server-candidate-source");
  assert.equal(first.queue.candidateSourceSha256, "7".repeat(64));
  assert.equal(first.queue.examCycleDefinitionSha256, state.examCycle.definitionSha256);
  assert.equal(first.queue.sourceOmittedItemCount, 0);
  assert.equal(first.queue.bridgeOverflowItemCount, 0);
  assert.equal(first.queue.sourceMappedMinutes, 270);
  assert.equal(first.queue.selectedMappedMinutes, 270);
  assert.equal(first.queue.overflowMappedMinutes, 0);
  assert.ok(first.plan.coreOutcomes.length <= 3);
  assert.ok(first.plan.executionBlocks.length > 0);
  assert.equal(first.plan.masteryMutationAllowed, false);
  assert.equal(first.persistenceMutation, false);
  assert.equal(first.aiGenerationEntitlementChanged, false);
  assert.equal(first.scheduleFeasibilityScope, "selected_bounded_scope_plus_explicit_overflow");
  assert.equal(first.deterministicPlanDigestAuthority, "replay_hint_only_not_identity_or_authorization");
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.plan), true);
  expectBridgeCode(() => build({
    availability: availability({ date: "2026-08-25" }),
  }), "invalid_input");
});

test("bounds a 200-item Full-Day queue by required minutes and reports overflow", () => {
  const state = kernelState(200);
  const result = build({ state, candidateSource: candidateSource({ required: true, minutes: 30 }) });
  assert.equal(result.queue.sourceItemCount, 200);
  assert.equal(result.queue.candidateCount, 168);
  assert.equal(result.queue.bridgeOverflowItemCount, 32);
  assert.equal(result.queue.sourceOmittedItemCount, 0);
  assert.equal(result.queue.sourceMappedMinutes, 6_000);
  assert.equal(result.queue.selectedMappedMinutes, 5_040);
  assert.equal(result.queue.overflowMappedMinutes, 960);
  assert.equal(result.queue.sourceRequiredMinutes, 0);
  assert.equal(result.queue.overflowRequiredMinutes, 0);
  assert.ok(result.plan.coreOutcomes.length <= 3);
  assert.ok(result.plan.plannedActiveMinutes <= result.plan.capacity.schedulableActiveMinutes);

  const orderedPrefix = build({
    state: kernelState(9),
    candidateSource: candidateSource({ mutate(batch) {
      const minutes = [719, 719, 719, 719, 719, 719, 719, 10, 7];
      batch.assignments.forEach((assignment, index) => {
        assignment.candidate.estimatedMinutes = minutes[index];
      });
    } }),
  });
  assert.equal(orderedPrefix.queue.candidateCount, 7);
  assert.equal(orderedPrefix.queue.bridgeOverflowItemCount, 2);
  assert.equal(orderedPrefix.queue.selectedMappedMinutes, 5_033);
  assert.equal(orderedPrefix.queue.overflowMappedMinutes, 17);
});

test("fails closed on incomplete, foreign, or stale candidate-source bindings", () => {
  expectBridgeCode(() => build({
    candidateSource: candidateSource({ mutate(batch) { batch.assignments.pop(); } }),
  }), "candidate_source_invalid");
  expectBridgeCode(() => build({
    candidateSource: candidateSource({ mutate(batch) {
      batch.assignments[0].candidate.sourceRef = "first-stage-question:foreign@v1";
    } }),
  }), "candidate_source_invalid");
  const stale = candidateSource();
  stale.subjectAdapterInterfaceDigest = "0".repeat(64);
  expectBridgeCode(() => build({ candidateSource: stale }), "candidate_source_invalid");
  expectBridgeCode(() => build({
    candidateSource: candidateSource({ mutate(batch) {
      batch.assignments[0].candidate.cognitiveLoad = "hostile";
    } }),
  }), "candidate_source_invalid");
  expectBridgeCode(() => build({
    trustedCandidateSourceBinding: {
      schemaVersion: "first_stage.study_capacity_candidate_source_binding.v1",
      sourceId: "m5-test-server-candidate-source",
      sourceVersion: "v1",
      sourceSha256: "8".repeat(64),
      subjectAdapterInterfaceDigest: SUBJECT_ADAPTER_V1_INTERFACE_DIGEST,
    },
  }), "candidate_source_invalid");

  const registry = createSubjectAdapterRegistry([testAdapter()]);
  const ready = kernelState(2, "today");
  const active = beginAttempt(ready, {
    trustedOwnerId: ready.examCycle.ownerId,
    trustedExamCycleDefinitionSha256: ready.examCycle.definitionSha256,
    expectedRevision: ready.revision,
    attemptId: "m5-active-attempt-1",
    questionId: ready.examCycle.questionReferences[0].questionId,
    trustedStartedAt: "2026-08-26T00:00:00.000Z",
  }, registry);
  expectBridgeCode(() => build({
    state: active,
    registry,
    profile: profile(),
    availability: availability({ declaredActiveMinutes: 180, windows: [
      { id: "today", startMinute: 540, endMinute: 720, environment: "desk", interruptibility: "low" },
    ] }),
    candidateSource: candidateSource({ mutate(batch) {
      const [assignment] = batch.assignments.splice(0, 1);
      batch.omittedQueueItemIds.push(assignment.queueItemId);
    } }),
  }), "candidate_source_invalid");
});

test("preserves Kernel queue class and order over hostile source priority", () => {
  const source = candidateSource({ mutate(batch) {
    batch.assignments.forEach((assignment, index) => {
      assignment.candidate.requiredness = index === 0 ? "optional" : "required";
      assignment.candidate.prioritySignals = index === 0 ? ["stable_support"] : ["due_review"];
      assignment.candidate.basePriority = index === 0 ? -10_000 : 10_000;
    });
  } });
  const state = kernelState(6);
  const baseline = build({ state });
  const result = build({ state, candidateSource: source });
  assert.deepEqual(result.plan, baseline.plan);
});

test("derives KST date and policy server-side for the adapter-blocked preview", () => {
  const input = {
    planKind: "today",
    lifeMode: "full_time_employed",
    phase: "timed_integration",
    scheduleVolatility: "medium",
    dayKind: "weekday",
    declaredActiveMinutes: 180,
    windows: [{ id: "after-work", startMinute: 1200, endMinute: 1380, environment: "desk", interruptibility: "medium" }],
    externalCommitmentMinutes: 480,
  };
  const result = buildFirstStageCapacityPreview(input, "2026-08-25T15:30:00.000Z");
  assert.equal(result.plan.date, "2026-08-26");
  assert.equal(result.plan.profile.policyVersion, policyVersion);
  assert.equal(result.plan.profile.examMode, "first");
  assert.equal(result.queueAvailability.blocker, "subject_adapter_required");
  assert.equal(result.queueAvailability.itemCount, 0);
  assert.equal(result.plan.executionBlocks.length, 0);
  assert.equal(result.plan.coreOutcomes.length, 0);
  assert.equal(result.persistenceMutation, false);
  assert.equal(result.capacityHistoryEvidenceUsed, false);

  expectBridgeCode(() => buildFirstStageCapacityPreview({ ...input, date: "2026-08-25" }, "2026-08-25T15:30:00.000Z"), "invalid_input");
  expectBridgeCode(() => buildFirstStageCapacityPreview({ ...input, policyVersion }, "2026-08-25T15:30:00.000Z"), "invalid_input");
  expectBridgeCode(() => buildFirstStageCapacityPreview({ ...input, kernelState: {} }, "2026-08-25T15:30:00.000Z"), "invalid_input");
  expectBridgeCode(() => buildFirstStageCapacityPreview({ ...input, declaredActiveMinutes: 29 }, "2026-08-25T15:30:00.000Z"), "invalid_input");
  expectBridgeCode(() => buildFirstStageCapacityPreview({ ...input, declaredActiveMinutes: 721 }, "2026-08-25T15:30:00.000Z"), "invalid_input");
  expectBridgeCode(() => buildFirstStageCapacityPreview({ ...input, windows: [
    { id: "a", startMinute: 600, endMinute: 720, environment: "desk", interruptibility: "low" },
    { id: "b", startMinute: 700, endMinute: 800, environment: "desk", interruptibility: "low" },
  ] }, "2026-08-25T15:30:00.000Z"), "invalid_input");

  const beforeMidnight = buildFirstStageCapacityPreview(input, "2026-08-25T14:59:59.000Z");
  const afterMidnight = buildFirstStageCapacityPreview(input, "2026-08-25T15:00:00.000Z");
  assert.equal(beforeMidnight.plan.date, "2026-08-25");
  assert.equal(afterMidnight.plan.date, "2026-08-26");
});

test("availability and HTTP surfaces remain Owner-only, nonpersistent, and authority-free", () => {
  const view = firstStageCapacityBridgeAvailability();
  assert.equal(view.state, "capacity_preview_ready");
  assert.equal(view.queueState, "blocked_subject_adapter_required");
  assert.equal(view.serverKernelStateProviderInstalled, false);
  assert.equal(view.serverCandidateSourceInstalled, false);
  assert.equal(view.acceptsClientKernelState, false);
  assert.equal(view.acceptsClientCandidates, false);
  assert.equal(view.acceptsClientCapacityHistory, false);
  assert.equal(view.persistenceMutation, false);

  const route = read("app/api/review-os/first-stage/study-capacity/route.ts");
  const page = read("app/(owner-first-stage)/app/first-stage/capacity/page.tsx");
  const component = read("components/review-os/first-stage-study-capacity-planner.tsx");
  assert.match(route, /private, no-store, max-age=0/);
  assert.match(route, /Pragma: "no-cache"/);
  assert.match(route, /Vary: "Cookie"/);
  assert.ok(route.indexOf("await requireOwnerAccess()") < route.indexOf("await request.text()"));
  assert.match(route, /new Date\(\)\.toISOString\(\)/);
  assert.doesNotMatch(route, /getReviewOsServerContext|ensureAccess|repository|supabase|buildPersonalDrillBudget|beginAttempt|submitAnswer|beginIndependentRetry/iu);
  assert.doesNotMatch(page, /getReviewOsServerContext|ensureAccess|includeProfile|includeUsage/);
  assert.ok(page.indexOf("process.env[FIRST_STAGE_CAPACITY_BRIDGE_FEATURE_FLAG]") < page.indexOf("await getServerSessionUser()"));
  assert.ok(page.indexOf("process.env.ALPHA_ADMIN_EMAILS") < page.indexOf("process.env[FIRST_STAGE_OWNER_ALLOWLIST]"));
  assert.ok(page.indexOf("notFound()") < page.indexOf("<ReviewOsAppShell email={email}>"));
  assert.doesNotMatch(component, /localStorage|sessionStorage|\/api\/os\/today-focus|\/api\/review-os\/c3r-/u);
  assert.doesNotMatch(component, /<main\b/u);
  assert.match(component, /not saved/);
  assert.match(component, /SubjectAdapter 설치 대기/);
  for (const lifeMode of [
    "full_time_study",
    "full_time_employed",
    "part_time_employed",
    "shift_or_irregular_work",
    "leave_or_transition",
    "caregiving_constrained",
    "health_constrained",
    "custom",
  ]) {
    assert.match(component, new RegExp(`<option value="${lifeMode}">`, "u"));
  }
});

test("registers the exact M5 path manifest and no forbidden concurrent class", () => {
  const contract = JSON.parse(read("config/dabangil-first-stage-study-capacity-runtime-bridge-v1.json"));
  const expected = [
    "app/(owner-first-stage)/app/first-stage/capacity/page.tsx",
    "app/api/review-os/first-stage/study-capacity/route.ts",
    "components/review-os/first-stage-study-capacity-planner.tsx",
    "config/dabangil-first-stage-study-capacity-runtime-bridge-v1.json",
    "docs/exec-plans/active/inverge-owner-study-os.md",
    "lib/review-os/first-stage/study-capacity/index.ts",
    "lib/review-os/first-stage/study-capacity/runtime-bridge.ts",
    "scripts/run-node-tests.mjs",
    "tests/first-stage-common-mcq-kernel.test.mjs",
    "tests/first-stage-study-capacity-runtime-bridge.test.mjs",
    "tests/s232f2-access-availability.test.mjs",
  ];
  assert.deepEqual(contract.pathOwnership.changedPathsExactly, expected);
  assert.equal(new Set(expected).size, expected.length);
  assert.ok(expected.every((filePath) => !filePath.startsWith("supabase/migrations/")));
  assert.ok(expected.every((filePath) => !filePath.startsWith("lib/auth/")));
  assert.ok(expected.every((filePath) => !filePath.startsWith("lib/review-os/first-stage/kernel/")));
  assert.ok(expected.every((filePath) => !filePath.startsWith("lib/review-os/first-stage/subject-adapter/")));
  assert.equal(contract.pathOwnership.validatedM4EvidenceTestRepair, true);
  assert.match(read("scripts/run-node-tests.mjs"), /tests\/first-stage-study-capacity-runtime-bridge\.test\.mjs/);
});
