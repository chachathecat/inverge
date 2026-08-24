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

const policyVersion = "dabangil.study_capacity_life_mode_orchestrator.v1";

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
  });
  const employedWeekend = buildCapacityEnvelope({
    profile: profile({ lifeMode: "full_time_employed" }),
    declaredActiveMinutes: 600,
  });

  assert.equal(fullTimeRecovery.capacityBand, "compressed_90_180");
  assert.equal(employedWeekend.capacityBand, "full_day_600_720");
});

test("full-time 600-minute day preserves max-three outcomes and many execution blocks", () => {
  const plan = buildStudyDayPlan({
    profile: profile(),
    availability: availability(),
    candidates: fullDayCandidates(),
  });

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
  assert.deepEqual(
    plan.deferredTasks.find((entry) => entry.candidateId === "long-timed"),
    {
      candidateId: "long-timed",
      title: "과제 long-timed",
      reason: "move_long_task_to_weekend",
      nextEligibleDayKind: "weekend",
      metadataOnly: true,
    },
  );
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

test("shift commute window admits a safe guided recall but rejects desk-dependent work", () => {
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
  const history = Array.from({ length: 14 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    plannedActiveMinutes: 180,
    actualActiveMinutes: 180,
    appInteractionMinutes: 30,
    providerWaitMinutes: 30,
    fatigueSelfReport: 2,
  }));
  const envelope = buildCapacityEnvelope({
    profile: profile({ lifeMode: "full_time_employed" }),
    declaredActiveMinutes: 180,
    history,
  });

  assert.equal(envelope.evidenceLevel, "evidence_supported_14d");
  assert.equal(envelope.historyDaysUsed, 14);
  assert.ok(envelope.effectiveActiveMinutes <= 126);
  assert.ok(envelope.derivationReasons.includes("declared-capacity-reduced-to-sustainable-evidence"));
});

test("fatigue evidence reduces capacity without shame or diagnosis", () => {
  const history = Array.from({ length: 10 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    plannedActiveMinutes: 360,
    actualActiveMinutes: 330,
    fatigueSelfReport: index < 5 ? 5 : 3,
    lateSessionErrorDelta: index < 5 ? 0.2 : 0,
  }));
  const envelope = buildCapacityEnvelope({
    profile: profile(),
    declaredActiveMinutes: 360,
    history,
  });
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
  assert.ok((plan.planGap?.shortfallMinutes ?? 0) > 0);
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
  assert.equal(new Set(replanned.decisions.map((entry) => entry.candidateId)).size, replanned.decisions.length);
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
  assert.equal(bankFirst.maximumNewItems, 8);
  assert.equal(bankFirst.readinessEligible, false);
  assert.equal(bankFirst.crossUserReuseEligible, false);

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
  for (const examMode of ["first", "second", "both"]) {
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
  const input = {
    profile: profile(),
    availability: availability(),
    candidates: fullDayCandidates(),
  };
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

test("learner-facing outputs contain no raw body fields, shame copy, guarantees or pass probabilities", () => {
  const plan = buildStudyDayPlan({
    profile: profile(),
    availability: availability(),
    candidates: fullDayCandidates(),
  });
  const serialized = JSON.stringify(plan);
  assert.doesNotMatch(serialized, /rawOcrText|problemText|questionText|userAnswer|answerText|sourceText/i);
  assert.doesNotMatch(serialized, /게으름|의지\s*부족|실패자|불합격\s*확정|합격\s*보장|합격\s*확률/i);
});
