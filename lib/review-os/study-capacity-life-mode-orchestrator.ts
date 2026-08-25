export type LifeModeV1 = "full_time_study" | "full_time_employed" | "part_time_employed" | "shift_or_irregular_work" | "leave_or_transition" | "caregiving_constrained" | "health_constrained" | "custom";
export type ExamModeV1 = "first" | "second" | "both";
export type StudyPhaseV1 = "foundation" | "coverage" | "consolidation" | "timed_integration" | "final_sprint" | "recovery";
export type CapacityBandV1 = "micro_30_90" | "compressed_90_180" | "standard_180_360" | "intensive_360_600" | "full_day_600_720";
export type ScheduleVolatilityV1 = "low" | "medium" | "high";
export type DayKindV1 = "weekday" | "weekend" | "holiday" | "recovery";
export type CognitiveLoadV1 = "high" | "medium" | "low" | "recovery";
export type TaskRequirednessV1 = "required" | "core_candidate" | "support" | "optional";
export type TaskKindV1 = "due_review" | "independent_problem_solving" | "timed_set" | "timed_answer_writing" | "rewrite_recalculate" | "lecture" | "textbook_reading" | "memorization" | "guided_study" | "microdrill" | "capture_triage" | "mock_set" | "manual";
export type EnvironmentV1 = "desk" | "library" | "office_break" | "commute_public_transit" | "walking" | "custom";
export type TaskPrioritySignalV1 = "due_review" | "high_confidence_wrong" | "pass_risk" | "exam_urgency" | "unseen_transfer_due" | "timed_evidence_missing" | "repeated_error" | "coverage_gap" | "recent_absence" | "learner_pinned" | "stable_support" | "new_study";
export type DeferralReasonV1 = "capacity_exhausted" | "cognitive_load_budget_exhausted" | "continuous_window_missing" | "move_long_task_to_weekend" | "environment_incompatible" | "protected_window_conflict" | "optional_scope_dropped" | "recovery_mode" | "not_selected_by_priority";
export type PlanGapReasonV1 = "due_review_overload" | "coverage_gap" | "timed_evidence_missing" | "external_commitment" | "recent_absence" | "exam_urgency";
export type PlanGapChoiceV1 = "drop_low_value_scope" | "shorten_support_tasks" | "move_long_task_to_weekend" | "increase_capacity" | "defer_noncritical_scope" | "change_target_timeline";
export type CapacityEvidenceLevelV1 = "declared_only" | "calibrating_7d" | "evidence_supported_14d";

export type StudyWindowV1 = { id: string; startMinute: number; endMinute: number; environment: EnvironmentV1; interruptibility: "low" | "medium" | "high"; protected?: boolean; allowedTaskKinds?: TaskKindV1[] };
export type DayAvailabilityV1 = { date: string; dayKind: DayKindV1; declaredActiveMinutes: number; windows: StudyWindowV1[]; externalCommitmentMinutes?: number };
export type CapacityHistoryDayV1 = { date: string; plannedActiveMinutes: number; actualActiveMinutes: number; appInteractionMinutes?: number; providerWaitMinutes?: number; highLoadPlannedMinutes?: number; highLoadCompletedMinutes?: number; replanCount?: number; fatigueSelfReport?: 1 | 2 | 3 | 4 | 5; lateSessionErrorDelta?: number };
export type LearnerConstraintProfileV1 = { lifeMode: LifeModeV1; examMode: ExamModeV1; phase: StudyPhaseV1; scheduleVolatility: ScheduleVolatilityV1; targetExamDates?: { first?: string; second?: string }; policyVersion: string };
export type CapacityEnvelopeV1 = { declaredActiveMinutes: number; effectiveActiveMinutes: number; schedulableActiveMinutes: number; capacityBand: CapacityBandV1; evidenceLevel: CapacityEvidenceLevelV1; historyDaysUsed: number; highLoadBudgetMinutes: number; mediumLoadBudgetMinutes: number; lowLoadBudgetMinutes: number; recoveryBudgetMinutes: number; unallocatedBufferMinutes: number; maxContinuousHighLoadMinutes: number; derivationReasons: string[]; policyVersion: string };
export type StudyTaskCandidateV1 = { id: string; title: string; subject: string; taskKind: TaskKindV1; cognitiveLoad: CognitiveLoadV1; requiredness: TaskRequirednessV1; estimatedMinutes: number; minimumContinuousMinutes?: number; splittable?: boolean; maxParts?: number; allowedEnvironments?: EnvironmentV1[]; requiresDesk?: boolean; requiresCalculator?: boolean; requiresDesktop?: boolean; prioritySignals: TaskPrioritySignalV1[]; basePriority: number; outcomeKey?: string; sourceRef?: string; metadataOnly?: true };
export type ExecutionBlockV1 = { blockId: string; candidateId: string | null; outcomeKey: string | null; title: string; subject: string | null; taskKind: TaskKindV1 | "recovery_buffer"; cognitiveLoad: CognitiveLoadV1; startMinute: number; endMinute: number; activeMinutes: number; windowId: string; requiredness: TaskRequirednessV1 | "buffer"; countsTowardActiveStudy: boolean; selectionReasons: string[]; metadataOnly: true };
export type CoreOutcomeV1 = { outcomeId: string; title: string; blockIds: string[]; estimatedMinutes: number; reason: string; metadataOnly: true };
export type DeferredTaskV1 = { candidateId: string; title: string; reason: DeferralReasonV1; nextEligibleDayKind?: DayKindV1; metadataOnly: true };
export type PlanGapV1 = { forecastCapacityMinutes: number; requiredPlanMinutes: number; shortfallMinutes: number; reasons: PlanGapReasonV1[]; choices: PlanGapChoiceV1[]; claimBoundary: "schedule_feasibility_only_not_pass_probability"; metadataOnly: true };
export type StudyDayPlanV1 = { date: string; profile: LearnerConstraintProfileV1; capacity: CapacityEnvelopeV1; coreOutcomes: CoreOutcomeV1[]; executionBlocks: ExecutionBlockV1[]; deferredTasks: DeferredTaskV1[]; planGap: PlanGapV1 | null; plannedActiveMinutes: number; completionMeaning: "block_completion_is_not_mastery"; masteryMutationAllowed: false; deterministicPlanDigest: string; metadataOnly: true };
export type FeasibilityProjectionV1 = { status: "feasible" | "tight" | "infeasible"; weeklyAvailableMinutes: number; requiredMinimumMinutes: number; requiredMaximumMinutes: number; shortfallMinutes: number; claimBoundary: "schedule_feasibility_only_not_pass_probability"; reasons: string[]; metadataOnly: true };
export type StudyWeekPlanV1 = { profile: LearnerConstraintProfileV1; dayPlans: StudyDayPlanV1[]; weeklyAvailableMinutes: number; weeklyPlannedMinutes: number; remainingTaskIds: string[]; feasibility: FeasibilityProjectionV1; metadataOnly: true };
export type DrillBudgetV1 = { next48hAvailableDrillMinutes: number; pendingDrillMinutes: number; newGenerationBudgetMinutes: number; maximumNewItems: number; route: "verified_bank_first" | "personal_generation_on_gap" | "no_generation_capacity"; readinessEligible: false; crossUserReuseEligible: false; metadataOnly: true };
export type ReplanDecisionV1 = { candidateId: string; decision: "keep" | "defer" | "drop"; reason: string; metadataOnly: true };
export type ReplannedStudyDayV1 = { plan: StudyDayPlanV1; decisions: ReplanDecisionV1[]; backlogCloneCount: 0; metadataOnly: true };

const MAX_ACTIVE_MINUTES = 720;
const MIN_ACTIVE_MINUTES = 30;
const MAX_CORE_OUTCOMES = 3;
const MAX_CANDIDATES_PER_PLAN = 256;
const MAX_WINDOWS_PER_DAY = 24;
const MAX_SPLIT_PARTS = 12;
const DAY_MS = 86_400_000;

const LIFE_MODES = ["full_time_study", "full_time_employed", "part_time_employed", "shift_or_irregular_work", "leave_or_transition", "caregiving_constrained", "health_constrained", "custom"] as const;
const EXAM_MODES = ["first", "second", "both"] as const;
const STUDY_PHASES = ["foundation", "coverage", "consolidation", "timed_integration", "final_sprint", "recovery"] as const;
const VOLATILITY = ["low", "medium", "high"] as const;
const DAY_KINDS = ["weekday", "weekend", "holiday", "recovery"] as const;
const COGNITIVE_LOADS = ["high", "medium", "low", "recovery"] as const;
const REQUIREDNESS = ["required", "core_candidate", "support", "optional"] as const;
const TASK_KINDS = ["due_review", "independent_problem_solving", "timed_set", "timed_answer_writing", "rewrite_recalculate", "lecture", "textbook_reading", "memorization", "guided_study", "microdrill", "capture_triage", "mock_set", "manual"] as const;
const ENVIRONMENTS = ["desk", "library", "office_break", "commute_public_transit", "walking", "custom"] as const;
const INTERRUPTIBILITY = ["low", "medium", "high"] as const;
const PRIORITY_SIGNALS = ["due_review", "high_confidence_wrong", "pass_risk", "exam_urgency", "unseen_transfer_due", "timed_evidence_missing", "repeated_error", "coverage_gap", "recent_absence", "learner_pinned", "stable_support", "new_study"] as const;
const CAPACITY_BANDS = ["micro_30_90", "compressed_90_180", "standard_180_360", "intensive_360_600", "full_day_600_720"] as const;
const EVIDENCE_LEVELS = ["declared_only", "calibrating_7d", "evidence_supported_14d"] as const;
const DEFERRAL_REASONS = ["capacity_exhausted", "cognitive_load_budget_exhausted", "continuous_window_missing", "move_long_task_to_weekend", "environment_incompatible", "protected_window_conflict", "optional_scope_dropped", "recovery_mode", "not_selected_by_priority"] as const;
const PLAN_GAP_REASONS = ["due_review_overload", "coverage_gap", "timed_evidence_missing", "external_commitment", "recent_absence", "exam_urgency"] as const;
const PLAN_GAP_CHOICES = ["drop_low_value_scope", "shorten_support_tasks", "move_long_task_to_weekend", "increase_capacity", "defer_noncritical_scope", "change_target_timeline"] as const;
const REPLAN_REASONS = ["overtime", "illness", "family_commitment", "energy_drop", "custom"] as const;
const PROHIBITED_COPY = [/하루\s*10시간.*합격/i, /10시간.*합격\s*조건/i, /합격\s*확률/i, /합격\s*보장/i, /의지\s*부족/i, /게으름/i, /실패자/i, /불합격\s*확정/i, /지금\s*안\s*하면\s*끝/i, /streak/i, /casino/i, /gacha/i];
const SIGNAL: Record<TaskPrioritySignalV1, number> = { due_review: 220, high_confidence_wrong: 190, pass_risk: 160, exam_urgency: 130, unseen_transfer_due: 180, timed_evidence_missing: 145, repeated_error: 150, coverage_gap: 90, recent_absence: 120, learner_pinned: 175, stable_support: 15, new_study: 30 };
const REQUIRED: Record<TaskRequirednessV1, number> = { required: 260, core_candidate: 140, support: 55, optional: 0 };

type WindowState = { w: StudyWindowV1; cursor: number };
type PlannedPart = { state: WindowState; start: number; end: number };

const uniq = <T>(values: T[]) => [...new Set(values)];

function integer(name: string, value: number, min: number, max: number) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`invalid-${name}:${String(value)}`);
}

function finite(name: string, value: number, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`invalid-${name}:${String(value)}`);
}

function safeText(value: string) {
  for (const pattern of PROHIBITED_COPY) if (pattern.test(value)) throw new Error(`prohibited-capacity-copy:${String(pattern)}`);
}

function requiredText(name: string, value: unknown, maximumLength = 256): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.length > maximumLength) throw new Error(`invalid-${name}`);
  safeText(value);
}

function metadataSafe(value: unknown): void {
  const raw = /(rawText|rawOcrText|ocrText|problemText|questionText|userAnswer|answerText|sourceText|copyrightedText|fullText)/i;
  if (typeof value === "string") {
    safeText(value);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(metadataSafe);
    return;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (raw.test(key)) throw new Error(`raw-body-field-not-allowed:${key}`);
    metadataSafe(nested);
  }
}

function exactKeys(name: string, value: unknown, allowed: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`invalid-${name}`);
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) if (!allowedSet.has(key)) throw new Error(`unknown-${name}-field:${key}`);
}

function enumValue<T extends string>(name: string, value: unknown, allowed: readonly T[]): asserts value is T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new Error(`unsupported-${name}:${String(value)}`);
}

function uniqueEnumArray<T extends string>(name: string, value: unknown, allowed: readonly T[]): asserts value is T[] {
  if (!Array.isArray(value)) throw new Error(`invalid-${name}`);
  const seen = new Set<string>();
  for (const entry of value) {
    enumValue(name, entry, allowed);
    if (seen.has(entry)) throw new Error(`duplicate-${name}:${entry}`);
    seen.add(entry);
  }
}

function dateOrdinal(name: string, value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`invalid-${name}:${String(value)}`);
  const [year, month, day] = value.split("-").map(Number);
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error(`invalid-${name}:${value}`);
  return Math.floor(time / DAY_MS);
}

function validProfile(profile: LearnerConstraintProfileV1) {
  exactKeys("profile", profile, ["lifeMode", "examMode", "phase", "scheduleVolatility", "targetExamDates", "policyVersion"]);
  enumValue("life-mode", profile.lifeMode, LIFE_MODES);
  enumValue("exam-mode", profile.examMode, EXAM_MODES);
  enumValue("study-phase", profile.phase, STUDY_PHASES);
  enumValue("schedule-volatility", profile.scheduleVolatility, VOLATILITY);
  requiredText("policy-version", profile.policyVersion, 128);
  if (profile.targetExamDates !== undefined) {
    exactKeys("target-exam-dates", profile.targetExamDates, ["first", "second"]);
    if (profile.targetExamDates.first !== undefined) dateOrdinal("first-exam-date", profile.targetExamDates.first);
    if (profile.targetExamDates.second !== undefined) dateOrdinal("second-exam-date", profile.targetExamDates.second);
  }
}

function validateHistory(history: CapacityHistoryDayV1[] | undefined, asOfDate: string) {
  const asOf = dateOrdinal("capacity-as-of-date", asOfDate);
  if (history === undefined) return [];
  if (!Array.isArray(history)) throw new Error("invalid-capacity-history");
  const dates = new Set<string>();
  const validated = history.map((day) => {
    exactKeys("capacity-history-day", day, ["date", "plannedActiveMinutes", "actualActiveMinutes", "appInteractionMinutes", "providerWaitMinutes", "highLoadPlannedMinutes", "highLoadCompletedMinutes", "replanCount", "fatigueSelfReport", "lateSessionErrorDelta"]);
    const ordinal = dateOrdinal("capacity-history-date", day.date);
    if (ordinal >= asOf) throw new Error(`capacity-history-not-before-as-of:${day.date}`);
    if (dates.has(day.date)) throw new Error(`duplicate-capacity-history-date:${day.date}`);
    dates.add(day.date);
    integer("history-planned-active-minutes", day.plannedActiveMinutes, 0, 1440);
    integer("history-actual-active-minutes", day.actualActiveMinutes, 0, 1440);
    for (const [name, value] of [["history-app-interaction-minutes", day.appInteractionMinutes], ["history-provider-wait-minutes", day.providerWaitMinutes], ["history-high-load-planned-minutes", day.highLoadPlannedMinutes], ["history-high-load-completed-minutes", day.highLoadCompletedMinutes]] as const) {
      if (value !== undefined) integer(name, value, 0, 1440);
    }
    if (day.actualActiveMinutes + (day.appInteractionMinutes ?? 0) + (day.providerWaitMinutes ?? 0) > 1440) throw new Error(`history-tracked-minutes-exceed-day:${day.date}`);
    if ((day.highLoadCompletedMinutes ?? 0) > day.actualActiveMinutes) throw new Error(`history-high-load-exceeds-actual:${day.date}`);
    if (day.replanCount !== undefined) integer("history-replan-count", day.replanCount, 0, 100);
    if (day.fatigueSelfReport !== undefined) integer("history-fatigue-self-report", day.fatigueSelfReport, 1, 5);
    if (day.lateSessionErrorDelta !== undefined) finite("history-late-session-error-delta", day.lateSessionErrorDelta, -10, 10);
    return { day, ordinal };
  });
  return validated.filter(({ ordinal }) => asOf - ordinal <= 28).sort((a, b) => a.ordinal - b.ordinal).slice(-28).map(({ day }) => day);
}

const usable = (day: CapacityHistoryDayV1) => day.actualActiveMinutes;
const pct = (value: number, ratio: number) => Math.max(0, Math.floor(value * ratio));

function percentile(values: number[], ratio: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)))];
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
}

export function classifyCapacityBand(minutes: number): CapacityBandV1 {
  integer("capacity-minutes", minutes, MIN_ACTIVE_MINUTES, MAX_ACTIVE_MINUTES);
  return minutes <= 90 ? "micro_30_90" : minutes <= 180 ? "compressed_90_180" : minutes <= 360 ? "standard_180_360" : minutes < 600 ? "intensive_360_600" : "full_day_600_720";
}

function ratios(band: CapacityBandV1, phase: StudyPhaseV1) {
  if (phase === "recovery") return { high: 0.2, medium: 0.3, low: 0.35, recovery: 0.15 };
  if (band === "micro_30_90") return { high: 0.35, medium: 0.35, low: 0.25, recovery: 0.05 };
  if (band === "compressed_90_180") return { high: 0.45, medium: 0.35, low: 0.15, recovery: 0.05 };
  if (band === "standard_180_360") return { high: 0.5, medium: 0.3, low: 0.15, recovery: 0.05 };
  if (band === "intensive_360_600") return { high: 0.48, medium: 0.3, low: 0.15, recovery: 0.07 };
  return { high: 0.45, medium: 0.3, low: 0.15, recovery: 0.1 };
}

const continuous = (band: CapacityBandV1, phase: StudyPhaseV1) => phase === "recovery" ? 45 : band === "micro_30_90" ? 60 : band === "compressed_90_180" ? 75 : band === "standard_180_360" ? 100 : 120;

function loadBudgets(minutes: number, band: CapacityBandV1, phase: StudyPhaseV1) {
  const ratio = ratios(band, phase);
  const high = pct(minutes, ratio.high);
  const medium = pct(minutes, ratio.medium);
  const low = pct(minutes, ratio.low);
  return { high, medium, low, recovery: Math.max(0, minutes - high - medium - low) };
}

export function buildCapacityEnvelope(input: { profile: LearnerConstraintProfileV1; declaredActiveMinutes: number; asOfDate: string; history?: CapacityHistoryDayV1[]; recoveryOverrideMinutes?: number }): CapacityEnvelopeV1 {
  metadataSafe(input);
  exactKeys("capacity-envelope-input", input, ["profile", "declaredActiveMinutes", "asOfDate", "history", "recoveryOverrideMinutes"]);
  validProfile(input.profile);
  integer("declared-active-minutes", input.declaredActiveMinutes, 30, 720);
  dateOrdinal("capacity-as-of-date", input.asOfDate);
  if (input.recoveryOverrideMinutes !== undefined) integer("recovery-override-minutes", input.recoveryOverrideMinutes, 30, 720);
  const history = validateHistory(input.history, input.asOfDate);
  const usableMinutes = history.map(usable);
  const evidenceLevel: CapacityEvidenceLevelV1 = usableMinutes.length >= 14 ? "evidence_supported_14d" : usableMinutes.length >= 7 ? "calibrating_7d" : "declared_only";
  const derivationReasons: string[] = [];
  let effective = input.declaredActiveMinutes;
  if (usableMinutes.length >= 7) {
    effective = Math.max(30, Math.min(input.declaredActiveMinutes, Math.floor(percentile(usableMinutes, usableMinutes.length >= 14 ? 0.6 : 0.5) * 1.05)));
    derivationReasons.push(`recent-active-evidence:${usableMinutes.length}d`);
    if (effective < input.declaredActiveMinutes) derivationReasons.push("declared-capacity-reduced-to-sustainable-evidence");
  } else {
    derivationReasons.push("declared-capacity-used-pending-evidence");
  }
  const fatigueDays = history.filter((day) => (day.fatigueSelfReport ?? 0) >= 4).length;
  const lateErrorDays = history.filter((day) => (day.lateSessionErrorDelta ?? 0) > 0).length;
  if (history.length >= 7 && (fatigueDays / history.length >= 0.35 || lateErrorDays / history.length >= 0.35)) {
    effective = Math.max(30, Math.floor(effective * 0.9));
    derivationReasons.push("fatigue-or-late-error-guardrail-applied");
  }
  if (input.profile.phase === "recovery") {
    effective = Math.min(effective, input.recoveryOverrideMinutes ?? 180);
    derivationReasons.push("recovery-phase-cap-applied");
  } else if (input.recoveryOverrideMinutes !== undefined) {
    effective = Math.min(effective, input.recoveryOverrideMinutes);
    derivationReasons.push("manual-recovery-override-applied");
  }
  effective = Math.max(30, Math.min(720, effective));
  const capacityBand = classifyCapacityBand(effective);
  const buffer = Math.max(capacityBand === "full_day_600_720" ? 30 : 5, pct(effective, capacityBand === "full_day_600_720" ? 0.08 : capacityBand === "intensive_360_600" ? 0.06 : 0.04));
  const schedulable = Math.max(0, effective - buffer);
  const budgets = loadBudgets(schedulable, capacityBand, input.profile.phase);
  const output: CapacityEnvelopeV1 = {
    declaredActiveMinutes: input.declaredActiveMinutes,
    effectiveActiveMinutes: effective,
    schedulableActiveMinutes: schedulable,
    capacityBand,
    evidenceLevel,
    historyDaysUsed: usableMinutes.length,
    highLoadBudgetMinutes: budgets.high,
    mediumLoadBudgetMinutes: budgets.medium,
    lowLoadBudgetMinutes: budgets.low,
    recoveryBudgetMinutes: budgets.recovery,
    unallocatedBufferMinutes: buffer,
    maxContinuousHighLoadMinutes: continuous(capacityBand, input.profile.phase),
    derivationReasons,
    policyVersion: input.profile.policyVersion,
  };
  metadataSafe(output);
  return output;
}

function validateAvailability(availability: DayAvailabilityV1) {
  exactKeys("day-availability", availability, ["date", "dayKind", "declaredActiveMinutes", "windows", "externalCommitmentMinutes"]);
  dateOrdinal("study-date", availability.date);
  enumValue("day-kind", availability.dayKind, DAY_KINDS);
  integer("day-declared-active-minutes", availability.declaredActiveMinutes, 30, 720);
  if (availability.externalCommitmentMinutes !== undefined) integer("external-commitment-minutes", availability.externalCommitmentMinutes, 0, 1440);
  if (!Array.isArray(availability.windows) || availability.windows.length > MAX_WINDOWS_PER_DAY) throw new Error(`invalid-study-window-count:${String(availability.windows?.length)}`);
  const ids = new Set<string>();
  for (const window of availability.windows) {
    exactKeys("study-window", window, ["id", "startMinute", "endMinute", "environment", "interruptibility", "protected", "allowedTaskKinds"]);
    requiredText("window-id", window.id, 128);
    if (ids.has(window.id)) throw new Error(`duplicate-window-id:${window.id}`);
    ids.add(window.id);
    integer("window-start-minute", window.startMinute, 0, 1439);
    integer("window-end-minute", window.endMinute, 1, 1440);
    if (window.endMinute <= window.startMinute) throw new Error(`invalid-window-order:${window.id}`);
    enumValue("window-environment", window.environment, ENVIRONMENTS);
    enumValue("window-interruptibility", window.interruptibility, INTERRUPTIBILITY);
    if (window.protected !== undefined && typeof window.protected !== "boolean") throw new Error(`invalid-window-protected:${window.id}`);
    if (window.allowedTaskKinds !== undefined) uniqueEnumArray("window-allowed-task-kind", window.allowedTaskKinds, TASK_KINDS);
  }
  const sorted = [...availability.windows].sort((left, right) => left.startMinute - right.startMinute);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].startMinute < sorted[index - 1].endMinute) throw new Error(`overlapping-study-windows:${sorted[index - 1].id}:${sorted[index].id}`);
  }
}

function validateCandidate(candidate: StudyTaskCandidateV1) {
  exactKeys("candidate", candidate, ["id", "title", "subject", "taskKind", "cognitiveLoad", "requiredness", "estimatedMinutes", "minimumContinuousMinutes", "splittable", "maxParts", "allowedEnvironments", "requiresDesk", "requiresCalculator", "requiresDesktop", "prioritySignals", "basePriority", "outcomeKey", "sourceRef", "metadataOnly"]);
  requiredText("candidate-id", candidate.id, 128);
  requiredText(`candidate-title:${candidate.id}`, candidate.title, 256);
  requiredText(`candidate-subject:${candidate.id}`, candidate.subject, 128);
  enumValue("candidate-task-kind", candidate.taskKind, TASK_KINDS);
  enumValue("candidate-cognitive-load", candidate.cognitiveLoad, COGNITIVE_LOADS);
  enumValue("candidate-requiredness", candidate.requiredness, REQUIREDNESS);
  integer("candidate-estimated-minutes", candidate.estimatedMinutes, 1, 720);
  integer("candidate-base-priority", candidate.basePriority, -10_000, 10_000);
  if (candidate.minimumContinuousMinutes !== undefined) integer("candidate-minimum-continuous-minutes", candidate.minimumContinuousMinutes, 1, candidate.estimatedMinutes);
  if (candidate.splittable !== undefined && typeof candidate.splittable !== "boolean") throw new Error(`invalid-candidate-splittable:${candidate.id}`);
  if (candidate.maxParts !== undefined) {
    integer("candidate-max-parts", candidate.maxParts, 2, MAX_SPLIT_PARTS);
    if (candidate.splittable !== true) throw new Error(`max-parts-requires-splittable:${candidate.id}`);
  }
  if (candidate.allowedEnvironments !== undefined) uniqueEnumArray("candidate-allowed-environment", candidate.allowedEnvironments, ENVIRONMENTS);
  for (const [name, value] of [["requires-desk", candidate.requiresDesk], ["requires-calculator", candidate.requiresCalculator], ["requires-desktop", candidate.requiresDesktop]] as const) {
    if (value !== undefined && typeof value !== "boolean") throw new Error(`invalid-candidate-${name}:${candidate.id}`);
  }
  uniqueEnumArray("candidate-priority-signal", candidate.prioritySignals, PRIORITY_SIGNALS);
  if (candidate.outcomeKey !== undefined) requiredText(`candidate-outcome-key:${candidate.id}`, candidate.outcomeKey, 128);
  if (candidate.sourceRef !== undefined) requiredText(`candidate-source-ref:${candidate.id}`, candidate.sourceRef, 512);
  if (candidate.metadataOnly !== undefined && candidate.metadataOnly !== true) throw new Error(`candidate-metadata-only-required:${candidate.id}`);
}

function score(candidate: StudyTaskCandidateV1) {
  return candidate.basePriority + REQUIRED[candidate.requiredness] + candidate.prioritySignals.reduce((sum, signal) => sum + SIGNAL[signal], 0);
}

function compareCandidatesForDay(profile: LearnerConstraintProfileV1, availability: DayAvailabilityV1, left: StudyTaskCandidateV1, right: StudyTaskCandidateV1) {
  const scoreDifference = score(right) - score(left);
  if (scoreDifference !== 0) return scoreDifference;
  if (profile.lifeMode === "full_time_employed") {
    const leftLong = left.estimatedMinutes >= 100 ? 1 : 0;
    const rightLong = right.estimatedMinutes >= 100 ? 1 : 0;
    if (availability.dayKind === "weekend" && leftLong !== rightLong) return rightLong - leftLong;
    if (availability.dayKind === "weekday" && leftLong !== rightLong) return leftLong - rightLong;
  }
  return left.estimatedMinutes - right.estimatedMinutes || left.id.localeCompare(right.id);
}

function compatible(candidate: StudyTaskCandidateV1, window: StudyWindowV1, allowProtected = false) {
  if (window.protected && !allowProtected) return false;
  if (candidate.cognitiveLoad === "high" && window.interruptibility === "high") return false;
  if (window.allowedTaskKinds && !window.allowedTaskKinds.includes(candidate.taskKind)) return false;
  if (candidate.allowedEnvironments && !candidate.allowedEnvironments.includes(window.environment)) return false;
  if ((candidate.requiresDesk || candidate.requiresDesktop || candidate.requiresCalculator) && !["desk", "library"].includes(window.environment)) return false;
  return !(["commute_public_transit", "walking"].includes(window.environment) && ["timed_set", "timed_answer_writing", "independent_problem_solving", "rewrite_recalculate", "mock_set"].includes(candidate.taskKind));
}

const interruptionRank = (window: StudyWindowV1) => window.interruptibility === "low" ? 0 : window.interruptibility === "medium" ? 1 : 2;

function compareEligibleWindows(candidate: StudyTaskCandidateV1, left: WindowState, right: WindowState) {
  if (candidate.cognitiveLoad === "high" || candidate.estimatedMinutes >= 100) {
    const interruptionDifference = interruptionRank(left.w) - interruptionRank(right.w);
    if (interruptionDifference !== 0) return interruptionDifference;
  }
  return (left.w.endMinute - left.cursor) - (right.w.endMinute - right.cursor) || left.w.startMinute - right.w.startMinute || left.w.id.localeCompare(right.w.id);
}

function capEnvelopeToWindows(envelope: CapacityEnvelopeV1, availability: DayAvailabilityV1, phase: StudyPhaseV1) {
  const usableWindowMinutes = availability.windows.filter((window) => !window.protected).reduce((sum, window) => sum + window.endMinute - window.startMinute, 0);
  const schedulable = Math.min(envelope.schedulableActiveMinutes, usableWindowMinutes);
  if (schedulable === envelope.schedulableActiveMinutes) return envelope;
  const budgets = loadBudgets(schedulable, envelope.capacityBand, phase);
  return {
    ...envelope,
    schedulableActiveMinutes: schedulable,
    highLoadBudgetMinutes: budgets.high,
    mediumLoadBudgetMinutes: budgets.medium,
    lowLoadBudgetMinutes: budgets.low,
    recoveryBudgetMinutes: budgets.recovery,
    unallocatedBufferMinutes: Math.max(envelope.unallocatedBufferMinutes, envelope.effectiveActiveMinutes - schedulable),
    derivationReasons: uniq([...envelope.derivationReasons, "usable-nonprotected-window-cap-applied"]),
  };
}

function highLoadRunExceeds(blocks: ExecutionBlockV1[], parts: PlannedPart[], maximumMinutes: number) {
  const intervals = [
    ...blocks.filter((block) => block.cognitiveLoad === "high").map((block) => ({ start: block.startMinute, end: block.endMinute })),
    ...parts.map((part) => ({ start: part.start, end: part.end })),
  ].sort((left, right) => left.start - right.start || left.end - right.end);
  let runStart = -1;
  let runEnd = -1;
  for (const interval of intervals) {
    if (runStart < 0 || interval.start > runEnd) {
      runStart = interval.start;
      runEnd = interval.end;
    } else {
      runEnd = Math.max(runEnd, interval.end);
    }
    if (runEnd - runStart > maximumMinutes) return true;
  }
  return false;
}

function materializeSplitParts(candidate: StudyTaskCandidateV1, selected: { state: WindowState; capacity: number }[], minimum: number, blocks: ExecutionBlockV1[], maxContinuousHighLoadMinutes: number) {
  if (candidate.cognitiveLoad === "high") {
    let answer: PlannedPart[] | null = null;
    const durations: number[] = [];
    const place = (index: number, parts: PlannedPart[]) => {
      if (answer) return;
      if (index === selected.length) {
        answer = [...parts];
        return;
      }
      const { state } = selected[index];
      const duration = durations[index];
      const latestStart = state.w.endMinute - duration;
      const earliestStart = parts.reduce((start, part) => part.state === state ? Math.max(start, part.end + 1) : start, state.cursor);
      for (let start = earliestStart; start <= latestStart; start += 1) {
        const part = { state, start, end: start + duration };
        if (highLoadRunExceeds(blocks, [...parts, part], maxContinuousHighLoadMinutes)) continue;
        parts.push(part);
        place(index + 1, parts);
        parts.pop();
        if (answer) return;
      }
    };
    const allocate = (index: number, remaining: number) => {
      if (answer) return;
      if (index === selected.length) {
        if (remaining === 0) place(0, []);
        return;
      }
      const remainingMinimum = (selected.length - index - 1) * minimum;
      const remainingMaximum = selected.slice(index + 1).reduce((sum, entry) => sum + entry.capacity, 0);
      const minimumDuration = Math.max(minimum, remaining - remainingMaximum);
      const maximumDuration = Math.min(selected[index].capacity, remaining - remainingMinimum);
      for (let duration = maximumDuration; duration >= minimumDuration; duration -= 1) {
        durations[index] = duration;
        allocate(index + 1, remaining - duration);
        if (answer) return;
      }
    };
    allocate(0, candidate.estimatedMinutes);
    return answer;
  }
  const minutes = selected.map(() => minimum);
  let remaining = candidate.estimatedMinutes - minutes.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < selected.length && remaining > 0; index += 1) {
    const addition = Math.min(remaining, selected[index].capacity - minutes[index]);
    minutes[index] += addition;
    remaining -= addition;
  }
  if (remaining !== 0) return null;
  return selected.map(({ state }, index) => ({ state, start: state.cursor, end: state.cursor + minutes[index] }));
}

function chooseSplitStates(candidate: StudyTaskCandidateV1, states: WindowState[], blocks: ExecutionBlockV1[], maxContinuousHighLoadMinutes: number): PlannedPart[] | null {
  const minimum = candidate.minimumContinuousMinutes ?? 1;
  const maxParts = candidate.maxParts ?? 2;
  const eligible = states
    .filter(({ w }) => compatible(candidate, w))
    .map((state) => ({ state, capacity: Math.min(state.w.endMinute - state.cursor, candidate.cognitiveLoad === "high" ? maxContinuousHighLoadMinutes : candidate.estimatedMinutes) }))
    .filter(({ capacity }) => capacity >= minimum)
    .sort((left, right) => compareEligibleWindows(candidate, left.state, right.state) || left.capacity - right.capacity);
  const options = eligible.map(({ state, capacity }) => {
    const available = state.w.endMinute - state.cursor;
    const maximumStateParts = candidate.cognitiveLoad === "high"
      ? Math.min(maxParts, Math.floor((available + 1) / (minimum + 1)))
      : 1;
    const stateOptions = [{ count: 0, capacities: [] as number[], totalCapacity: 0 }];
    for (let count = 1; count <= maximumStateParts; count += 1) {
      const totalCapacity = candidate.cognitiveLoad === "high"
        ? Math.min(candidate.estimatedMinutes, available - (count - 1), count * maxContinuousHighLoadMinutes)
        : capacity;
      if (totalCapacity < count * minimum) continue;
      const capacities = Array.from({ length: count }, () => minimum);
      let remaining = totalCapacity - count * minimum;
      for (let index = 0; index < capacities.length && remaining > 0; index += 1) {
        const maximum = candidate.cognitiveLoad === "high" ? maxContinuousHighLoadMinutes : capacity;
        const addition = Math.min(remaining, maximum - capacities[index]);
        capacities[index] += addition;
        remaining -= addition;
      }
      stateOptions.push({ count, capacities, totalCapacity });
    }
    return stateOptions;
  });
  const suffixCapacity = Array.from({ length: eligible.length + 1 }, () => Array.from({ length: maxParts + 1 }, () => Number.NEGATIVE_INFINITY));
  suffixCapacity[eligible.length][0] = 0;
  for (let stateIndex = eligible.length - 1; stateIndex >= 0; stateIndex -= 1) {
    for (let parts = 0; parts <= maxParts; parts += 1) {
      for (const option of options[stateIndex]) {
        if (option.count > parts || !Number.isFinite(suffixCapacity[stateIndex + 1][parts - option.count])) continue;
        suffixCapacity[stateIndex][parts] = Math.max(suffixCapacity[stateIndex][parts], option.totalCapacity + suffixCapacity[stateIndex + 1][parts - option.count]);
      }
    }
  }
  const selected: typeof eligible = [];
  let answer: PlannedPart[] | null = null;
  const search = (stateIndex: number, remainingParts: number, capacity: number) => {
    if (answer) return;
    if (capacity + suffixCapacity[stateIndex][remainingParts] < candidate.estimatedMinutes) return;
    if (stateIndex === eligible.length) {
      if (remainingParts !== 0 || capacity < candidate.estimatedMinutes) return;
      const plannedParts = materializeSplitParts(candidate, selected, minimum, blocks, maxContinuousHighLoadMinutes);
      if (plannedParts) answer = plannedParts;
      return;
    }
    for (const option of [...options[stateIndex]].reverse()) {
      if (option.count > remainingParts) continue;
      for (const partCapacity of option.capacities) selected.push({ state: eligible[stateIndex].state, capacity: partCapacity });
      search(stateIndex + 1, remainingParts - option.count, capacity + option.totalCapacity);
      selected.splice(selected.length - option.count, option.count);
      if (answer) return;
    }
  };
  for (let parts = 1; parts <= maxParts && !answer; parts += 1) {
    if (candidate.estimatedMinutes < parts * minimum || suffixCapacity[0][parts] < candidate.estimatedMinutes) continue;
    search(0, parts, 0);
  }
  return answer;
}

function chooseParts(candidate: StudyTaskCandidateV1, states: WindowState[], blocks: ExecutionBlockV1[], maxContinuousHighLoadMinutes: number): PlannedPart[] | null {
  if (candidate.splittable === true) return chooseSplitStates(candidate, states, blocks, maxContinuousHighLoadMinutes);
  if (candidate.cognitiveLoad === "high" && candidate.estimatedMinutes > maxContinuousHighLoadMinutes) return null;
  const requiredContinuous = Math.max(candidate.estimatedMinutes, candidate.minimumContinuousMinutes ?? candidate.estimatedMinutes);
  const eligible = states
    .filter(({ w, cursor }) => compatible(candidate, w) && w.endMinute - cursor >= requiredContinuous)
    .sort((left, right) => compareEligibleWindows(candidate, left, right));
  for (const state of eligible) {
    const latestStart = state.w.endMinute - candidate.estimatedMinutes;
    for (let start = state.cursor; start <= latestStart; start += 1) {
      const parts = [{ state, start, end: start + candidate.estimatedMinutes }];
      if (candidate.cognitiveLoad !== "high" || !highLoadRunExceeds(blocks, parts, maxContinuousHighLoadMinutes)) return parts;
    }
  }
  return null;
}

function hasStructuralPlacement(candidate: StudyTaskCandidateV1, states: WindowState[], maxContinuousHighLoadMinutes: number) {
  if (candidate.splittable !== true) {
    if (candidate.cognitiveLoad === "high" && candidate.estimatedMinutes > maxContinuousHighLoadMinutes) return false;
    const requiredContinuous = Math.max(candidate.estimatedMinutes, candidate.minimumContinuousMinutes ?? candidate.estimatedMinutes);
    return states.some(({ w, cursor }) => compatible(candidate, w) && w.endMinute - cursor >= requiredContinuous);
  }
  const minimum = candidate.minimumContinuousMinutes ?? 1;
  const maximumParts = candidate.maxParts ?? 2;
  const capacities = states
    .filter(({ w }) => compatible(candidate, w))
    .flatMap(({ w, cursor }) => {
      const available = w.endMinute - cursor;
      if (candidate.cognitiveLoad !== "high") return [Math.min(available, candidate.estimatedMinutes)];
      const possibleParts = Math.min(maximumParts, Math.floor((available + 1) / (minimum + 1)));
      return Array.from({ length: possibleParts }, (_, index) => Math.min(maxContinuousHighLoadMinutes, available - index * (minimum + 1)));
    })
    .filter((capacity) => capacity >= minimum)
    .sort((left, right) => right - left)
    .slice(0, maximumParts);
  for (let parts = 1; parts <= capacities.length; parts += 1) {
    if (candidate.estimatedMinutes >= parts * minimum && capacities.slice(0, parts).reduce((sum, capacity) => sum + capacity, 0) >= candidate.estimatedMinutes) return true;
  }
  return false;
}

function outcomeLimit(profile: LearnerConstraintProfileV1, availability: DayAvailabilityV1, envelope: CapacityEnvelopeV1) {
  if (envelope.capacityBand === "micro_30_90" || profile.phase === "recovery") return 1;
  if (profile.lifeMode === "full_time_employed" && availability.dayKind === "weekday") return 2;
  if (profile.lifeMode === "shift_or_irregular_work" && profile.scheduleVolatility === "high") return 2;
  return MAX_CORE_OUTCOMES;
}

function buildPlanGap(envelope: CapacityEnvelopeV1, candidates: StudyTaskCandidateV1[], scheduled: Set<string>, availability: DayAvailabilityV1): PlanGapV1 | null {
  const required = candidates.filter((candidate) => candidate.requiredness === "required");
  const missing = required.filter((candidate) => !scheduled.has(candidate.id));
  const requiredMinutes = required.reduce((sum, candidate) => sum + candidate.estimatedMinutes, 0);
  const shortfall = Math.max(0, requiredMinutes - envelope.schedulableActiveMinutes);
  if (!missing.length && !shortfall) return null;
  const reasons: PlanGapReasonV1[] = [];
  if (missing.some((candidate) => candidate.prioritySignals.includes("due_review"))) reasons.push("due_review_overload");
  if (missing.some((candidate) => candidate.prioritySignals.includes("coverage_gap"))) reasons.push("coverage_gap");
  if (missing.some((candidate) => candidate.prioritySignals.includes("timed_evidence_missing"))) reasons.push("timed_evidence_missing");
  if ((availability.externalCommitmentMinutes ?? 0) > 0) reasons.push("external_commitment");
  if (missing.some((candidate) => candidate.prioritySignals.includes("recent_absence"))) reasons.push("recent_absence");
  if (missing.some((candidate) => candidate.prioritySignals.includes("exam_urgency"))) reasons.push("exam_urgency");
  const choices: PlanGapChoiceV1[] = ["drop_low_value_scope", "shorten_support_tasks", "defer_noncritical_scope"];
  if (missing.some((candidate) => candidate.estimatedMinutes >= 100)) choices.push("move_long_task_to_weekend");
  choices.push("increase_capacity", "change_target_timeline");
  return { forecastCapacityMinutes: envelope.schedulableActiveMinutes, requiredPlanMinutes: requiredMinutes, shortfallMinutes: shortfall, reasons: uniq(reasons.length ? reasons : ["coverage_gap"]), choices: uniq(choices), claimBoundary: "schedule_feasibility_only_not_pass_probability", metadataOnly: true };
}

export function buildStudyDayPlan(input: { profile: LearnerConstraintProfileV1; availability: DayAvailabilityV1; candidates: StudyTaskCandidateV1[]; capacityHistory?: CapacityHistoryDayV1[]; recoveryOverrideMinutes?: number }): StudyDayPlanV1 {
  metadataSafe(input);
  exactKeys("study-day-plan-input", input, ["profile", "availability", "candidates", "capacityHistory", "recoveryOverrideMinutes"]);
  validProfile(input.profile);
  validateAvailability(input.availability);
  if (!Array.isArray(input.candidates) || input.candidates.length > MAX_CANDIDATES_PER_PLAN) throw new Error(`invalid-study-candidate-count:${String(input.candidates?.length)}`);
  const candidateIds = new Set<string>();
  for (const candidate of input.candidates) {
    validateCandidate(candidate);
    if (candidateIds.has(candidate.id)) throw new Error(`duplicate-candidate-id:${candidate.id}`);
    candidateIds.add(candidate.id);
  }
  const derivedEnvelope = buildCapacityEnvelope({ profile: input.profile, declaredActiveMinutes: input.availability.declaredActiveMinutes, asOfDate: input.availability.date, history: input.capacityHistory, recoveryOverrideMinutes: input.recoveryOverrideMinutes });
  const envelope = capEnvelopeToWindows(derivedEnvelope, input.availability, input.profile.phase);
  const states = input.availability.windows.filter((window) => !window.protected).map((window) => ({ w: window, cursor: window.startMinute }));
  const used: Record<CognitiveLoadV1, number> = { high: 0, medium: 0, low: 0, recovery: 0 };
  const budgets: Record<CognitiveLoadV1, number> = { high: envelope.highLoadBudgetMinutes, medium: envelope.mediumLoadBudgetMinutes, low: envelope.lowLoadBudgetMinutes, recovery: envelope.recoveryBudgetMinutes };
  const blocks: ExecutionBlockV1[] = [];
  const deferred: DeferredTaskV1[] = [];
  const scheduled = new Set<string>();
  const ordered = [...input.candidates].sort((left, right) => compareCandidatesForDay(input.profile, input.availability, left, right));
  for (const candidate of ordered) {
    const loadExceeded = used[candidate.cognitiveLoad] + candidate.estimatedMinutes > budgets[candidate.cognitiveLoad];
    const plannedMinutes = blocks.reduce((sum, block) => sum + block.activeMinutes, 0);
    const activeExceeded = plannedMinutes + candidate.estimatedMinutes > envelope.schedulableActiveMinutes;
    const structurallyPlaceable = hasStructuralPlacement(candidate, states, envelope.maxContinuousHighLoadMinutes);
    const parts = structurallyPlaceable && !loadExceeded && !activeExceeded ? chooseParts(candidate, states, blocks, envelope.maxContinuousHighLoadMinutes) : null;
    if (!parts) {
      const anyUnprotectedCompatible = states.some(({ w }) => compatible(candidate, w));
      const protectedCompatible = input.availability.windows.some((window) => Boolean(window.protected) && compatible(candidate, window, true));
      let reason: DeferralReasonV1 = !anyUnprotectedCompatible ? (protectedCompatible ? "protected_window_conflict" : "environment_incompatible") : !structurallyPlaceable ? (input.profile.lifeMode === "full_time_employed" && input.availability.dayKind === "weekday" && candidate.estimatedMinutes >= 100 ? "move_long_task_to_weekend" : "continuous_window_missing") : loadExceeded ? "cognitive_load_budget_exhausted" : activeExceeded ? (candidate.requiredness === "optional" ? "optional_scope_dropped" : "capacity_exhausted") : "continuous_window_missing";
      if (input.profile.phase === "recovery" && candidate.requiredness !== "required") reason = "recovery_mode";
      deferred.push({ candidateId: candidate.id, title: candidate.title, reason, nextEligibleDayKind: reason === "move_long_task_to_weekend" ? "weekend" : undefined, metadataOnly: true });
      continue;
    }
    used[candidate.cognitiveLoad] += candidate.estimatedMinutes;
    scheduled.add(candidate.id);
    parts.forEach((part, index) => {
      part.state.cursor = part.end;
      blocks.push({
        blockId: parts.length === 1 ? `block:${input.availability.date}:${candidate.id}` : `block:${input.availability.date}:${candidate.id}:part:${index + 1}`,
        candidateId: candidate.id,
        outcomeKey: candidate.outcomeKey ?? candidate.id,
        title: candidate.title,
        subject: candidate.subject,
        taskKind: candidate.taskKind,
        cognitiveLoad: candidate.cognitiveLoad,
        startMinute: part.start,
        endMinute: part.end,
        activeMinutes: part.end - part.start,
        windowId: part.state.w.id,
        requiredness: candidate.requiredness,
        countsTowardActiveStudy: true,
        selectionReasons: uniq([`requiredness:${candidate.requiredness}`, ...candidate.prioritySignals.map((signal) => `priority:${signal}`), `life-mode:${input.profile.lifeMode}`, `day-kind:${input.availability.dayKind}`]),
        metadataOnly: true,
      });
    });
  }
  blocks.sort((left, right) => left.startMinute - right.startMinute || left.blockId.localeCompare(right.blockId));
  const candidateMap = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const groups = new Map<string, ExecutionBlockV1[]>();
  for (const block of [...blocks].sort((left, right) => score(candidateMap.get(right.candidateId!)!) - score(candidateMap.get(left.candidateId!)!))) {
    if (block.requiredness === "support" || block.requiredness === "optional") continue;
    const key = block.outcomeKey ?? block.blockId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(block);
  }
  const outcomes: CoreOutcomeV1[] = [...groups.entries()].slice(0, outcomeLimit(input.profile, input.availability, envelope)).map(([key, groupBlocks], index) => ({
    outcomeId: `outcome:${input.availability.date}:${index + 1}:${hash(key)}`,
    title: groupBlocks[0].title,
    blockIds: groupBlocks.map((block) => block.blockId),
    estimatedMinutes: groupBlocks.reduce((sum, block) => sum + block.activeMinutes, 0),
    reason: groupBlocks[0].selectionReasons.filter((reason) => reason.startsWith("priority:")).slice(0, 2).join(", ") || "highest-value-executable-outcome",
    metadataOnly: true,
  }));
  if (outcomes.length > MAX_CORE_OUTCOMES) throw new Error("core-outcome-limit-violated");
  const plannedActiveMinutes = blocks.reduce((sum, block) => sum + block.activeMinutes, 0);
  if (plannedActiveMinutes > envelope.schedulableActiveMinutes) throw new Error("planned-active-minutes-exceed-capacity");
  const basis = JSON.stringify({ date: input.availability.date, profile: input.profile, envelope, blocks: blocks.map((block) => [block.blockId, block.candidateId, block.startMinute, block.endMinute, block.windowId]), deferred: deferred.map((entry) => [entry.candidateId, entry.reason]) });
  const output: StudyDayPlanV1 = {
    date: input.availability.date,
    profile: { ...input.profile },
    capacity: envelope,
    coreOutcomes: outcomes,
    executionBlocks: blocks,
    deferredTasks: deferred,
    planGap: buildPlanGap(envelope, input.candidates, scheduled, input.availability),
    plannedActiveMinutes,
    completionMeaning: "block_completion_is_not_mastery",
    masteryMutationAllowed: false,
    deterministicPlanDigest: `sclm-v1:${hash(basis)}`,
    metadataOnly: true,
  };
  metadataSafe(output);
  return output;
}

export function projectWeeklyFeasibility(input: { weeklyAvailableMinutes: number; requiredMinimumMinutes: number; requiredMaximumMinutes: number; reasons?: string[] }): FeasibilityProjectionV1 {
  metadataSafe(input);
  exactKeys("weekly-feasibility-input", input, ["weeklyAvailableMinutes", "requiredMinimumMinutes", "requiredMaximumMinutes", "reasons"]);
  integer("weekly-available-minutes", input.weeklyAvailableMinutes, 0, 5040);
  integer("required-minimum-minutes", input.requiredMinimumMinutes, 0, 5040);
  integer("required-maximum-minutes", input.requiredMaximumMinutes, input.requiredMinimumMinutes, 5040);
  if (input.reasons !== undefined) {
    if (!Array.isArray(input.reasons)) throw new Error("invalid-weekly-feasibility-reasons");
    input.reasons.forEach((reason) => requiredText("weekly-feasibility-reason", reason, 128));
  }
  const output: FeasibilityProjectionV1 = {
    status: input.weeklyAvailableMinutes < input.requiredMinimumMinutes ? "infeasible" : input.weeklyAvailableMinutes < input.requiredMaximumMinutes ? "tight" : "feasible",
    weeklyAvailableMinutes: input.weeklyAvailableMinutes,
    requiredMinimumMinutes: input.requiredMinimumMinutes,
    requiredMaximumMinutes: input.requiredMaximumMinutes,
    shortfallMinutes: Math.max(0, input.requiredMinimumMinutes - input.weeklyAvailableMinutes),
    claimBoundary: "schedule_feasibility_only_not_pass_probability",
    reasons: input.reasons ?? [],
    metadataOnly: true,
  };
  metadataSafe(output);
  return output;
}

export function buildStudyWeekPlan(input: { profile: LearnerConstraintProfileV1; days: DayAvailabilityV1[]; candidates: StudyTaskCandidateV1[]; capacityHistory?: CapacityHistoryDayV1[]; requiredMinimumMinutes: number; requiredMaximumMinutes: number }): StudyWeekPlanV1 {
  metadataSafe(input);
  exactKeys("study-week-plan-input", input, ["profile", "days", "candidates", "capacityHistory", "requiredMinimumMinutes", "requiredMaximumMinutes"]);
  validProfile(input.profile);
  if (!Array.isArray(input.candidates) || input.candidates.length > MAX_CANDIDATES_PER_PLAN) throw new Error(`invalid-study-candidate-count:${String(input.candidates?.length)}`);
  if (!Array.isArray(input.days) || !input.days.length || input.days.length > 7) throw new Error(`invalid-week-day-count:${String(input.days?.length)}`);
  if (new Set(input.days.map((day) => day.date)).size !== input.days.length) throw new Error("duplicate-week-date");
  let remaining = [...input.candidates];
  const plans: StudyDayPlanV1[] = [];
  for (const day of [...input.days].sort((left, right) => left.date.localeCompare(right.date))) {
    const candidates = [...remaining].sort((left, right) => compareCandidatesForDay(input.profile, day, left, right));
    const plan = buildStudyDayPlan({ profile: input.profile, availability: day, candidates, capacityHistory: input.capacityHistory });
    plans.push(plan);
    const completed = new Set(plan.executionBlocks.map((block) => block.candidateId).filter((candidateId): candidateId is string => Boolean(candidateId)));
    remaining = remaining.filter((candidate) => !completed.has(candidate.id));
  }
  const weeklyAvailableMinutes = plans.reduce((sum, plan) => sum + plan.capacity.schedulableActiveMinutes, 0);
  const weeklyPlannedMinutes = plans.reduce((sum, plan) => sum + plan.plannedActiveMinutes, 0);
  const output: StudyWeekPlanV1 = {
    profile: { ...input.profile },
    dayPlans: plans,
    weeklyAvailableMinutes,
    weeklyPlannedMinutes,
    remainingTaskIds: remaining.map((candidate) => candidate.id),
    feasibility: projectWeeklyFeasibility({ weeklyAvailableMinutes, requiredMinimumMinutes: input.requiredMinimumMinutes, requiredMaximumMinutes: input.requiredMaximumMinutes, reasons: remaining.length ? ["candidate-scope-remains-after-week-allocation"] : [] }),
    metadataOnly: true,
  };
  metadataSafe(output);
  return output;
}

export function buildPersonalDrillBudget(input: { next48hAvailableDrillMinutes: number; pendingDrillMinutes: number; estimatedMinutesPerNewItem: number; verifiedBankHasMatchingItems: boolean }): DrillBudgetV1 {
  metadataSafe(input);
  exactKeys("personal-drill-budget-input", input, ["next48hAvailableDrillMinutes", "pendingDrillMinutes", "estimatedMinutesPerNewItem", "verifiedBankHasMatchingItems"]);
  integer("next48h-drill-minutes", input.next48hAvailableDrillMinutes, 0, 1440);
  integer("pending-drill-minutes", input.pendingDrillMinutes, 0, 1440);
  integer("estimated-minutes-per-new-item", input.estimatedMinutesPerNewItem, 1, 180);
  if (typeof input.verifiedBankHasMatchingItems !== "boolean") throw new Error("invalid-verified-bank-match-state");
  const residualMinutes = Math.max(0, input.next48hAvailableDrillMinutes - input.pendingDrillMinutes);
  const generationBudgetMinutes = input.verifiedBankHasMatchingItems ? 0 : residualMinutes;
  const maximumNewItems = Math.floor(generationBudgetMinutes / input.estimatedMinutesPerNewItem);
  const output: DrillBudgetV1 = {
    next48hAvailableDrillMinutes: input.next48hAvailableDrillMinutes,
    pendingDrillMinutes: input.pendingDrillMinutes,
    newGenerationBudgetMinutes: generationBudgetMinutes,
    maximumNewItems,
    route: input.verifiedBankHasMatchingItems ? "verified_bank_first" : maximumNewItems ? "personal_generation_on_gap" : "no_generation_capacity",
    readinessEligible: false,
    crossUserReuseEligible: false,
    metadataOnly: true,
  };
  metadataSafe(output);
  return output;
}

function validatePreviousPlan(plan: StudyDayPlanV1) {
  exactKeys("previous-plan", plan, ["date", "profile", "capacity", "coreOutcomes", "executionBlocks", "deferredTasks", "planGap", "plannedActiveMinutes", "completionMeaning", "masteryMutationAllowed", "deterministicPlanDigest", "metadataOnly"]);
  dateOrdinal("previous-plan-date", plan.date);
  validProfile(plan.profile);
  exactKeys("previous-plan-capacity", plan.capacity, ["declaredActiveMinutes", "effectiveActiveMinutes", "schedulableActiveMinutes", "capacityBand", "evidenceLevel", "historyDaysUsed", "highLoadBudgetMinutes", "mediumLoadBudgetMinutes", "lowLoadBudgetMinutes", "recoveryBudgetMinutes", "unallocatedBufferMinutes", "maxContinuousHighLoadMinutes", "derivationReasons", "policyVersion"]);
  integer("previous-declared-active-minutes", plan.capacity.declaredActiveMinutes, 30, 720);
  integer("previous-effective-active-minutes", plan.capacity.effectiveActiveMinutes, 30, 720);
  integer("previous-schedulable-active-minutes", plan.capacity.schedulableActiveMinutes, 0, plan.capacity.effectiveActiveMinutes);
  enumValue("previous-capacity-band", plan.capacity.capacityBand, CAPACITY_BANDS);
  if (plan.capacity.capacityBand !== classifyCapacityBand(plan.capacity.effectiveActiveMinutes)) throw new Error("previous-capacity-band-mismatch");
  enumValue("previous-evidence-level", plan.capacity.evidenceLevel, EVIDENCE_LEVELS);
  integer("previous-history-days-used", plan.capacity.historyDaysUsed, 0, 28);
  for (const [name, value] of [["high", plan.capacity.highLoadBudgetMinutes], ["medium", plan.capacity.mediumLoadBudgetMinutes], ["low", plan.capacity.lowLoadBudgetMinutes], ["recovery", plan.capacity.recoveryBudgetMinutes]] as const) integer(`previous-${name}-load-budget-minutes`, value, 0, plan.capacity.schedulableActiveMinutes);
  const budgetTotal = plan.capacity.highLoadBudgetMinutes + plan.capacity.mediumLoadBudgetMinutes + plan.capacity.lowLoadBudgetMinutes + plan.capacity.recoveryBudgetMinutes;
  if (budgetTotal !== plan.capacity.schedulableActiveMinutes) throw new Error("previous-load-budget-total-mismatch");
  integer("previous-unallocated-buffer-minutes", plan.capacity.unallocatedBufferMinutes, 0, 720);
  if (plan.capacity.schedulableActiveMinutes + plan.capacity.unallocatedBufferMinutes !== plan.capacity.effectiveActiveMinutes) throw new Error("previous-capacity-envelope-total-mismatch");
  integer("previous-max-continuous-high-load-minutes", plan.capacity.maxContinuousHighLoadMinutes, 1, 720);
  if (!Array.isArray(plan.capacity.derivationReasons)) throw new Error("invalid-previous-derivation-reasons");
  plan.capacity.derivationReasons.forEach((reason) => requiredText("previous-derivation-reason", reason, 128));
  requiredText("previous-capacity-policy-version", plan.capacity.policyVersion, 128);
  if (plan.capacity.policyVersion !== plan.profile.policyVersion) throw new Error("previous-policy-version-mismatch");

  if (!Array.isArray(plan.executionBlocks)) throw new Error("invalid-previous-execution-blocks");
  const blockIds = new Set<string>();
  const scheduledCandidates = new Set<string>();
  for (const block of plan.executionBlocks) {
    exactKeys("previous-execution-block", block, ["blockId", "candidateId", "outcomeKey", "title", "subject", "taskKind", "cognitiveLoad", "startMinute", "endMinute", "activeMinutes", "windowId", "requiredness", "countsTowardActiveStudy", "selectionReasons", "metadataOnly"]);
    requiredText("previous-block-id", block.blockId, 256);
    if (blockIds.has(block.blockId)) throw new Error(`duplicate-previous-block-id:${block.blockId}`);
    blockIds.add(block.blockId);
    if (block.candidateId === null) {
      if (block.outcomeKey !== null || block.subject !== null || block.taskKind !== "recovery_buffer" || block.requiredness !== "buffer") throw new Error(`invalid-previous-buffer-block:${block.blockId}`);
    } else {
      requiredText(`previous-block-candidate-id:${block.blockId}`, block.candidateId, 128);
      scheduledCandidates.add(block.candidateId);
      requiredText(`previous-block-outcome-key:${block.blockId}`, block.outcomeKey, 128);
      requiredText(`previous-block-subject:${block.blockId}`, block.subject, 128);
      enumValue("previous-block-task-kind", block.taskKind, TASK_KINDS);
      enumValue("previous-block-requiredness", block.requiredness, REQUIREDNESS);
    }
    requiredText(`previous-block-title:${block.blockId}`, block.title, 256);
    enumValue("previous-block-cognitive-load", block.cognitiveLoad, COGNITIVE_LOADS);
    integer("previous-block-start-minute", block.startMinute, 0, 1439);
    integer("previous-block-end-minute", block.endMinute, 1, 1440);
    integer("previous-block-active-minutes", block.activeMinutes, 1, 720);
    if (block.endMinute <= block.startMinute || block.activeMinutes !== block.endMinute - block.startMinute) throw new Error(`previous-block-duration-mismatch:${block.blockId}`);
    requiredText(`previous-block-window-id:${block.blockId}`, block.windowId, 128);
    if (block.countsTowardActiveStudy !== true || block.metadataOnly !== true) throw new Error(`invalid-previous-block-boundary:${block.blockId}`);
    if (!Array.isArray(block.selectionReasons)) throw new Error(`invalid-previous-block-selection-reasons:${block.blockId}`);
    block.selectionReasons.forEach((reason) => requiredText(`previous-block-selection-reason:${block.blockId}`, reason, 128));
  }
  const chronologicalBlocks = [...plan.executionBlocks].sort((left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute);
  for (let index = 1; index < chronologicalBlocks.length; index += 1) if (chronologicalBlocks[index].startMinute < chronologicalBlocks[index - 1].endMinute) throw new Error("overlapping-previous-execution-blocks");
  if (highLoadRunExceeds(plan.executionBlocks, [], plan.capacity.maxContinuousHighLoadMinutes)) throw new Error("previous-high-load-run-exceeds-limit");

  if (!Array.isArray(plan.deferredTasks)) throw new Error("invalid-previous-deferred-tasks");
  const deferredCandidates = new Set<string>();
  for (const entry of plan.deferredTasks) {
    exactKeys("previous-deferred-task", entry, ["candidateId", "title", "reason", "nextEligibleDayKind", "metadataOnly"]);
    requiredText("previous-deferred-candidate-id", entry.candidateId, 128);
    requiredText(`previous-deferred-title:${entry.candidateId}`, entry.title, 256);
    if (deferredCandidates.has(entry.candidateId) || scheduledCandidates.has(entry.candidateId)) throw new Error(`duplicate-previous-candidate-classification:${entry.candidateId}`);
    deferredCandidates.add(entry.candidateId);
    enumValue("previous-deferral-reason", entry.reason, DEFERRAL_REASONS);
    if (entry.nextEligibleDayKind !== undefined) enumValue("previous-next-eligible-day-kind", entry.nextEligibleDayKind, DAY_KINDS);
    if (entry.metadataOnly !== true) throw new Error(`invalid-previous-deferred-boundary:${entry.candidateId}`);
  }

  if (!Array.isArray(plan.coreOutcomes) || plan.coreOutcomes.length > MAX_CORE_OUTCOMES) throw new Error("invalid-previous-core-outcomes");
  const outcomeIds = new Set<string>();
  for (const outcome of plan.coreOutcomes) {
    exactKeys("previous-core-outcome", outcome, ["outcomeId", "title", "blockIds", "estimatedMinutes", "reason", "metadataOnly"]);
    requiredText("previous-outcome-id", outcome.outcomeId, 256);
    if (outcomeIds.has(outcome.outcomeId)) throw new Error(`duplicate-previous-outcome-id:${outcome.outcomeId}`);
    outcomeIds.add(outcome.outcomeId);
    requiredText(`previous-outcome-title:${outcome.outcomeId}`, outcome.title, 256);
    if (!Array.isArray(outcome.blockIds) || !outcome.blockIds.length || new Set(outcome.blockIds).size !== outcome.blockIds.length) throw new Error(`invalid-previous-outcome-block-ids:${outcome.outcomeId}`);
    const outcomeBlocks = outcome.blockIds.map((blockId) => {
      requiredText(`previous-outcome-block-id:${outcome.outcomeId}`, blockId, 256);
      const block = plan.executionBlocks.find((candidate) => candidate.blockId === blockId);
      if (!block) throw new Error(`unknown-previous-outcome-block:${blockId}`);
      return block;
    });
    integer("previous-outcome-estimated-minutes", outcome.estimatedMinutes, 1, 720);
    if (outcome.estimatedMinutes !== outcomeBlocks.reduce((sum, block) => sum + block.activeMinutes, 0)) throw new Error(`previous-outcome-duration-mismatch:${outcome.outcomeId}`);
    requiredText(`previous-outcome-reason:${outcome.outcomeId}`, outcome.reason, 256);
    if (outcome.metadataOnly !== true) throw new Error(`invalid-previous-outcome-boundary:${outcome.outcomeId}`);
  }

  if (plan.planGap !== null) {
    exactKeys("previous-plan-gap", plan.planGap, ["forecastCapacityMinutes", "requiredPlanMinutes", "shortfallMinutes", "reasons", "choices", "claimBoundary", "metadataOnly"]);
    integer("previous-gap-forecast-capacity-minutes", plan.planGap.forecastCapacityMinutes, 0, 720);
    integer("previous-gap-required-plan-minutes", plan.planGap.requiredPlanMinutes, 0, 5040);
    integer("previous-gap-shortfall-minutes", plan.planGap.shortfallMinutes, 0, 5040);
    if (plan.planGap.forecastCapacityMinutes !== plan.capacity.schedulableActiveMinutes || plan.planGap.shortfallMinutes !== Math.max(0, plan.planGap.requiredPlanMinutes - plan.planGap.forecastCapacityMinutes)) throw new Error("previous-plan-gap-arithmetic-mismatch");
    uniqueEnumArray("previous-plan-gap-reason", plan.planGap.reasons, PLAN_GAP_REASONS);
    uniqueEnumArray("previous-plan-gap-choice", plan.planGap.choices, PLAN_GAP_CHOICES);
    if (plan.planGap.claimBoundary !== "schedule_feasibility_only_not_pass_probability" || plan.planGap.metadataOnly !== true) throw new Error("invalid-previous-plan-gap-boundary");
  }
  integer("previous-planned-active-minutes", plan.plannedActiveMinutes, 0, 720);
  if (plan.plannedActiveMinutes !== plan.executionBlocks.reduce((sum, block) => sum + block.activeMinutes, 0) || plan.plannedActiveMinutes > plan.capacity.schedulableActiveMinutes) throw new Error("previous-planned-active-minutes-mismatch");
  if (plan.completionMeaning !== "block_completion_is_not_mastery" || plan.masteryMutationAllowed !== false || plan.metadataOnly !== true) throw new Error("invalid-previous-plan-learning-boundary");
  const basis = JSON.stringify({ date: plan.date, profile: plan.profile, envelope: plan.capacity, blocks: plan.executionBlocks.map((block) => [block.blockId, block.candidateId, block.startMinute, block.endMinute, block.windowId]), deferred: plan.deferredTasks.map((entry) => [entry.candidateId, entry.reason]) });
  if (plan.deterministicPlanDigest !== `sclm-v1:${hash(basis)}`) throw new Error("previous-plan-digest-mismatch");
}

export function replanStudyDay(input: { previousPlan: StudyDayPlanV1; newAvailability: DayAvailabilityV1; candidates: StudyTaskCandidateV1[]; capacityHistory?: CapacityHistoryDayV1[]; reason: "overtime" | "illness" | "family_commitment" | "energy_drop" | "custom" }): ReplannedStudyDayV1 {
  metadataSafe(input);
  exactKeys("replan-study-day-input", input, ["previousPlan", "newAvailability", "candidates", "capacityHistory", "reason"]);
  enumValue("replan-reason", input.reason, REPLAN_REASONS);
  validatePreviousPlan(input.previousPlan);
  if (!Array.isArray(input.candidates) || input.candidates.length > MAX_CANDIDATES_PER_PLAN) throw new Error(`invalid-study-candidate-count:${String(input.candidates?.length)}`);
  const previousScope = new Set([...input.previousPlan.executionBlocks.map((block) => block.candidateId).filter((candidateId): candidateId is string => Boolean(candidateId)), ...input.previousPlan.deferredTasks.map((entry) => entry.candidateId)]);
  const candidateScope = new Set(input.candidates.map((candidate) => candidate.id));
  if (previousScope.size !== candidateScope.size || [...previousScope].some((candidateId) => !candidateScope.has(candidateId))) throw new Error("replan-candidate-scope-mismatch");
  const plan = buildStudyDayPlan({ profile: input.previousPlan.profile, availability: input.newAvailability, candidates: input.candidates, capacityHistory: input.capacityHistory, recoveryOverrideMinutes: input.reason === "illness" ? Math.min(180, input.newAvailability.declaredActiveMinutes) : undefined });
  const next = new Set(plan.executionBlocks.map((block) => block.candidateId).filter((candidateId): candidateId is string => Boolean(candidateId)));
  const decisions: ReplanDecisionV1[] = input.candidates.map((candidate) => next.has(candidate.id)
    ? { candidateId: candidate.id, decision: "keep", reason: `replanned-after:${input.reason}`, metadataOnly: true }
    : candidate.requiredness === "optional"
      ? { candidateId: candidate.id, decision: "drop", reason: `optional-scope-dropped-after:${input.reason}`, metadataOnly: true }
      : { candidateId: candidate.id, decision: "defer", reason: `capacity-preserved-after:${input.reason}`, metadataOnly: true });
  const output: ReplannedStudyDayV1 = { plan, decisions, backlogCloneCount: 0, metadataOnly: true };
  metadataSafe(output);
  return output;
}
