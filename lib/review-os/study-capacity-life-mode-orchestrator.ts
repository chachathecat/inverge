export type LifeModeV1 =
  | "full_time_study"
  | "full_time_employed"
  | "part_time_employed"
  | "shift_or_irregular_work"
  | "leave_or_transition"
  | "caregiving_constrained"
  | "health_constrained"
  | "custom";

export type ExamModeV1 = "first" | "second" | "both";

export type StudyPhaseV1 =
  | "foundation"
  | "coverage"
  | "consolidation"
  | "timed_integration"
  | "final_sprint"
  | "recovery";

export type CapacityBandV1 =
  | "micro_30_90"
  | "compressed_90_180"
  | "standard_180_360"
  | "intensive_360_600"
  | "full_day_600_720";

export type ScheduleVolatilityV1 = "low" | "medium" | "high";
export type DayKindV1 = "weekday" | "weekend" | "holiday" | "recovery";
export type CognitiveLoadV1 = "high" | "medium" | "low" | "recovery";
export type TaskRequirednessV1 = "required" | "core_candidate" | "support" | "optional";
export type TaskKindV1 =
  | "due_review"
  | "independent_problem_solving"
  | "timed_set"
  | "timed_answer_writing"
  | "rewrite_recalculate"
  | "lecture"
  | "textbook_reading"
  | "memorization"
  | "guided_study"
  | "microdrill"
  | "capture_triage"
  | "mock_set"
  | "manual";

export type EnvironmentV1 =
  | "desk"
  | "library"
  | "office_break"
  | "commute_public_transit"
  | "walking"
  | "custom";

export type TaskPrioritySignalV1 =
  | "due_review"
  | "high_confidence_wrong"
  | "pass_risk"
  | "exam_urgency"
  | "unseen_transfer_due"
  | "timed_evidence_missing"
  | "repeated_error"
  | "coverage_gap"
  | "recent_absence"
  | "learner_pinned"
  | "stable_support"
  | "new_study";

export type DeferralReasonV1 =
  | "capacity_exhausted"
  | "cognitive_load_budget_exhausted"
  | "continuous_window_missing"
  | "move_long_task_to_weekend"
  | "environment_incompatible"
  | "protected_window_conflict"
  | "optional_scope_dropped"
  | "recovery_mode"
  | "not_selected_by_priority";

export type PlanGapReasonV1 =
  | "due_review_overload"
  | "coverage_gap"
  | "timed_evidence_missing"
  | "external_commitment"
  | "recent_absence"
  | "exam_urgency";

export type PlanGapChoiceV1 =
  | "drop_low_value_scope"
  | "shorten_support_tasks"
  | "move_long_task_to_weekend"
  | "increase_capacity"
  | "defer_noncritical_scope"
  | "change_target_timeline";

export type CapacityEvidenceLevelV1 =
  | "declared_only"
  | "calibrating_7d"
  | "evidence_supported_14d";

export type StudyWindowV1 = {
  id: string;
  startMinute: number;
  endMinute: number;
  environment: EnvironmentV1;
  interruptibility: "low" | "medium" | "high";
  protected?: boolean;
  allowedTaskKinds?: TaskKindV1[];
};

export type DayAvailabilityV1 = {
  date: string;
  dayKind: DayKindV1;
  declaredActiveMinutes: number;
  windows: StudyWindowV1[];
  externalCommitmentMinutes?: number;
};

export type CapacityHistoryDayV1 = {
  date: string;
  plannedActiveMinutes: number;
  actualActiveMinutes: number;
  appInteractionMinutes?: number;
  providerWaitMinutes?: number;
  highLoadPlannedMinutes?: number;
  highLoadCompletedMinutes?: number;
  replanCount?: number;
  fatigueSelfReport?: 1 | 2 | 3 | 4 | 5;
  lateSessionErrorDelta?: number;
};

export type LearnerConstraintProfileV1 = {
  lifeMode: LifeModeV1;
  examMode: ExamModeV1;
  phase: StudyPhaseV1;
  scheduleVolatility: ScheduleVolatilityV1;
  targetExamDates?: { first?: string; second?: string };
  policyVersion: string;
};

export type CapacityEnvelopeV1 = {
  declaredActiveMinutes: number;
  effectiveActiveMinutes: number;
  schedulableActiveMinutes: number;
  capacityBand: CapacityBandV1;
  evidenceLevel: CapacityEvidenceLevelV1;
  historyDaysUsed: number;
  highLoadBudgetMinutes: number;
  mediumLoadBudgetMinutes: number;
  lowLoadBudgetMinutes: number;
  recoveryBudgetMinutes: number;
  unallocatedBufferMinutes: number;
  maxContinuousHighLoadMinutes: number;
  derivationReasons: string[];
  policyVersion: string;
};

export type StudyTaskCandidateV1 = {
  id: string;
  title: string;
  subject: string;
  taskKind: TaskKindV1;
  cognitiveLoad: CognitiveLoadV1;
  requiredness: TaskRequirednessV1;
  estimatedMinutes: number;
  minimumContinuousMinutes?: number;
  splittable?: boolean;
  maxParts?: number;
  allowedEnvironments?: EnvironmentV1[];
  requiresDesk?: boolean;
  requiresCalculator?: boolean;
  requiresDesktop?: boolean;
  prioritySignals: TaskPrioritySignalV1[];
  basePriority: number;
  outcomeKey?: string;
  sourceRef?: string;
  metadataOnly?: true;
};

export type ExecutionBlockV1 = {
  blockId: string;
  candidateId: string | null;
  outcomeKey: string | null;
  title: string;
  subject: string | null;
  taskKind: TaskKindV1 | "recovery_buffer";
  cognitiveLoad: CognitiveLoadV1;
  startMinute: number;
  endMinute: number;
  activeMinutes: number;
  windowId: string;
  requiredness: TaskRequirednessV1 | "buffer";
  countsTowardActiveStudy: boolean;
  selectionReasons: string[];
  metadataOnly: true;
};

export type CoreOutcomeV1 = {
  outcomeId: string;
  title: string;
  blockIds: string[];
  estimatedMinutes: number;
  reason: string;
  metadataOnly: true;
};

export type DeferredTaskV1 = {
  candidateId: string;
  title: string;
  reason: DeferralReasonV1;
  nextEligibleDayKind?: DayKindV1;
  metadataOnly: true;
};

export type PlanGapV1 = {
  forecastCapacityMinutes: number;
  requiredPlanMinutes: number;
  shortfallMinutes: number;
  reasons: PlanGapReasonV1[];
  choices: PlanGapChoiceV1[];
  claimBoundary: "schedule_feasibility_only_not_pass_probability";
  metadataOnly: true;
};

export type StudyDayPlanV1 = {
  date: string;
  profile: LearnerConstraintProfileV1;
  capacity: CapacityEnvelopeV1;
  coreOutcomes: CoreOutcomeV1[];
  executionBlocks: ExecutionBlockV1[];
  deferredTasks: DeferredTaskV1[];
  planGap: PlanGapV1 | null;
  plannedActiveMinutes: number;
  completionMeaning: "block_completion_is_not_mastery";
  masteryMutationAllowed: false;
  deterministicPlanDigest: string;
  metadataOnly: true;
};

export type FeasibilityProjectionV1 = {
  status: "feasible" | "tight" | "infeasible";
  weeklyAvailableMinutes: number;
  requiredMinimumMinutes: number;
  requiredMaximumMinutes: number;
  shortfallMinutes: number;
  claimBoundary: "schedule_feasibility_only_not_pass_probability";
  reasons: string[];
  metadataOnly: true;
};

export type StudyWeekPlanV1 = {
  profile: LearnerConstraintProfileV1;
  dayPlans: StudyDayPlanV1[];
  weeklyAvailableMinutes: number;
  weeklyPlannedMinutes: number;
  remainingTaskIds: string[];
  feasibility: FeasibilityProjectionV1;
  metadataOnly: true;
};

export type DrillBudgetV1 = {
  next48hAvailableDrillMinutes: number;
  pendingDrillMinutes: number;
  newGenerationBudgetMinutes: number;
  maximumNewItems: number;
  route: "verified_bank_first" | "personal_generation_on_gap" | "no_generation_capacity";
  readinessEligible: false;
  crossUserReuseEligible: false;
  metadataOnly: true;
};

export type ReplanDecisionV1 = {
  candidateId: string;
  decision: "keep" | "defer" | "drop";
  reason: string;
  metadataOnly: true;
};

export type ReplannedStudyDayV1 = {
  plan: StudyDayPlanV1;
  decisions: ReplanDecisionV1[];
  backlogCloneCount: 0;
  metadataOnly: true;
};

const MAX_ACTIVE_MINUTES = 720;
const MIN_ACTIVE_MINUTES = 30;
const MAX_CORE_OUTCOMES = 3;
const PROHIBITED_COPY = [
  /하루\s*10시간.*합격/i,
  /10시간.*합격\s*조건/i,
  /합격\s*확률/i,
  /합격\s*보장/i,
  /의지\s*부족/i,
  /게으름/i,
  /실패자/i,
  /불합격\s*확정/i,
  /지금\s*안\s*하면\s*끝/i,
  /streak/i,
  /casino/i,
  /gacha/i,
];

const PRIORITY_SIGNAL_SCORE: Record<TaskPrioritySignalV1, number> = {
  due_review: 220,
  high_confidence_wrong: 190,
  pass_risk: 160,
  exam_urgency: 130,
  unseen_transfer_due: 180,
  timed_evidence_missing: 145,
  repeated_error: 150,
  coverage_gap: 90,
  recent_absence: 120,
  learner_pinned: 175,
  stable_support: 15,
  new_study: 30,
};

const REQUIREDNESS_SCORE: Record<TaskRequirednessV1, number> = {
  required: 260,
  core_candidate: 140,
  support: 55,
  optional: 0,
};

function assertFiniteInteger(name: string, value: number, min: number, max: number) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`invalid-${name}:${String(value)}`);
  }
}

function assertSafeText(value: string) {
  for (const pattern of PROHIBITED_COPY) {
    if (pattern.test(value)) throw new Error(`prohibited-capacity-copy:${String(pattern)}`);
  }
}

function assertMetadataSafe(value: unknown): void {
  const rawKey = /(rawText|rawOcrText|ocrText|problemText|questionText|userAnswer|answerText|sourceText|copyrightedText|fullText)/i;
  if (typeof value === "string") {
    assertSafeText(value);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertMetadataSafe);
    return;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (rawKey.test(key)) throw new Error(`raw-body-field-not-allowed:${key}`);
    assertMetadataSafe(nested);
  }
}

function validateProfile(profile: LearnerConstraintProfileV1) {
  const lifeModes: LifeModeV1[] = [
    "full_time_study",
    "full_time_employed",
    "part_time_employed",
    "shift_or_irregular_work",
    "leave_or_transition",
    "caregiving_constrained",
    "health_constrained",
    "custom",
  ];
  const examModes: ExamModeV1[] = ["first", "second", "both"];
  const phases: StudyPhaseV1[] = [
    "foundation",
    "coverage",
    "consolidation",
    "timed_integration",
    "final_sprint",
    "recovery",
  ];
  if (!lifeModes.includes(profile.lifeMode)) throw new Error(`unsupported-life-mode:${String(profile.lifeMode)}`);
  if (!examModes.includes(profile.examMode)) throw new Error(`unsupported-exam-mode:${String(profile.examMode)}`);
  if (!phases.includes(profile.phase)) throw new Error(`unsupported-study-phase:${String(profile.phase)}`);
  if (!["low", "medium", "high"].includes(profile.scheduleVolatility)) {
    throw new Error(`unsupported-schedule-volatility:${String(profile.scheduleVolatility)}`);
  }
  if (!profile.policyVersion.trim()) throw new Error("missing-policy-version");
}

function usableActualMinutes(day: CapacityHistoryDayV1) {
  const app = Math.max(0, Math.floor(day.appInteractionMinutes ?? 0));
  const wait = Math.max(0, Math.floor(day.providerWaitMinutes ?? 0));
  return Math.max(0, Math.floor(day.actualActiveMinutes) - app - wait);
}

function sortedNumeric(values: number[]) {
  return [...values].sort((a, b) => a - b);
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return 0;
  const sorted = sortedNumeric(values);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index];
}

function percentage(value: number, ratio: number) {
  return Math.max(0, Math.floor(value * ratio));
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function classifyCapacityBand(minutes: number): CapacityBandV1 {
  assertFiniteInteger("capacity-minutes", minutes, MIN_ACTIVE_MINUTES, MAX_ACTIVE_MINUTES);
  if (minutes <= 90) return "micro_30_90";
  if (minutes <= 180) return "compressed_90_180";
  if (minutes <= 360) return "standard_180_360";
  if (minutes < 600) return "intensive_360_600";
  return "full_day_600_720";
}

function loadBudgetRatios(band: CapacityBandV1, phase: StudyPhaseV1) {
  if (phase === "recovery") return { high: 0.2, medium: 0.3, low: 0.35, recovery: 0.15 };
  if (band === "micro_30_90") return { high: 0.35, medium: 0.35, low: 0.25, recovery: 0.05 };
  if (band === "compressed_90_180") return { high: 0.45, medium: 0.35, low: 0.15, recovery: 0.05 };
  if (band === "standard_180_360") return { high: 0.5, medium: 0.3, low: 0.15, recovery: 0.05 };
  if (band === "intensive_360_600") return { high: 0.48, medium: 0.3, low: 0.15, recovery: 0.07 };
  return { high: 0.45, medium: 0.3, low: 0.15, recovery: 0.1 };
}

function maxContinuousForBand(band: CapacityBandV1, phase: StudyPhaseV1) {
  if (phase === "recovery") return 45;
  if (band === "micro_30_90") return 60;
  if (band === "compressed_90_180") return 75;
  if (band === "standard_180_360") return 100;
  return 120;
}

export function buildCapacityEnvelope(input: {
  profile: LearnerConstraintProfileV1;
  declaredActiveMinutes: number;
  history?: CapacityHistoryDayV1[];
  recoveryOverrideMinutes?: number;
}): CapacityEnvelopeV1 {
  validateProfile(input.profile);
  assertFiniteInteger("declared-active-minutes", input.declaredActiveMinutes, MIN_ACTIVE_MINUTES, MAX_ACTIVE_MINUTES);
  if (input.recoveryOverrideMinutes !== undefined) {
    assertFiniteInteger("recovery-override-minutes", input.recoveryOverrideMinutes, MIN_ACTIVE_MINUTES, MAX_ACTIVE_MINUTES);
  }

  const history = (input.history ?? []).filter((entry) => Number.isFinite(entry.actualActiveMinutes)).slice(-28);
  const usable = history.map(usableActualMinutes).filter((minutes) => minutes >= 0);
  const evidenceLevel: CapacityEvidenceLevelV1 =
    usable.length >= 14 ? "evidence_supported_14d" : usable.length >= 7 ? "calibrating_7d" : "declared_only";

  const reasons: string[] = [];
  let effective = input.declaredActiveMinutes;

  if (usable.length >= 7) {
    const conservativeObserved = percentile(usable, usable.length >= 14 ? 0.6 : 0.5);
    const bufferedObserved = Math.floor(conservativeObserved * 1.05);
    effective = Math.max(MIN_ACTIVE_MINUTES, Math.min(input.declaredActiveMinutes, bufferedObserved));
    reasons.push(`recent-active-evidence:${usable.length}d`);
    if (effective < input.declaredActiveMinutes) reasons.push("declared-capacity-reduced-to-sustainable-evidence");
  } else {
    reasons.push("declared-capacity-used-pending-evidence");
  }

  const highFatigueDays = history.filter((entry) => (entry.fatigueSelfReport ?? 0) >= 4).length;
  const lateErrorDays = history.filter((entry) => (entry.lateSessionErrorDelta ?? 0) > 0).length;
  if (history.length >= 7 && (highFatigueDays / history.length >= 0.35 || lateErrorDays / history.length >= 0.35)) {
    effective = Math.max(MIN_ACTIVE_MINUTES, Math.floor(effective * 0.9));
    reasons.push("fatigue-or-late-error-guardrail-applied");
  }

  if (input.profile.phase === "recovery") {
    effective = Math.min(effective, input.recoveryOverrideMinutes ?? 180);
    reasons.push("recovery-phase-cap-applied");
  } else if (input.recoveryOverrideMinutes !== undefined) {
    effective = Math.min(effective, input.recoveryOverrideMinutes);
    reasons.push("manual-recovery-override-applied");
  }

  effective = Math.max(MIN_ACTIVE_MINUTES, Math.min(MAX_ACTIVE_MINUTES, effective));
  const band = classifyCapacityBand(effective);
  const bufferRatio = band === "full_day_600_720" ? 0.08 : band === "intensive_360_600" ? 0.06 : 0.04;
  const buffer = Math.max(band === "full_day_600_720" ? 30 : 5, percentage(effective, bufferRatio));
  const schedulable = Math.max(MIN_ACTIVE_MINUTES, effective - buffer);
  const ratios = loadBudgetRatios(band, input.profile.phase);
  let high = percentage(schedulable, ratios.high);
  let medium = percentage(schedulable, ratios.medium);
  let low = percentage(schedulable, ratios.low);
  const recovery = Math.max(0, schedulable - high - medium - low);

  if (high + medium + low + recovery > schedulable) {
    low = Math.max(0, schedulable - high - medium - recovery);
  }

  const result: CapacityEnvelopeV1 = {
    declaredActiveMinutes: input.declaredActiveMinutes,
    effectiveActiveMinutes: effective,
    schedulableActiveMinutes: schedulable,
    capacityBand: band,
    evidenceLevel,
    historyDaysUsed: usable.length,
    highLoadBudgetMinutes: high,
    mediumLoadBudgetMinutes: medium,
    lowLoadBudgetMinutes: low,
    recoveryBudgetMinutes: recovery,
    unallocatedBufferMinutes: buffer,
    maxContinuousHighLoadMinutes: maxContinuousForBand(band, input.profile.phase),
    derivationReasons: reasons,
    policyVersion: input.profile.policyVersion,
  };
  assertMetadataSafe(result);
  return result;
}

function validateWindow(window: StudyWindowV1) {
  if (!window.id.trim()) throw new Error("missing-window-id");
  assertFiniteInteger("window-start-minute", window.startMinute, 0, 1439);
  assertFiniteInteger("window-end-minute", window.endMinute, 1, 1440);
  if (window.endMinute <= window.startMinute) throw new Error(`invalid-window-order:${window.id}`);
}

function validateAvailability(availability: DayAvailabilityV1) {
  assertFiniteInteger("day-declared-active-minutes", availability.declaredActiveMinutes, MIN_ACTIVE_MINUTES, MAX_ACTIVE_MINUTES);
  if (!availability.date.trim()) throw new Error("missing-study-date");
  for (const window of availability.windows) validateWindow(window);
  const sorted = [...availability.windows].sort((a, b) => a.startMinute - b.startMinute);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].startMinute < sorted[index - 1].endMinute) {
      throw new Error(`overlapping-study-windows:${sorted[index - 1].id}:${sorted[index].id}`);
    }
  }
}

function validateCandidate(candidate: StudyTaskCandidateV1) {
  if (!candidate.id.trim()) throw new Error("missing-candidate-id");
  if (!candidate.title.trim()) throw new Error(`missing-candidate-title:${candidate.id}`);
  assertSafeText(candidate.title);
  assertFiniteInteger("candidate-estimated-minutes", candidate.estimatedMinutes, 1, MAX_ACTIVE_MINUTES);
  if (candidate.minimumContinuousMinutes !== undefined) {
    assertFiniteInteger("candidate-minimum-continuous-minutes", candidate.minimumContinuousMinutes, 1, candidate.estimatedMinutes);
  }
  if (candidate.maxParts !== undefined) assertFiniteInteger("candidate-max-parts", candidate.maxParts, 1, 12);
}

function candidateScore(candidate: StudyTaskCandidateV1) {
  return (
    candidate.basePriority +
    REQUIREDNESS_SCORE[candidate.requiredness] +
    candidate.prioritySignals.reduce((total, signal) => total + PRIORITY_SIGNAL_SCORE[signal], 0)
  );
}

function environmentCompatible(candidate: StudyTaskCandidateV1, window: StudyWindowV1) {
  if (window.protected) return false;
  if (window.allowedTaskKinds && !window.allowedTaskKinds.includes(candidate.taskKind)) return false;
  if (candidate.allowedEnvironments && !candidate.allowedEnvironments.includes(window.environment)) return false;
  if (candidate.requiresDesk && !["desk", "library"].includes(window.environment)) return false;
  if ((candidate.requiresDesktop || candidate.requiresCalculator) && !["desk", "library"].includes(window.environment)) return false;
  if (
    ["commute_public_transit", "walking"].includes(window.environment) &&
    ["timed_set", "timed_answer_writing", "independent_problem_solving", "rewrite_recalculate", "mock_set"].includes(candidate.taskKind)
  ) {
    return false;
  }
  return true;
}

function loadBudgetKey(load: CognitiveLoadV1): "high" | "medium" | "low" | "recovery" {
  return load;
}

function coreOutcomeLimit(profile: LearnerConstraintProfileV1, availability: DayAvailabilityV1, capacity: CapacityEnvelopeV1) {
  if (capacity.capacityBand === "micro_30_90" || profile.phase === "recovery") return 1;
  if (profile.lifeMode === "full_time_employed" && availability.dayKind === "weekday") return 2;
  if (profile.lifeMode === "shift_or_irregular_work" && profile.scheduleVolatility === "high") return 2;
  return MAX_CORE_OUTCOMES;
}

function deferralReasonFor(candidate: StudyTaskCandidateV1, profile: LearnerConstraintProfileV1, availability: DayAvailabilityV1, hadCompatibleWindow: boolean, hadContinuousWindow: boolean, loadExceeded: boolean): DeferralReasonV1 {
  if (profile.phase === "recovery" && candidate.requiredness !== "required") return "recovery_mode";
  if (!hadCompatibleWindow) return "environment_incompatible";
  if (!hadContinuousWindow) {
    if (
      profile.lifeMode === "full_time_employed" &&
      availability.dayKind === "weekday" &&
      candidate.estimatedMinutes >= 100
    ) {
      return "move_long_task_to_weekend";
    }
    return "continuous_window_missing";
  }
  if (loadExceeded) return "cognitive_load_budget_exhausted";
  if (candidate.requiredness === "optional") return "optional_scope_dropped";
  return "capacity_exhausted";
}

function planGapFrom(input: {
  capacity: CapacityEnvelopeV1;
  candidates: StudyTaskCandidateV1[];
  scheduledCandidateIds: Set<string>;
  availability: DayAvailabilityV1;
}): PlanGapV1 | null {
  const required = input.candidates.filter((candidate) => candidate.requiredness === "required");
  const requiredMinutes = required.reduce((total, candidate) => total + candidate.estimatedMinutes, 0);
  const unscheduledRequired = required.filter((candidate) => !input.scheduledCandidateIds.has(candidate.id));
  const shortfall = Math.max(0, requiredMinutes - input.capacity.schedulableActiveMinutes);
  if (unscheduledRequired.length === 0 && shortfall === 0) return null;

  const reasons: PlanGapReasonV1[] = [];
  if (unscheduledRequired.some((candidate) => candidate.prioritySignals.includes("due_review"))) reasons.push("due_review_overload");
  if (unscheduledRequired.some((candidate) => candidate.prioritySignals.includes("coverage_gap"))) reasons.push("coverage_gap");
  if (unscheduledRequired.some((candidate) => candidate.prioritySignals.includes("timed_evidence_missing"))) reasons.push("timed_evidence_missing");
  if ((input.availability.externalCommitmentMinutes ?? 0) > 0) reasons.push("external_commitment");
  if (unscheduledRequired.some((candidate) => candidate.prioritySignals.includes("recent_absence"))) reasons.push("recent_absence");
  if (unscheduledRequired.some((candidate) => candidate.prioritySignals.includes("exam_urgency"))) reasons.push("exam_urgency");

  const choices: PlanGapChoiceV1[] = [
    "drop_low_value_scope",
    "shorten_support_tasks",
    "defer_noncritical_scope",
  ];
  if (unscheduledRequired.some((candidate) => candidate.estimatedMinutes >= 100)) choices.push("move_long_task_to_weekend");
  choices.push("increase_capacity", "change_target_timeline");

  const result: PlanGapV1 = {
    forecastCapacityMinutes: input.capacity.schedulableActiveMinutes,
    requiredPlanMinutes: requiredMinutes,
    shortfallMinutes: Math.max(shortfall, unscheduledRequired.reduce((sum, candidate) => sum + candidate.estimatedMinutes, 0)),
    reasons: unique(reasons.length > 0 ? reasons : ["coverage_gap"]),
    choices: unique(choices),
    claimBoundary: "schedule_feasibility_only_not_pass_probability",
    metadataOnly: true,
  };
  return result;
}

export function buildStudyDayPlan(input: {
  profile: LearnerConstraintProfileV1;
  availability: DayAvailabilityV1;
  candidates: StudyTaskCandidateV1[];
  capacityHistory?: CapacityHistoryDayV1[];
  recoveryOverrideMinutes?: number;
}): StudyDayPlanV1 {
  validateProfile(input.profile);
  validateAvailability(input.availability);
  const candidateIds = new Set<string>();
  for (const candidate of input.candidates) {
    validateCandidate(candidate);
    if (candidateIds.has(candidate.id)) throw new Error(`duplicate-candidate-id:${candidate.id}`);
    candidateIds.add(candidate.id);
  }

  const capacity = buildCapacityEnvelope({
    profile: input.profile,
    declaredActiveMinutes: input.availability.declaredActiveMinutes,
    history: input.capacityHistory,
    recoveryOverrideMinutes: input.recoveryOverrideMinutes,
  });

  const activeWindows = input.availability.windows.filter((window) => !window.protected);
  const windowState = new Map(activeWindows.map((window) => [window.id, { window, cursor: window.startMinute }]));
  const usedLoad = { high: 0, medium: 0, low: 0, recovery: 0 };
  const loadBudgets = {
    high: capacity.highLoadBudgetMinutes,
    medium: capacity.mediumLoadBudgetMinutes,
    low: capacity.lowLoadBudgetMinutes,
    recovery: capacity.recoveryBudgetMinutes,
  };
  const scheduled: ExecutionBlockV1[] = [];
  const deferred: DeferredTaskV1[] = [];
  const scheduledIds = new Set<string>();

  const sortedCandidates = [...input.candidates].sort((left, right) => {
    const scoreDiff = candidateScore(right) - candidateScore(left);
    if (scoreDiff !== 0) return scoreDiff;
    if (left.estimatedMinutes !== right.estimatedMinutes) return left.estimatedMinutes - right.estimatedMinutes;
    return left.id.localeCompare(right.id);
  });

  for (const candidate of sortedCandidates) {
    const minimumContinuous = candidate.minimumContinuousMinutes ?? candidate.estimatedMinutes;
    const compatibleStates = [...windowState.values()].filter(({ window }) => environmentCompatible(candidate, window));
    const hadCompatibleWindow = compatibleStates.length > 0;
    const continuousStates = compatibleStates.filter(({ window, cursor }) => {
      const remaining = window.endMinute - cursor;
      return remaining >= candidate.estimatedMinutes && remaining >= minimumContinuous;
    });
    const hadContinuousWindow = continuousStates.length > 0;
    const budgetKey = loadBudgetKey(candidate.cognitiveLoad);
    const loadExceeded = usedLoad[budgetKey] + candidate.estimatedMinutes > loadBudgets[budgetKey];
    const activeExceeded = scheduled.reduce((sum, block) => sum + block.activeMinutes, 0) + candidate.estimatedMinutes > capacity.schedulableActiveMinutes;

    if (!hadContinuousWindow || loadExceeded || activeExceeded) {
      deferred.push({
        candidateId: candidate.id,
        title: candidate.title,
        reason: deferralReasonFor(candidate, input.profile, input.availability, hadCompatibleWindow, hadContinuousWindow, loadExceeded),
        nextEligibleDayKind:
          input.profile.lifeMode === "full_time_employed" && input.availability.dayKind === "weekday" && candidate.estimatedMinutes >= 100
            ? "weekend"
            : undefined,
        metadataOnly: true,
      });
      continue;
    }

    const selectedState = continuousStates.sort((left, right) => {
      const leftRemaining = left.window.endMinute - left.cursor;
      const rightRemaining = right.window.endMinute - right.cursor;
      return leftRemaining - rightRemaining || left.window.startMinute - right.window.startMinute;
    })[0];
    const start = selectedState.cursor;
    const end = start + candidate.estimatedMinutes;
    selectedState.cursor = end;
    usedLoad[budgetKey] += candidate.estimatedMinutes;
    scheduledIds.add(candidate.id);
    scheduled.push({
      blockId: `block:${input.availability.date}:${candidate.id}`,
      candidateId: candidate.id,
      outcomeKey: candidate.outcomeKey ?? candidate.id,
      title: candidate.title,
      subject: candidate.subject,
      taskKind: candidate.taskKind,
      cognitiveLoad: candidate.cognitiveLoad,
      startMinute: start,
      endMinute: end,
      activeMinutes: candidate.estimatedMinutes,
      windowId: selectedState.window.id,
      requiredness: candidate.requiredness,
      countsTowardActiveStudy: true,
      selectionReasons: unique([
        `requiredness:${candidate.requiredness}`,
        ...candidate.prioritySignals.map((signal) => `priority:${signal}`),
        `life-mode:${input.profile.lifeMode}`,
        `day-kind:${input.availability.dayKind}`,
      ]),
      metadataOnly: true,
    });
  }

  scheduled.sort((left, right) => left.startMinute - right.startMinute || left.blockId.localeCompare(right.blockId));
  const scheduledById = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const outcomeCandidates = [...scheduled]
    .sort((left, right) => {
      const leftCandidate = left.candidateId ? scheduledById.get(left.candidateId) : undefined;
      const rightCandidate = right.candidateId ? scheduledById.get(right.candidateId) : undefined;
      return candidateScore(rightCandidate ?? input.candidates[0]) - candidateScore(leftCandidate ?? input.candidates[0]);
    });
  const limit = coreOutcomeLimit(input.profile, input.availability, capacity);
  const grouped = new Map<string, ExecutionBlockV1[]>();
  for (const block of outcomeCandidates) {
    if (block.requiredness === "support" || block.requiredness === "optional") continue;
    const key = block.outcomeKey ?? block.blockId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(block);
  }
  const coreOutcomes: CoreOutcomeV1[] = [...grouped.entries()].slice(0, limit).map(([key, blocks], index) => ({
    outcomeId: `outcome:${input.availability.date}:${index + 1}:${stableHash(key)}`,
    title: blocks[0].title,
    blockIds: blocks.map((block) => block.blockId),
    estimatedMinutes: blocks.reduce((sum, block) => sum + block.activeMinutes, 0),
    reason: blocks[0].selectionReasons.filter((reason) => reason.startsWith("priority:")).slice(0, 2).join(", ") || "highest-value-executable-outcome",
    metadataOnly: true,
  }));

  if (coreOutcomes.length > MAX_CORE_OUTCOMES) throw new Error("core-outcome-limit-violated");
  const plannedActiveMinutes = scheduled.reduce((sum, block) => sum + block.activeMinutes, 0);
  if (plannedActiveMinutes > capacity.schedulableActiveMinutes) throw new Error("planned-active-minutes-exceed-capacity");

  const planGap = planGapFrom({
    capacity,
    candidates: input.candidates,
    scheduledCandidateIds: scheduledIds,
    availability: input.availability,
  });

  const digestBasis = JSON.stringify({
    date: input.availability.date,
    profile: input.profile,
    capacity,
    blocks: scheduled.map(({ blockId, candidateId, startMinute, endMinute, windowId }) => ({ blockId, candidateId, startMinute, endMinute, windowId })),
    deferred: deferred.map(({ candidateId, reason }) => ({ candidateId, reason })),
  });

  const result: StudyDayPlanV1 = {
    date: input.availability.date,
    profile: { ...input.profile },
    capacity,
    coreOutcomes,
    executionBlocks: scheduled,
    deferredTasks: deferred,
    planGap,
    plannedActiveMinutes,
    completionMeaning: "block_completion_is_not_mastery",
    masteryMutationAllowed: false,
    deterministicPlanDigest: `sclm-v1:${stableHash(digestBasis)}`,
    metadataOnly: true,
  };
  assertMetadataSafe(result);
  return result;
}

export function projectWeeklyFeasibility(input: {
  weeklyAvailableMinutes: number;
  requiredMinimumMinutes: number;
  requiredMaximumMinutes: number;
  reasons?: string[];
}): FeasibilityProjectionV1 {
  assertFiniteInteger("weekly-available-minutes", input.weeklyAvailableMinutes, 0, 7 * MAX_ACTIVE_MINUTES);
  assertFiniteInteger("required-minimum-minutes", input.requiredMinimumMinutes, 0, 7 * MAX_ACTIVE_MINUTES);
  assertFiniteInteger("required-maximum-minutes", input.requiredMaximumMinutes, input.requiredMinimumMinutes, 7 * MAX_ACTIVE_MINUTES);
  let status: FeasibilityProjectionV1["status"] = "feasible";
  if (input.weeklyAvailableMinutes < input.requiredMinimumMinutes) status = "infeasible";
  else if (input.weeklyAvailableMinutes < input.requiredMaximumMinutes) status = "tight";

  const result: FeasibilityProjectionV1 = {
    status,
    weeklyAvailableMinutes: input.weeklyAvailableMinutes,
    requiredMinimumMinutes: input.requiredMinimumMinutes,
    requiredMaximumMinutes: input.requiredMaximumMinutes,
    shortfallMinutes: Math.max(0, input.requiredMinimumMinutes - input.weeklyAvailableMinutes),
    claimBoundary: "schedule_feasibility_only_not_pass_probability",
    reasons: input.reasons ?? [],
    metadataOnly: true,
  };
  assertMetadataSafe(result);
  return result;
}

export function buildStudyWeekPlan(input: {
  profile: LearnerConstraintProfileV1;
  days: DayAvailabilityV1[];
  candidates: StudyTaskCandidateV1[];
  capacityHistory?: CapacityHistoryDayV1[];
  requiredMinimumMinutes: number;
  requiredMaximumMinutes: number;
}): StudyWeekPlanV1 {
  validateProfile(input.profile);
  if (input.days.length === 0 || input.days.length > 7) throw new Error(`invalid-week-day-count:${input.days.length}`);
  const uniqueDates = new Set(input.days.map((day) => day.date));
  if (uniqueDates.size !== input.days.length) throw new Error("duplicate-week-date");

  const orderedDays = [...input.days].sort((left, right) => left.date.localeCompare(right.date));
  let remaining = [...input.candidates];
  const dayPlans: StudyDayPlanV1[] = [];

  for (const day of orderedDays) {
    const dayCandidates = [...remaining].sort((left, right) => {
      if (input.profile.lifeMode === "full_time_employed") {
        const leftLong = left.estimatedMinutes >= 100 ? 1 : 0;
        const rightLong = right.estimatedMinutes >= 100 ? 1 : 0;
        if (day.dayKind === "weekend" && leftLong !== rightLong) return rightLong - leftLong;
        if (day.dayKind === "weekday" && leftLong !== rightLong) return leftLong - rightLong;
      }
      return candidateScore(right) - candidateScore(left);
    });
    const plan = buildStudyDayPlan({
      profile: input.profile,
      availability: day,
      candidates: dayCandidates,
      capacityHistory: input.capacityHistory,
    });
    dayPlans.push(plan);
    const scheduledIds = new Set(plan.executionBlocks.map((block) => block.candidateId).filter((id): id is string => Boolean(id)));
    remaining = remaining.filter((candidate) => !scheduledIds.has(candidate.id));
  }

  const weeklyAvailableMinutes = dayPlans.reduce((sum, plan) => sum + plan.capacity.schedulableActiveMinutes, 0);
  const weeklyPlannedMinutes = dayPlans.reduce((sum, plan) => sum + plan.plannedActiveMinutes, 0);
  const result: StudyWeekPlanV1 = {
    profile: { ...input.profile },
    dayPlans,
    weeklyAvailableMinutes,
    weeklyPlannedMinutes,
    remainingTaskIds: remaining.map((candidate) => candidate.id),
    feasibility: projectWeeklyFeasibility({
      weeklyAvailableMinutes,
      requiredMinimumMinutes: input.requiredMinimumMinutes,
      requiredMaximumMinutes: input.requiredMaximumMinutes,
      reasons: remaining.length > 0 ? ["candidate-scope-remains-after-week-allocation"] : [],
    }),
    metadataOnly: true,
  };
  assertMetadataSafe(result);
  return result;
}

export function buildPersonalDrillBudget(input: {
  next48hAvailableDrillMinutes: number;
  pendingDrillMinutes: number;
  estimatedMinutesPerNewItem: number;
  verifiedBankHasMatchingItems: boolean;
}): DrillBudgetV1 {
  assertFiniteInteger("next48h-drill-minutes", input.next48hAvailableDrillMinutes, 0, 2 * MAX_ACTIVE_MINUTES);
  assertFiniteInteger("pending-drill-minutes", input.pendingDrillMinutes, 0, 2 * MAX_ACTIVE_MINUTES);
  assertFiniteInteger("estimated-minutes-per-new-item", input.estimatedMinutesPerNewItem, 1, 180);
  const budget = Math.max(0, input.next48hAvailableDrillMinutes - input.pendingDrillMinutes);
  const maximumNewItems = Math.floor(budget / input.estimatedMinutesPerNewItem);
  const route: DrillBudgetV1["route"] =
    input.verifiedBankHasMatchingItems
      ? "verified_bank_first"
      : maximumNewItems > 0
        ? "personal_generation_on_gap"
        : "no_generation_capacity";
  const result: DrillBudgetV1 = {
    next48hAvailableDrillMinutes: input.next48hAvailableDrillMinutes,
    pendingDrillMinutes: input.pendingDrillMinutes,
    newGenerationBudgetMinutes: budget,
    maximumNewItems,
    route,
    readinessEligible: false,
    crossUserReuseEligible: false,
    metadataOnly: true,
  };
  assertMetadataSafe(result);
  return result;
}

export function replanStudyDay(input: {
  previousPlan: StudyDayPlanV1;
  newAvailability: DayAvailabilityV1;
  candidates: StudyTaskCandidateV1[];
  capacityHistory?: CapacityHistoryDayV1[];
  reason: "overtime" | "illness" | "family_commitment" | "energy_drop" | "custom";
}): ReplannedStudyDayV1 {
  const next = buildStudyDayPlan({
    profile: input.previousPlan.profile,
    availability: input.newAvailability,
    candidates: input.candidates,
    capacityHistory: input.capacityHistory,
    recoveryOverrideMinutes: input.reason === "illness" ? Math.min(180, input.newAvailability.declaredActiveMinutes) : undefined,
  });
  const nextIds = new Set(next.executionBlocks.map((block) => block.candidateId).filter((id): id is string => Boolean(id)));
  const previousIds = new Set(input.previousPlan.executionBlocks.map((block) => block.candidateId).filter((id): id is string => Boolean(id)));
  const candidateMap = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const decisions: ReplanDecisionV1[] = [];

  for (const candidateId of unique([...previousIds, ...nextIds])) {
    const candidate = candidateMap.get(candidateId);
    if (nextIds.has(candidateId)) {
      decisions.push({ candidateId, decision: "keep", reason: `replanned-after:${input.reason}`, metadataOnly: true });
    } else if (candidate?.requiredness === "optional") {
      decisions.push({ candidateId, decision: "drop", reason: `optional-scope-dropped-after:${input.reason}`, metadataOnly: true });
    } else {
      decisions.push({ candidateId, decision: "defer", reason: `capacity-preserved-after:${input.reason}`, metadataOnly: true });
    }
  }

  const result: ReplannedStudyDayV1 = {
    plan: next,
    decisions,
    backlogCloneCount: 0,
    metadataOnly: true,
  };
  assertMetadataSafe(result);
  return result;
}
