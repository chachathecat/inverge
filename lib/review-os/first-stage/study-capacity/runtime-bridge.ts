import {
  buildStudyDayPlan,
  type DayAvailabilityV1,
  type LearnerConstraintProfileV1,
  type StudyDayPlanV1,
  type StudyTaskCandidateV1,
} from "../../study-capacity-life-mode-orchestrator";
import {
  FIRST_STAGE_KERNEL_SCHEMA_VERSION,
  FirstStageKernelError,
  buildTodayQueue,
  exactObject,
  type FirstStageKernelState,
  type TodayQueueItem,
} from "../kernel/index";
import {
  SUBJECT_ADAPTER_V1_INTERFACE_DIGEST,
  type SubjectAdapterRegistry,
} from "../subject-adapter/index";

export const FIRST_STAGE_CAPACITY_BRIDGE_SCHEMA_VERSION =
  "first_stage.study_capacity_runtime_bridge.v1" as const;
export const FIRST_STAGE_CAPACITY_BRIDGE_FEATURE_FLAG =
  "INVERGE_OWNER_FIRST_STAGE_CAPACITY_ENABLED" as const;

export type FirstStageCapacityPlanKind = "today" | "full_day";

const SOURCE_POLICY_VERSION =
  "dabangil.study_capacity_life_mode_orchestrator.v1" as const;
const MAX_BRIDGE_MAPPED_MINUTES = 5_040;

export class FirstStageCapacityBridgeError extends Error {
  readonly code: "invalid_input" | "candidate_source_invalid" | "kernel_unavailable";

  constructor(code: FirstStageCapacityBridgeError["code"]) {
    super(`first-stage-capacity-bridge:${code}`);
    this.code = code;
  }
}

type QueueSummary = Readonly<{
  schemaVersion: "first_stage.study_capacity_queue_summary.v1";
  kernelRevision: number;
  generatedAt: string;
  sourceItemCount: number;
  candidateCount: number;
  candidateSourceId: string;
  candidateSourceVersion: string;
  candidateSourceSha256: string;
  examCycleDefinitionSha256: string;
  sourceOmittedItemCount: number;
  bridgeOverflowItemCount: number;
  sourceMappedMinutes: number;
  selectedMappedMinutes: number;
  overflowMappedMinutes: number;
  sourceRequiredMinutes: number;
  selectedRequiredMinutes: number;
  overflowRequiredMinutes: number;
  kernelOmittedPriorityItemCount: number;
  notYetDueReviewCount: number;
}>;

export type FirstStageCapacityCandidateAssignment = Readonly<{
  queueItemId: string;
  candidate: StudyTaskCandidateV1;
}>;

export type FirstStageCapacityCandidateBatch = Readonly<{
  schemaVersion: "first_stage.study_capacity_candidate_batch.v1";
  assignments: readonly FirstStageCapacityCandidateAssignment[];
  omittedQueueItemIds: readonly string[];
}>;

export interface FirstStageStudyCapacityCandidateSourceV1 {
  readonly schemaVersion: "first_stage.study_capacity_candidate_source.v1";
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly sourceSha256: string;
  readonly subjectAdapterInterfaceDigest: typeof SUBJECT_ADAPTER_V1_INTERFACE_DIGEST;
  buildCandidates(input: Readonly<{
    planKind: FirstStageCapacityPlanKind;
    queueItems: readonly TodayQueueItem[];
  }>): FirstStageCapacityCandidateBatch;
}

export type TrustedFirstStageCapacityCandidateSourceBinding = Readonly<{
  schemaVersion: "first_stage.study_capacity_candidate_source_binding.v1";
  sourceId: string;
  sourceVersion: string;
  sourceSha256: string;
  subjectAdapterInterfaceDigest: typeof SUBJECT_ADAPTER_V1_INTERFACE_DIGEST;
}>;

export type FirstStageStudyCapacityPlan = Readonly<{
  schemaVersion: typeof FIRST_STAGE_CAPACITY_BRIDGE_SCHEMA_VERSION;
  sourcePolicyVersion: typeof SOURCE_POLICY_VERSION;
  planKind: FirstStageCapacityPlanKind;
  kernelSchemaVersion: typeof FIRST_STAGE_KERNEL_SCHEMA_VERSION;
  subjectAdapterInterfaceDigest: typeof SUBJECT_ADAPTER_V1_INTERFACE_DIGEST;
  queue: QueueSummary;
  plan: StudyDayPlanV1;
  ownerOnly: true;
  defaultOff: true;
  productionAllowed: false;
  persistenceMutation: false;
  masteryMutationAllowed: false;
  aiGenerationEntitlementChanged: false;
  scheduleFeasibilityScope: "selected_bounded_scope_plus_explicit_overflow";
  deterministicPlanDigestAuthority: "replay_hint_only_not_identity_or_authorization";
}>;

export type FirstStageCapacityPreview = Readonly<{
  schemaVersion: typeof FIRST_STAGE_CAPACITY_BRIDGE_SCHEMA_VERSION;
  sourcePolicyVersion: typeof SOURCE_POLICY_VERSION;
  planKind: FirstStageCapacityPlanKind;
  kernelSchemaVersion: typeof FIRST_STAGE_KERNEL_SCHEMA_VERSION;
  subjectAdapterInterfaceDigest: typeof SUBJECT_ADAPTER_V1_INTERFACE_DIGEST;
  queueAvailability: Readonly<{
    state: "blocked";
    itemCount: 0;
    blocker: "subject_adapter_required";
    serverKernelStateProviderInstalled: false;
  }>;
  plan: StudyDayPlanV1;
  ownerOnly: true;
  defaultOff: true;
  productionAllowed: false;
  persistenceMutation: false;
  masteryMutationAllowed: false;
  aiGenerationEntitlementChanged: false;
  capacityHistoryEvidenceUsed: false;
  deterministicPlanDigestAuthority: "replay_hint_only_not_identity_or_authorization";
}>;

function fail(): never {
  throw new FirstStageCapacityBridgeError("invalid_input");
}

function planKind(value: unknown): FirstStageCapacityPlanKind {
  if (value !== "today" && value !== "full_day") fail();
  return value;
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail();
  return value as Record<string, unknown>;
}

function firstStageProfile(value: unknown) {
  const profile = record(value);
  if (
    (profile.examMode !== "first" && profile.examMode !== "both") ||
    profile.policyVersion !== SOURCE_POLICY_VERSION
  ) fail();
  return value as LearnerConstraintProfileV1;
}

function trustedKstDate(value: unknown) {
  if (typeof value !== "string") fail();
  const instant = Date.parse(value);
  if (!Number.isFinite(instant) || new Date(instant).toISOString() !== value) fail();
  return new Date(instant + 9 * 60 * 60 * 1_000).toISOString().slice(0, 10);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}

function buildPlan(
  profileValue: unknown,
  availabilityValue: unknown,
  candidates: StudyTaskCandidateV1[],
) {
  const profile = firstStageProfile(profileValue);
  return buildStudyDayPlan({
    profile,
    availability: availabilityValue as DayAvailabilityV1,
    candidates,
  });
}

function candidateBatch(
  sourceValue: unknown,
  trustedBindingValue: unknown,
  kind: FirstStageCapacityPlanKind,
  queueItems: readonly TodayQueueItem[],
) {
  try {
    const source = sourceValue as FirstStageStudyCapacityCandidateSourceV1;
    const trustedBinding = exactObject(trustedBindingValue, [
      "schemaVersion",
      "sourceId",
      "sourceVersion",
      "sourceSha256",
      "subjectAdapterInterfaceDigest",
    ]);
    const sourceRow = exactObject(source, [
      "schemaVersion",
      "sourceId",
      "sourceVersion",
      "sourceSha256",
      "subjectAdapterInterfaceDigest",
      "buildCandidates",
    ]);
    if (
      sourceRow.schemaVersion !== "first_stage.study_capacity_candidate_source.v1" ||
      sourceRow.subjectAdapterInterfaceDigest !== SUBJECT_ADAPTER_V1_INTERFACE_DIGEST ||
      typeof sourceRow.sourceId !== "string" ||
      !sourceRow.sourceId.trim() ||
      typeof sourceRow.sourceVersion !== "string" ||
      !sourceRow.sourceVersion.trim() ||
      typeof sourceRow.sourceSha256 !== "string" ||
      !/^[0-9a-f]{64}$/u.test(sourceRow.sourceSha256) ||
      typeof sourceRow.buildCandidates !== "function"
    ) throw new Error("invalid-candidate-source");
    if (
      trustedBinding.schemaVersion !==
        "first_stage.study_capacity_candidate_source_binding.v1" ||
      trustedBinding.sourceId !== sourceRow.sourceId ||
      trustedBinding.sourceVersion !== sourceRow.sourceVersion ||
      trustedBinding.sourceSha256 !== sourceRow.sourceSha256 ||
      trustedBinding.subjectAdapterInterfaceDigest !==
        SUBJECT_ADAPTER_V1_INTERFACE_DIGEST
    ) throw new Error("candidate-source-binding-mismatch");
    const batch = source.buildCandidates({ planKind: kind, queueItems });
    const batchRow = exactObject(batch, [
      "schemaVersion",
      "assignments",
      "omittedQueueItemIds",
    ]);
    if (
      batchRow.schemaVersion !== "first_stage.study_capacity_candidate_batch.v1" ||
      !Array.isArray(batchRow.assignments) ||
      !Array.isArray(batchRow.omittedQueueItemIds)
    ) throw new Error("invalid-candidate-batch");
    const queueById = new Map(queueItems.map((item) => [item.queueItemId, item]));
    const assignmentsById = new Map<string, StudyTaskCandidateV1>();
    for (const value of batchRow.assignments) {
      const assignment = exactObject(value, ["queueItemId", "candidate"]);
      if (
        typeof assignment.queueItemId !== "string" ||
        !queueById.has(assignment.queueItemId) ||
        assignmentsById.has(assignment.queueItemId)
      ) throw new Error("invalid-candidate-assignment");
      const item = queueById.get(assignment.queueItemId)!;
      const candidate = record(assignment.candidate) as StudyTaskCandidateV1;
      if (
        candidate.id !== `first-stage:${item.queueItemId}` ||
        candidate.subject !== item.subjectId ||
        candidate.examTrack !== "first" ||
        candidate.sourceRef !==
          `first-stage-question:${item.questionReference.questionId}@${item.questionReference.questionVersion}` ||
        candidate.metadataOnly !== true ||
        !Number.isSafeInteger(candidate.estimatedMinutes) ||
        candidate.estimatedMinutes < 1 ||
        candidate.estimatedMinutes > 720 ||
        !["required", "core_candidate", "support", "optional"].includes(
          String(candidate.requiredness),
        )
      ) throw new Error("invalid-candidate-binding");
      assignmentsById.set(assignment.queueItemId, candidate);
    }
    const omitted = batchRow.omittedQueueItemIds;
    const omittedIds = new Set<string>();
    for (const value of omitted) {
      if (
        typeof value !== "string" ||
        !queueById.has(value) ||
        assignmentsById.has(value) ||
        omittedIds.has(value)
      ) throw new Error("invalid-candidate-omission");
      if (queueById.get(value)!.kind !== "new_question") {
        throw new Error("mandatory-queue-item-omitted");
      }
      omittedIds.add(value);
    }
    if (assignmentsById.size + omittedIds.size !== queueItems.length) {
      throw new Error("incomplete-candidate-classification");
    }
    const sourceMappedMinutes = queueItems.reduce((sum, item) =>
      sum + (assignmentsById.get(item.queueItemId)?.estimatedMinutes ?? 0), 0);
    const sourceRequiredMinutes = queueItems.reduce((sum, item) =>
      sum + (item.kind === "new_question"
        ? 0
        : assignmentsById.get(item.queueItemId)?.estimatedMinutes ?? 0), 0);
    let mappedMinutes = 0;
    let selectedRequiredMinutes = 0;
    let overflowStarted = false;
    const selected: StudyTaskCandidateV1[] = [];
    const bridgeOverflowQueueItemIds: string[] = [];
    queueItems.forEach((item, index) => {
      const candidate = assignmentsById.get(item.queueItemId);
      if (!candidate) return;
      const nextMappedMinutes = mappedMinutes + candidate.estimatedMinutes;
      if (overflowStarted || nextMappedMinutes > MAX_BRIDGE_MAPPED_MINUTES) {
        overflowStarted = true;
        bridgeOverflowQueueItemIds.push(item.queueItemId);
        return;
      }
      mappedMinutes = nextMappedMinutes;
      if (item.kind !== "new_question") {
        selectedRequiredMinutes += candidate.estimatedMinutes;
      }
      const queueClassBase = item.kind === "active_attempt"
        ? 9_000
        : item.kind === "independent_retry" ? 6_000 : 3_000;
      selected.push({
        ...candidate,
        id: `first-stage:${item.queueItemId}`,
        title: `1차 ${item.subjectId} · ${item.kind}`,
        subject: item.subjectId,
        examTrack: "first",
        taskKind: item.kind === "independent_retry"
          ? "due_review"
          : "independent_problem_solving",
        requiredness: item.kind === "new_question" ? "core_candidate" : "required",
        prioritySignals: item.kind === "active_attempt"
          ? ["learner_pinned"]
          : item.kind === "independent_retry" ? ["due_review"] : ["new_study"],
        basePriority: queueClassBase - index,
        outcomeKey: `first-stage:${item.subjectId}:${item.kind}`,
        sourceRef:
          `first-stage-question:${item.questionReference.questionId}@${item.questionReference.questionVersion}`,
        metadataOnly: true,
      });
    });
    return {
      sourceId: trustedBinding.sourceId as string,
      sourceVersion: trustedBinding.sourceVersion as string,
      sourceSha256: trustedBinding.sourceSha256 as string,
      candidates: selected,
      sourceOmittedItemCount: omittedIds.size,
      bridgeOverflowQueueItemIds,
      sourceMappedMinutes,
      selectedMappedMinutes: mappedMinutes,
      sourceRequiredMinutes,
      selectedRequiredMinutes,
    };
  } catch {
    throw new FirstStageCapacityBridgeError("candidate_source_invalid");
  }
}

export function buildFirstStageCapacityPreview(
  input: unknown,
  trustedNow: unknown,
): FirstStageCapacityPreview {
  try {
    const row = exactObject(input, [
      "planKind",
      "lifeMode",
      "phase",
      "scheduleVolatility",
      "dayKind",
      "declaredActiveMinutes",
      "windows",
      "externalCommitmentMinutes",
    ]);
    const kind = planKind(row.planKind);
    const profile = {
      lifeMode: row.lifeMode,
      examMode: "first",
      phase: row.phase,
      scheduleVolatility: row.scheduleVolatility,
      policyVersion: SOURCE_POLICY_VERSION,
    };
    const availability = {
      date: trustedKstDate(trustedNow),
      dayKind: row.dayKind,
      declaredActiveMinutes: row.declaredActiveMinutes,
      windows: row.windows,
      externalCommitmentMinutes: row.externalCommitmentMinutes,
    };
    const plan = buildPlan(profile, availability, []);
    return deepFreeze({
      schemaVersion: FIRST_STAGE_CAPACITY_BRIDGE_SCHEMA_VERSION,
      sourcePolicyVersion: SOURCE_POLICY_VERSION,
      planKind: kind,
      kernelSchemaVersion: FIRST_STAGE_KERNEL_SCHEMA_VERSION,
      subjectAdapterInterfaceDigest: SUBJECT_ADAPTER_V1_INTERFACE_DIGEST,
      queueAvailability: {
        state: "blocked",
        itemCount: 0,
        blocker: "subject_adapter_required",
        serverKernelStateProviderInstalled: false,
      },
      plan,
      ownerOnly: true,
      defaultOff: true,
      productionAllowed: false,
      persistenceMutation: false,
      masteryMutationAllowed: false,
      aiGenerationEntitlementChanged: false,
      capacityHistoryEvidenceUsed: false,
      deterministicPlanDigestAuthority: "replay_hint_only_not_identity_or_authorization",
    });
  } catch (error) {
    if (error instanceof FirstStageCapacityBridgeError) throw error;
    throw new FirstStageCapacityBridgeError("invalid_input");
  }
}

export function buildFirstStageStudyCapacityPlan(input: Readonly<{
  planKind: FirstStageCapacityPlanKind;
  state: FirstStageKernelState;
  trustedOwnerId: string;
  trustedExamCycleDefinitionSha256: string;
  trustedGeneratedAt: string;
  profile: LearnerConstraintProfileV1;
  availability: DayAvailabilityV1;
  registry: SubjectAdapterRegistry;
  candidateSource: FirstStageStudyCapacityCandidateSourceV1;
  trustedCandidateSourceBinding: TrustedFirstStageCapacityCandidateSourceBinding;
}>): FirstStageStudyCapacityPlan {
  try {
    const row = exactObject(input, [
      "planKind",
      "state",
      "trustedOwnerId",
      "trustedExamCycleDefinitionSha256",
      "trustedGeneratedAt",
      "profile",
      "availability",
      "registry",
      "candidateSource",
      "trustedCandidateSourceBinding",
    ]);
    const kind = planKind(row.planKind);
    const state = row.state as FirstStageKernelState;
    if (state.examCycle.mode !== kind) fail();
    const trustedPlanningDate = trustedKstDate(row.trustedGeneratedAt);
    if (record(row.availability).date !== trustedPlanningDate) fail();
    const queue = buildTodayQueue(
      state,
      {
        trustedOwnerId: row.trustedOwnerId as string,
        trustedExamCycleDefinitionSha256:
          row.trustedExamCycleDefinitionSha256 as string,
        trustedGeneratedAt: row.trustedGeneratedAt as string,
      },
      row.registry as SubjectAdapterRegistry,
    );
    buildPlan(row.profile, row.availability, []);
    const batch = candidateBatch(
      row.candidateSource,
      row.trustedCandidateSourceBinding,
      kind,
      queue.items,
    );
    let plan: StudyDayPlanV1;
    try {
      plan = buildPlan(row.profile, row.availability, batch.candidates);
    } catch {
      throw new FirstStageCapacityBridgeError("candidate_source_invalid");
    }
    return deepFreeze({
      schemaVersion: FIRST_STAGE_CAPACITY_BRIDGE_SCHEMA_VERSION,
      sourcePolicyVersion: SOURCE_POLICY_VERSION,
      planKind: kind,
      kernelSchemaVersion: FIRST_STAGE_KERNEL_SCHEMA_VERSION,
      subjectAdapterInterfaceDigest: SUBJECT_ADAPTER_V1_INTERFACE_DIGEST,
      queue: {
        schemaVersion: "first_stage.study_capacity_queue_summary.v1",
        kernelRevision: queue.kernelRevision,
        generatedAt: queue.generatedAt,
        sourceItemCount: queue.items.length,
        candidateCount: batch.candidates.length,
        candidateSourceId: batch.sourceId,
        candidateSourceVersion: batch.sourceVersion,
        candidateSourceSha256: batch.sourceSha256,
        examCycleDefinitionSha256: state.examCycle.definitionSha256,
        sourceOmittedItemCount: batch.sourceOmittedItemCount,
        bridgeOverflowItemCount: batch.bridgeOverflowQueueItemIds.length,
        sourceMappedMinutes: batch.sourceMappedMinutes,
        selectedMappedMinutes: batch.selectedMappedMinutes,
        overflowMappedMinutes:
          batch.sourceMappedMinutes - batch.selectedMappedMinutes,
        sourceRequiredMinutes: batch.sourceRequiredMinutes,
        selectedRequiredMinutes: batch.selectedRequiredMinutes,
        overflowRequiredMinutes:
          batch.sourceRequiredMinutes - batch.selectedRequiredMinutes,
        kernelOmittedPriorityItemCount: queue.omittedPriorityItemCount,
        notYetDueReviewCount: queue.notYetDueReviewCount,
      },
      plan,
      ownerOnly: true,
      defaultOff: true,
      productionAllowed: false,
      persistenceMutation: false,
      masteryMutationAllowed: false,
      aiGenerationEntitlementChanged: false,
      scheduleFeasibilityScope: "selected_bounded_scope_plus_explicit_overflow",
      deterministicPlanDigestAuthority: "replay_hint_only_not_identity_or_authorization",
    });
  } catch (error) {
    if (error instanceof FirstStageCapacityBridgeError) throw error;
    if (error instanceof FirstStageKernelError) throw error;
    throw new FirstStageCapacityBridgeError("kernel_unavailable");
  }
}

export function firstStageCapacityBridgeAvailability() {
  return deepFreeze({
    schemaVersion: "first_stage.study_capacity_runtime_availability.v1" as const,
    bridgeSchemaVersion: FIRST_STAGE_CAPACITY_BRIDGE_SCHEMA_VERSION,
    sourcePolicyVersion: SOURCE_POLICY_VERSION,
    kernelSchemaVersion: FIRST_STAGE_KERNEL_SCHEMA_VERSION,
    subjectAdapterInterfaceDigest: SUBJECT_ADAPTER_V1_INTERFACE_DIGEST,
    state: "capacity_preview_ready" as const,
    queueState: "blocked_subject_adapter_required" as const,
    serverKernelStateProviderInstalled: false as const,
    serverCandidateSourceInstalled: false as const,
    acceptsClientKernelState: false as const,
    acceptsClientCandidates: false as const,
    acceptsClientCapacityHistory: false as const,
    acceptsClientTrustedClock: false as const,
    ownerOnly: true as const,
    defaultOff: true as const,
    productionAllowed: false as const,
    persistenceMutation: false as const,
    masteryMutationAllowed: false as const,
    aiGenerationEntitlementChanged: false as const,
    capacityHistoryCalibrationClaim: false as const,
    learningEfficacyClaim: false as const,
  });
}
