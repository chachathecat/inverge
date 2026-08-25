import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCapacityEnvelope,
  buildPersonalDrillBudget,
  buildStudyDayPlan,
  buildStudyWeekPlan,
  classifyCapacityBand,
  projectWeeklyFeasibility,
  replanStudyDay,
} from "../lib/review-os/study-capacity-life-mode-orchestrator.ts";

/** @typedef {import("../lib/review-os/study-capacity-life-mode-orchestrator.ts").LearnerConstraintProfileV1} LearnerConstraintProfileV1 */
/** @typedef {import("../lib/review-os/study-capacity-life-mode-orchestrator.ts").DayAvailabilityV1} DayAvailabilityV1 */
/** @typedef {import("../lib/review-os/study-capacity-life-mode-orchestrator.ts").StudyTaskCandidateV1} StudyTaskCandidateV1 */
/** @typedef {import("../lib/review-os/study-capacity-life-mode-orchestrator.ts").CapacityHistoryDayV1} CapacityHistoryDayV1 */
/** @typedef {import("../lib/review-os/study-capacity-life-mode-orchestrator.ts").ExamModeV1} ExamModeV1 */

const policyVersion = "dabangil.study_capacity_life_mode_orchestrator.v1";

/**
 * @param {Partial<LearnerConstraintProfileV1>} [overrides]
 * @returns {LearnerConstraintProfileV1}
 */
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

/**
 * @param {Partial<DayAvailabilityV1>} [overrides]
 * @returns {DayAvailabilityV1}
 */
function availability(overrides = {}) {
  return {
    date: "2026-08-24",
    dayKind: "weekday",
    declaredActiveMinutes: 600,
    windows: [
      { id: "morning", startMinute: 480, endMinute: 720, environment: "desk", interruptibility: "low" },
      { id: "afternoon", startMinute: 780, endMinute: 1020, environment: "library", interruptibility: "low" },
      { id: "evening", startMinute: 1080, endMinute: 1260, environment: "desk", interruptibility: "medium" },
    ],
    ...overrides,
  };
}

/**
 * @param {string} id
 * @param {Partial<StudyTaskCandidateV1>} [overrides]
 * @returns {StudyTaskCandidateV1}
 */
function task(id, overrides = {}) {
  return {
    id,
    title: `과제 ${id}`,
    subject: "회계학",
    taskKind: "independent_problem_solving",
    cognitiveLoad: "high",
    requiredness: "core_candidate",
    estimatedMinutes: 60,
    prioritySignals: ["new_study"],
    basePriority: 100,
    metadataOnly: true,
    ...overrides,
  };
}

/** @returns {StudyTaskCandidateV1[]} */
function fullDayCandidates() {
  return [
    task("timed-first", {
      title: "1교시형 미사용 timed set",
      taskKind: "timed_set",
      estimatedMinutes: 120,
      minimumContinuousMinutes: 120,
      prioritySignals: ["timed_evidence_missing", "exam_urgency"],
      requiredness: "required",
      outcomeKey: "timed-evidence",
    }),
    task("accounting-repair", {
      title: "회계 고확신 오답 복구",
      estimatedMinutes: 90,
      prioritySignals: ["high_confidence_wrong", "pass_risk"],
      requiredness: "required",
      outcomeKey: "accounting-repair",
    }),
    task("d7-review", {
      title: "민법 D+7 미사용 전이",
      taskKind: "due_review",
      cognitiveLoad: "medium",
      estimatedMinutes: 45,
      prioritySignals: ["due_review", "unseen_transfer_due"],
      requiredness: "required",
      outcomeKey: "d7-transfer",
    }),
    task("law-repair", {
      title: "관계법규 함정어 교정",
      taskKind: "rewrite_recalculate",
      cognitiveLoad: "medium",
      estimatedMinutes: 60,
      prioritySignals: ["repeated_error", "pass_risk"],
      requiredness: "core_candidate",
      outcomeKey: "law-repair",
    }),
    task("economics-graph", {
      title: "경제 문장-그래프 전환",
      taskKind: "microdrill",
      cognitiveLoad: "medium",
      estimatedMinutes: 50,
      prioritySignals: ["coverage_gap"],
      requiredness: "support",
    }),
    task("lecture", {
      title: "회계 기본강의 진도",
      taskKind: "lecture",
      cognitiveLoad: "low",
      estimatedMinutes: 80,
      prioritySignals: ["new_study"],
      requiredness: "support",
    }),
    task("guided-note", {
      title: "AI 풀이 노트 정리",
      taskKind: "guided_study",
      cognitiveLoad: "recovery",
      estimatedMinutes: 25,
      prioritySignals: ["stable_support"],
      requiredness: "support",
    }),
    task("capture-triage", {
      title: "오늘 입력 정리",
      taskKind: "capture_triage",
      cognitiveLoad: "recovery",
      estimatedMinutes: 20,
      prioritySignals: ["recent_absence"],
      requiredness: "support",
    }),
  ];
}

test("capacity bands are independent from employment labels", () => {
  assert.equal(classifyCapacityBand(180), "compressed_90_180");
  assert.equal(classifyCapacityBand(600), "full_day_600_720");
  const fullTimeRecovery = buildCapacityEnvelope({
    profile: profile({ lifeMode: "full_time_study", phase: "recovery" }),
    declaredActiveMinutes: 180,
    asOfDate: "2026-08-24",
  });
  const employedWeekend = buildCapacityEnvelope({
    profile: profile({ lifeMode: "full_time_employed" }),
    declaredActiveMinutes: 600,
    asOfDate: "2026-08-24",
  });
  assert.equal(fullTimeRecovery.capacityBand, "compressed_90_180");
  assert.equal(employedWeekend.capacityBand, "full_day_600_720");
});

test("full-time 600-minute day preserves max-three outcomes and many execution blocks", () => {
  const plan = buildStudyDayPlan({ profile: profile(), availability: availability(), candidates: fullDayCandidates() });
  assert.ok(plan.coreOutcomes.length <= 3);
  assert.ok(plan.executionBlocks.length > 3);
  assert.ok(plan.plannedActiveMinutes <= plan.capacity.schedulableActiveMinutes);
  assert.ok(plan.capacity.unallocatedBufferMinutes >= 30);
  assert.equal(plan.masteryMutationAllowed, false);
  assert.equal(plan.completionMeaning, "block_completion_is_not_mastery");
  assert.ok(plan.executionBlocks.some((block) => block.taskKind === "timed_set"));
  assert.ok(plan.executionBlocks.some((block) => block.taskKind === "lecture"));
});

test("full-time 720-minute fixture stays bounded and protects non-high-load time", () => {
  const plan = buildStudyDayPlan({
    profile: profile(),
    availability: availability({
      declaredActiveMinutes: 720,
      windows: [
        { id: "w1", startMinute: 420, endMinute: 720, environment: "desk", interruptibility: "low" },
        { id: "w2", startMinute: 780, endMinute: 1080, environment: "library", interruptibility: "low" },
        { id: "w3", startMinute: 1110, endMinute: 1380, environment: "desk", interruptibility: "medium" },
      ],
    }),
    candidates: fullDayCandidates(),
  });
  assert.equal(plan.capacity.capacityBand, "full_day_600_720");
  assert.ok(plan.capacity.highLoadBudgetMinutes < plan.capacity.schedulableActiveMinutes);
  assert.ok(plan.capacity.mediumLoadBudgetMinutes > 0);
  assert.ok(plan.capacity.lowLoadBudgetMinutes > 0);
  assert.ok(plan.capacity.recoveryBudgetMinutes > 0);
  assert.ok(plan.plannedActiveMinutes <= 720);
});

test("employed weekday moves a long timed task to the weekend instead of pretending it fits", () => {
  const plan = buildStudyDayPlan({
    profile: profile({ lifeMode: "full_time_employed", scheduleVolatility: "medium" }),
    availability: availability({
      declaredActiveMinutes: 180,
      windows: [
        { id: "before-work", startMinute: 420, endMinute: 480, environment: "desk", interruptibility: "medium" },
        { id: "after-work", startMinute: 1200, endMinute: 1290, environment: "desk", interruptibility: "medium" },
      ],
    }),
    candidates: [
      task("long-timed", {
        taskKind: "timed_set",
        estimatedMinutes: 120,
        minimumContinuousMinutes: 120,
        requiredness: "required",
        prioritySignals: ["timed_evidence_missing"],
      }),
      task("d1", {
        taskKind: "due_review",
        cognitiveLoad: "medium",
        estimatedMinutes: 30,
        requiredness: "required",
        prioritySignals: ["due_review"],
      }),
    ],
  });
  assert.ok(plan.coreOutcomes.length <= 2);
  assert.ok(!plan.executionBlocks.some((block) => block.candidateId === "long-timed"));
  assert.deepEqual(plan.deferredTasks.find((entry) => entry.candidateId === "long-timed"), {
    candidateId: "long-timed",
    title: "과제 long-timed",
    reason: "move_long_task_to_weekend",
    nextEligibleDayKind: "weekend",
    metadataOnly: true,
  });
});

test("employed weekend can schedule the long timed task when a continuous window exists", () => {
  const plan = buildStudyDayPlan({
    profile: profile({ lifeMode: "full_time_employed", scheduleVolatility: "medium" }),
    availability: availability({
      dayKind: "weekend",
      declaredActiveMinutes: 420,
      windows: [
        { id: "weekend-long", startMinute: 540, endMinute: 900, environment: "library", interruptibility: "low" },
        { id: "weekend-short", startMinute: 960, endMinute: 1080, environment: "desk", interruptibility: "medium" },
      ],
    }),
    candidates: [
      task("long-timed", {
        taskKind: "timed_set",
        estimatedMinutes: 120,
        minimumContinuousMinutes: 120,
        requiredness: "required",
        prioritySignals: ["timed_evidence_missing"],
      }),
      task("repair", {
        cognitiveLoad: "medium",
        taskKind: "rewrite_recalculate",
        estimatedMinutes: 60,
        requiredness: "core_candidate",
        prioritySignals: ["repeated_error"],
      }),
    ],
  });
  assert.ok(plan.executionBlocks.some((block) => block.candidateId === "long-timed"));
  assert.ok(plan.coreOutcomes.length <= 3);
});

test("working-mode weekly plan defers the long task on weekday and consumes it on weekend", () => {
  const week = buildStudyWeekPlan({
    profile: profile({ lifeMode: "full_time_employed", scheduleVolatility: "medium" }),
    days: [
      availability({
        date: "2026-08-24",
        dayKind: "weekday",
        declaredActiveMinutes: 180,
        windows: [{ id: "weekday", startMinute: 1200, endMinute: 1290, environment: "desk", interruptibility: "medium" }],
      }),
      availability({
        date: "2026-08-29",
        dayKind: "weekend",
        declaredActiveMinutes: 420,
        windows: [{ id: "weekend", startMinute: 540, endMinute: 900, environment: "library", interruptibility: "low" }],
      }),
    ],
    candidates: [
      task("long-timed", {
        taskKind: "timed_set",
        estimatedMinutes: 120,
        minimumContinuousMinutes: 120,
        requiredness: "required",
        prioritySignals: ["timed_evidence_missing"],
      }),
      task("weekday-review", {
        taskKind: "due_review",
        cognitiveLoad: "medium",
        estimatedMinutes: 30,
        requiredness: "required",
        prioritySignals: ["due_review"],
      }),
    ],
    requiredMinimumMinutes: 120,
    requiredMaximumMinutes: 240,
  });
  assert.ok(!week.dayPlans[0].executionBlocks.some((block) => block.candidateId === "long-timed"));
  assert.ok(week.dayPlans[1].executionBlocks.some((block) => block.candidateId === "long-timed"));
  assert.ok(!week.remainingTaskIds.includes("long-timed"));
});

test("shift commute window admits safe guided recall but rejects desk-dependent work", () => {
  const plan = buildStudyDayPlan({
    profile: profile({ lifeMode: "shift_or_irregular_work", scheduleVolatility: "high" }),
    availability: availability({
      declaredActiveMinutes: 90,
      windows: [
        {
          id: "commute",
          startMinute: 420,
          endMinute: 510,
          environment: "commute_public_transit",
          interruptibility: "high",
          allowedTaskKinds: ["guided_study", "memorization"],
        },
      ],
    }),
    candidates: [
      task("audio-recall", {
        taskKind: "guided_study",
        cognitiveLoad: "low",
        estimatedMinutes: 15,
        allowedEnvironments: ["commute_public_transit"],
        requiredness: "required",
        prioritySignals: ["due_review"],
      }),
      task("visual-calculation", {
        taskKind: "rewrite_recalculate",
        cognitiveLoad: "high",
        estimatedMinutes: 45,
        requiresDesk: true,
        requiresCalculator: true,
        requiredness: "required",
        prioritySignals: ["high_confidence_wrong"],
      }),
    ],
  });
  assert.ok(plan.executionBlocks.some((block) => block.candidateId === "audio-recall"));
  assert.equal(plan.deferredTasks.find((entry) => entry.candidateId === "visual-calculation")?.reason, "environment_incompatible");
});

test("fourteen-day capacity calibration excludes app interaction and provider waiting", () => {
  /** @type {CapacityHistoryDayV1[]} */
  const history = Array.from({ length: 14 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    plannedActiveMinutes: 180,
    actualActiveMinutes: 120,
    appInteractionMinutes: 30,
    providerWaitMinutes: 30,
    fatigueSelfReport: 2,
  }));
  const envelope = buildCapacityEnvelope({
    profile: profile({ lifeMode: "full_time_employed" }),
    declaredActiveMinutes: 180,
    asOfDate: "2026-08-24",
    history,
  });
  assert.equal(envelope.evidenceLevel, "evidence_supported_14d");
  assert.equal(envelope.historyDaysUsed, 14);
  assert.equal(envelope.effectiveActiveMinutes, 126);
  assert.ok(envelope.derivationReasons.includes("declared-capacity-reduced-to-sustainable-evidence"));
  const withoutExcludedMetadata = buildCapacityEnvelope({
    profile: profile({ lifeMode: "full_time_employed" }),
    declaredActiveMinutes: 180,
    asOfDate: "2026-08-24",
    history: history.map((day) => ({
      date: day.date,
      plannedActiveMinutes: day.plannedActiveMinutes,
      actualActiveMinutes: day.actualActiveMinutes,
      fatigueSelfReport: day.fatigueSelfReport,
    })),
  });
  assert.equal(withoutExcludedMetadata.effectiveActiveMinutes, envelope.effectiveActiveMinutes);
});

test("fatigue evidence reduces capacity without shame or diagnosis", () => {
  /** @type {CapacityHistoryDayV1[]} */
  const history = Array.from({ length: 10 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    plannedActiveMinutes: 360,
    actualActiveMinutes: 330,
    fatigueSelfReport: index < 5 ? 5 : 3,
    lateSessionErrorDelta: index < 5 ? 0.2 : 0,
  }));
  const envelope = buildCapacityEnvelope({ profile: profile(), declaredActiveMinutes: 360, asOfDate: "2026-08-24", history });
  assert.ok(envelope.derivationReasons.includes("fatigue-or-late-error-guardrail-applied"));
  assert.ok(envelope.effectiveActiveMinutes < 360);
  assert.doesNotMatch(JSON.stringify(envelope), /게으름|의지 부족|진단|불합격/i);
});

test("plan gap reports schedule feasibility and never invents pass probability", () => {
  const plan = buildStudyDayPlan({
    profile: profile({ lifeMode: "full_time_employed" }),
    availability: availability({
      declaredActiveMinutes: 90,
      externalCommitmentMinutes: 540,
      windows: [{ id: "short", startMinute: 1200, endMinute: 1290, environment: "desk", interruptibility: "medium" }],
    }),
    candidates: [
      task("required-a", { estimatedMinutes: 60, requiredness: "required", prioritySignals: ["due_review"] }),
      task("required-b", { estimatedMinutes: 60, requiredness: "required", prioritySignals: ["coverage_gap", "exam_urgency"] }),
    ],
  });
  assert.ok(plan.planGap);
  assert.equal(plan.planGap?.claimBoundary, "schedule_feasibility_only_not_pass_probability");
  assert.equal(
    plan.planGap?.shortfallMinutes,
    Math.max(0, (plan.planGap?.requiredPlanMinutes ?? 0) - (plan.planGap?.forecastCapacityMinutes ?? 0)),
  );
  assert.doesNotMatch(JSON.stringify(plan.planGap), /합격\s*확률|합격\s*보장/i);
});

test("weekly feasibility distinguishes feasible, tight and infeasible without outcome claims", () => {
  assert.equal(projectWeeklyFeasibility({ weeklyAvailableMinutes: 1200, requiredMinimumMinutes: 900, requiredMaximumMinutes: 1100 }).status, "feasible");
  assert.equal(projectWeeklyFeasibility({ weeklyAvailableMinutes: 1000, requiredMinimumMinutes: 900, requiredMaximumMinutes: 1100 }).status, "tight");
  const infeasible = projectWeeklyFeasibility({ weeklyAvailableMinutes: 700, requiredMinimumMinutes: 900, requiredMaximumMinutes: 1100 });
  assert.equal(infeasible.status, "infeasible");
  assert.equal(infeasible.shortfallMinutes, 200);
  assert.equal(infeasible.claimBoundary, "schedule_feasibility_only_not_pass_probability");
});

test("overtime replan keeps, defers or drops exactly once and never clones backlog", () => {
  const candidates = [
    task("due", {
      taskKind: "due_review",
      cognitiveLoad: "medium",
      estimatedMinutes: 15,
      requiredness: "required",
      prioritySignals: ["due_review"],
    }),
    task("repair", {
      estimatedMinutes: 30,
      requiredness: "core_candidate",
      prioritySignals: ["high_confidence_wrong"],
    }),
    task("optional", {
      taskKind: "guided_study",
      cognitiveLoad: "low",
      estimatedMinutes: 15,
      requiredness: "optional",
      prioritySignals: ["new_study"],
    }),
    task("deferred-both", {
      taskKind: "guided_study",
      cognitiveLoad: "low",
      estimatedMinutes: 10,
      requiredness: "support",
      allowedEnvironments: ["walking"],
      prioritySignals: ["stable_support"],
    }),
  ];
  const previous = buildStudyDayPlan({
    profile: profile({ lifeMode: "full_time_employed" }),
    availability: availability({
      declaredActiveMinutes: 180,
      windows: [{ id: "normal", startMinute: 1140, endMinute: 1320, environment: "desk", interruptibility: "medium" }],
    }),
    candidates,
  });
  const replanned = replanStudyDay({
    previousPlan: previous,
    newAvailability: availability({
      declaredActiveMinutes: 60,
      windows: [{ id: "overtime", startMinute: 1260, endMinute: 1320, environment: "desk", interruptibility: "high" }],
    }),
    candidates,
    reason: "overtime",
  });
  assert.equal(replanned.backlogCloneCount, 0);
  assert.equal(replanned.decisions.length, candidates.length);
  assert.equal(new Set(replanned.decisions.map((entry) => entry.candidateId)).size, replanned.decisions.length);
  assert.equal(replanned.decisions.find((entry) => entry.candidateId === "deferred-both")?.decision, "defer");
  assert.ok(replanned.decisions.some((entry) => entry.decision === "keep"));
  assert.ok(replanned.decisions.some((entry) => entry.decision === "defer" || entry.decision === "drop"));
  assert.ok(replanned.plan.plannedActiveMinutes <= replanned.plan.capacity.schedulableActiveMinutes);
});

test("AI drill generation is capped by the next 48 hours and verified bank is preferred", () => {
  const bankFirst = buildPersonalDrillBudget({
    next48hAvailableDrillMinutes: 120,
    pendingDrillMinutes: 40,
    estimatedMinutesPerNewItem: 10,
    verifiedBankHasMatchingItems: true,
  });
  assert.equal(bankFirst.route, "verified_bank_first");
  assert.equal(bankFirst.newGenerationBudgetMinutes, 0);
  assert.equal(bankFirst.maximumNewItems, 0);
  assert.equal(bankFirst.readinessEligible, false);
  assert.equal(bankFirst.crossUserReuseEligible, false);
  const generationOnGap = buildPersonalDrillBudget({
    next48hAvailableDrillMinutes: 120,
    pendingDrillMinutes: 40,
    estimatedMinutesPerNewItem: 10,
    verifiedBankHasMatchingItems: false,
  });
  assert.equal(generationOnGap.route, "personal_generation_on_gap");
  assert.equal(generationOnGap.newGenerationBudgetMinutes, 80);
  assert.equal(generationOnGap.maximumNewItems, 8);
  const exhausted = buildPersonalDrillBudget({
    next48hAvailableDrillMinutes: 60,
    pendingDrillMinutes: 60,
    estimatedMinutesPerNewItem: 10,
    verifiedBankHasMatchingItems: false,
  });
  assert.equal(exhausted.route, "no_generation_capacity");
  assert.equal(exhausted.maximumNewItems, 0);
});

test("first, second and both modes are accepted without changing mastery", () => {
  /** @type {ExamModeV1[]} */
  const examModes = ["first", "second", "both"];
  for (const examMode of examModes) {
    const plan = buildStudyDayPlan({
      profile: profile({ examMode }),
      availability: availability({
        declaredActiveMinutes: 90,
        windows: [{ id: `window-${examMode}`, startMinute: 600, endMinute: 690, environment: "desk", interruptibility: "low" }],
      }),
      candidates: [task(`task-${examMode}`, { estimatedMinutes: 25, cognitiveLoad: "medium", requiredness: "required", prioritySignals: ["due_review"] })],
    });
    assert.equal(plan.profile.examMode, examMode);
    assert.equal(plan.masteryMutationAllowed, false);
  }
});

test("same input produces the same deterministic plan digest", () => {
  const input = { profile: profile(), availability: availability(), candidates: fullDayCandidates() };
  const first = buildStudyDayPlan(input);
  const second = buildStudyDayPlan(input);
  assert.equal(first.deterministicPlanDigest, second.deterministicPlanDigest);
  assert.deepEqual(first.executionBlocks, second.executionBlocks);
});

test("invalid and overlapping windows fail closed", () => {
  assert.throws(
    () => buildStudyDayPlan({
      profile: profile(),
      availability: availability({
        declaredActiveMinutes: 90,
        windows: [
          { id: "a", startMinute: 600, endMinute: 660, environment: "desk", interruptibility: "low" },
          { id: "b", startMinute: 650, endMinute: 720, environment: "desk", interruptibility: "low" },
        ],
      }),
      candidates: [task("x", { estimatedMinutes: 20 })],
    }),
    /overlapping-study-windows/,
  );
  assert.throws(() => classifyCapacityBand(721), /invalid-capacity-minutes/);
  assert.throws(() => classifyCapacityBand(29), /invalid-capacity-minutes/);
});

test("weekly capacity is bounded by usable nonprotected windows", () => {
  for (const windows of [
    [{ id: "narrow", startMinute: 600, endMinute: 630, environment: "desk", interruptibility: "low" }],
    [{ id: "protected", startMinute: 600, endMinute: 720, environment: "desk", interruptibility: "low", protected: true }],
    [],
  ]) {
    const week = buildStudyWeekPlan({
      profile: profile(),
      days: [availability({ declaredActiveMinutes: 720, windows })],
      candidates: [],
      requiredMinimumMinutes: 60,
      requiredMaximumMinutes: 120,
    });
    const usable = windows.some((window) => !window.protected) ? 30 : 0;
    assert.equal(week.weeklyAvailableMinutes, usable);
    assert.equal(week.feasibility.status, "infeasible");
    assert.ok(week.dayPlans[0].capacity.schedulableActiveMinutes + week.dayPlans[0].capacity.unallocatedBufferMinutes <= week.dayPlans[0].capacity.effectiveActiveMinutes);
  }
});

test("plan gap arithmetic stays exact when execution constraints, not minutes, block work", () => {
  const plan = buildStudyDayPlan({
    profile: profile(),
    availability: availability(),
    candidates: [task("walking-only", {
      cognitiveLoad: "low",
      requiredness: "required",
      estimatedMinutes: 30,
      allowedEnvironments: ["walking"],
      prioritySignals: ["coverage_gap"],
    })],
  });
  assert.ok(plan.planGap);
  assert.equal(plan.planGap?.requiredPlanMinutes, 30);
  assert.ok((plan.planGap?.forecastCapacityMinutes ?? 0) > 30);
  assert.equal(plan.planGap?.shortfallMinutes, 0);
  assert.equal(plan.deferredTasks[0].reason, "environment_incompatible");
});

test("continuous high-load limits and atomic split bounds are enforced", () => {
  const windows = [
    { id: "library-a", startMinute: 420, endMinute: 510, environment: "library", interruptibility: "low" },
    { id: "library-b", startMinute: 540, endMinute: 630, environment: "library", interruptibility: "low" },
    { id: "other-capacity", startMinute: 660, endMinute: 1080, environment: "desk", interruptibility: "low" },
  ];
  const unsplittable = buildStudyDayPlan({
    profile: profile(),
    availability: availability({ windows }),
    candidates: [task("unsplittable-high", { estimatedMinutes: 180, allowedEnvironments: ["library"], requiredness: "required" })],
  });
  assert.equal(unsplittable.executionBlocks.length, 0);
  assert.equal(unsplittable.deferredTasks[0].reason, "continuous_window_missing");

  const split = buildStudyDayPlan({
    profile: profile(),
    availability: availability({ windows }),
    candidates: [task("split-high", {
      estimatedMinutes: 180,
      minimumContinuousMinutes: 60,
      splittable: true,
      maxParts: 2,
      allowedEnvironments: ["library"],
      requiredness: "required",
    })],
  });
  const splitBlocks = split.executionBlocks.filter((block) => block.candidateId === "split-high");
  assert.equal(splitBlocks.length, 2);
  assert.equal(splitBlocks.reduce((sum, block) => sum + block.activeMinutes, 0), 180);
  assert.ok(splitBlocks.every((block) => block.activeMinutes >= 60));
  assert.ok(splitBlocks.every((block) => block.activeMinutes <= split.capacity.maxContinuousHighLoadMinutes));
  assert.ok(splitBlocks.every((block) => /:part:[12]$/.test(block.blockId)));

  const impossible = buildStudyDayPlan({
    profile: profile(),
    availability: availability({ windows }),
    candidates: [task("impossible-split", {
      estimatedMinutes: 200,
      minimumContinuousMinutes: 60,
      splittable: true,
      maxParts: 2,
      allowedEnvironments: ["library"],
      requiredness: "required",
    })],
  });
  assert.equal(impossible.executionBlocks.length, 0);
  assert.equal(impossible.deferredTasks.length, 1);

  const adjacentWithoutBreak = buildStudyDayPlan({
    profile: profile(),
    availability: availability({
      declaredActiveMinutes: 360,
      windows: [
        { id: "continuous", startMinute: 480, endMinute: 590, environment: "desk", interruptibility: "low" },
        { id: "other-environment", startMinute: 650, endMinute: 900, environment: "library", interruptibility: "low" },
      ],
    }),
    candidates: [
      task("adjacent-a", { estimatedMinutes: 50, allowedEnvironments: ["desk"], requiredness: "required", prioritySignals: ["due_review"] }),
      task("adjacent-b", { estimatedMinutes: 60, allowedEnvironments: ["desk"], requiredness: "required", prioritySignals: ["coverage_gap"] }),
    ],
  });
  assert.equal(adjacentWithoutBreak.executionBlocks.filter((block) => block.cognitiveLoad === "high").length, 1);
  assert.equal(adjacentWithoutBreak.deferredTasks.length, 1);

  const feasibleWithIdleBreak = buildStudyDayPlan({
    profile: profile(),
    availability: availability({
      declaredActiveMinutes: 360,
      windows: [
        { id: "break-capable", startMinute: 480, endMinute: 600, environment: "desk", interruptibility: "low" },
        { id: "other-environment", startMinute: 650, endMinute: 890, environment: "library", interruptibility: "low" },
      ],
    }),
    candidates: [
      task("break-a", { estimatedMinutes: 50, allowedEnvironments: ["desk"], requiredness: "required", prioritySignals: ["due_review"] }),
      task("break-b", { estimatedMinutes: 60, allowedEnvironments: ["desk"], requiredness: "required", prioritySignals: ["coverage_gap"] }),
    ],
  });
  assert.equal(feasibleWithIdleBreak.executionBlocks.length, 2);
  assert.ok(feasibleWithIdleBreak.executionBlocks[1].startMinute > feasibleWithIdleBreak.executionBlocks[0].endMinute);

  const feasibleSplitDistribution = buildStudyDayPlan({
    profile: profile(),
    availability: availability({
      declaredActiveMinutes: 360,
      windows: [
        { id: "prior", startMinute: 480, endMinute: 530, environment: "desk", interruptibility: "low" },
        { id: "split-a", startMinute: 530, endMinute: 590, environment: "library", interruptibility: "low" },
        { id: "split-b", startMinute: 680, endMinute: 770, environment: "library", interruptibility: "low" },
        { id: "capacity", startMinute: 800, endMinute: 960, environment: "desk", interruptibility: "low" },
      ],
    }),
    candidates: [
      task("prior-high", { estimatedMinutes: 50, allowedEnvironments: ["desk"], requiredness: "required", prioritySignals: ["due_review"] }),
      task("distributed-split", { estimatedMinutes: 120, minimumContinuousMinutes: 30, splittable: true, maxParts: 2, allowedEnvironments: ["library"], requiredness: "required", prioritySignals: ["coverage_gap"] }),
    ],
  });
  const distributedBlocks = feasibleSplitDistribution.executionBlocks.filter((block) => block.candidateId === "distributed-split");
  assert.equal(distributedBlocks.length, 2);
  assert.equal(distributedBlocks.reduce((sum, block) => sum + block.activeMinutes, 0), 120);
  assert.ok(distributedBlocks[0].activeMinutes < 60);
  assert.ok(distributedBlocks[1].activeMinutes > 60);

  const touchingSplit = buildStudyDayPlan({
    profile: profile(),
    availability: availability({
      windows: [
        { id: "touch-a", startMinute: 480, endMinute: 570, environment: "library", interruptibility: "low" },
        { id: "touch-b", startMinute: 570, endMinute: 660, environment: "library", interruptibility: "low" },
        { id: "touch-capacity", startMinute: 720, endMinute: 1140, environment: "desk", interruptibility: "low" },
      ],
    }),
    candidates: [task("touching-split", {
      estimatedMinutes: 180,
      minimumContinuousMinutes: 60,
      splittable: true,
      maxParts: 2,
      allowedEnvironments: ["library"],
      requiredness: "required",
    })],
  });
  assert.equal(touchingSplit.executionBlocks.length, 0);
  assert.equal(touchingSplit.deferredTasks.length, 1);
});

test("high-load work never enters high interruption and prefers low over medium interruption", () => {
  const plan = buildStudyDayPlan({
    profile: profile(),
    availability: availability({
      declaredActiveMinutes: 360,
      windows: [
        { id: "high-interruption", startMinute: 480, endMinute: 660, environment: "desk", interruptibility: "high" },
        { id: "medium-interruption", startMinute: 720, endMinute: 780, environment: "desk", interruptibility: "medium" },
        { id: "low-interruption", startMinute: 840, endMinute: 1020, environment: "desk", interruptibility: "low" },
      ],
    }),
    candidates: [task("high-load", { estimatedMinutes: 60, requiredness: "required" })],
  });
  assert.equal(plan.executionBlocks[0]?.windowId, "low-interruption");
});

test("capacity evidence requires distinct valid recent dates before an explicit as-of date", () => {
  const duplicateHistory = Array.from({ length: 14 }, () => ({ date: "2026-08-10", plannedActiveMinutes: 120, actualActiveMinutes: 120 }));
  assert.throws(
    () => buildCapacityEnvelope({ profile: profile(), declaredActiveMinutes: 180, asOfDate: "2026-08-25", history: duplicateHistory }),
    /duplicate-capacity-history-date/,
  );
  assert.throws(
    () => buildCapacityEnvelope({ profile: profile(), declaredActiveMinutes: 180, asOfDate: "2026-08-25", history: [{ date: "2026-08-25", plannedActiveMinutes: 120, actualActiveMinutes: 120 }] }),
    /capacity-history-not-before-as-of/,
  );
  const recentUnordered = Array.from({ length: 14 }, (_, index) => ({
    date: `2026-08-${String(index + 10).padStart(2, "0")}`,
    plannedActiveMinutes: 120,
    actualActiveMinutes: 120,
  })).reverse();
  recentUnordered.push({ date: "2026-07-01", plannedActiveMinutes: 120, actualActiveMinutes: 120 });
  const envelope = buildCapacityEnvelope({ profile: profile(), declaredActiveMinutes: 180, asOfDate: "2026-08-25", history: recentUnordered });
  assert.equal(envelope.evidenceLevel, "evidence_supported_14d");
  assert.equal(envelope.historyDaysUsed, 14);
});

test("hostile, unknown, duplicate and non-finite inputs fail closed", () => {
  const validAvailability = availability({ declaredActiveMinutes: 90, windows: [{ id: "one", startMinute: 600, endMinute: 690, environment: "desk", interruptibility: "low" }] });
  const invalidCandidates = [
    { ...task("raw"), rawText: "private body" },
    { ...task("unknown-field"), debug: true },
    { ...task("task-kind"), taskKind: "bogus" },
    { ...task("load"), cognitiveLoad: "bogus" },
    { ...task("requiredness"), requiredness: "bogus" },
    { ...task("signal"), prioritySignals: ["bogus"] },
    { ...task("duplicate-signal"), prioritySignals: ["due_review", "due_review"] },
    { ...task("nan"), basePriority: Number.NaN },
    { ...task("oversized-title"), title: "x".repeat(257) },
  ];
  for (const candidate of invalidCandidates) {
    assert.throws(() => buildStudyDayPlan({ profile: profile(), availability: validAvailability, candidates: [candidate] }));
  }
  assert.throws(() => buildStudyDayPlan({
    profile: profile(),
    availability: availability({
      declaredActiveMinutes: 90,
      windows: [
        { id: "duplicate", startMinute: 600, endMinute: 630, environment: "desk", interruptibility: "low" },
        { id: "duplicate", startMinute: 660, endMinute: 690, environment: "desk", interruptibility: "low" },
      ],
    }),
    candidates: [],
  }), /duplicate-window-id/);
  assert.throws(() => buildStudyDayPlan({
    profile: profile(),
    availability: availability({ declaredActiveMinutes: 90, windows: [{ id: "bad-environment", startMinute: 600, endMinute: 690, environment: "bogus", interruptibility: "low" }] }),
    candidates: [],
  }), /unsupported-window-environment/);
  assert.throws(() => buildStudyDayPlan({
    profile: { ...profile(), targetExamDates: { first: "2027-01-01", rawOcrText: "private" } },
    availability: validAvailability,
    candidates: [],
  }), /raw-body-field-not-allowed/);
  assert.throws(() => buildStudyDayPlan({
    profile: profile(),
    availability: validAvailability,
    candidates: Array.from({ length: 257 }, (_, index) => task(`bounded-${index}`)),
  }), /invalid-study-candidate-count/);
});

test("budget-impossible maximum split input short-circuits exhaustive placement", () => {
  const plan = buildStudyDayPlan({
    profile: profile(),
    availability: availability({
      declaredActiveMinutes: 720,
      windows: Array.from({ length: 12 }, (_, index) => ({
        id: `max-window-${index}`,
        startMinute: index * 120,
        endMinute: (index + 1) * 120,
        environment: "desk",
        interruptibility: "low",
      })),
    }),
    candidates: [task("budget-impossible-max-split", {
      estimatedMinutes: 720,
      minimumContinuousMinutes: 60,
      splittable: true,
      maxParts: 12,
      requiredness: "required",
    })],
  });
  assert.equal(plan.executionBlocks.length, 0);
  assert.equal(plan.deferredTasks[0].reason, "cognitive_load_budget_exhausted");
});

test("replanning rejects candidate scope changes", () => {
  const candidates = [task("scope", { estimatedMinutes: 20, cognitiveLoad: "medium", requiredness: "required", prioritySignals: ["due_review"] })];
  const previousPlan = buildStudyDayPlan({
    profile: profile(),
    availability: availability({ declaredActiveMinutes: 90, windows: [{ id: "scope-window", startMinute: 600, endMinute: 690, environment: "desk", interruptibility: "low" }] }),
    candidates,
  });
  assert.throws(() => replanStudyDay({ previousPlan, newAvailability: availability({ declaredActiveMinutes: 90, windows: [] }), candidates: [], reason: "custom" }), /replan-candidate-scope-mismatch/);
  assert.throws(() => replanStudyDay({ previousPlan: { ...previousPlan, debug: true }, newAvailability: validReplanAvailability(), candidates, reason: "custom" }), /unknown-previous-plan-field/);
  assert.throws(() => replanStudyDay({ previousPlan: { ...previousPlan, plannedActiveMinutes: previousPlan.plannedActiveMinutes + 1 }, newAvailability: validReplanAvailability(), candidates, reason: "custom" }), /previous-planned-active-minutes-mismatch/);
});

function validReplanAvailability() {
  return availability({ declaredActiveMinutes: 90, windows: [{ id: "replan-valid", startMinute: 600, endMinute: 690, environment: "desk", interruptibility: "low" }] });
}

test("outputs contain no raw body fields, shame copy, guarantees or pass probabilities", () => {
  const plan = buildStudyDayPlan({ profile: profile(), availability: availability(), candidates: fullDayCandidates() });
  const serialized = JSON.stringify(plan);
  assert.doesNotMatch(serialized, /rawOcrText|problemText|questionText|userAnswer|answerText|sourceText/i);
  assert.doesNotMatch(serialized, /게으름|의지\s*부족|실패자|불합격\s*확정|합격\s*보장|합격\s*확률/i);
});
